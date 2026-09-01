const DATABASE = 'xr1-media-v1'
const STORE = 'media'

export type StoredMedia = {
  id: string
  blob: Blob
  name: string
  mime: string
  projectId: string
  createdAt: string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB is unavailable in this browser.'))
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath:'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open browser media storage.'))
  })
}

export async function persistMedia(media: StoredMedia): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(media)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save media.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Media save was interrupted.'))
  }).finally(() => database.close())
}

export async function loadMedia(id: string): Promise<StoredMedia | undefined> {
  const database = await openDatabase()
  return new Promise<StoredMedia | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly')
    const request = transaction.objectStore(STORE).get(id)
    request.onsuccess = () => resolve(request.result as StoredMedia | undefined)
    request.onerror = () => reject(request.error ?? new Error('Could not restore media.'))
    transaction.oncomplete = () => database.close()
  })
}

export async function deleteMedia(id: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete media.'))
  }).finally(() => database.close())
}

export async function storageEstimate() {
  if (!navigator.storage?.estimate) return undefined
  return navigator.storage.estimate()
}

