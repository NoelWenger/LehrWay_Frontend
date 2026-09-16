<script setup lang="ts">
import {useRouter} from "vue-router";
import { ref } from 'vue'

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
        password: password.value
      }),
    });

    const data = await response.json();
    console.log("Antwort vom Backend:", data);

    if (response.ok && data.success) {
      console.log("Login erfolgreich! Weiterleitung...");
      router.push('/home');
    } else {
      alert(data.message || "Login fehlgeschlagen!");
    }

  } catch (error) {
    console.error("Verbindungsfehler zum Backend:", error);
    alert("Server ist nicht erreichbar!");
  }
}

</script>

<template>
  <div>
    <h1>Login</h1>

    <form @submit.prevent="handleLogin">
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

      <button type="submit">Einloggen</button>
    </form>

    <br />

    <p>
      Noch kein Konto?
      <RouterLink to="/register">Hier registrieren</RouterLink>
    </p>
  </div>
</template>

<style scoped>

</style>
