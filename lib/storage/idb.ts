import type { LifeStateAny } from "@/lib/life/types"

const DB_NAME = "life-os"
const STORE = "kv"
const KEY = "state.json"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    const req = fn(store)
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"))
    req.onsuccess = () => resolve(req.result as T)
    tx.oncomplete = () => db.close()
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx failed"))
  })
}

export async function idbLoadState(): Promise<LifeStateAny | null> {
  const raw = await withStore<unknown>("readonly", (s) => s.get(KEY))
  if (!raw) return null
  return raw as LifeStateAny
}

export async function idbSaveState(state: LifeStateAny): Promise<void> {
  await withStore("readwrite", (s) => s.put(state, KEY))
}

export async function idbExport(): Promise<string> {
  const raw = await withStore<unknown>("readonly", (s) => s.get(KEY))
  return JSON.stringify(raw ?? null, null, 2)
}

export async function idbImport(jsonText: string): Promise<void> {
  const value = JSON.parse(jsonText) as LifeStateAny
  await idbSaveState(value)
}

