<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import {
  confirmationState as state,
  resolveConfirmation,
} from '@/composables/useConfirm'

const dialog = ref<HTMLDialogElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)

let previousFocus: HTMLElement | null = null
let previousOverflow = ''
let scrollLocked = false

function restorePage() {
  if (scrollLocked) {
    document.body.style.overflow = previousOverflow
    scrollLocked = false
  }

  if (previousFocus?.isConnected) {
    previousFocus.focus({
      preventScroll: true,
    })
  }

  previousFocus = null
}

watch(
  () => state.open,
  async open => {
    if (!open) {
      if (dialog.value?.open) {
        dialog.value.close()
      }

      restorePage()
      return
    }

    await nextTick()

    if (
      !state.open ||
      !dialog.value ||
      dialog.value.open
    ) {
      return
    }

    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    scrollLocked = true

    try {
      dialog.value.showModal()

      // Zunächst die abbrechende Aktion fokussieren.
      cancelButton.value?.focus()
    } catch (error) {
      console.error(
        'Bestätigungsdialog konnte nicht geöffnet werden:',
        error,
      )

      resolveConfirmation(false)
      restorePage()
    }
  },
)

function handleNativeClose() {
  if (!dialog.value?.open && state.open) {
    resolveConfirmation(false)
  }
}

onBeforeUnmount(() => {
  if (dialog.value?.open) {
    dialog.value.close()
  }

  resolveConfirmation(false)
  restorePage()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="confirm-dialog"
      :class="{ 'is-danger': state.tone === 'danger' }"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      @cancel.prevent="resolveConfirmation(false)"
      @close="handleNativeClose"
    >
      <div class="confirm-content">
        <div class="confirm-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
          </svg>
        </div>

        <span class="confirm-eyebrow">
          Bestätigung
        </span>

        <h2 id="confirm-dialog-title">
          {{ state.title }}
        </h2>

        <p id="confirm-dialog-message">
          {{ state.message }}
        </p>
      </div>

      <div class="confirm-actions">
        <button
          ref="cancelButton"
          type="button"
          class="confirm-cancel"
          @click="resolveConfirmation(false)"
        >
          {{ state.cancelLabel }}
        </button>

        <button
          type="button"
          class="confirm-accept"
          @click="resolveConfirmation(true)"
        >
          {{ state.confirmLabel }}
        </button>
      </div>
    </dialog>
  </Teleport>
</template>
