<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import { confirmationState } from '@/composables/useConfirm'

const props = defineProps<{
  open: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const scrollArea = ref<HTMLDivElement | null>(null)

const closeBlocked = computed(() =>
  props.busy || confirmationState.open,
)

let previousFocus: HTMLElement | null = null
let backdropPressed = false

function restoreFocus() {
  if (previousFocus?.isConnected) {
    previousFocus.focus({
      preventScroll: true,
    })
  }

  previousFocus = null
}

async function syncDialog() {
  await nextTick()

  const element = dialog.value
  if (!element) return

  if (props.open) {
    if (element.open) return

    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    try {
      element.showModal()

      if (scrollArea.value) {
        scrollArea.value.scrollTop = 0
      }

      closeButton.value?.focus({
        preventScroll: true,
      })
    } catch (error) {
      console.error(
        'Klassen-Sidebar konnte nicht geöffnet werden:',
        error,
      )

      emit('close')
    }
  } else {
    if (element.open) {
      element.close()
    }

    restoreFocus()
  }
}

watch(
  () => props.open,
  syncDialog,
  { immediate: true },
)

function requestClose() {
  if (closeBlocked.value) return

  emit('close')
}

function handleNativeClose() {
  if (!props.open || dialog.value?.open) return

  if (closeBlocked.value) {
    void syncDialog()
  } else {
    emit('close')
  }
}

function isOutside(event: PointerEvent) {
  const element = dialog.value

  if (!element || event.target !== element) {
    return false
  }

  const rect = element.getBoundingClientRect()

  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
}

function handlePointerDown(event: PointerEvent) {
  backdropPressed = isOutside(event)
}

function handlePointerUp(event: PointerEvent) {
  const startedOutside = backdropPressed
  backdropPressed = false

  if (startedOutside && isOutside(event)) {
    requestClose()
  }
}

function resetBackdropPress() {
  backdropPressed = false
}

onBeforeUnmount(() => {
  if (dialog.value?.open) {
    dialog.value.close()
  }

  restoreFocus()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="class-drawer"
      aria-labelledby="class-drawer-title"
      @cancel.prevent="requestClose"
      @close="handleNativeClose"
      @pointerdown="handlePointerDown"
      @pointerup="handlePointerUp"
      @pointercancel="resetBackdropPress"
    >
      <!-- Verwendet die bestehenden gemeinsamen Formularstyles. -->
      <div class="page-shell class-drawer-layout">
        <header class="class-drawer-header">
          <div>
            <p class="class-drawer-eyebrow">
              Wochenplan
            </p>

            <h2 id="class-drawer-title">
              Klasse bearbeiten
            </h2>
          </div>

          <button
            ref="closeButton"
            type="button"
            class="class-drawer-close"
            :disabled="closeBlocked"
            aria-label="Klassenbearbeitung schließen"
            @click="requestClose"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div
          ref="scrollArea"
          class="class-drawer-body"
        >
          <slot />
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
