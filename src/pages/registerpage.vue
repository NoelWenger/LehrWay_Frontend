<script setup lang="ts">

</script>

<template>
  <div>
    <h1>Registrierung</h1>

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

      <div>
        <label>Passwort wiederholen: </label>
        <input type="password" placeholder="x" />
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
