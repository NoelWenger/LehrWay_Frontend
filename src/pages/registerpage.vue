<script setup lang="ts">
import {useRouter} from "vue-router";
import {ref} from "vue";

const router = useRouter()
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')

const handleRegister = () => {
  if (password.value !== passwordConfirm.value)
  {
    alert("Passwort stimmt nicht überein")
    return
  }

  console.log('Eingegebene E-Mail:', email.value)
  console.log('Eingegebenes Passwort:', password.value)
  console.log('Eingegebene Passwort Bestätigung:', passwordConfirm.value)

  router.push('/home')
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
