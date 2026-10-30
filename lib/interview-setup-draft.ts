const KEY = 'cveat_interview_setup_key'
const TTL = 30 * 60 * 1000
export type InterviewSetupDraft = { role: string; level: string; jd: string; file: File | null; importedName: string; owner: string | null; expires: number }
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cveat-interview-setup', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function transaction<T>(run: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
  const db = await database()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite'); let value: T
      tx.oncomplete = () => resolve(value)
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Interview setup could not be stored'))
      const store = tx.objectStore('drafts')
      // Remove expired files on the next draft-store access, including other tabs' expired drafts.
      const cursor = store.openCursor()
      cursor.onsuccess = () => { const c = cursor.result; if (!c) return; if (c.value.expires <= Date.now()) c.delete(); c.continue() }
      run(store, result => { value = result })
    })
  } finally { db.close() }
}
export function hasInterviewSetupDraft() { try { return !!sessionStorage.getItem(KEY) } catch { return false } }
export async function saveInterviewSetupDraft(draft: Omit<InterviewSetupDraft, 'expires'>) {
  const key = sessionStorage.getItem(KEY) || crypto.randomUUID()
  await transaction<void>((store, done) => { store.put({ ...draft, expires: Date.now() + TTL }, key); done() })
  sessionStorage.setItem(KEY, key)
}
export async function restoreInterviewSetupDraft(owner: string | null): Promise<InterviewSetupDraft | null> {
  const key = sessionStorage.getItem(KEY); if (!key) return null
  return transaction<InterviewSetupDraft | null>((store, done) => {
    const request = store.get(key)
    request.onsuccess = () => {
      const draft = request.result as InterviewSetupDraft | undefined
      if (!draft || draft.expires <= Date.now() || (draft.owner && draft.owner !== owner)) { store.delete(key); sessionStorage.removeItem(KEY); done(null); return }
      if (owner && !draft.owner) { draft.owner = owner; store.put(draft, key) }
      done(draft)
    }
  })
}
export async function clearInterviewSetupDraft() {
  const key = sessionStorage.getItem(KEY); if (!key) return
  await transaction<void>((store, done) => { store.delete(key); done() })
  sessionStorage.removeItem(KEY)
}
