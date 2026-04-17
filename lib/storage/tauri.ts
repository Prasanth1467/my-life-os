import type { LifeStateAny } from "@/lib/life/types"

declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

function hasTauri(): boolean {
  return typeof window !== "undefined" && typeof window.__TAURI__ !== "undefined"
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const mod = await import("@tauri-apps/api/core")
  return mod.invoke<T>(cmd, args)
}

export async function tauriLoadState(): Promise<LifeStateAny | null> {
  if (!hasTauri()) return null
  return await invoke<LifeStateAny | null>("load_state")
}

export async function tauriSaveState(state: LifeStateAny): Promise<void> {
  if (!hasTauri()) return
  await invoke<void>("save_state", { state })
}

export async function tauriCreateBackup(): Promise<string | null> {
  if (!hasTauri()) return null
  return await invoke<string>("create_backup")
}

export async function tauriExportToFile(): Promise<string | null> {
  if (!hasTauri()) return null
  return await invoke<string>("export_to_file")
}

export async function tauriImportFromFile(): Promise<LifeStateAny | null> {
  if (!hasTauri()) return null
  return await invoke<LifeStateAny | null>("import_from_file")
}

