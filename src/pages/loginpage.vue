<script setup lang="ts">
import {useRouter} from "vue-router";
import { ref } from 'vue'

const router = useRouter()
const email = ref('')
const password = ref('')

const handleLogin = () => {
  console.log('Eingegebene E-Mail:', email.value)
  console.log('Eingegebenes Passwort:', password.value)

  router.push('/home')
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
