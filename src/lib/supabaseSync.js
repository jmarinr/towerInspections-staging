import { supabase } from './supabaseClient';
import { getDeviceId } from './deviceId';
import { dataUrlToBlob } from './dataUrl';
import { emitPhotoStatus, PhotoUploadStatus } from './photoEvents';


// Converts multiple image representations into a Blob:
// - DataURL string: "data:image/...;base64,..."
// - Blob/File objects
// - Object URLs: "blob:..."
async function toBlobAny(input) {
  if (!input) throw new Error("Invalid image input (empty)");

  // Blob or File
  if (typeof Blob !== "undefined" && input instanceof Blob) return input;

  // Data URL string
  if (typeof input === "string") {
    if (input.startsWith("data:")) return dataUrlToBlob(input);
    if (input.startsWith("blob:")) {
      const resp = await fetch(input);
      if (!resp.ok) throw new Error("Failed to fetch blob URL");
      return await resp.blob();
    }
  }

  throw new Error("Invalid image input (expected DataURL string or Blob/File)");
}

const ORG_CODE = 'PTI';
const BUCKET = 'pti-inspect';
const SUBMISSION_IDS_KEY = 'pti_submission_ids_v1';
const PENDING_SYNC_KEY = 'pti_pending_sync_v1';
const PENDING_ASSETS_KEY = 'pti_pending_assets_v1';

// Concurrency guard – prevents overlapping flushSupabaseQueues calls
let _flushing = false;
// Track consecutive re-flush attempts to prevent infinite loops on persistent errors
let _reflushCount = 0;
const MAX_REFLUSH = 10;

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function getAppVersion() {
  // Vite injects this at build time if you define it; fallback to package.json string shown in UI.
  return import.meta.env.VITE_APP_VERSION || '2.6.2';
}

function loadMap(key) {
  return safeJsonParse(localStorage.getItem(key), {}) || {};
}

function saveMap(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}



export function clearSupabaseLocalForForm(formCode) {
  if (!formCode) return;
  try {
    const syncMap = loadMap(PENDING_SYNC_KEY);
    if (syncMap && typeof syncMap === 'object') {
      delete syncMap[formCode];
      saveMap(PENDING_SYNC_KEY, syncMap);
    }
  } catch (e) {}

  try {
    const assetsMap = loadMap(PENDING_ASSETS_KEY);
    if (assetsMap && typeof assetsMap === 'object') {
      delete assetsMap[formCode];
      saveMap(PENDING_ASSETS_KEY, assetsMap);
    }
  } catch (e) {}

  try {
    const idsMap = loadMap(SUBMISSION_IDS_KEY);
    if (idsMap && typeof idsMap === 'object') {
      // Clear both old-style keys and new-style keys (formCode::visitId)
      delete idsMap[formCode];
      for (const key of Object.keys(idsMap)) {
        if (key.startsWith(formCode + '::')) {
          delete idsMap[key];
        }
      }
      saveMap(SUBMISSION_IDS_KEY, idsMap);
    }
  } catch (e) {}

  // NOTE: pti_uploaded_urls_v1 is intentionally NOT cleared here.
  // URLs are kept so photos can always be recovered after reload
  // via recoverPhotoFromQueue, as a fallback to hydrateFormFromSupabase.
}

