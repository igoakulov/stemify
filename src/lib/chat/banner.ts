import type { ReactNode } from "react"

export type BannerType = "error" | "warning" | "suggestion"

export type BannerAction = {
  label: string
  onClick: () => void
}

export type BannerState = {
  type: BannerType
  title?: string
  message: ReactNode
  actions?: BannerAction[]
  dismissable?: boolean
} | null

let current_banner: BannerState = null
const listeners: Set<() => void> = new Set()

export function get_banner(): BannerState {
  return current_banner
}

export function set_banner(banner: BannerState): void {
  current_banner = banner
  listeners.forEach((listener) => listener())
}

export function clear_banner(): void {
  current_banner = null
  listeners.forEach((listener) => listener())
}

export function subscribe_banner(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function show_error(message: ReactNode, options?: {
  title?: string
  actions?: BannerAction[]
  dismissable?: boolean
}): void {
  set_banner({
    type: "error",
    message,
    title: options?.title,
    actions: options?.actions,
    dismissable: options?.dismissable ?? true,
  })
}

export function show_warning(message: ReactNode, options?: {
  title?: string
  actions?: BannerAction[]
  dismissable?: boolean
}): void {
  set_banner({
    type: "warning",
    message,
    title: options?.title,
    actions: options?.actions,
    dismissable: options?.dismissable ?? true,
  })
}

export function show_suggestion(message: ReactNode, options?: {
  title?: string
  actions?: BannerAction[]
}): void {
  set_banner({
    type: "suggestion",
    message,
    title: options?.title,
    actions: options?.actions,
    dismissable: false,
  })
}
