<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import { useRouter } from 'vue-router'
import { confirmAction } from '@/composables/useConfirm'

import {
  currentUser,
  logout as endLogin,
} from '@/services/auth'

const router = useRouter()

const username = computed(
  () => currentUser.value?.username ?? '',
)

const logoutError = ref('')

const menu =
  ref<HTMLDetailsElement | null>(null)

let closeTimer:
  ReturnType<typeof setTimeout> |
  null = null

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
  if (event.pointerType !== 'mouse') return

  cancelClose()

  closeTimer = setTimeout(() => {
    closeMenu()
  }, 200)
}

function handleOutsideClick(
  event: PointerEvent,
) {
  const target = event.target

  if (
    target instanceof Node &&
    menu.value &&
    !menu.value.contains(target)
  ) {
    closeMenu()
  }
}

function handleFocusOut(
  event: FocusEvent,
) {
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

  menu.value
    .querySelector('summary')
    ?.focus({
      preventScroll: true,
    })
}

onMounted(() => {
  document.addEventListener(
    'pointerdown',
    handleOutsideClick,
  )
})

onBeforeUnmount(() => {
  cancelClose()

  document.removeEventListener(
    'pointerdown',
    handleOutsideClick,
  )
})

async function logout() {
  closeMenu()

  menu.value
    ?.querySelector('summary')
    ?.focus({
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

  logoutError.value = ''

  try {
    await endLogin()
    await router.replace('/')
  } catch (cause) {
    logoutError.value =
      cause instanceof Error
        ? cause.message
        : 'Abmelden fehlgeschlagen.'

    if (menu.value) {
      menu.value.open = true
    }
  }
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
      <span
        class="user-avatar"
        aria-hidden="true"
      >
        {{ username.charAt(0).toUpperCase() }}
      </span>

      <span class="user-name">
        {{ username }}
      </span>

      <span aria-hidden="true">
        ▾
      </span>
    </summary>

    <div class="user-dropdown">
      <RouterLink
        to="/logs"
        class="logs-link"
        @click="closeMenu"
      >
        Logs
      </RouterLink>

      <p
        v-if="logoutError"
        class="error-message"
        role="alert"
      >
        {{ logoutError }}
      </p>

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

<style scoped>
.logs-link {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  color: #205447;
  text-decoration: none;
  font-weight: 600;
}

.logs-link:hover {
  background: #edf3ed;
}

.logs-link:focus-visible {
  outline: 2px solid #205447;
  outline-offset: 2px;
}
</style>
