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

        <button type="button" @click="showCreateClass = true">
          Klasse erstellen
        </button>

        <form v-if="showCreateClass" @submit.prevent="createClass">
          <input
            v-model="newClassName"
            type="text"
            placeholder="Klassenname"
          >
          <button type="submit">Erstellen</button>
          <button type="button" @click="cancelCreateClass">Abbrechen</button>
        </form>

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
              <button type="button" @click="toggleSchoolDay(klasse, day)">
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

<script setup lang="ts">
import { computed, ref } from 'vue'

type Weekday = 'Montag' | 'Dienstag' | 'Mittwoch' | 'Donnerstag' | 'Freitag'

interface SchoolClass {
  id: number
  name: string
  schoolDays: Weekday[]
}

const weekdays: Weekday[] = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag'
]

const roomCapacity = 5

const classes = ref<SchoolClass[]>([
  { id: 1, name: 'KLA', schoolDays: ['Montag', 'Dienstag', 'Donnerstag'] },
  { id: 2, name: 'KLB', schoolDays: ['Dienstag', 'Mittwoch', 'Freitag'] },
  { id: 3, name: 'KLC', schoolDays: ['Montag', 'Mittwoch', 'Donnerstag'] },
  { id: 4, name: 'KLD', schoolDays: ['Dienstag', 'Donnerstag', 'Freitag'] }
])

const searchQuery = ref('')
const selectedClassId = ref<number | null>(null)
const showCreateClass = ref(false)
const newClassName = ref('')

const filteredClasses = computed(() =>
  classes.value.filter(klasse =>
    klasse.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const selectedClass = computed(() =>
  classes.value.find(klasse => klasse.id === selectedClassId.value)
)

function selectClass(classId: number) {
  selectedClassId.value = classId
}

function createClass() {
  const name = newClassName.value.trim()

  if (!name) return

  classes.value.push({
    id: Date.now(),
    name,
    schoolDays: []
  })

  newClassName.value = ''
  showCreateClass.value = false
}

function cancelCreateClass() {
  newClassName.value = ''
  showCreateClass.value = false
}

function hasSchool(klasse: SchoolClass, day: Weekday) {
  return klasse.schoolDays.includes(day)
}

function toggleSchoolDay(klasse: SchoolClass, day: Weekday) {
  if (hasSchool(klasse, day)) {
    klasse.schoolDays = klasse.schoolDays.filter(
      schoolDay => schoolDay !== day
    )
  } else {
    klasse.schoolDays.push(day)
  }
}

function getUsedRooms(day: Weekday) {
  return classes.value.filter(klasse => hasSchool(klasse, day)).length
}
</script>
