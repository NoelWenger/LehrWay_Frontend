<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { confirmAction } from '@/composables/useConfirm'

const router = useRouter()
const username = ref('')
const menu = ref<HTMLDetailsElement | null>(null)

let closeTimer: ReturnType<typeof setTimeout> | null = null

function cancelClose() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function closeMenu() {
  cancelClose()

  if (menu.value) {
    menu.value.open = false
  }
}

function scheduleClose(event: PointerEvent) {
  // Auf Touchscreens bleibt das Menü per Antippen bedienbar.
  if (event.pointerType !== 'mouse') return

  cancelClose()

  closeTimer = setTimeout(() => {
    closeMenu()
  }, 200)
}

function handleOutsideClick(event: PointerEvent) {
  const target = event.target

  if (
    target instanceof Node &&
    menu.value &&
    !menu.value.contains(target)
  ) {
    closeMenu()
  }
}

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget

  if (
    !(nextTarget instanceof Node) ||
    !menu.value?.contains(nextTarget)
  ) {
    closeMenu()
  }
}

function handleEscape() {
  if (!menu.value?.open) return

  closeMenu()

  menu.value.querySelector('summary')?.focus({
    preventScroll: true,
  })
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)

  try {
    const storedUser = localStorage.getItem('user')

    if (!storedUser) return

    const user = JSON.parse(storedUser)

    if (typeof user?.username === 'string') {
      username.value = user.username.trim()
    }
  } catch {
    username.value = ''
  }
})

onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('pointerdown', handleOutsideClick)
})

async function logout() {
  closeMenu()

  menu.value?.querySelector('summary')?.focus({
    preventScroll: true,
  })

  const confirmed = await confirmAction({
    title: 'Abmelden?',
    message:
      'Möchtest du dich wirklich abmelden? ' +
      'Du wirst zur Loginseite zurückgeleitet.',
    confirmLabel: 'Abmelden',
    tone: 'neutral',
  })

  if (!confirmed) return

  localStorage.removeItem('user')
  username.value = ''

  await router.replace('/')
}
</script>

<template>
  <details
    v-if="username"
    ref="menu"
    class="user-menu"
    @pointerenter="cancelClose"
    @pointerleave="scheduleClose"
    @focusout="handleFocusOut"
    @keydown.esc="handleEscape"
  >
    <summary class="user-button">
      <span class="user-avatar" aria-hidden="true">
        {{ username.charAt(0).toUpperCase() }}
      </span>

      <span class="user-name">
        {{ username }}
      </span>

      <span aria-hidden="true">▾</span>
    </summary>

    <div class="user-dropdown">
      <button
        type="button"
        class="logout-button"
        @click="logout"
      >
        Abmelden
      </button>
    </div>
  </details>
</template>
