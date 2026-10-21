
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { request, json } from '../services/lehrway-api'

type Weekday = 'Montag' | 'Dienstag' | 'Mittwoch' | 'Donnerstag' | 'Freitag'

interface SchoolClass {
  id: number
  name: string
  schoolDays: Weekday[]
  lehrgang_id: number | null
}

interface ClassRule {
  id: number
  classAId: number
  classBId: number
}

interface RoomCapacity {
  id: number
  day: Weekday
  capacity: number
}

interface DBClass {
  id: number
  bezeichnung: string
  lehrgang_id: number | null
}

interface DBRoom {
  id: number
  wochentag: Weekday
  anzahl_raeume: number
}

interface DBRule {
  id: number
  klasse_a_id: number
  klasse_b_id: number
}

interface DBAssignment {
  klasse_id: number
  ressourcen_id: number
}

interface DBLehrgang {
  id: number
  bezeichnung: string
}

const weekdays: Weekday[] = [
  'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'
]

const currentYear = ref(new Date().getFullYear())
const classes = ref<SchoolClass[]>([])
const rules = ref<ClassRule[]>([])
const roomCapacities = ref<RoomCapacity[]>([])
const lehrgaenge = ref<DBLehrgang[]>([])

const searchQuery = ref('')
const selectedClassId = ref<number | null>(null)
const selectedRuleClassId = ref<number | null>(null)
const selectedLehrgangId = ref<number | null>(null)

const showCreateClass = ref(false)
const newClassName = ref('')
const editedClassName = ref('')
const classError = ref('')
const editClassError = ref('')
const apiError = ref('')
const loading = ref(false)

const schoolYearLabel = computed(() =>
  `${currentYear.value}/${String(currentYear.value + 1).slice(-2)}`
)

