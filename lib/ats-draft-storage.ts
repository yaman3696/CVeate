
const DB_NAME = 'cveate-ats-drafts'
const STORE_NAME = 'drafts'
const DRAFT_KEY = 'current'
const JD_KEY = 'cveate_ats_draft_jd'
const SAVED_AT_KEY = 'cveate_ats_draft_saved_at'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function writeFile(file: File | null): Promise<void> {
  const db = await openDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)

      if (file) {
        store.put(file, DRAFT_KEY)
      } else {
        store.delete(DRAFT_KEY)
      }

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function readFile(): Promise<File | null> {
  const db = await openDatabase()

  try {
    return await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(DRAFT_KEY)

      request.onsuccess = () => {
        const value = request.result
        resolve(value instanceof File ? value : null)
      }

      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function saveAtsDraft(
  jobDescription: string,
  file: File | null
): Promise<void> {
  // Complete the file transaction before marking the draft as saved.
  await writeFile(file)

  sessionStorage.setItem(JD_KEY, jobDescription)
  sessionStorage.setItem(SAVED_AT_KEY, String(Date.now()))
}

export async function restoreAtsDraft(): Promise<{
  jobDescription: string
  file: File | null
} | null> {
  const savedAt = Number(sessionStorage.getItem(SAVED_AT_KEY))

  if (!savedAt) return null

  if (
    !Number.isFinite(savedAt) ||
    savedAt > Date.now() ||
    Date.now() - savedAt > MAX_AGE_MS
  ) {
    await clearAtsDraft()
    return null
  }

  return {
    jobDescription: sessionStorage.getItem(JD_KEY) ?? '',
    file: await readFile()
  }
}

export async function clearAtsDraft(): Promise<void> {
  // Remove the marker first to prevent restoration during cleanup.
  sessionStorage.removeItem(SAVED_AT_KEY)
  sessionStorage.removeItem(JD_KEY)
  await writeFile(null)
}
