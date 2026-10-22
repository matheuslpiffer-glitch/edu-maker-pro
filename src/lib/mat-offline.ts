/** Cópia local das conversas do Mat para abrir sem internet. */
export type CachedMsg = { role: 'user' | 'assistant'; content: string };
export type CachedSession = { id: string; title: string; created_at: string };

const SESSIONS_KEY = 'mat-offline-sessions';
const msgKey = (id: string) => `mat-offline-msgs-${id}`;

export function cacheSessions(list: CachedSession[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, 100))); } catch { /* cheio */ }
}
export function readCachedSessions(): CachedSession[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; }
}
export function cacheMessages(id: string, msgs: CachedMsg[]) {
  try { localStorage.setItem(msgKey(id), JSON.stringify(msgs)); } catch { /* cheio */ }
}
export function readCachedMessages(id: string): CachedMsg[] | null {
  try { const v = localStorage.getItem(msgKey(id)); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function removeCachedSession(id: string) {
  localStorage.removeItem(msgKey(id));
  cacheSessions(readCachedSessions().filter((s) => s.id !== id));
}