const filteredClasses = computed(() =>
  classes.value.filter(klasse =>
    klasse.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const selectedClass = computed(() =>
  classes.value.find(klasse => klasse.id === selectedClassId.value)
)

const selectedClassRules = computed(() =>
  rules.value.filter(rule =>
    rule.classAId === selectedClassId.value ||
    rule.classBId === selectedClassId.value
  )
)

const availableRuleClasses = computed(() =>
  classes.value.filter(klasse =>
    klasse.id !== selectedClassId.value &&
    !selectedClassRules.value.some(rule =>
      rule.classAId === klasse.id || rule.classBId === klasse.id
    )
  )
)

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Ein unbekannter Fehler ist aufgetreten.'
}

// Daten laden
async function loadData() {
  loading.value = true
  apiError.value = ''

  try {
    const [dbClasses, dbRooms, dbRules, assignments, dbLehrgaenge] =
      await Promise.all([
        request<DBClass[]>('/klassen'),
        request<DBRoom[]>('/ressourcen'),
        request<DBRule[]>('/regeln'),
        request<DBAssignment[]>('/klasse-ressourcen'),
        request<DBLehrgang[]>('/lehrgaenge')
      ])

    lehrgaenge.value = dbLehrgaenge

    roomCapacities.value = dbRooms.map(room => ({
      id: room.id,
      day: room.wochentag,
      capacity: room.anzahl_raeume
    }))

    classes.value = dbClasses.map(klasse => ({
      id: klasse.id,
      name: klasse.bezeichnung,
      lehrgang_id: klasse.lehrgang_id,
      schoolDays: dbRooms
        .filter(room => assignments.some(assignment =>
          assignment.klasse_id === klasse.id &&
          assignment.ressourcen_id === room.id
        ))
        .map(room => room.wochentag)
    }))

    rules.value = dbRules.map(rule => ({
      id: rule.id,
      classAId: rule.klasse_a_id,
      classBId: rule.klasse_b_id
    }))

    if (selectedClassId.value !== null &&
      !classes.value.some(klasse => klasse.id === selectedClassId.value)) {
      selectedClassId.value = null
    }
  } catch (error) {
    apiError.value = getError(error)
    classes.value = []
    rules.value = []
    roomCapacities.value = []
    lehrgaenge.value = []
  } finally {
    loading.value = false
  }
}

function selectClass(id: number) {
  selectedClassId.value = id
  editedClassName.value = classes.value.find(klasse => klasse.id === id)?.name ?? ''
  selectedRuleClassId.value = null
  editClassError.value = ''
}

// Klasse erstellen
async function createClass() {
  const name = newClassName.value.trim()
  classError.value = ''

  // Klasse muss noch aktualisiert werden, fehler besteht wenn man klasse erstellen muss.


  if (!name) {
    classError.value = 'Bitte einen Klassennamen eingeben.'
    return
  }

  if (selectedLehrgangId.value === null) {
    classError.value = 'Bitte einen Lehrgang auswählen.'
    return
  }

  try {
    await request('/klassen', json('POST', {
      bezeichnung: name,
      lehrgang_id: selectedLehrgangId.value,
      anzahl_schultage_woche: 0
    }))

    newClassName.value = ''
    selectedLehrgangId.value = null
    showCreateClass.value = false
    await loadData()
  } catch (error) {
    classError.value = getError(error)
  }
}

function cancelCreateClass() {
  showCreateClass.value = false
  newClassName.value = ''
  selectedLehrgangId.value = null
  classError.value = ''
}

// Klasse umbenennen
async function renameClass() {
  if (!selectedClass.value) return

  const name = editedClassName.value.trim()
  if (!name) {
    editClassError.value = 'Der Klassenname darf nicht leer sein.'
    return
  }

  try {
    await request(
      `/klassen/${selectedClass.value.id}`,
      json('PUT', { bezeichnung: name })
    )
    editClassError.value = ''
    await loadData()
  } catch (error) {
    editClassError.value = getError(error)
  }
}

// Klasse löschen
async function deleteClass() {
  if (!selectedClass.value ||
    !confirm('Möchtest du diese Klasse wirklich löschen?')) return

  try {
    await request(`/klassen/${selectedClass.value.id}`, json('DELETE'))
    selectedClassId.value = null
    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
}

// Schultage und Räume
function hasSchool(klasse: SchoolClass, day: Weekday) {
  return klasse.schoolDays.includes(day)
}

async function toggleSchoolDay(klasse: SchoolClass, day: Weekday) {
  const room = roomCapacities.value.find(room => room.day === day)

  if (!room) {
    apiError.value = `Keine Ressource für ${day} gefunden.`
    return
  }

  try {
    if (hasSchool(klasse, day)) {
      await request(
        `/klasse-ressourcen/${klasse.id}/${room.id}`,
        json('DELETE')
      )
    } else {
      await request('/klasse-ressourcen', json('POST', {
        klasse_id: klasse.id,
        ressourcen_id: room.id
      }))
    }
    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
}

function getUsedRooms(day: Weekday) {
  return classes.value.filter(klasse => hasSchool(klasse, day)).length
}

function getRoomCapacity(day: Weekday) {
  return roomCapacities.value.find(room => room.day === day)?.capacity ?? 0
}

async function changeRoomCapacity(day: Weekday, amount: number) {
  const room = roomCapacities.value.find(room => room.day === day)
  if (!room) return

  try {
    await request(`/ressourcen/${room.id}`, json('PUT', {
      anzahl_raeume: Math.max(0, room.capacity + amount)
    }))
    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
}

function hasRoomConflict(day: Weekday) {
  return getUsedRooms(day) > getRoomCapacity(day)
}

function getRoomConflictText(day: Weekday) {
  return `${getUsedRooms(day) - getRoomCapacity(day)} Raum/Räume zu wenig`
}

// Klassenregeln
async function addRule() {
  if (!selectedClass.value || selectedRuleClassId.value === null) return

  try {
    await request('/regeln', json('POST', {
      klasse_a_id: selectedClass.value.id,
      klasse_b_id: selectedRuleClassId.value
    }))
    selectedRuleClassId.value = null
    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
}

async function removeRule(ruleId: number) {
  try {
    await request(`/regeln/${ruleId}`, json('DELETE'))
    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
}

function getOtherClassId(rule: ClassRule, classId: number) {
  return rule.classAId === classId ? rule.classBId : rule.classAId
}

function getOtherClassName(rule: ClassRule, classId: number) {
  const id = getOtherClassId(rule, classId)
  return classes.value.find(klasse => klasse.id === id)?.name ?? 'Unbekannt'
}

function getConflictingClasses(klasse: SchoolClass, day: Weekday) {
  if (!hasSchool(klasse, day)) return []

  return rules.value
    .filter(rule => rule.classAId === klasse.id || rule.classBId === klasse.id)
    .map(rule => classes.value.find(
      other => other.id === getOtherClassId(rule, klasse.id)
    ))
    .filter((other): other is SchoolClass =>
      other !== undefined && hasSchool(other, day)
    )
}

function hasConflict(klasse: SchoolClass, day: Weekday) {
  return getConflictingClasses(klasse, day).length > 0
}

function getConflictText(klasse: SchoolClass, day: Weekday) {
  return getConflictingClasses(klasse, day)
    .map(other =>
      `${klasse.name} und ${other.name} dürfen nicht gleichzeitig Schule haben.`
    )
    .join('\n')
}

// Schuljahre sind in der Datenbank noch nicht hinterlegt
function changeSchoolYear(_direction: number) {
  apiError.value =
    'Der Schuljahreswechsel benötigt noch eine Schuljahr-Zuordnung in der Datenbank.'
}

onMounted(loadData)
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/home" class="brand">
          Lehr<span>way</span>
        </router-link>

        <nav class="site-nav">
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
      <p v-if="loading" class="status-message">Daten werden geladen...</p>
      <p v-if="apiError" class="api-error" role="alert">{{ apiError }}</p>

      <!-- Klassenübersicht -->
      <aside class="panel">
        <h2>Klassen</h2>

        <button
          type="button"
          class="primary-button"
          @click="showCreateClass = true"
        >
          + Klasse erstellen
        </button>

        <form
          v-if="showCreateClass"
          class="form-stack"
          @submit.prevent="createClass"
        >
          <input
            v-model="newClassName"
            type="text"
            placeholder="Klassenname"
            required
          >

          <select v-model="selectedLehrgangId" required>
            <option :value="null">Lehrgang auswählen</option>
            <option
              v-for="lehrgang in lehrgaenge"
              :key="lehrgang.id"
              :value="lehrgang.id"
            >
              {{ lehrgang.bezeichnung }}
            </option>
          </select>

          <button type="submit" class="primary-button">Erstellen</button>
          <button type="button" @click="cancelCreateClass">Abbrechen</button>
          <p v-if="classError" class="api-error">{{ classError }}</p>
        </form>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Klassen suchen"
          class="search-input"
        >

        <ul class="item-list">
          <li v-for="klasse in filteredClasses" :key="klasse.id">
            <button
              type="button"
              class="list-button"
              :class="{ selected: selectedClassId === klasse.id }"
              @click="selectClass(klasse.id)"
            >
              {{ klasse.name }}
            </button>
          </li>
        </ul>

        <p v-if="!loading && filteredClasses.length === 0">
          Keine Klassen gefunden.
        </p>
      </aside>

      <!-- Wochenplan -->
      <section class="panel">
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
                  <span>{{ getUsedRooms(day) }} / {{ getRoomCapacity(day) }}</span>

                  <span
                    v-if="hasRoomConflict(day)"
                    class="conflict"
                    :title="getRoomConflictText(day)"
                  >
                      ⚠
                    </span>

                  <div>
                    <button
                      type="button"
                      @click="changeRoomCapacity(day, 1)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      @click="changeRoomCapacity(day, -1)"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- Klasse bearbeiten -->
      <aside class="panel">
        <h2>Klasse bearbeiten</h2>

        <div v-if="selectedClass">
          <h3>{{ selectedClass.name }}</h3>

          <form class="form-stack" @submit.prevent="renameClass">
            <label for="class-name">Klassenname</label>
            <input
              id="class-name"
              v-model="editedClassName"
              type="text"
              required
            >

            <button type="submit" class="primary-button">
              Namen speichern
            </button>
            <p v-if="editClassError" class="api-error">{{ editClassError }}</p>
          </form>

          <h3>Regeln</h3>

          <form class="form-stack" @submit.prevent="addRule">
            <label for="rule-class">
              Darf nicht am gleichen Tag wie:
            </label>

            <select id="rule-class" v-model="selectedRuleClassId">
              <option :value="null">Klasse auswählen</option>
              <option
                v-for="klasse in availableRuleClasses"
                :key="klasse.id"
                :value="klasse.id"
              >
                {{ klasse.name }}
              </option>
            </select>

            <button type="submit">Regel hinzufügen</button>
          </form>

          <ul class="rule-list">
            <li v-for="rule in selectedClassRules" :key="rule.id">
              <span>{{ getOtherClassName(rule, selectedClass.id) }}</span>
              <button type="button" @click="removeRule(rule.id)">
                Entfernen
              </button>
            </li>
          </ul>

          <button
            type="button"
            class="danger-button"
            @click="deleteClass"
          >
            Klasse löschen
          </button>
        </div>

        <p v-else>Wähle eine Klasse aus.</p>
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

<style scoped>
.page-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f6f8fc;
  color: #172033;
  font-family: Inter, system-ui, Arial, sans-serif;
}

/* Navbar */
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
}

.brand {
  color: #172033;
  text-decoration: none;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
}

.brand span {
  color: #2563eb;
}

.site-nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 11px 18px;
  border-radius: 10px;
  color: #475569;
  text-decoration: none;
  font-weight: 600;
  transition: 0.2s;
}

.nav-link:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.nav-link.router-link-active {
  background: #2563eb;
  color: white;
}

/* Seitenlayout */
.page-intro {
  width: 100%;
  max-width: 1440px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 36px 32px 18px;
}

.page-intro h1 {
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 8px;
}

.page-intro p {
  color: #64748b;
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

.panel {
  min-width: 0;
  padding: 24px;
  background: white;
  border: 1px solid #e6eaf0;
  border-radius: 16px;
  box-shadow: 0 5px 22px rgba(15, 23, 42, 0.04);
}

.panel h2 {
  margin-top: 0;
  font-size: 20px;
}

.panel h3 {
  font-size: 16px;
  margin-top: 24px;
}

/* Formulare und Buttons */
button {
  cursor: pointer;
  font-family: inherit;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: inherit;
}

input:focus,
select:focus {
  outline: none;
  border-color: #2563eb;
}

.primary-button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 11px 14px;
  font-weight: 600;
}

.primary-button:hover {
  background: #1d4ed8;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0;
}

.search-input {
  margin-top: 18px;
}

.item-list,
.rule-list {
  list-style: none;
  padding: 0;
}

.item-list li {
  margin-bottom: 6px;
}

.list-button {
  width: 100%;
  padding: 10px;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.list-button:hover,
.list-button.selected {
  background: #dbeafe;
  color: #1d4ed8;
}

.rule-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

/* Wochenplan */
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.year-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.year-navigation button,
.room-controls button {
  padding: 5px 9px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
}

.table-wrapper {
  overflow-x: auto;
  margin-top: 18px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 12px 8px;
  border: 1px solid #e2e8f0;
  text-align: center;
}

thead th {
  background: #eff6ff;
  color: #1e40af;
}

tbody th,
tfoot th {
  background: #f8fafc;
}

.school-day-button {
  width: 100%;
  padding: 9px 6px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
}

.school-day-button.active {
  background: #dbeafe;
  color: #1d4ed8;
  border-color: #93c5fd;
}

.room-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.conflict,
.api-error {
  color: #dc2626;
}

.conflict {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}

.status-message,
.api-error {
  grid-column: 1 / -1;
  margin: 0;
}

.danger-button {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
}

/* Footer */
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

/* Responsive Design */
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

  .site-nav {
    flex-wrap: wrap;
    justify-content: center;
  }

  .page-intro {
    padding: 28px 18px 16px;
  }

  .page-intro h1 {
    font-size: 28px;
  }

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

  .footer-inner span:last-child {
    text-align: center;
  }
}
</style>
