<script setup lang="ts">

import { ref } from 'vue'

const password = ref('')
const email = ref ('')

</script>

<template>
  <div>
    <h1>Login</h1>

    <form>
      <div>
        <label>E-Mail: </label>
        <input type="email" placeholder="x@x.ch" />
      </div>

      <br />

      <div>
        <label>Passwort: </label>
        <input type="password" placeholder="x" />
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
