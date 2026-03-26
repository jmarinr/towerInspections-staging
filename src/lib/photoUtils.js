/**
 * Photo Utilities
 * Compression, validation, and user-friendly error handling for photo uploads.
 */

const MAX_DIMENSION = 1920 // max width or height after resize
const JPEG_QUALITY = 0.75
const MAX_FILE_SIZE = 12 * 1024 * 1024 // 12MB raw input limit

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  NO_FILE: 'No se seleccionó ningún archivo.',
  NOT_IMAGE: 'El archivo seleccionado no es una imagen válida. Use JPG, PNG o HEIC.',
  TOO_LARGE: 'La imagen es muy grande (máximo 12MB). Intente tomar la foto en menor resolución.',
  READ_FAILED: 'No se pudo leer la imagen. Verifique los permisos e intente de nuevo.',
  COMPRESS_FAILED: 'No se pudo procesar la imagen. Intente tomar otra foto.',
  PERMISSION_DENIED: 'Acceso a la cámara/galería denegado. Verifique los permisos en la configuración del dispositivo.',
  UNKNOWN: 'Error inesperado al cargar la imagen. Intente de nuevo.',
}

/**
 * Validate a File object before processing
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: ERROR_MESSAGES.NO_FILE }
  }

  // Check MIME type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!validTypes.includes(file.type) && !file.name?.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    return { valid: false, error: ERROR_MESSAGES.NOT_IMAGE }
  }

  // Check size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: ERROR_MESSAGES.TOO_LARGE }
  }

  return { valid: true, error: null }
}

/**
 * Read a File as data URL with proper error handling
 * @returns {Promise<string>} data URL string
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (ev) => {
      const result = ev?.target?.result
      if (typeof result === 'string' && result.startsWith('data:')) {
        resolve(result)
      } else {
        reject(new Error(ERROR_MESSAGES.READ_FAILED))
      }
    }

    reader.onerror = () => {
      reject(new Error(ERROR_MESSAGES.READ_FAILED))
    }

    reader.onabort = () => {
      reject(new Error(ERROR_MESSAGES.READ_FAILED))
    }

    try {
      reader.readAsDataURL(file)
    } catch (e) {
      reject(new Error(ERROR_MESSAGES.READ_FAILED))
    }
  })
}

/**
 * Compress and resize an image data URL.
 * Returns a smaller JPEG data URL.
 * @param {string} dataUrl - original data URL
 * @param {object} opts - { maxDimension, quality }
 * @returns {Promise<string>} compressed data URL
 */
export function compressImage(dataUrl, opts = {}) {
  const maxDim = opts.maxDimension || MAX_DIMENSION
  const quality = opts.quality || JPEG_QUALITY

  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      try {
        let { width, height } = img

        // Only resize if larger than max dimension
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error(ERROR_MESSAGES.COMPRESS_FAILED))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', quality)

        if (!compressed || compressed === 'data:,') {
          reject(new Error(ERROR_MESSAGES.COMPRESS_FAILED))
          return
        }

        resolve(compressed)
      } catch (e) {
        reject(new Error(ERROR_MESSAGES.COMPRESS_FAILED))
      }
    }

    img.onerror = () => {
      reject(new Error(ERROR_MESSAGES.COMPRESS_FAILED))
    }

    img.src = dataUrl
  })
}

/**
 * Full pipeline: validate → read → compress → return data URL
 * Returns { dataUrl, error } — if error is set, dataUrl is null.
 */
export async function processImageFile(file) {
  // 1. Validate
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { dataUrl: null, error: validation.error }
  }

  try {
    // 2. Read as data URL
    const rawDataUrl = await readFileAsDataUrl(file)

    // 3. Compress
    const compressed = await compressImage(rawDataUrl)

    return { dataUrl: compressed, error: null }
  } catch (e) {
    return { dataUrl: null, error: e?.message || ERROR_MESSAGES.UNKNOWN }
  }
}

/**
 * Get user-friendly error for common photo upload/sync failures
 */
export function getPhotoSyncErrorMessage(error) {
  const msg = error?.message || String(error || '')

  if (msg.includes('exceeded') || msg.includes('quota') || msg.includes('QuotaExceeded')) {
    return 'Memoria del dispositivo llena. Borre algunas fotos del formulario o cierre otras apps.'
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
    return 'Sin conexión a internet. La foto se guardó localmente y se subirá cuando haya señal.'
  }
  if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('policy')) {
    return 'Permiso denegado por el servidor. Contacte al administrador.'
  }
  if (msg.includes('413') || msg.includes('too large') || msg.includes('payload')) {
    return 'La foto es demasiado grande para el servidor. Intente con menor resolución.'
  }
  if (msg.includes('timeout') || msg.includes('Timeout')) {
    return 'Tiempo de espera agotado. Verifique su conexión e intente de nuevo.'
  }

  return 'Error al subir la foto. Se reintentará automáticamente.'
}
