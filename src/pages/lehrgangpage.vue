
<script setup lang="ts">
import { computed, ref } from 'vue'

interface CourseField {
  id: number
  startQuarter: number
  quarterSpan: number
  lessons: number | null
}

interface CourseModule {
  id: number
  name: string
  fields: CourseField[]
}

interface Course {
  id: number
  name: string
  modules: CourseModule[]
}

interface QuarterSelection {
  moduleId: number
  startQuarter: number
}

const quarters = Array.from({ length: 12 }, (_, i) => i + 1)

const courses = ref<Course[]>([
  {
    id: 1,
    name: 'IMS',
    modules: [
      { id: 101, name: 'M117', fields: [] },
      { id: 102, name: 'M122', fields: [] },
      { id: 103, name: 'M164', fields: [] }
    ]
  },
  { id: 2, name: 'Informatiker/in Applikationsentwicklung', modules: [] },
  { id: 3, name: 'Informatiker/in Plattformentwicklung', modules: [] }
])

const searchQuery = ref('')
const selectedCourseId = ref<number | null>(null)
const showCreateCourse = ref(false)
const newCourseName = ref('')
const editedCourseName = ref('')
const newModuleName = ref('')

const createCourseError = ref('')
const editCourseError = ref('')
const moduleError = ref('')
const fieldError = ref('')

const selection = ref<QuarterSelection | null>(null)
const editingFieldId = ref<number | null>(null)

