<template>
  <div>
    <header>
      <h1>Lehrway</h1>

      <nav>
        <router-link to="/">
          Wochenplan
        </router-link>

        <router-link to="/lehrgang">
          Lehrgänge
        </router-link>
      </nav>
    </header>

    <main>
      <aside>
        <h2>Klassen</h2>

        <button type="button">
          Klasse erstellen
        </button>

        <input
          type="text"
          placeholder="Klassen suchen"
        >

        <ul>
          <li>
            <button type="button">
              KLA
            </button>
          </li>

          <li>
            <button type="button">
              KLB
            </button>
          </li>

          <li>
            <button type="button">
              KLC
            </button>
          </li>

          <li>
            <button type="button">
              KLD
            </button>
          </li>
        </ul>
      </aside>

      <section>
        <h2>Wochenansicht</h2>
      </section>

      <aside>
        <h2>Klasse bearbeiten</h2>
      </aside>
    </main>
  </div>
</template>
