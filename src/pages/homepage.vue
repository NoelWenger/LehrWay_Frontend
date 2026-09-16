<template>
  <div>
    <header>
      <h1>Lehrway</h1>

      <nav>
        <router-link to="/">Wochenplan</router-link>
        <router-link to="/lehrgang">Lehrgänge</router-link>
      </nav>
    </header>

    <main>
      <aside>
        <h2>Klassen</h2>

        <button type="button">Klasse erstellen</button>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Klassen suchen"
        >

        <ul>
          <li v-for="klasse in filteredClasses" :key="klasse.id">
            <button type="button" @click="selectClass(klasse.id)">
              {{ klasse.name }}
            </button>
          </li>
        </ul>
      </aside>

      <section>
        <h2>Wochenansicht</h2>

        <table>
          <thead>
          <tr>
            <th>Klasse</th>
            <th v-for="day in weekdays" :key="day">
              {{ day }}
            </th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="klasse in classes" :key="klasse.id">
            <th>{{ klasse.name }}</th>

            <td v-for="day in weekdays" :key="day">
              <button type="button">
                {{ hasSchool(klasse, day) ? 'Schule' : '-' }}
              </button>
            </td>
          </tr>
          </tbody>

          <tfoot>
          <tr>
            <th>Räume</th>
            <td v-for="day in weekdays" :key="day">
              {{ getUsedRooms(day) }} / {{ roomCapacity }}
            </td>
          </tr>
          </tfoot>
        </table>
      </section>

      <aside>
        <h2>Klasse bearbeiten</h2>

        <div v-if="selectedClass">
          <h3>{{ selectedClass.name }}</h3>
        </div>

        <p v-else>Keine Klasse ausgewählt.</p>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
const roomCapacity = 5

const classes = ref([
  { id: 1, name: 'KLA', schoolDays: ['Montag', 'Dienstag', 'Donnerstag'] },
  { id: 2, name: 'KLB', schoolDays: ['Dienstag', 'Mittwoch', 'Freitag'] },
  { id: 3, name: 'KLC', schoolDays: ['Montag', 'Mittwoch', 'Donnerstag'] },
  { id: 4, name: 'KLD', schoolDays: ['Dienstag', 'Donnerstag', 'Freitag'] }
])

const searchQuery = ref('')
const selectedClassId = ref(null)

const filteredClasses = computed(() =>
  classes.value.filter(klasse =>
    klasse.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const selectedClass = computed(() =>
  classes.value.find(klasse => klasse.id === selectedClassId.value)
)

function selectClass(classId) {
  selectedClassId.value = classId
}

function hasSchool(klasse, day) {
  return klasse.schoolDays.includes(day)
}

function getUsedRooms(day) {
  return classes.value.filter(klasse => hasSchool(klasse, day)).length
}
</script>
