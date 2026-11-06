<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')

onMounted(() => {
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

async function logout() {
  if (!window.confirm('Möchtest du dich wirklich abmelden?')) {
    return
  }

  localStorage.removeItem('user')
  username.value = ''

  await router.replace('/')
}
</script>

<template>
  <details v-if="username" class="user-menu">
    <summary class="user-button">
      <span class="user-avatar" aria-hidden="true">
        {{ username.charAt(0).toUpperCase() }}
      </span>

      <span class="user-name">{{ username }}</span>
      <span aria-hidden="true">▾</span>
    </summary>

    <div class="user-dropdown">
      <button type="button" class="logout-button" @click="logout">
        Abmelden
      </button>
    </div>
  </details>
</template>

