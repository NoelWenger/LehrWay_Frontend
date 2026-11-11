import { reactive, readonly } from 'vue'

interface ConfirmationOptions {
  title: string
  message: string
  context?: string
  question?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'neutral' | 'danger'
}

interface ConfirmationState {
  open: boolean
  title: string
  message: string
  context: string
  question: string
  confirmLabel: string
  cancelLabel: string
  tone: 'neutral' | 'danger'
}

const state = reactive<ConfirmationState>({
  open: false,
  title: '',
  message: '',
  context: '',
  question: '',
  confirmLabel: 'Bestätigen',
  cancelLabel: 'Abbrechen',
  tone: 'neutral',
})

let pendingResolve: ((confirmed: boolean) => void) | null = null

export const confirmationState = readonly(state)

export function confirmAction(
  options: ConfirmationOptions,
): Promise<boolean> {
  // Keine zweite gleichzeitige Bestätigung öffnen.
  if (pendingResolve) {
    return Promise.resolve(false)
  }

  return new Promise(resolve => {
    pendingResolve = resolve

    Object.assign(state, {
      title: options.title,
      message: options.message,
      context: options.context ?? '',
      question: options.question ?? '',
      confirmLabel: options.confirmLabel ?? 'Bestätigen',
      cancelLabel: options.cancelLabel ?? 'Abbrechen',
      tone: options.tone ?? 'neutral',
      open: true,
    })
  })
}

export function resolveConfirmation(confirmed: boolean) {
  const resolve = pendingResolve

  pendingResolve = null
  state.open = false

  resolve?.(confirmed)
}
