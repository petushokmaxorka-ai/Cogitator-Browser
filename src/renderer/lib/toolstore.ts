// ═══════════════════════════════════════════════════════════
// Tool Store — file-backed persistence bridge for tool panels
// ═══════════════════════════════════════════════════════════
// userData/toolstore/<key>.json via IPC. Survives localStorage
// wipes and profile resets; null = no data yet.

export async function storeGet<T>(key: string): Promise<T | null> {
  try {
    const value = await window.electronAPI?.store?.get?.(key);
    return (value ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function storeSet(key: string, value: unknown): Promise<void> {
  try {
    await window.electronAPI?.store?.set?.(key, value ?? null);
  } catch {
    // store offline — panel keeps working from memory this session
  }
}