const filteredCourses = computed(() =>
  courses.value.filter(course =>
    course.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const selectedCourse = computed(() =>
  courses.value.find(course => course.id === selectedCourseId.value)
)

// Lehrgang auswählen
function selectCourse(id: number) {
  selectedCourseId.value = id
  editedCourseName.value = selectedCourse.value?.name ?? ''
  selection.value = null
  editingFieldId.value = null
  editCourseError.value = ''
  moduleError.value = ''
  fieldError.value = ''
}

// Lehrgang erstellen
function createCourse() {
  const name = newCourseName.value.trim()
  createCourseError.value = ''

  if (!name) {
    createCourseError.value = 'Der Lehrgangsname darf nicht leer sein.'
    return
  }

  if (courses.value.some(course =>
    course.name.trim().toLowerCase() === name.toLowerCase()
  )) {
    createCourseError.value = 'Ein Lehrgang mit diesem Namen existiert bereits.'
    return
  }

  courses.value.push({
    id: Date.now(),
    name,
    modules: []
  })

  newCourseName.value = ''
  showCreateCourse.value = false
}

function cancelCreateCourse() {
  newCourseName.value = ''
  createCourseError.value = ''
  showCreateCourse.value = false
}

// Lehrgang umbenennen
function renameCourse() {
  if (!selectedCourse.value) return

  const name = editedCourseName.value.trim()
  editCourseError.value = ''

  if (!name) {
    editCourseError.value = 'Der Lehrgangsname darf nicht leer sein.'
    return
  }

  if (courses.value.some(course =>
    course.id !== selectedCourseId.value &&
    course.name.trim().toLowerCase() === name.toLowerCase()
  )) {
    editCourseError.value = 'Ein Lehrgang mit diesem Namen existiert bereits.'
    return
  }

  selectedCourse.value.name = name
  editedCourseName.value = name
}

// Lehrgang löschen
function deleteCourse() {
  if (!selectedCourse.value) return

  courses.value = courses.value.filter(
    course => course.id !== selectedCourseId.value
  )

  selectedCourseId.value = null
  selection.value = null
  editingFieldId.value = null
  editedCourseName.value = ''
  editCourseError.value = ''
  newModuleName.value = ''
  moduleError.value = ''
  fieldError.value = ''
}

// Modul hinzufügen
function addModule() {
  if (!selectedCourse.value) return

  const name = newModuleName.value.trim()
  moduleError.value = ''

  if (!name) {
    moduleError.value = 'Der Modulname darf nicht leer sein.'
    return
  }

  if (selectedCourse.value.modules.some(module =>
    module.name.trim().toLowerCase() === name.toLowerCase()
  )) {
    moduleError.value = 'Ein Modul mit diesem Namen existiert bereits.'
    return
  }

  selectedCourse.value.modules.push({
    id: Date.now(),
    name,
    fields: []
  })

  newModuleName.value = ''
}

function removeModule(moduleId: number) {
  if (!selectedCourse.value) return

  selectedCourse.value.modules = selectedCourse.value.modules.filter(
    module => module.id !== moduleId
  )

  if (selection.value?.moduleId === moduleId) {
    selection.value = null
  }
}

// Quartale auswählen und verbinden
function handleQuarterClick(module: CourseModule, quarter: number) {
  fieldError.value = ''

  if (isQuarterOccupied(module, quarter)) {
    fieldError.value = 'Dieses Quartal ist bereits belegt.'
    return
  }

  if (!selection.value || selection.value.moduleId !== module.id) {
    selection.value = { moduleId: module.id, startQuarter: quarter }
    return
  }

  const start = Math.min(selection.value.startQuarter, quarter)
  const end = Math.max(selection.value.startQuarter, quarter)

  if (!isRangeAvailable(module, start, end)) {
    fieldError.value =
      'Zwischen diesen Quartalen befindet sich bereits ein anderes Feld.'
    return
  }

  createField(module, start, end)
  selection.value = null
}

function createField(module: CourseModule, start: number, end: number) {
  const field: CourseField = {
    id: Date.now(),
    startQuarter: start,
    quarterSpan: end - start + 1,
    lessons: null
  }

  module.fields.push(field)
  editingFieldId.value = field.id
}

function editField(fieldId: number) {
  editingFieldId.value = fieldId
}

function finishEditingField() {
  editingFieldId.value = null
}

function removeField(module: CourseModule, fieldId: number) {
  module.fields = module.fields.filter(field => field.id !== fieldId)

  if (editingFieldId.value === fieldId) {
    editingFieldId.value = null
  }

  fieldError.value = ''
}

function cancelSelection() {
  selection.value = null
  fieldError.value = ''
}

// Hilfsfunktionen für die Quartalstabelle
function getFieldAtStart(module: CourseModule, quarter: number) {
  return module.fields.find(field => field.startQuarter === quarter)
}

function getFieldAtQuarter(module: CourseModule, quarter: number) {
  return module.fields.find(field =>
    quarter >= field.startQuarter &&
    quarter < field.startQuarter + field.quarterSpan
  )
}

function isQuarterOccupied(module: CourseModule, quarter: number) {
  return getFieldAtQuarter(module, quarter) !== undefined
}

function isRangeAvailable(module: CourseModule, start: number, end: number) {
  for (let quarter = start; quarter <= end; quarter++) {
    if (isQuarterOccupied(module, quarter)) return false
  }
  return true
}

function shouldRenderQuarter(module: CourseModule, quarter: number) {
  const field = getFieldAtQuarter(module, quarter)
  return !field || field.startQuarter === quarter
}

function isSelectionStart(moduleId: number, quarter: number) {
  return selection.value?.moduleId === moduleId &&
    selection.value?.startQuarter === quarter
}
</script>

<template>
  <div class="page-shell">
    <!-- Navbar -->
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
      <h1>Lehrgänge verwalten</h1>
      <p>Organisiere Lehrgänge, Module und Lektionen.</p>
    </div>

    <main class="page-main">
      <!-- Lehrgangsliste -->
      <aside>
        <h2>Lehrgänge</h2>

        <button type="button" @click="showCreateCourse = true">
          Lehrgang erstellen
        </button>

        <form v-if="showCreateCourse" @submit.prevent="createCourse">
          <input
            v-model="newCourseName"
            type="text"
            placeholder="Lehrgangsname"
          >

          <button type="submit">Erstellen</button>
          <button type="button" @click="cancelCreateCourse">Abbrechen</button>
          <p v-if="createCourseError">{{ createCourseError }}</p>
        </form>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Lehrgänge suchen"
        >

        <ul>
          <li v-for="course in filteredCourses" :key="course.id">
            <button type="button" @click="selectCourse(course.id)">
              {{ course.name }}
            </button>
          </li>
        </ul>
      </aside>

      <!-- Lehrgang bearbeiten -->
      <section>
        <h2>Lehrgang bearbeiten</h2>

        <div v-if="selectedCourse">
          <h3>{{ selectedCourse.name }}</h3>

          <form @submit.prevent="renameCourse">
            <label>
              Lehrgangsname
              <input v-model="editedCourseName" type="text">
            </label>

            <button type="submit">Namen speichern</button>
            <p v-if="editCourseError">{{ editCourseError }}</p>
          </form>

          <hr>

          <h3>Lehrplan</h3>
          <p>
            Klicke auf ein Quartal, um ein Feld zu erstellen.
            Klicke danach auf ein zweites Quartal desselben Moduls,
            um mehrere Quartale zu verbinden.
          </p>

          <div class="table-wrapper">
            <table>
              <thead>
              <tr>
                <th rowspan="3">Module</th>
                <th colspan="4">Lehrjahr 1</th>
                <th colspan="4">Lehrjahr 2</th>
                <th colspan="4">Lehrjahr 3</th>
              </tr>
              <tr>
                <th
                  v-for="semester in 6"
                  :key="semester"
                  colspan="2"
                >
                  Semester {{ semester }}
                </th>
              </tr>
              <tr>
                <th v-for="quarter in quarters" :key="quarter">
                  Q{{ quarter }}
                </th>
              </tr>
              </thead>

              <tbody>
              <tr v-for="module in selectedCourse.modules" :key="module.id">
                <th>
                  <input v-model="module.name" type="text">

                  <button
                    type="button"
                    class="danger-button"
                    @click="removeModule(module.id)"
                  >
                    Entfernen
                  </button>
                </th>

                <template v-for="quarter in quarters" :key="quarter">
                  <td
                    v-if="shouldRenderQuarter(module, quarter)"
                    :colspan="getFieldAtStart(module, quarter)?.quarterSpan ?? 1"
                  >
                    <!-- Belegtes Quartal -->
                    <div v-if="getFieldAtStart(module, quarter)">
                      <template
                        v-if="editingFieldId === getFieldAtStart(module, quarter)!.id"
                      >
                        <input
                          v-model.number="getFieldAtStart(module, quarter)!.lessons"
                          type="number"
                          min="0"
                          placeholder="Lektionen"
                        >

                        <button type="button" @click="finishEditingField">
                          Speichern
                        </button>

                        <button
                          type="button"
                          class="danger-button"
                          @click="removeField(module, getFieldAtStart(module, quarter)!.id)"
                        >
                          Löschen
                        </button>
                      </template>

                      <button
                        v-else
                        type="button"
                        class="lesson-button"
                        @click="editField(getFieldAtStart(module, quarter)!.id)"
                      >
                        {{
                          getFieldAtStart(module, quarter)!.lessons !== null
                            ? getFieldAtStart(module, quarter)!.lessons + ' Lektionen'
                            : 'Lektionen eintragen'
                        }}
                      </button>
                    </div>

                    <!-- Freies Quartal -->
                    <button
                      v-else
                      type="button"
                      class="quarter-button"
                      :class="{ selected: isSelectionStart(module.id, quarter) }"
                      @click="handleQuarterClick(module, quarter)"
                    >
                      {{ isSelectionStart(module.id, quarter) ? '●' : '+' }}
                    </button>
                  </td>
                </template>
              </tr>
              </tbody>
            </table>
          </div>

          <p v-if="selectedCourse.modules.length === 0">
            Noch keine Module vorhanden.
          </p>

          <div v-if="selection" class="selection-notice">
            <p>
              Startquartal Q{{ selection.startQuarter }} ausgewählt.
              Wähle ein zweites freies Quartal im gleichen Modul.
            </p>
            <button type="button" @click="cancelSelection">
              Auswahl abbrechen
            </button>
          </div>

          <p v-if="fieldError" class="error-message">{{ fieldError }}</p>

          <form @submit.prevent="addModule">
            <input
              v-model="newModuleName"
              type="text"
              placeholder="Modulname"
            >
            <button type="submit">Modul hinzufügen</button>
          </form>

          <p v-if="moduleError" class="error-message">{{ moduleError }}</p>

          <hr>

          <button
            type="button"
            class="danger-button"
            @click="deleteCourse"
          >
            Lehrgang löschen
          </button>
        </div>

        <p v-else>Kein Lehrgang ausgewählt.</p>
      </section>
    </main>

    <!-- Footer -->
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
/* Grundlayout */
.page-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f6f8fc;
  color: #172033;
  font-family: Inter, system-ui, Arial, sans-serif;
}

/* Navigation */
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

.brand span {
  color: #2563eb;
}

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

/* Seiteninhalt */
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
  grid-template-columns: 270px minmax(0, 1fr);
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

.page-main h3 {
  margin-top: 24px;
}

/* Tabelle */
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin: 20px 0;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  border: 1px solid #e2e8f0;
  padding: 10px 6px;
  text-align: center;
}

thead th {
  background: #eff6ff;
  color: #1e40af;
}

tbody th {
  background: #f8fafc;
  min-width: 150px;
}

tbody th input {
  max-width: 130px;
}

/* Buttons und Quartale */
button {
  cursor: pointer;
}

.quarter-button {
  width: 100%;
  min-width: 32px;
  padding: 8px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fafc;
  color: #2563eb;
}

.quarter-button:hover {
  background: #dbeafe;
}

.quarter-button.selected {
  background: #2563eb;
  color: white;
}

.lesson-button {
  border: 1px solid #93c5fd;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 8px;
  font-weight: 600;
}

.selection-notice {
  padding: 12px 16px;
  background: #eff6ff;
  border-radius: 10px;
  color: #1d4ed8;
  margin: 16px 0;
}

.error-message {
  color: #dc2626;
}

.danger-button {
  color: #b91c1c;
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

/* Responsive */
@media (max-width: 1100px) {
  .page-main {
    grid-template-columns: 220px minmax(0, 1fr);
  }
}

@media (max-width: 700px) {
  .header-inner {
    flex-direction: column;
    padding: 18px;
  }

  .site-nav {
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

  .footer-inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .footer-inner span:last-child {
    text-align: center;
  }
}
</style>
