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
        <div>
          <h2>Wochenansicht</h2>

          <button type="button" @click="changeYear(-1)">←</button>
          <strong>{{ currentYear }}</strong>
          <button type="button" @click="changeYear(1)">→</button>
        </div>

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

                <span
                  v-if="hasConflict(klasse, day)"
                  :title="getConflictText(klasse, day)"
                >
                    ⚠ Konflikt
                  </span>
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

          <h4>Regeln</h4>

          <form @submit.prevent="addRule">
            <label>
              Darf nicht am gleichen Tag wie

              <select v-model="selectedRuleClassId">
                <option :value="null">
                  Klasse auswählen
                </option>

                <option
                  v-for="klasse in availableRuleClasses"
                  :key="klasse.id"
                  :value="klasse.id"
                >
                  {{ klasse.name }}
                </option>
              </select>
            </label>

            <button type="submit">
              Regel hinzufügen
            </button>
          </form>

          <ul>
            <li
              v-for="rule in selectedClassRules"
              :key="rule.id"
            >
              Darf nicht am gleichen Tag wie
              {{ getOtherClassName(rule, selectedClass.id) }}

              <button
                type="button"
                @click="removeRule(rule.id)"
              >
                Entfernen
              </button>
            </li>
          </ul>
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

interface ClassRule {
  id: number
  classAId: number
  classBId: number
}

interface YearData {
  year: number
  classes: SchoolClass[]
  rules: ClassRule[]
}

const weekdays: Weekday[] = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag'
]

const roomCapacity = 5
const currentYear = ref(2026)

const years = ref<YearData[]>([
  {
    year: 2026,
    classes: [
      {
        id: 1,
        name: 'KLA',
        schoolDays: ['Montag', 'Dienstag', 'Donnerstag']
      },
      {
        id: 2,
        name: 'KLB',
        schoolDays: ['Dienstag', 'Mittwoch', 'Freitag']
      },
      {
        id: 3,
        name: 'KLC',
        schoolDays: ['Montag', 'Mittwoch', 'Donnerstag']
      },
      {
        id: 4,
        name: 'KLD',
        schoolDays: ['Dienstag', 'Donnerstag', 'Freitag']
      }
    ],
    rules: []
  }
])

const searchQuery = ref('')
const selectedClassId = ref<number | null>(null)
const selectedRuleClassId = ref<number | null>(null)
const showCreateClass = ref(false)
const newClassName = ref('')

const currentYearData = computed(() =>
  years.value.find(yearData => yearData.year === currentYear.value)
)

const classes = computed(() =>
  currentYearData.value?.classes ?? []
)

const rules = computed(() =>
  currentYearData.value?.rules ?? []
)

const filteredClasses = computed(() =>
  classes.value.filter(klasse =>
    klasse.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const selectedClass = computed(() =>
  classes.value.find(klasse => klasse.id === selectedClassId.value)
)

const selectedClassRules = computed(() => {
  if (!selectedClass.value) return []

  return rules.value.filter(rule =>
    rule.classAId === selectedClass.value?.id ||
    rule.classBId === selectedClass.value?.id
  )
})

const availableRuleClasses = computed(() => {
  if (!selectedClass.value) return []

  return classes.value.filter(klasse => {
    if (klasse.id === selectedClass.value?.id) return false

    return !selectedClassRules.value.some(rule =>
      rule.classAId === klasse.id ||
      rule.classBId === klasse.id
    )
  })
})

function selectClass(classId: number) {
  selectedClassId.value = classId
  selectedRuleClassId.value = null
}

function createClass() {
  const name = newClassName.value.trim()

  if (!name || !currentYearData.value) return

  currentYearData.value.classes.push({
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

function addRule() {
  if (
    !selectedClass.value ||
    selectedRuleClassId.value === null ||
    !currentYearData.value
  ) {
    return
  }

  currentYearData.value.rules.push({
    id: Date.now(),
    classAId: selectedClass.value.id,
    classBId: selectedRuleClassId.value
  })

  selectedRuleClassId.value = null
}

function removeRule(ruleId: number) {
  if (!currentYearData.value) return

  currentYearData.value.rules = currentYearData.value.rules.filter(
    rule => rule.id !== ruleId
  )
}

function getOtherClassId(rule: ClassRule, classId: number) {
  return rule.classAId === classId
    ? rule.classBId
    : rule.classAId
}

function getOtherClassName(rule: ClassRule, classId: number) {
  const otherClassId = getOtherClassId(rule, classId)

  return classes.value.find(
    klasse => klasse.id === otherClassId
  )?.name ?? 'Unbekannt'
}

function getConflictingClasses(klasse: SchoolClass, day: Weekday) {
  if (!hasSchool(klasse, day)) return []

  const classRules = rules.value.filter(rule =>
    rule.classAId === klasse.id ||
    rule.classBId === klasse.id
  )

  return classRules
    .map(rule => {
      const otherClassId = getOtherClassId(rule, klasse.id)

      return classes.value.find(
        otherClass => otherClass.id === otherClassId
      )
    })
    .filter(
      (otherClass): otherClass is SchoolClass =>
        otherClass !== undefined && hasSchool(otherClass, day)
    )
}

function hasConflict(klasse: SchoolClass, day: Weekday) {
  return getConflictingClasses(klasse, day).length > 0
}

function getConflictText(klasse: SchoolClass, day: Weekday) {
  const conflictingClasses = getConflictingClasses(klasse, day)

  return conflictingClasses
    .map(
      otherClass =>
        `Konflikt zwischen ${klasse.name} und ${otherClass.name}`
    )
    .join('\n')
}

function changeYear(direction: number) {
  const newYear = currentYear.value + direction

  if (!years.value.some(yearData => yearData.year === newYear)) {
    const copiedClasses: SchoolClass[] = classes.value.map(klasse => ({
      id: klasse.id,
      name: klasse.name,
      schoolDays: [...klasse.schoolDays]
    }))

    const copiedRules: ClassRule[] = rules.value.map(rule => ({
      ...rule
    }))

    years.value.push({
      year: newYear,
      classes: copiedClasses,
      rules: copiedRules
    })
  }

  currentYear.value = newYear
  selectedClassId.value = null
  selectedRuleClassId.value = null
}
</script>
