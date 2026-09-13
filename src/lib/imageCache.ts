import { meta } from './program'

/**
 * Frames are vendored into public/exercises at build time so the app works at
 * the gym with no signal on the very first load. The upstream public-domain
 * dataset is kept as a fallback, and whatever resolves is cached as a blob in
 * IndexedDB so a reload never touches the network again.
 */
const DB_NAME = 'workout-block-1-images'
const STORE = 'frames'
const VERSION = 1

export function localUrl(dbId: string, frame: 0 | 1): string {
  return `${import.meta.env.BASE_URL}exercises/${dbId}/${frame}.jpg`
}

export function remoteUrl(dbId: string, frame: 0 | 1): string {
  return `${meta.imageSource.imageBaseUrl}${dbId}/${frame}.jpg`
}

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    // Blocked on file:// in Chrome and off entirely in some privacy modes.
    if (typeof indexedDB === 'undefined') return resolve(null)
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, VERSION)
    } catch {
      return resolve(null)
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return dbPromise
}

function idbGet(key: string): Promise<Blob | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null)
        try {
          const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
          req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null)
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      }),
  )
}

function idbPut(key: string, blob: Blob): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve()
        try {
          const tx = db.transaction(STORE, 'readwrite')
          tx.objectStore(STORE).put(blob, key)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch {
          resolve()
        }
      }),
  )
}

/** Object URLs are shared per frame and intentionally live for the session. */
const objectUrls = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

export function frameKey(dbId: string, frame: 0 | 1): string {
  return `${dbId}/${frame}`
}

export function cachedUrl(dbId: string, frame: 0 | 1): string | undefined {
  return objectUrls.get(frameKey(dbId, frame))
}

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return null
    const blob = await res.blob()
    return blob.size > 0 ? blob : null
  } catch {
    return null
  }
}

/** Resolve a frame to a usable URL, or null if every source failed. */
export function loadFrame(dbId: string, frame: 0 | 1): Promise<string | null> {
  const key = frameKey(dbId, frame)
  const ready = objectUrls.get(key)
  if (ready) return Promise.resolve(ready)
  const pending = inflight.get(key)
  if (pending) return pending

  const task = (async () => {
    const cached = await idbGet(key)
    if (cached) {
      const url = URL.createObjectURL(cached)
      objectUrls.set(key, url)
      return url
    }
    const blob = (await fetchBlob(localUrl(dbId, frame))) ?? (await fetchBlob(remoteUrl(dbId, frame)))
    if (!blob) {
      inflight.delete(key)
      return null
    }
    await idbPut(key, blob)
    const url = URL.createObjectURL(blob)
    objectUrls.set(key, url)
    return url
  })()

  inflight.set(key, task)
  return task
}
