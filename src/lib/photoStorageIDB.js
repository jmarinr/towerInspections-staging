/**
 * photoStorageIDB.js
 * Capa de almacenamiento IndexedDB para la cola de fotos de Additional Photo Report.
 *
 * SCOPE: Solo para form_code = 'additional-photo-report'.
 * Todos los demás formularios siguen usando localStorage sin cambios.
 *
 * Por qué IndexedDB:
 *   localStorage: ~5MB total → se llena con ~17 fotos en base64
 *   IndexedDB: cientos de MB → sin límite práctico para inspecciones
 *
 * La API es intencionalmente similar a la de localStorage para facilitar
 * la migración y el entendimiento del código.
 */

const DB_NAME    = 'pti_inspect_idb'
const DB_VERSION = 1
const STORE_NAME = 'pending_assets'  // object store: { id, formCode, assetType, dataUrl, action, ts }

// ── Singleton de la conexión ────────────────────────────────────────────────

let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        // Índice por formCode para consultas filtradas por formulario
        store.createIndex('by_formCode', 'formCode', { unique: false })
      }
    }

    req.onsuccess = (e) => {
      _db = e.target.result
      // Si la conexión se cierra (poco frecuente), resetear para reconectar
      _db.onclose = () => { _db = null }
      resolve(_db)
    }

    req.onerror = (e) => {
      console.error('[IDB] Error opening database:', e.target.error)
      reject(e.target.error)
    }
  })
}

// ── Helpers internos ────────────────────────────────────────────────────────

function makeId(formCode, assetType) {
  return `${formCode}::${assetType}`
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Añadir o reemplazar una foto en la cola de IndexedDB.
 * Equivalente a queueAssetUpload() pero para IDB.
 */
export async function idbQueueAsset(formCode, assetType, dataUrl, action = 'upload') {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({
        id:        makeId(formCode, assetType),
        formCode,
        assetType,
        dataUrl,
        action,
        ts: Date.now(),
      })
      tx.oncomplete = () => resolve(true)
      tx.onerror    = (e) => { console.error('[IDB] put error:', e.target.error); reject(e.target.error) }
    })
  } catch (e) {
    console.error('[IDB] idbQueueAsset failed:', e)
    throw e
  }
}

/**
 * Encolar una acción de DELETE (borrar foto del servidor) en IndexedDB.
 */
export async function idbQueueDelete(formCode, assetType) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({
        id:        makeId(formCode, assetType),
        formCode,
        assetType,
        dataUrl:   null,
        action:    'delete',
        ts:        Date.now(),
      })
      tx.oncomplete = () => resolve(true)
      tx.onerror    = (e) => reject(e.target.error)
    })
  } catch (e) {
    console.error('[IDB] idbQueueDelete failed:', e)
    throw e
  }
}

/**
 * Obtener todos los assets pendientes de un formCode.
 * Retorna [] si no hay nada o si falla.
 */
export async function idbGetPending(formCode) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('by_formCode')
      const req   = index.getAll(formCode)
      req.onsuccess = () => resolve(req.result || [])
      req.onerror   = () => resolve([])
    })
  } catch {
    return []
  }
}

/**
 * Obtener un asset específico por formCode + assetType.
 * Retorna null si no existe.
 */
export async function idbGetAsset(formCode, assetType) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req   = store.get(makeId(formCode, assetType))
      req.onsuccess = () => resolve(req.result || null)
      req.onerror   = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Eliminar un asset de la cola (después de subirlo o al resetear).
 */
export async function idbRemoveAsset(formCode, assetType) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(makeId(formCode, assetType))
      tx.oncomplete = () => resolve(true)
      tx.onerror    = () => resolve(false)
    })
  } catch {
    return false
  }
}

/**
 * Eliminar TODOS los assets de un formCode (equivalente a clearSupabaseLocalForForm).
 */
export async function idbClearForm(formCode) {
  try {
    const pending = await idbGetPending(formCode)
    if (!pending.length) return true
    const db = await openDB()
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      pending.forEach(a => store.delete(makeId(formCode, a.assetType)))
      tx.oncomplete = () => resolve(true)
      tx.onerror    = () => resolve(false)
    })
  } catch {
    return false
  }
}

/**
 * Contar assets pendientes de un formCode (para el banner de sync).
 */
export async function idbCountPending(formCode) {
  try {
    const items = await idbGetPending(formCode)
    return items.filter(a => a.action === 'upload' && a.dataUrl).length
  } catch {
    return 0
  }
}
