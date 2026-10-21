
<template>
  <div class="page-shell">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/home" class="brand">
          Lehr<span>way</span>
        </router-link>
        <nav class="site-nav" aria-label="Hauptnavigation">
          <router-link to="/home" class="nav-link">Wochenplan</router-link>
          <router-link to="/lehrgang" class="nav-link">Lehrgänge</router-link>
        </nav>
      </div>
    </header>

    <div class="page-intro">
      <h1>Wochenübersicht</h1>
      <p>Plane Klassen, Schultage und verfügbare Räume.</p>
    </div>

    <main class="page-main">
      <aside>
        <h2>Klassen</h2>
        <button type="button" @click="showCreateClass = true">
          Klasse erstellen
        </button>

        <form v-if="showCreateClass" @submit.prevent="createClass">
          <input v-model="newClassName" type="text" placeholder="Klassenname">
          <button type="submit">Erstellen</button>
          <button type="button" @click="cancelCreateClass">Abbrechen</button>
          <p v-if="classError">{{ classError }}</p>
        </form>

        <input v-model="searchQuery" type="text" placeholder="Klassen suchen">

        <ul>
          <li v-for="klasse in filteredClasses" :key="klasse.id">
            <button type="button" @click="selectClass(klasse.id)">
              {{ klasse.name }}
            </button>
          </li>
        </ul>
      </aside>

      <section>
        <div class="section-heading">
          <h2>Wochenansicht</h2>
          <div class="year-navigation">
            <button type="button" @click="changeSchoolYear(-1)">←</button>
            <strong>{{ schoolYearLabel }}</strong>
            <button type="button" @click="changeSchoolYear(1)">→</button>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
            <tr>
              <th>Klasse</th>
              <th v-for="day in weekdays" :key="day">{{ day }}</th>
            </tr>
            </thead>

            <tbody>
            <tr v-for="klasse in classes" :key="klasse.id">
              <th>{{ klasse.name }}</th>
              <td v-for="day in weekdays" :key="day">
                <button
                  type="button"
                  class="school-day-button"
                  :class="{ active: hasSchool(klasse, day) }"
                  @click="toggleSchoolDay(klasse, day)"
                >
                  {{ hasSchool(klasse, day) ? 'Schule' : '–' }}
                  <span
                    v-if="hasConflict(klasse, day)"
                    class="conflict"
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
                <div class="room-controls">
                    <span>
                      {{ getUsedRooms(day) }} / {{ getRoomCapacity(day) }}
                      <span
                        v-if="hasRoomConflict(day)"
                        class="conflict"
                        :title="getRoomConflictText(day)"
                      >⚠</span>
                    </span>
                  <div>
                    <button type="button" title="Raum hinzufügen" @click="changeRoomCapacity(day, 1)">▲</button>
                    <button type="button" title="Raum entfernen" @click="changeRoomCapacity(day, -1)">▼</button>
                  </div>
                </div>
              </td>
            </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <aside>
        <h2>Klasse bearbeiten</h2>

        <div v-if="selectedClass">
          <h3>{{ selectedClass.name }}</h3>

          <form @submit.prevent="renameClass">
            <label>
              Klassenname
              <input v-model="editedClassName" type="text">
            </label>
            <button type="submit">Namen speichern</button>
            <p v-if="editClassError">{{ editClassError }}</p>
          </form>

          <h4>Regeln</h4>
          <form @submit.prevent="addRule">
            <label>
              Darf nicht am gleichen Tag wie
              <select v-model="selectedRuleClassId">
                <option :value="null">Klasse auswählen</option>
                <option
                  v-for="klasse in availableRuleClasses"
                  :key="klasse.id"
                  :value="klasse.id"
                >
                  {{ klasse.name }}
                </option>
              </select>
            </label>
            <button type="submit">Regel hinzufügen</button>
          </form>

          <ul>
            <li v-for="rule in selectedClassRules" :key="rule.id">
              Darf nicht am gleichen Tag wie
              {{ getOtherClassName(rule, selectedClass.id) }}
              <button type="button" @click="removeRule(rule.id)">
                Entfernen
              </button>
            </li>
          </ul>

          <button type="button" class="danger-button" @click="deleteClass">
            Klasse löschen
          </button>
        </div>

        <p v-else>Keine Klasse ausgewählt.</p>
      </aside>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <span>Klasse: D24a</span>
        <strong>Lehrway</strong>
        <span>Khalil, Luka, Noél und Kenan</span>
      </div>
    </footer>
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

interface RoomCapacity {
  day: Weekday
  capacity: number
}

