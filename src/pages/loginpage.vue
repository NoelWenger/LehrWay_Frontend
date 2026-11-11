<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ref } from 'vue'
import Footer from '@/components/Footer.vue'
import { currentUser } from '@/services/auth'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const showRegistrationSuccess = ref(
  route.query.registered === '1',
)

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000/api'
).replace(/\/$/, '')

const handleLogin = async () => {
  if (submitting.value) return

  errorMessage.value = ''
  showRegistrationSuccess.value = false
  submitting.value = true

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

    if (response.ok && data.success) {
      currentUser.value = data.user
      localStorage.removeItem('user')

      await router.push('/home')
    } else {
      errorMessage.value =
        data.message ||
        'Login fehlgeschlagen. Bitte versuche es erneut.'
    }
  } catch (error) {
    console.error('Fehler beim Anmelden:', error)

    errorMessage.value =
      'Anmeldung nicht möglich. Bitte prüfe deine Verbindung und versuche es erneut.'
  } finally {
    submitting.value = false
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

        <p
          v-if="showRegistrationSuccess"
          class="auth-feedback auth-feedback-success"
          role="status"
        >
          Registrierung erfolgreich!
          Du kannst dich jetzt anmelden.
        </p>

        <form
          @submit.prevent="handleLogin"
          :aria-busy="submitting"
          @input="errorMessage = ''"
        >
          <div class="form-group">
            <label for="login-email">
              E-Mail:
            </label>

            <input
              id="login-email"
              v-model="email"
              type="email"
              autocomplete="username"
              placeholder="example@examplemail.ch"
              :disabled="submitting"
              required
            />
          </div>

          <div class="form-group">
            <label for="login-password">
              Passwort:
            </label>

            <input
              id="login-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="passwort"
              :disabled="submitting"
              required
            />
          </div>

          <p
            v-if="errorMessage"
            class="auth-feedback auth-feedback-error"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="submitting"
          >
            {{
              submitting
                ? 'Wird angemeldet …'
                : 'Einloggen'
            }}
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
