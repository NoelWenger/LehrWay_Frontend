
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { request, json } from '../services/lehrway-api'

interface CourseField {
  id: number
  startQuarter: number
  lessons: number
}

interface CourseModule {
  id: number
  name: string
  fields: CourseField[]
}

interface Course {
  id: number
  name: string
  semesteranzahl: number
  modules: CourseModule[]
}

interface DBLehrgang {
  id: number
  bezeichnung: string
  semesteranzahl: number
}

interface DBModul {
  id: number
  bezeichnung: string
  lehrjahr: number
  semester: number
  quartal: number
  lektionen: number | null
  lehrgang_id: number
}

const quarters = Array.from({ length: 12 }, (_, i) => i + 1)

const courses = ref<Course[]>([])
const selectedCourseId = ref<number | null>(null)
const searchQuery = ref('')
const loading = ref(false)
const saving = ref(false)
const apiError = ref('')

const showCreateCourse = ref(false)
const newCourseName = ref('')
const newCourseSemesters = ref(6)
const editedCourseName = ref('')
const newModuleName = ref('')

const createCourseError = ref('')
const editCourseError = ref('')
const moduleError = ref('')
const fieldError = ref('')

const editingFieldId = ref<number | null>(null)
const editedLessons = ref(0)

const filteredCourses = computed(() =>
  courses.value.filter(course =>
    course.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const selectedCourse = computed(() =>
  courses.value.find(course => course.id === selectedCourseId.value)
)

function getError(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Ein unbekannter Fehler ist aufgetreten.'
}

// Datenbank-Quartal in Tabellenposition umrechnen
function getGlobalQuarter(module: DBModul) {
  return (module.lehrjahr - 1) * 4 + module.quartal
}

// Tabellenposition in Datenbankwerte umrechnen
function toDBQuarter(quarter: number) {
  const lehrjahr = Math.floor((quarter - 1) / 4) + 1
  const quartal = ((quarter - 1) % 4) + 1
  const semester = (lehrjahr - 1) * 2 + Math.ceil(quartal / 2)

  return { lehrjahr, semester, quartal }
}

// Lehrgänge und Module aus der Datenbank laden
async function loadCourses() {
  loading.value = true
  apiError.value = ''

  try {
    const dbCourses = await request<DBLehrgang[]>('/lehrgaenge')

    const loadedCourses = await Promise.all(
      dbCourses.map(async course => {
        const dbModules = await request<DBModul[]>(
          `/lehrgaenge/${course.id}/module`
        )

        // Datenbankeinträge mit gleichem Modulnamen
        // als eine Zeile im Lehrplan anzeigen.
        const moduleMap = new Map<string, CourseModule>()

        for (const entry of dbModules) {
          const key = entry.bezeichnung.trim().toLowerCase()
          let module = moduleMap.get(key)

          if (!module) {
            module = {
              id: entry.id,
              name: entry.bezeichnung,
              fields: []
            }
            moduleMap.set(key, module)
          }

          module.fields.push({
            id: entry.id,
            startQuarter: getGlobalQuarter(entry),
            lessons: entry.lektionen ?? 0
          })
        }

        return {
          id: course.id,
          name: course.bezeichnung,
          semesteranzahl: course.semesteranzahl,
          modules: [...moduleMap.values()]
        }
      })
    )

    courses.value = loadedCourses

    if (selectedCourseId.value !== null &&
      !courses.value.some(course => course.id === selectedCourseId.value)) {
      selectedCourseId.value = null
    }
  } catch (error) {
    apiError.value = getError(error)
    courses.value = []
  } finally {
    loading.value = false
  }
}

function selectCourse(id: number) {
  selectedCourseId.value = id
  editedCourseName.value = selectedCourse.value?.name ?? ''
  editingFieldId.value = null
  editCourseError.value = ''
  moduleError.value = ''
  fieldError.value = ''
}

// Lehrgang erstellen
async function createCourse() {
  const name = newCourseName.value.trim()
  createCourseError.value = ''

  if (!name) {
    createCourseError.value = 'Bitte einen Lehrgangsnamen eingeben.'
    return
  }

  if (courses.value.some(course =>
    course.name.toLowerCase() === name.toLowerCase()
  )) {
    createCourseError.value = 'Dieser Lehrgang existiert bereits.'
    return
  }

  saving.value = true

  try {
    await request('/lehrgaenge', json('POST', {
      bezeichnung: name,
      semesteranzahl: newCourseSemesters.value
    }))

    newCourseName.value = ''
    newCourseSemesters.value = 6
    showCreateCourse.value = false
    await loadCourses()
  } catch (error) {
    createCourseError.value = getError(error)
  } finally {
    saving.value = false
  }
}

function cancelCreateCourse() {
  showCreateCourse.value = false
  newCourseName.value = ''
  createCourseError.value = ''
}

// Lehrgang umbenennen
async function renameCourse() {
  if (!selectedCourse.value) return

  const name = editedCourseName.value.trim()
  editCourseError.value = ''

  if (!name) {
    editCourseError.value = 'Der Lehrgangsname darf nicht leer sein.'
    return
  }

  if (courses.value.some(course =>
    course.id !== selectedCourseId.value &&
    course.name.toLowerCase() === name.toLowerCase()
  )) {
    editCourseError.value = 'Dieser Lehrgang existiert bereits.'
    return
  }

  saving.value = true

  try {
    await request(
      `/lehrgaenge/${selectedCourse.value.id}`,
      json('PUT', { bezeichnung: name })
    )

    await loadCourses()
    editedCourseName.value = name
  } catch (error) {
    editCourseError.value = getError(error)
  } finally {
    saving.value = false
  }
}

// Lehrgang löschen
async function deleteCourse() {
  if (!selectedCourse.value) return

  if (!confirm('Möchtest du diesen Lehrgang wirklich löschen?')) {
    return
  }

  saving.value = true

  try {
    await request(
      `/lehrgaenge/${selectedCourse.value.id}`,
      json('DELETE')
    )

    selectedCourseId.value = null
    editedCourseName.value = ''
    editingFieldId.value = null
    await loadCourses()
  } catch (error) {
    apiError.value = getError(error)
  } finally {
    saving.value = false
  }
}

// Neues Modul erstellen
async function addModule() {
  if (!selectedCourse.value) return

  const name = newModuleName.value.trim()
  moduleError.value = ''

  if (!name) {
    moduleError.value = 'Bitte einen Modulnamen eingeben.'
    return
  }

  if (selectedCourse.value.modules.some(module =>
    module.name.toLowerCase() === name.toLowerCase()
  )) {
    moduleError.value = 'Dieses Modul existiert bereits.'
    return
  }

  saving.value = true

  try {
    // Die Datenbank hat keine separate Modultabelle.
    // Deshalb wird das Modul zunächst im ersten Quartal erstellt.
    await request(
      `/lehrgaenge/${selectedCourse.value.id}/module`,
      json('POST', {
        bezeichnung: name,
        ...toDBQuarter(1),
        lektionen: 0
      })
    )

    newModuleName.value = ''
    await loadCourses()
  } catch (error) {
    moduleError.value = getError(error)
  } finally {
    saving.value = false
  }
}

// Alle Datenbankeinträge eines Moduls löschen
async function removeModule(module: CourseModule) {
  if (!confirm(`Möchtest du das Modul "${module.name}" löschen?`)) {
    return
  }

  saving.value = true
  moduleError.value = ''

  try {
    for (const field of module.fields) {
      await request(`/lehrgang-module/${field.id}`, json('DELETE'))
    }

    await loadCourses()
  } catch (error) {
    moduleError.value = getError(error)
    await loadCourses()
  } finally {
    saving.value = false
  }
}

// Einzelnes Quartal erstellen
async function createField(module: CourseModule, quarter: number) {
  if (!selectedCourse.value) return
  if (getFieldAtQuarter(module, quarter)) return

  fieldError.value = ''
  saving.value = true

  try {
    await request(
      `/lehrgaenge/${selectedCourse.value.id}/module`,
      json('POST', {
        bezeichnung: module.name,
        ...toDBQuarter(quarter),
        lektionen: 0
      })
    )

    await loadCourses()
  } catch (error) {
    fieldError.value = getError(error)
  } finally {
    saving.value = false
  }
}

// Lektionen bearbeiten
function editField(field: CourseField) {
  editingFieldId.value = field.id
  editedLessons.value = field.lessons
  fieldError.value = ''
}

async function finishEditingField() {
  if (editingFieldId.value === null) return

  if (!Number.isInteger(editedLessons.value) || editedLessons.value < 0) {
    fieldError.value = 'Bitte eine gültige Lektionszahl eingeben.'
    return
  }

  saving.value = true
  fieldError.value = ''

  try {
    await request(
      `/lehrgang-module/${editingFieldId.value}`,
      json('PUT', { lektionen: editedLessons.value })
    )

    editingFieldId.value = null
    await loadCourses()
  } catch (error) {
    fieldError.value = getError(error)
  } finally {
    saving.value = false
  }
}

// Quartal löschen
async function removeField(fieldId: number) {
  if (!confirm('Möchtest du dieses Quartal löschen?')) return

  saving.value = true
  fieldError.value = ''

  try {
    await request(`/lehrgang-module/${fieldId}`, json('DELETE'))
    editingFieldId.value = null
    await loadCourses()
  } catch (error) {
    fieldError.value = getError(error)
  } finally {
    saving.value = false
  }
}

function getFieldAtQuarter(module: CourseModule, quarter: number) {
  return module.fields.find(field => field.startQuarter === quarter)
}

onMounted(loadCourses)
</script>

<template>
  <div class="page-shell">
    <!-- Navigation -->
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
      <p v-if="loading" class="status-message">
        Lehrgänge werden geladen...
      </p>

      <p v-if="apiError" class="error-message status-message" role="alert">
        {{ apiError }}
      </p>

      <!-- Lehrgangsliste -->
      <aside class="panel">
        <h2>Lehrgänge</h2>

        <button
          type="button"
          class="primary-button"
          :disabled="saving"
          @click="showCreateCourse = true"
        >
          + Lehrgang erstellen
        </button>

        <form
          v-if="showCreateCourse"
          class="form-stack"
          @submit.prevent="createCourse"
        >
          <input
            v-model="newCourseName"
            type="text"
            placeholder="Lehrgangsname"
            required
          >

          <label for="semesteranzahl">Anzahl Semester</label>
          <select id="semesteranzahl" v-model.number="newCourseSemesters">
            <option :value="2">2 Semester</option>
            <option :value="4">4 Semester</option>
            <option :value="6">6 Semester</option>
          </select>

          <button type="submit" class="primary-button" :disabled="saving">
            Erstellen
          </button>

          <button type="button" @click="cancelCreateCourse">
            Abbrechen
          </button>

          <p v-if="createCourseError" class="error-message">
            {{ createCourseError }}
          </p>
        </form>

        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Lehrgänge suchen"
        >

        <ul class="item-list">
          <li v-for="course in filteredCourses" :key="course.id">
            <button
              type="button"
              class="list-button"
              :class="{ selected: selectedCourseId === course.id }"
              @click="selectCourse(course.id)"
            >
              {{ course.name }}
            </button>
          </li>
        </ul>

        <p v-if="!loading && filteredCourses.length === 0">
          Keine Lehrgänge gefunden.
        </p>
      </aside>

      <!-- Lehrgang bearbeiten -->
      <section class="panel">
        <h2>Lehrgang bearbeiten</h2>

        <div v-if="selectedCourse">
          <h3>{{ selectedCourse.name }}</h3>

          <form class="form-stack" @submit.prevent="renameCourse">
            <label for="course-name">Lehrgangsname</label>

            <input
              id="course-name"
              v-model="editedCourseName"
              type="text"
              required
            >

            <button type="submit" class="primary-button" :disabled="saving">
              Namen speichern
            </button>

            <p v-if="editCourseError" class="error-message">
              {{ editCourseError }}
            </p>
          </form>

          <hr>

          <h3>Lehrplan</h3>
          <p class="help-text">
            Klicke auf +, um ein Quartal zu erstellen.
            Anschliessend kannst du die Lektionen eintragen.
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
              <tr
                v-for="module in selectedCourse.modules"
                :key="module.id"
              >
                <th>
                  <div class="module-name">{{ module.name }}</div>

                  <button
                    type="button"
                    class="danger-button"
                    :disabled="saving"
                    @click="removeModule(module)"
                  >
                    Entfernen
                  </button>
                </th>

                <td v-for="quarter in quarters" :key="quarter">
                  <template v-if="getFieldAtQuarter(module, quarter)">
                    <div
                      v-if="editingFieldId === getFieldAtQuarter(module, quarter)!.id"
                      class="lesson-editor"
                    >
                      <input
                        v-model.number="editedLessons"
                        type="number"
                        min="0"
                        placeholder="Lektionen"
                      >

                      <button
                        type="button"
                        :disabled="saving"
                        @click="finishEditingField"
                      >
                        Speichern
                      </button>

                      <button
                        type="button"
                        @click="editingFieldId = null"
                      >
                        Abbrechen
                      </button>

                      <button
                        type="button"
                        class="danger-button"
                        :disabled="saving"
                        @click="removeField(getFieldAtQuarter(module, quarter)!.id)"
                      >
                        Löschen
                      </button>
                    </div>

                    <button
                      v-else
                      type="button"
                      class="lesson-button"
                      :disabled="saving"
                      @click="editField(getFieldAtQuarter(module, quarter)!)"
                    >
                      {{ getFieldAtQuarter(module, quarter)!.lessons }}
                      Lektionen
                    </button>
                  </template>

                  <button
                    v-else
                    type="button"
                    class="quarter-button"
                    :disabled="saving"
                    @click="createField(module, quarter)"
                  >
                    +
                  </button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <p v-if="selectedCourse.modules.length === 0">
            Noch keine Module vorhanden.
          </p>

          <p v-if="fieldError" class="error-message">
            {{ fieldError }}
          </p>

          <form class="form-stack module-form" @submit.prevent="addModule">
            <label for="module-name">Neues Modul</label>

            <input
              id="module-name"
              v-model="newModuleName"
              type="text"
              placeholder="Modulname, z. B. M117"
              required
            >

            <button type="submit" class="primary-button" :disabled="saving">
              + Modul hinzufügen
            </button>
          </form>

          <p v-if="moduleError" class="error-message">
            {{ moduleError }}
          </p>

          <hr>

          <button
            type="button"
            class="danger-button delete-course"
            :disabled="saving"
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

.panel {
  min-width: 0;
  padding: 24px;
  background: white;
  border: 1px solid #e6eaf0;
  border-radius: 16px;
  box-shadow: 0 5px 22px rgba(15, 23, 42, 0.035);
}

.panel h2 {
  margin-top: 0;
  font-size: 20px;
}

.panel h3 {
  margin-top: 24px;
  font-size: 17px;
}

/* Formulare */
button {
  cursor: pointer;
  font-family: inherit;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0;
}

.primary-button {
  padding: 11px 14px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-weight: 600;
}

.primary-button:hover:not(:disabled) {
  background: #1d4ed8;
}

.search-input {
  margin-top: 18px;
}

.item-list {
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

/* Lehrplantabelle */
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
  min-width: 150px;
  background: #f8fafc;
}

.module-name {
  margin-bottom: 10px;
  font-weight: 600;
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

.quarter-button:hover:not(:disabled) {
  background: #dbeafe;
}

.lesson-button {
  padding: 8px;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.lesson-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 90px;
}

.lesson-editor input {
  padding: 6px;
}

.lesson-editor button {
  padding: 6px;
}

.help-text {
  color: #64748b;
}

.module-form {
  max-width: 340px;
  margin-top: 24px;
}

.error-message {
  color: #dc2626;
}

.status-message {
  grid-column: 1 / -1;
  margin: 0;
}

.danger-button {
  padding: 8px 10px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
}

.delete-course {
  margin-top: 12px;
  padding: 11px 14px;
}

hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 24px 0;
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
