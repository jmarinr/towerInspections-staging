/**
 * Simple event bus for photo upload status notifications.
 * Allows supabaseSync to notify UI components about upload progress
 * without circular imports.
 */

const listeners = new Set()

export const PhotoUploadStatus = {
  UPLOADING: 'uploading',
  DONE: 'done',
  ERROR: 'error',
}

/**
 * Emit a photo upload status change.
 * @param {string} formCode - e.g. 'inspection-general'
 * @param {string} assetType - e.g. 'inspection:item1:before'
 * @param {string} status - 'uploading' | 'done' | 'error'
 * @param {string|null} publicUrl - Supabase public URL (only when status='done')
 */
export function emitPhotoStatus(formCode, assetType, status, publicUrl = null) {
  const event = { formCode, assetType, status, publicUrl, ts: Date.now() }
  for (const fn of listeners) {
    try { fn(event) } catch (_) {}
  }
}

/**
 * Subscribe to photo upload status changes.
 * @param {Function} fn - Callback receiving { formCode, assetType, status, publicUrl }
 * @returns {Function} Unsubscribe function
 */
export function onPhotoStatus(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