export async function ensureSubmissionId(formCode, formVersion = '1.2.1') {
  const deviceId = getDeviceId();
  const map = loadMap(SUBMISSION_IDS_KEY);
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';

  // Map autosave bucket names to canonical form codes (same as getSupabasePayloadForForm)
  const toCanonical = (code) => {
    if (!code) return 'unknown';
    if (code.startsWith('inspection')) return 'inspeccion';
    if (code === 'preventive-maintenance') return 'mantenimiento';
    if (code === 'executed-maintenance' || code === 'pm-executed') return 'mantenimiento-ejecutado';
    if (code === 'equipment-inventory' || code === 'equipment') return 'inventario';
    if (code === 'equipment-v2') return 'inventario-v2';
    if (code === 'grounding-system-test') return 'puesta-tierra';
    if (code === 'safety-system') return 'sistema-ascenso';
    if (code === 'additional-photo-report' || code === 'additional-photo') return 'additional-photo-report';
    return code;
  };
  const canonicalCode = toCanonical(formCode);

  // Get site_visit_id from the most recent pending sync for this form
  let siteVisitId = NIL_UUID;
  try {
    // First check pending sync queue
    const syncMap = loadMap(PENDING_SYNC_KEY);
    for (const [, item] of Object.entries(syncMap)) {
      const vid = item?.payload?.site_visit_id;
      if (vid && vid !== NIL_UUID && !String(vid).startsWith('local-')) {
        siteVisitId = vid;
        break;
      }
    }
    // If not found in sync queue, check the active visit in the zustand persisted store
    if (siteVisitId === NIL_UUID) {
      const storeRaw = localStorage.getItem('pti-inspect-storage');
      if (storeRaw) {
        const store = JSON.parse(storeRaw);
        const vid = store?.state?.activeVisit?.id;
        if (vid && vid !== NIL_UUID && !String(vid).startsWith('local-')) {
          siteVisitId = vid;
        }
      }
    }
  } catch (_) {}

  // If we still have NIL_UUID, we can't create a submission (FK constraint will fail)
  if (siteVisitId === NIL_UUID) {
    throw new Error('No valid site_visit_id available - cannot create submission for assets');
  }

  // Cache key includes visit ID to separate per-order submissions
  const cacheKey = `${canonicalCode}::${siteVisitId}`;
  if (map[cacheKey]) return map[cacheKey];

  // Check formAssignments in Zustand store for known submission ID (cross-device)
  try {
    const storeRaw = localStorage.getItem('pti-inspect-storage');
    if (storeRaw) {
      const store = JSON.parse(storeRaw);
      const assignments = store?.state?.formAssignments || {};
      const assignment = assignments[canonicalCode];
      if (assignment?.submissionId) {
        map[cacheKey] = assignment.submissionId;
        saveMap(SUBMISSION_IDS_KEY, map);
        return assignment.submissionId;
      }
    }
  } catch (_) {}

  // First try to find the existing submission row by site_visit_id + form_code (any device)
  const { data: existingAny } = await supabase
    .from('submissions')
    .select('id')
    .eq('form_code', canonicalCode)
    .eq('site_visit_id', siteVisitId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingAny) {
    map[cacheKey] = existingAny.id;
    saveMap(SUBMISSION_IDS_KEY, map);
    return existingAny.id;
  }

  // Fall back: find by device_id (own submissions only)
  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('device_id', deviceId)
    .eq('form_code', canonicalCode)
    .eq('site_visit_id', siteVisitId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    map[cacheKey] = existing.id;
    saveMap(SUBMISSION_IDS_KEY, map);
    return existing.id;
  }

  // If not found, create a minimal row
  const row = {
    org_code: payload?.org_code || ORG_CODE,
    device_id: deviceId,
    form_code: canonicalCode,
    form_version: formVersion,
    app_version: getAppVersion(),
    site_visit_id: siteVisitId,
    submitted_by_user_id: payload?.submitted_by_user_id || null,
    finalized: false,
    payload: {},
  };

  const { data, error } = await supabase
    .from('submissions')
    .upsert(row, { onConflict: 'org_code,device_id,form_code,site_visit_id' })
    .select('id')
    .single();

  if (error) throw error;
  map[cacheKey] = data.id;
  saveMap(SUBMISSION_IDS_KEY, map);
  return data.id;
}

export function queueSubmissionSync(formCode, payload, formVersion = '1.2.1', assignedTo = null, submissionId = null) {
  const map = loadMap(PENDING_SYNC_KEY);
  map[formCode] = {
    formCode,
    formVersion,
    payload,
    assignedTo,
    submissionId,  // known DB row id — use UPDATE by id instead of upsert by constraint
    ts: Date.now(),
  };
  saveMap(PENDING_SYNC_KEY, map);
}

