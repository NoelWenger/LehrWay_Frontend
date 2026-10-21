<script setup lang="ts">
import {useRouter} from "vue-router";
import {ref} from "vue";

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
      router.push('/') // Leitet zur Login-Seite weiter
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
  <div>
    <h1>Registrierung</h1>

    <form @submit.prevent="handleRegister">
      <div>
        <label>E-Mail: </label>
        <input type="email" v-model="email" placeholder="x@x.ch" required />
      </div>

      <br />

      <div>
        <label>Passwort: </label>
        <input type="password" v-model="password" placeholder="x" required />
      </div>

      <br />

      <div>
        <label>Passwort wiederholen: </label>
        <input type="password" v-model="passwordConfirm" placeholder="x" required />
      </div>

      <button type="submit">Registrieren</button>
    </form>

    <br />

    <p>
      Du hast bereits ein Konto?
      <RouterLink to="/">Hier einloggen</RouterLink>
    </p>
  </div>
</template>

<style scoped>

</style>
