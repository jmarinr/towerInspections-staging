const KEY = 'pti_device_id';

export function getDeviceId() {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
