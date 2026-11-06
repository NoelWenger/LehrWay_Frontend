<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import Footer from '@/components/Footer.vue'

const router = useRouter()
const email = ref('')
const password = ref('')

const handleLogin = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
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
      console.log('Login erfolgreich! Weiterleitung...')
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/home')
    } else {
      alert(data.message || 'Login fehlgeschlagen!')
    }
  } catch (error) {
    console.error('Verbindungsfehler zum Backend:', error)
    alert('Server ist nicht erreichbar!')
  }
}
</script>

<template>
  <div class="page-shell page-auth">
    <header class="site-header">
      <div class="header-inner">
        <h1 class="brand">Lehr<span>way</span></h1>
      </div>
    </header>

    <main class="page-main">
      <div class="auth-card">
        <h2>Login</h2>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>E-Mail:</label>
            <input type="email" v-model="email" placeholder="example@examplemail.ch" required />
          </div>

          <div class="form-group">
            <label>Passwort:</label>
            <input type="password" v-model="password" placeholder="password" required />
          </div>

          <button type="submit">Einloggen</button>
        </form>

        <p class="auth-link">
          Noch kein Konto?
          <RouterLink to="/register"> Hier registrieren </RouterLink>
        </p>
      </div>
    </main>

    <Footer />
  </div>
</template>

