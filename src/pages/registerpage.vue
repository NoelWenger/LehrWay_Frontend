<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import Footer from '@/components/Footer.vue'

const router = useRouter()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')

const submitting = ref(false)
const errorMessage = ref('')
const passwordConfirmError = ref('')

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000/api'
).replace(/\/$/, '')

const handleRegister = async () => {
  if (submitting.value) return

  errorMessage.value = ''
  passwordConfirmError.value = ''

  if (password.value !== passwordConfirm.value) {
    passwordConfirmError.value =
      'Die Passwörter stimmen nicht überein.'
    return
  }

  submitting.value = true

  try {
    const response = await fetch(`${API_URL}/register`, {
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
      await router.push({
        path: '/',
        query: {
          registered: '1',
        },
      })
    } else {
      errorMessage.value =
        data.message ||
        'Registrierung fehlgeschlagen. Bitte versuche es erneut.'
    }
  } catch (error) {
    console.error(
      'Fehler bei der Registrierung:',
      error,
    )

    errorMessage.value =
      'Registrierung nicht möglich. Bitte prüfe deine Verbindung und versuche es erneut.'
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
        <h2>Registrierung</h2>

        <form
          @submit.prevent="handleRegister"
          :aria-busy="submitting"
          @input="errorMessage = ''"
        >
          <div class="form-group">
            <label for="register-email">
              E-Mail:
            </label>

            <input
              id="register-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="example@examplemail.ch"
              :disabled="submitting"
              required
            />
          </div>

          <div class="form-group">
            <label for="register-password">
              Passwort:
            </label>

            <input
              id="register-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              placeholder="passwort"
              :disabled="submitting"
              @input="passwordConfirmError = ''"
              required
            />
          </div>

          <div class="form-group">
            <label for="register-password-confirm">
              Passwort wiederholen:
            </label>

            <input
              id="register-password-confirm"
              v-model="passwordConfirm"
              type="password"
              autocomplete="new-password"
              placeholder="passwort wiederholen"
              :disabled="submitting"
              :aria-invalid="
                passwordConfirmError
                  ? true
                  : undefined
              "
              :aria-describedby="
                passwordConfirmError
                  ? 'password-confirm-error'
                  : undefined
              "
              @input="passwordConfirmError = ''"
              required
            />

            <p
              v-if="passwordConfirmError"
              id="password-confirm-error"
              class="auth-field-error"
              role="alert"
            >
              {{ passwordConfirmError }}
            </p>
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
                ? 'Wird registriert …'
                : 'Registrieren'
            }}
          </button>
        </form>

        <p class="auth-link">
          Du hast bereits ein Konto?

          <RouterLink to="/">
            Hier einloggen
          </RouterLink>
        </p>
      </div>
    </main>

    <Footer />
  </div>
</template>
