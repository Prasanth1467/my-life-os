"use client"

/* eslint-disable react-hooks/refs */

import * as React from "react"

export type Selector<TState, TSel> = (s: TState) => TSel

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) return false
  const aa = a as Record<string, unknown>
  const bb = b as Record<string, unknown>
  const ak = Object.keys(aa)
  const bk = Object.keys(bb)
  if (ak.length !== bk.length) return false
  for (const k of ak) if (!Object.is(aa[k], bb[k])) return false
  return true
}

export type Store<T> = {
  get(): T
  set(next: T | ((prev: T) => T)): void
  subscribe(fn: () => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get() {
      return state
    },
    set(next) {
      state = typeof next === "function" ? (next as (p: T) => T)(state) : next
      for (const l of listeners) l()
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export function useStore<TState, TSel>(
  store: Store<TState>,
  selector: Selector<TState, TSel>,
  isEqual: (a: TSel, b: TSel) => boolean = Object.is
): TSel {
  // IMPORTANT:
  // `getSnapshot` must be referentially stable when the store hasn't changed.
  // If we return a freshly-created selected object here, React will think the snapshot
  // changed and can enter an infinite re-render loop.
  const getSnapshot = React.useCallback(() => store.get(), [store])
  const subscribe = React.useCallback((onChange: () => void) => store.subscribe(onChange), [store])
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const selected = selector(snapshot)
  const ref = React.useRef(selected)
  if (!isEqual(ref.current, selected)) ref.current = selected
  return ref.current
}

