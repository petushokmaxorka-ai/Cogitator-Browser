/** Stream a one-shot prompt through Anathemetron (llama-server via main bridge). */
export async function askAnathemetron(prompt: string, model = ''): Promise<string> {
  const api = window.electronAPI?.ollama;
  if (!api?.chat) return '';
  const chunks: string[] = [];
  const unsub = api.onStreamChunk?.((data: { chunk: string; done: boolean }) => {
    if (data.chunk) chunks.push(data.chunk);
  });
  try {
    await api.chat([{ role: 'user', content: prompt }], model);
  } finally {
    unsub?.();
  }
  return chunks.join('').trim();
}
