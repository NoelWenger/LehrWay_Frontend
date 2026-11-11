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

        <h2 id="confirm-dialog-title">
          {{ state.title }}
        </h2>

        <div id="confirm-dialog-message">
          <p v-if="state.context" class="confirm-dialog-context">
            {{ state.context }}
          </p>

          <p class="confirm-dialog-message-text">
            {{ state.message }}
          </p>

          <p v-if="state.question" class="confirm-dialog-question">
            {{ state.question }}
          </p>
        </div>
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

<style scoped>
.confirm-dialog {
  box-sizing: border-box;
  width: max-content;
  min-width: min(320px, calc(100% - 32px));
  max-width: calc(100% - 32px);
}

.confirm-actions {
  flex-wrap: wrap;
}
</style>