interface YearData {
  year: number
  classes: SchoolClass[]
  rules: ClassRule[]
  roomCapacities: RoomCapacity[]
}

const weekdays: Weekday[] = [
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'
]

const currentYear = ref(2026)

const years = ref<YearData[]>([
  {
    year: 2026,
    classes: [
      { id: 1, name: 'KLA', schoolDays: ['Montag', 'Dienstag', 'Donnerstag'] },
      { id: 2, name: 'KLB', schoolDays: ['Dienstag', 'Mittwoch', 'Freitag'] },
      { id: 3, name: 'KLC', schoolDays: ['Montag', 'Mittwoch', 'Donnerstag'] },
      { id: 4, name: 'KLD', schoolDays: ['Dienstag', 'Donnerstag', 'Freitag'] }
    ],
    rules: [],
    roomCapacities: [
      { day: 'Montag', capacity: 6 },
      { day: 'Dienstag', capacity: 6 },
      { day: 'Mittwoch', capacity: 6 },
      { day: 'Donnerstag', capacity: 6 },
      { day: 'Freitag', capacity: 6 }
    ]
  }
])

const searchQuery = ref('')
const selectedClassId = ref<number | null>(null)
const selectedRuleClassId = ref<number | null>(null)
const showCreateClass = ref(false)
const newClassName = ref('')
const classError = ref('')
const editedClassName = ref('')
const editClassError = ref('')

const currentYearData = computed(() =>
  years.value.find(yearData => yearData.year === currentYear.value)
)

const classes = computed(() => currentYearData.value?.classes ?? [])
const rules = computed(() => currentYearData.value?.rules ?? [])
const roomCapacities = computed(() => currentYearData.value?.roomCapacities ?? [])

const schoolYearLabel = computed(() => {
  const nextYear = String(currentYear.value + 1).slice(-2)
  return `${currentYear.value}/${nextYear}`
})

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
      rule.classAId === klasse.id || rule.classBId === klasse.id
    )
  })
})

function selectClass(classId: number) {
  selectedClassId.value = classId
  selectedRuleClassId.value = null
  editClassError.value = ''

  const klasse = classes.value.find(klasse => klasse.id === classId)
  editedClassName.value = klasse?.name ?? ''
}

function createClass() {
  const name = newClassName.value.trim()
  classError.value = ''

  if (!name || !currentYearData.value) return

  const classAlreadyExists = classes.value.some(
    klasse => klasse.name.trim().toLowerCase() === name.toLowerCase()
  )

  if (classAlreadyExists) {
    classError.value = 'Eine Klasse mit diesem Namen existiert bereits.'
    return
  }

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
  classError.value = ''
  showCreateClass.value = false
}

function renameClass() {
  if (!selectedClass.value) return

  const name = editedClassName.value.trim()
  editClassError.value = ''

  if (!name) {
    editClassError.value = 'Der Klassenname darf nicht leer sein.'
    return
  }

  const classAlreadyExists = classes.value.some(
    klasse =>
      klasse.id !== selectedClass.value?.id &&
      klasse.name.trim().toLowerCase() === name.toLowerCase()
  )

  if (classAlreadyExists) {
    editClassError.value = 'Eine Klasse mit diesem Namen existiert bereits.'
    return
  }

  selectedClass.value.name = name
  editedClassName.value = name
}

