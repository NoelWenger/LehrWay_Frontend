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
          v-model="searchQuery"
          type="text"
          placeholder="Klassen suchen"
        >

        <ul>
          <li
            v-for="klasse in filteredClasses"
            :key="klasse.id"
          >
            <button
              type="button"
              @click="selectClass(klasse.id)"
            >
              {{ klasse.name }}
            </button>
          </li>
        </ul>
      </aside>

      <section>
        <h2>Wochenansicht</h2>
      </section>

      <aside>
        <h2>Klasse bearbeiten</h2>

        <div v-if="selectedClass">
          <h3>{{ selectedClass.name }}</h3>

          <p>
            Lehrgang: {{ selectedClass.course }}
          </p>
        </div>

        <p v-else>
          Keine Klasse ausgewählt.
        </p>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const classes = ref([
  {
    id: 1,
    name: 'KLA',
    course: 'IMS'
  },
  {
    id: 2,
    name: 'KLB',
    course: 'WayUp'
  },
  {
    id: 3,
    name: 'KLC',
    course: 'IMS'
  },
  {
    id: 4,
    name: 'KLD',
    course: 'WayUp'
  }
])

const searchQuery = ref('')

const selectedClassId = ref(null)

const filteredClasses = computed(() => {
  return classes.value.filter((klasse) => {
    return klasse.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  })
})

const selectedClass = computed(() => {
  return classes.value.find((klasse) => {
    return klasse.id === selectedClassId.value
  })
})

function selectClass(classId) {
  selectedClassId.value = classId
}
</script>
