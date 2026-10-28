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
  <div class="page-shell">
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
            <input type="email" v-model="email" placeholder="x@x.ch" required />
          </div>

          <div class="form-group">
            <label>Passwort:</label>
            <input type="password" v-model="password" placeholder="x" required />
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

<style scoped>
.page-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f6f8fc;
  color: #172033;
  font-family: Inter, system-ui, Arial, sans-serif;
}

.site-header {
  background: white;
  border-bottom: 1px solid #e6eaf0;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.header-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 18px 32px;
}

.brand {
  margin: 0;
  color: #172033;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
}

.brand span {
  color: #2563eb;
}

.page-main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  box-sizing: border-box;
  padding: 36px;
  background: white;
  border: 1px solid #e6eaf0;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
}

.auth-card h2 {
  margin: 0 0 28px;
  font-size: 28px;
  font-weight: 800;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 22px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.form-group input {
  width: 100%;
  box-sizing: border-box;
  padding: 13px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: white;
  color: #172033;
  font-size: 15px;
  font-family: inherit;
  transition: 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.auth-card form button {
  width: 100%;
  padding: 14px;
  background: #2563eb;
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}

.auth-card form button:hover {
  background: #1d4ed8;
}

.auth-link {
  margin: 26px 0 0;
  padding-top: 20px;
  border-top: 1px solid #e6eaf0;
  text-align: center;
  font-size: 14px;
  color: #64748b;
}

.auth-link a {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
}

.auth-link a:hover {
  text-decoration: underline;
}

@media (max-width: 700px) {
  .header-inner {
    padding: 18px;
    text-align: center;
  }

  .page-main {
    padding: 30px 18px;
  }

  .auth-card {
    padding: 26px 20px;
  }
}
</style>
