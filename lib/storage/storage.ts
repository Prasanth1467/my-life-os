import type { LifeStateAny } from "@/lib/life/types"
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env"
import { idbExport, idbImport, idbLoadState, idbSaveState } from "@/lib/storage/idb"
import {
  tauriCreateBackup,
  tauriExportToFile,
  tauriImportFromFile,
  tauriLoadState,
  tauriSaveState,
} from "@/lib/storage/tauri"

export type PersistDriver = "tauri" | "idb" | "supabase"

function downloadJson(filenamePrefix: string, state: LifeStateAny): void {
  const json = JSON.stringify(state, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function detectDriver(): Promise<PersistDriver> {
  if (typeof window !== "undefined" && "__TAURI__" in window) return "tauri"
  if (isSupabaseBrowserConfigured()) return "supabase"
  return "idb"
}

export async function loadState(): Promise<{ driver: PersistDriver; state: LifeStateAny | null }> {
  const driver = await detectDriver()
  if (driver === "supabase") return { driver, state: null }
  const state = driver === "tauri" ? await tauriLoadState() : await idbLoadState()
  return { driver, state }
}

export async function saveState(driver: PersistDriver, state: LifeStateAny): Promise<void> {
  if (driver === "supabase") return
  if (driver === "tauri") return await tauriSaveState(state)
  return await idbSaveState(state)
}

export async function createBackup(driver: PersistDriver, snapshot?: LifeStateAny): Promise<string | null> {
  if (driver === "supabase") {
    if (!snapshot) return null
    downloadJson("lifeos-backup", snapshot)
    return null
  }
  if (driver === "tauri") return await tauriCreateBackup()
  const json = await idbExport()
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  return null
}

export async function exportData(driver: PersistDriver, snapshot?: LifeStateAny): Promise<string | null> {
  if (driver === "supabase") {
    if (!snapshot) return null
    downloadJson("lifeos-export", snapshot)
    return null
  }
  if (driver === "tauri") return await tauriExportToFile()
  const json = await idbExport()
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  return null
}

export async function importData(driver: PersistDriver): Promise<LifeStateAny | null> {
  if (driver === "tauri") return await tauriImportFromFile()
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "application/json"
  const file = await new Promise<File | null>((resolve) => {
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
  if (!file) return null
  const text = await file.text()
  if (driver === "idb") await idbImport(text)
  return JSON.parse(text) as LifeStateAny
}