function deleteClass() {
  if (!selectedClass.value || !currentYearData.value) return

  const classId = selectedClass.value.id

  currentYearData.value.classes = currentYearData.value.classes.filter(
    klasse => klasse.id !== classId
  )

  currentYearData.value.rules = currentYearData.value.rules.filter(
    rule => rule.classAId !== classId && rule.classBId !== classId
  )

  selectedClassId.value = null
  selectedRuleClassId.value = null
  editedClassName.value = ''
  editClassError.value = ''
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

function getRoomCapacity(day: Weekday) {
  return roomCapacities.value.find(room => room.day === day)?.capacity ?? 0
}

function changeRoomCapacity(day: Weekday, amount: number) {
  const room = roomCapacities.value.find(room => room.day === day)
  if (!room) return
  room.capacity = Math.max(0, room.capacity + amount)
}

function hasRoomConflict(day: Weekday) {
  return getUsedRooms(day) > getRoomCapacity(day)
}

function getRoomConflictText(day: Weekday) {
  const missingRooms = getUsedRooms(day) - getRoomCapacity(day)
  return missingRooms === 1
    ? '1 Raum zu wenig'
    : `${missingRooms} Räume zu wenig`
}

function addRule() {
  if (
    !selectedClass.value ||
    selectedRuleClassId.value === null ||
    !currentYearData.value
  ) return

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
  return rule.classAId === classId ? rule.classBId : rule.classAId
}

function getOtherClassName(rule: ClassRule, classId: number) {
  const otherClassId = getOtherClassId(rule, classId)
  return classes.value.find(klasse => klasse.id === otherClassId)?.name ?? 'Unbekannt'
}

function getConflictingClasses(klasse: SchoolClass, day: Weekday) {
  if (!hasSchool(klasse, day)) return []

  const classRules = rules.value.filter(
    rule => rule.classAId === klasse.id || rule.classBId === klasse.id
  )

  return classRules
    .map(rule => {
      const otherClassId = getOtherClassId(rule, klasse.id)
      return classes.value.find(otherClass => otherClass.id === otherClassId)
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
  return getConflictingClasses(klasse, day)
    .map(otherClass => `Konflikt zwischen ${klasse.name} und ${otherClass.name}`)
    .join('\n')
}

function changeSchoolYear(direction: number) {
  const newYear = currentYear.value + direction

  if (!years.value.some(yearData => yearData.year === newYear)) {
    const copiedClasses: SchoolClass[] = classes.value.map(klasse => ({
      id: klasse.id,
      name: klasse.name,
      schoolDays: [...klasse.schoolDays]
    }))

    const copiedRules: ClassRule[] = rules.value.map(rule => ({ ...rule }))
    const copiedRoomCapacities: RoomCapacity[] =
      roomCapacities.value.map(room => ({ ...room }))

    years.value.push({
      year: newYear,
      classes: copiedClasses,
      rules: copiedRules,
      roomCapacities: copiedRoomCapacities
    })
  }

  currentYear.value = newYear
  selectedClassId.value = null
  selectedRuleClassId.value = null
  editedClassName.value = ''
  editClassError.value = ''
}
</script>

<style scoped>
.page-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f6f8fc;
  color: #172033;
  font-family: Inter, system-ui, Arial, sans-serif;
}

.site-header {
  background: white;
  border-bottom: 1px solid #e6eaf0;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.header-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 18px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.brand {
  color: #172033;
  text-decoration: none;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
}

.brand span { color: #2563eb; }

.site-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.nav-link {
  padding: 11px 18px;
  border-radius: 10px;
  color: #475569;
  text-decoration: none;
  font-weight: 600;
  transition: 0.2s ease;
}

.nav-link:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.nav-link.router-link-active {
  background: #2563eb;
  color: white;
}

.page-intro {
  max-width: 1440px;
  width: 100%;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 36px 32px 18px;
}

.page-intro h1 {
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 8px;
  letter-spacing: -1px;
}

.page-intro p {
  color: #64748b;
  font-size: 16px;
  margin: 0;
}

.page-main {
  flex: 1;
  width: 100%;
  max-width: 1440px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 16px 32px 48px;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 260px;
  gap: 20px;
  align-items: start;
}

.page-main > aside,
.page-main > section {
  min-width: 0;
  padding: 24px;
  background: white;
  border: 1px solid #e6eaf0;
  border-radius: 16px;
  box-shadow: 0 5px 22px rgba(15, 23, 42, 0.035);
}

.page-main h2 {
  margin-top: 0;
  font-size: 20px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.year-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-wrapper { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 18px;
  font-size: 14px;
}

th, td {
  padding: 12px 8px;
  border: 1px solid #e2e8f0;
  text-align: center;
}

thead th {
  background: #eff6ff;
  color: #1e40af;
}

tbody th, tfoot th { background: #f8fafc; }

button {
  cursor: pointer;
}

.school-day-button {
  border: 1px solid #dbe3ee;
  background: #f8fafc;
  border-radius: 8px;
  padding: 9px;
  color: #475569;
}

.school-day-button.active {
  background: #dbeafe;
  color: #1d4ed8;
  border-color: #93c5fd;
}

.conflict {
  display: block;
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
}

.room-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.room-controls button {
  margin: 2px;
}

.danger-button {
  color: #b91c1c;
}

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

.footer-inner span:last-child { text-align: right; }

@media (max-width: 1100px) {
  .page-main {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .page-main > aside:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 700px) {
  .header-inner {
    flex-direction: column;
    padding: 18px;
  }

  .site-nav { justify-content: center; }

  .page-intro { padding: 28px 18px 16px; }
  .page-intro h1 { font-size: 28px; }

  .page-main {
    grid-template-columns: 1fr;
    padding: 16px 18px 32px;
  }

  .page-main > aside:last-child {
    grid-column: auto;
  }

  .footer-inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .footer-inner span:last-child { text-align: center; }
}
</style>
