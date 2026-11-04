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

  await router.replace('/login')
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

<style scoped>
.user-menu {
  position: relative;
  flex-shrink: 0;
  font-family: inherit;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #172033;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}

.user-button::-webkit-details-marker {
  display: none;
}

.user-button:hover {
  background: #eff6ff;
}

.user-button:focus-visible,
.logout-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 14px;
  flex-shrink: 0;
}

.user-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 100;
  min-width: 160px;
  padding: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.logout-button {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: white;
  color: #b91c1c;
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.logout-button:hover {
  background: #fef2f2;
}
</style>
