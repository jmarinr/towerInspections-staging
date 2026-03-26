export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Invalid dataUrl (expected a Data URL string)');
  }
  const [meta, data] = dataUrl.split(',');
  const isBase64 = /base64/i.test(meta);
  const mime = (meta.match(/data:([^;]+)/i) || [])[1] || 'application/octet-stream';

  let bytes;
  if (isBase64) {
    const binStr = atob(data);
    bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  } else {
    // URL-encoded
    const decoded = decodeURIComponent(data);
    bytes = new TextEncoder().encode(decoded);
  }
  return new Blob([bytes], { type: mime });
}