export function queueAssetUpload(formCode, assetType, dataUrl) {
  if (!formCode || !assetType) return

  const map = loadMap(PENDING_ASSETS_KEY)
  const list = Array.isArray(map[formCode]) ? map[formCode] : []
  const now = Date.now()

  const isBlob = typeof Blob !== 'undefined' && dataUrl instanceof Blob
  const isDataUrlString =
    typeof dataUrl === 'string' &&
    dataUrl.trim().length > 0 &&
    dataUrl.trimStart().startsWith('data:')

  // Si recibimos un string que no es Data URL, lo ignoramos (evita errores de build/runtime)
  if (typeof dataUrl === 'string' && dataUrl.trim().length > 0 && !isDataUrlString) {
    console.warn('[Supabase] Ignorando asset inválido (string no es Data URL).', {
      formCode,
      assetType,
      preview: dataUrl.slice(0, 30),
    })
    return
  }

  const action = (isBlob || isDataUrlString) ? 'upload' : 'delete'

  const item = action === 'upload'
    ? { assetType, action, dataUrl, ts: now }
    : { assetType, action, ts: now }

  const idx = list.findIndex(a => a.assetType === assetType)
  if (idx >= 0) list[idx] = item
  else list.push(item)

  map[formCode] = list
  saveMap(PENDING_ASSETS_KEY, map)
}

function extFromMime(mime) {
  if (!mime) return 'bin';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'bin';
}

async function uploadToStorage(path, blob) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

/**
 * Upsert a row in submission_assets.
 * Uses native Supabase upsert on (submission_id, asset_type) constraint.
 * DB constraint: submission_assets_submission_asset_type_key
 */
async function upsertSubmissionAsset(row) {
  const { error } = await supabase
    .from('submission_assets')
    .upsert(row, { onConflict: 'submission_id,asset_type' })

  if (error) throw error
}

