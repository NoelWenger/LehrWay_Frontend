<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref } from "vue";
import Footer from '@/components/Footer.vue'

const router = useRouter()
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')

const handleRegister = async () => {
  if (password.value !== passwordConfirm.value)
  {
    alert("Passwort stimmt nicht überein")
    return
  }
  try {
    const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    })

    const data = await response.json()
    console.log('Antwort vom Backend:', data)

    if (response.ok && data.success) {
      alert("Registrierung erfolgreich! Bitte logge dich ein.")
      router.push('/')
    } else {
      alert(data.message || "Registrierung fehlgeschlagen!")
    }
  } catch (error) {
    console.error("Verbindungsfehler:", error)
    alert("Server ist nicht erreichbar! Läuft dein Backend?")
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

        <form @submit.prevent="handleRegister">
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

          <div class="form-group">
            <label>Passwort wiederholen:</label>
            <input
              type="password"
              v-model="passwordConfirm"
              placeholder="password wiederholen"
              required
            />
          </div>

          <button type="submit">
            Registrieren
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

