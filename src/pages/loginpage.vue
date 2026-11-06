<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import Footer from '@/components/Footer.vue'
import { currentUser } from '@/services/auth'

const router = useRouter()
const email = ref('')
const password = ref('')

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000/api'
).replace(/\/$/, '')

const handleLogin = async () => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Lehrway-Request': '1',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    })

    const data = await response.json()
    console.log('Antwort vom Backend:', data)

    if (response.ok && data.success) {
      console.log('Login erfolgreich! Weiterleitung...')

      currentUser.value = data.user
      localStorage.removeItem('user')

      await router.push('/home')
    } else {
      alert(data.message || 'Login fehlgeschlagen!')
    }
  } catch (error) {
    console.error('Fehler beim Anmelden:', error)
    alert('Anmeldung nicht möglich. Bitte prüfe die Verbindung zum Backend.')
  }
}
</script>

<template>
  <div class="page-shell page-auth">
    <header class="site-header">
      <div class="header-inner">
        <h1 class="brand">
          Lehr<span>way</span>
        </h1>
      </div>
    </header>

    <main class="page-main">
      <div class="auth-card">
        <h2>Login</h2>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>E-Mail:</label>

            <input
              type="email"
              v-model="email"
              placeholder="example@examplemail.ch"
              required
            />
          </div>

          <div class="form-group">
            <label>Passwort:</label>

            <input
              type="password"
              v-model="password"
              placeholder="password"
              required
            />
          </div>

          <button type="submit">
            Einloggen
          </button>
        </form>

        <p class="auth-link">
          Noch kein Konto?

          <RouterLink to="/register">
            Hier registrieren
          </RouterLink>
        </p>
      </div>
    </main>

    <Footer />
  </div>
</template>