export async function flushSupabaseQueues({ formCode } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  // Concurrency guard – if already flushing, skip this call
  if (_flushing) return;
  _flushing = true;

  try {
    // 1) submissions
    const pending = loadMap(PENDING_SYNC_KEY);
    const codes = formCode ? [formCode] : Object.keys(pending);

    for (const code of codes) {
      const item = pending[code];
      if (!item) continue;

      try {
        const canonicalFormCode = item.payload?.form_code || code;
        const deviceId = getDeviceId();
        const NIL_UUID = '00000000-0000-0000-0000-000000000000';
        const siteVisitId = (item.payload?.site_visit_id && !String(item.payload.site_visit_id).startsWith('local-'))
          ? item.payload.site_visit_id
          : NIL_UUID;

        const row = {
          org_code: item.payload?.org_code || ORG_CODE,
          device_id: deviceId,
          form_code: canonicalFormCode,
          form_version: item.formVersion,
          app_version: getAppVersion(),
          site_visit_id: siteVisitId,
          submitted_by_user_id: item.payload?.submitted_by_user_id || null,
          finalized: item.payload?.payload?.finalized === true,
          ...(item.assignedTo ? { assigned_to: item.assignedTo } : {}),
          // Site catalog references — only include if columns exist in DB
          // Run migration first: ALTER TABLE submissions ADD COLUMN IF NOT EXISTS site_id uuid, region_id uuid
          // site_id: item.payload?.payload?.data?.siteInfo?.siteRef || null,
          // region_id: item.payload?.payload?.data?.siteInfo?.region_id || null,
          payload: {
            ...item.payload,
            _meta: {
              ...(item.payload?._meta || {}),
              last_saved_at: new Date().toISOString(),
            },
          },
        };

        // If we know the submission ID (cross-device collaboration), UPDATE directly by ID
        // Otherwise fall back to upsert by device-based constraint
        let error
        if (item.submissionId) {
          // Direct update by ID — works for both own forms and cross-device collaboration
          // Build update payload explicitly to avoid sending device_id/org_code
          const updatePayload = {
            form_version: row.form_version,
            app_version: row.app_version,
            submitted_by_user_id: row.submitted_by_user_id,
            finalized: row.finalized,
            payload: row.payload,
            ...(item.assignedTo ? { assigned_to: item.assignedTo } : {}),
          }
          const { error: updErr } = await supabase
            .from('submissions')
            .update(updatePayload)
            .eq('id', item.submissionId);
          error = updErr
          // Also cache this submission ID for ensureSubmissionId
          try {
            const idsMap = loadMap(SUBMISSION_IDS_KEY)
            const cacheKey = `${canonicalFormCode}::${siteVisitId}`
            idsMap[cacheKey] = item.submissionId
            saveMap(SUBMISSION_IDS_KEY, idsMap)
          } catch (_) {}
        } else {
          const { data: upserted, error: upsErr } = await supabase
            .from('submissions')
            .upsert(row, { onConflict: 'org_code,device_id,form_code,site_visit_id' })
            .select('id')
            .maybeSingle();
          error = upsErr
          // Cache the new submission ID so future saves use UPDATE by ID
          if (!upsErr && upserted?.id) {
            try {
              const idsMap = loadMap(SUBMISSION_IDS_KEY)
              const cacheKey = `${canonicalFormCode}::${siteVisitId}`
              idsMap[cacheKey] = upserted.id
              saveMap(SUBMISSION_IDS_KEY, idsMap)
              // Also update formAssignments in localStorage so triggerAutosave picks it up
              const storeRaw = localStorage.getItem('pti-inspect-storage')
              if (storeRaw) {
                const store = JSON.parse(storeRaw)
                if (store?.state?.formAssignments?.[canonicalFormCode]) {
                  store.state.formAssignments[canonicalFormCode].submissionId = upserted.id
                  localStorage.setItem('pti-inspect-storage', JSON.stringify(store))
                }
              }
            } catch (_) {}
          }
        }

        if (error) throw error;

        // remove from queue only if success
        const fresh = loadMap(PENDING_SYNC_KEY);
        delete fresh[code];
        saveMap(PENDING_SYNC_KEY, fresh);
      } catch (e) {
        console.warn('[Supabase] submission sync failed', code, e?.message || e);
      }
    }

    // 2) assets
    const assetsMap = loadMap(PENDING_ASSETS_KEY)
    const assetFormCodes = formCode ? [formCode] : Object.keys(assetsMap)

    for (const fc of assetFormCodes) {
      const pendingAssetsRaw = assetsMap[fc]
      const pendingAssets = Array.isArray(pendingAssetsRaw) ? pendingAssetsRaw : []
      if (!pendingAssets.length) continue

      let submissionId
      try {
        submissionId = await ensureSubmissionId(fc)
      } catch (e) {
        console.warn('[Supabase] ensureSubmissionId failed for assets', fc, e?.message || e)
        continue
      }

      // Process items one-by-one so we can persist progress and retry cleanly
      for (const asset of pendingAssets) {
        const action = asset?.action || 'upload'

        // DELETE: remove the DB record for this asset slot
        if (action === 'delete' || !asset?.dataUrl) {
          try {
            await supabase
              .from('submission_assets')
              .delete()
              .eq('submission_id', submissionId)
              .eq('asset_type', asset.assetType)
          } catch (_) {}

          // remove from queue
          assetsMap[fc] = (assetsMap[fc] || []).filter(a => a.assetType !== asset.assetType)
          saveMap(PENDING_ASSETS_KEY, assetsMap)
          continue
        }

        // UPLOAD
        try {
          emitPhotoStatus(fc, asset.assetType, PhotoUploadStatus.UPLOADING)
          const blob = await toBlobAny(asset.dataUrl)

          const mimeExt = (blob.type || '').split('/')[1] || 'jpg'
          const ext = String(mimeExt).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
          const safeType = String(asset.assetType).replace(/[^a-zA-Z0-9\-_.:]/g, '_')

          const objectPath = `${asset.payload?.org_code || ORG_CODE}/${getDeviceId()}/${fc}/${submissionId}/${safeType}.${ext}`

          // Upload to Storage (upsert: true replaces existing file)
          const { error: upErr } = await supabase.storage
            .from('pti-inspect')
            .upload(objectPath, blob, { upsert: true, contentType: blob.type || 'image/jpeg' })

          if (upErr) throw upErr

          const { data: pub } = supabase.storage.from('pti-inspect').getPublicUrl(objectPath)
          const publicUrl = pub?.publicUrl || null

          const row = {
            submission_id: submissionId,
            asset_key: objectPath,
            asset_type: asset.assetType,
            bucket: 'pti-inspect',
            path: objectPath,
            public_url: publicUrl,
            mime: blob.type || null,
            size_bytes: typeof blob.size === 'number' ? blob.size : null
          }

          // Use the safe upsert (DELETE + INSERT) to avoid 409 Conflict
          await upsertSubmissionAsset(row)

          // Save public URL for photo recovery (so preview works after reload)
          try {
            const urlsRaw = localStorage.getItem('pti_uploaded_urls_v1')
            const urlsMap = urlsRaw ? JSON.parse(urlsRaw) : {}
            urlsMap[`${fc}::${asset.assetType}`] = publicUrl
            localStorage.setItem('pti_uploaded_urls_v1', JSON.stringify(urlsMap))
          } catch (_) {}

          emitPhotoStatus(fc, asset.assetType, PhotoUploadStatus.DONE, publicUrl)

          // remove from queue on success
          assetsMap[fc] = (assetsMap[fc] || []).filter(a => a.assetType !== asset.assetType)
          saveMap(PENDING_ASSETS_KEY, assetsMap)
        } catch (e) {
          console.warn('[Supabase] asset upload failed', fc, asset?.assetType, e?.message || e)
          emitPhotoStatus(fc, asset.assetType, PhotoUploadStatus.ERROR)
          // Continue with next asset instead of breaking the whole loop
          continue
        }
      }
    }
  } finally {
    _flushing = false;
  }

  // Re-check: if new items were queued while we were flushing, flush again.
  // This handles the case where photo 2 is captured while photo 1 is still uploading.
  const remainingAssets = loadMap(PENDING_ASSETS_KEY);
  const remainingSync = loadMap(PENDING_SYNC_KEY);
  const hasRemaining = (formCode
    ? !!(remainingAssets[formCode]?.length || remainingSync[formCode])
    : (Object.values(remainingAssets).some(a => a?.length) || Object.keys(remainingSync).length > 0)
  );
  if (hasRemaining && _reflushCount < MAX_REFLUSH) {
    _reflushCount++;
    // Use setTimeout to avoid deep recursion and give the UI a chance to breathe
    setTimeout(() => flushSupabaseQueues({ formCode }), 500);
  } else {
    // Reset counter when queue is drained or we gave up
    _reflushCount = 0;
  }
}

/**
 * Count pending items in sync queues
 */
export function getPendingSyncCount() {
  let count = 0
  try {
    const syncMap = loadMap(PENDING_SYNC_KEY)
    count += Object.keys(syncMap).length

    const assetsMap = loadMap(PENDING_ASSETS_KEY)
    for (const fc of Object.keys(assetsMap)) {
      const list = Array.isArray(assetsMap[fc]) ? assetsMap[fc] : []
      count += list.length
    }
  } catch (_) {}
  return count
}

export function startSupabaseBackgroundSync() {
  // flush on load
  setTimeout(() => flushSupabaseQueues(), 1500);

  // flush on going online
  window.addEventListener('online', () => flushSupabaseQueues());

  // periodic flush
  setInterval(() => flushSupabaseQueues(), 15000);
}
