<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <span>Klasse: D24a</span>
      <strong>Lehrway</strong>
      <span>Khalil, Luka, Noël und Kenan</span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: #101114;
  color: white;
  padding: 24px 32px;
}

.footer-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  gap: 18px;
  font-size: 14px;
}

.footer-inner strong {
  text-align: center;
  font-size: 20px;
}

.footer-inner span:last-child {
  text-align: right;
}

@media (max-width: 700px) {
  .footer-inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .footer-inner span:last-child {
    text-align: center;
  }
}
</style>
