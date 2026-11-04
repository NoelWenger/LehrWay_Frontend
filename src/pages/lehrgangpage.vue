<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { request, json } from '../services/lehrway-api'
import Footer from '@/components/Footer.vue'
import UserMenu from '@/components/UserMenu.vue'

interface CourseField {
  id: number
  startQuarter: number
  quarterSpan: number
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
  quartal_span: number
  lektionen: number | null
  lehrgang_id: number
}

interface QuarterSelection {
  moduleId: number
  startQuarter: number
}

interface DraggedField {
  courseId: number
  moduleId: number
  fieldId: number
}

interface DropTarget {
  moduleId: number
  quarter: number
  valid: boolean
}

interface SavedRange {
  id: number
  startQuarter: number
  endQuarter: number
  quarterSpan: number
  lessons: number
}

interface SavedPosition {
  id: number
  startQuarter: number
  endQuarter: number
  quarterSpan: number
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
const showModuleForm = ref(false)
const moduleNameInput = ref<HTMLInputElement | null>(null)

const createCourseError = ref('')
const editCourseError = ref('')
const moduleError = ref('')
const fieldError = ref('')

const selection = ref<QuarterSelection | null>(null)

const editingFieldId = ref<number | null>(null)
const editedLessons = ref(0)
const showRangeEditor = ref(false)
const editedStartQuarter = ref(1)
const editedEndQuarter = ref(1)

const draggedField = ref<DraggedField | null>(null)
const dropTarget = ref<DropTarget | null>(null)

const busy = computed(() => saving.value || loading.value)

const filteredCourses = computed(() =>
  courses.value.filter(course =>
    course.name.toLowerCase().includes(
      searchQuery.value.toLowerCase(),
    ),
  ),
)

const selectedCourse = computed(() =>
  courses.value.find(
    course => course.id === selectedCourseId.value,
  ),
)

const editingContext = computed(() => {
  if (
    editingFieldId.value === null ||
    !selectedCourse.value
  ) {
    return null
  }

  for (const module of selectedCourse.value.modules) {
    const field = module.fields.find(
      entry => entry.id === editingFieldId.value,
    )

    if (field) {
      return { module, field }
    }
  }

  return null
})

const startQuarterOptions = computed(() => {
  const context = editingContext.value
  if (!context) return []

  return quarters.map(quarter => ({
    quarter,
    available: isRangeAvailable(
      context.module,
      quarter,
      editedEndQuarter.value,
      context.field.id,
    ),
  }))
})

const endQuarterOptions = computed(() => {
  const context = editingContext.value
  if (!context) return []

  return quarters.map(quarter => ({
    quarter,
    available: isRangeAvailable(
      context.module,
      editedStartQuarter.value,
      quarter,
      context.field.id,
    ),
  }))
})

const editedRangeText = computed(() => {
  const start = editedStartQuarter.value
  const end = editedEndQuarter.value
  const count = end - start + 1

  return count === 1
    ? `Q${start} · 1 Quartal`
    : `Q${start} bis Q${end} · ${count} Quartale`
})

function getError(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Ein unbekannter Fehler ist aufgetreten.'
}

function getGlobalQuarter(module: DBModul) {
  return (Number(module.lehrjahr) - 1) * 4 +
    Number(module.quartal)
}

function toDBQuarter(quarter: number) {
  const lehrjahr = Math.floor((quarter - 1) / 4) + 1
  const quartal = ((quarter - 1) % 4) + 1
  const semester =
    (lehrjahr - 1) * 2 + Math.ceil(quartal / 2)

  return { lehrjahr, semester, quartal }
}

function getFieldRangeText(field: CourseField) {
  const start = field.startQuarter
  const end = start + field.quarterSpan - 1

  return field.quarterSpan === 1
    ? `Q${start}`
    : `Q${start}–Q${end}`
}

// --------------------------------------------------
// Lehrgänge laden
// --------------------------------------------------

async function loadCourses() {
  loading.value = true
  apiError.value = ''

  try {
    const dbCourses =
      await request<DBLehrgang[]>('/lehrgaenge')

    const loadedCourses = await Promise.all(
      dbCourses.map(async course => {
        const dbModules = await request<DBModul[]>(
          `/lehrgaenge/${course.id}/module`,
        )

        const moduleMap = new Map<string, CourseModule>()

        for (const entry of dbModules) {
          const key = entry.bezeichnung.trim().toLowerCase()
          let module = moduleMap.get(key)

          if (!module) {
            module = {
              id: Number(entry.id),
              name: entry.bezeichnung,
              fields: [],
            }

            moduleMap.set(key, module)
          }

          module.fields.push({
            id: Number(entry.id),
            startQuarter: getGlobalQuarter(entry),
            quarterSpan: Number(entry.quartal_span ?? 1),
            lessons: Number(entry.lektionen ?? 0),
          })
        }

        return {
          id: Number(course.id),
          name: course.bezeichnung,
          semesteranzahl: Number(course.semesteranzahl),
          modules: [...moduleMap.values()],
        }
      }),
    )

    courses.value = loadedCourses

    if (
      selectedCourseId.value !== null &&
      !courses.value.some(
        course => course.id === selectedCourseId.value,
      )
    ) {
      selectedCourseId.value = null
      showModuleForm.value = false
      newModuleName.value = ''
      selection.value = null
      cancelEditingField()
      clearDrag()
    }
  } catch (error) {
    // Bereits geladene Daten bleiben bei einem Ladefehler sichtbar.
    apiError.value = getError(error)
  } finally {
    loading.value = false
  }
}

function selectCourse(id: number) {
  if (busy.value) return

  selectedCourseId.value = id
  editedCourseName.value = selectedCourse.value?.name ?? ''

  selection.value = null
  cancelEditingField()

  editCourseError.value = ''
  moduleError.value = ''
  fieldError.value = ''

  showModuleForm.value = false
  newModuleName.value = ''

  clearDrag()
}

// --------------------------------------------------
// Lehrgänge verwalten
// --------------------------------------------------

async function createCourse() {
  if (busy.value) return

  const name = newCourseName.value.trim()
  createCourseError.value = ''

  if (!name || Array.from(name).length > 255) {
    createCourseError.value =
      'Bitte einen Lehrgangsnamen mit 1 bis 255 Zeichen eingeben.'
    return
  }

  if (
    courses.value.some(
      course =>
        course.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    createCourseError.value =
      'Dieser Lehrgang existiert bereits.'
    return
  }

  saving.value = true

  try {
    await request('/lehrgaenge', json('POST', {
      bezeichnung: name,
      semesteranzahl: newCourseSemesters.value,
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
  if (saving.value) return

  showCreateCourse.value = false
  newCourseName.value = ''
  createCourseError.value = ''
}

async function renameCourse() {
  const course = selectedCourse.value
  if (!course || busy.value) return

  const name = editedCourseName.value.trim()
  editCourseError.value = ''

  if (!name || Array.from(name).length > 255) {
    editCourseError.value =
      'Bitte einen Lehrgangsnamen mit 1 bis 255 Zeichen eingeben.'
    return
  }

  if (
    courses.value.some(
      other =>
        other.id !== course.id &&
        other.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    editCourseError.value =
      'Dieser Lehrgang existiert bereits.'
    return
  }

  saving.value = true

  try {
    await request(
      `/lehrgaenge/${course.id}`,
      json('PUT', { bezeichnung: name }),
    )

    course.name = name
    editedCourseName.value = name

    await loadCourses()
  } catch (error) {
    editCourseError.value = getError(error)
  } finally {
    saving.value = false
  }
}

async function deleteCourse() {
  const course = selectedCourse.value
  if (!course || busy.value) return

  if (!confirm('Möchtest du diesen Lehrgang wirklich löschen?')) {
    return
  }

  saving.value = true

  try {
    await request(
      `/lehrgaenge/${course.id}`,
      json('DELETE'),
    )

    courses.value = courses.value.filter(
      entry => entry.id !== course.id,
    )

    selectedCourseId.value = null
    selection.value = null
    cancelEditingField()

    editedCourseName.value = ''
    showModuleForm.value = false
    newModuleName.value = ''

    clearDrag()
    await loadCourses()
  } catch (error) {
    apiError.value = getError(error)
  } finally {
    saving.value = false
  }
}

// --------------------------------------------------
// Modulformular
// --------------------------------------------------

async function openModuleForm() {
  if (!selectedCourse.value || busy.value) return

  showModuleForm.value = true
  moduleError.value = ''

  await nextTick()

  moduleNameInput.value?.focus({
    preventScroll: true,
  })

  moduleNameInput.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  })
}

function cancelModuleForm() {
  if (saving.value) return

  showModuleForm.value = false
  newModuleName.value = ''
  moduleError.value = ''
}

// --------------------------------------------------
// Module
// --------------------------------------------------

async function addModule() {
  const course = selectedCourse.value
  if (!course || busy.value) return

  const name = newModuleName.value.trim()
  moduleError.value = ''

  if (!name || Array.from(name).length > 50) {
    moduleError.value =
      'Bitte einen Modulnamen mit 1 bis 50 Zeichen eingeben.'
    return
  }

  if (
    course.modules.some(
      module =>
        module.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    moduleError.value = 'Dieses Modul existiert bereits.'
    return
  }

  saving.value = true

  try {
    await request(
      `/lehrgaenge/${course.id}/module`,
      json('POST', {
        bezeichnung: name,
        ...toDBQuarter(1),
        quartal_span: 1,
        lektionen: 0,
      }),
    )

    newModuleName.value = ''
    showModuleForm.value = false

    await loadCourses()
  } catch (error) {
    moduleError.value = getError(error)
  } finally {
    saving.value = false
  }
}

async function removeModule(module: CourseModule) {
  if (busy.value) return

  if (!confirm(`Möchtest du das Modul "${module.name}" löschen?`)) {
    return
  }

  saving.value = true
  moduleError.value = ''

  try {
    // Die vorhandene Datenstruktur speichert jedes
    // Quartalsfeld als eigenen Datensatz.
    for (const field of [...module.fields]) {
      await request(
        `/lehrgang-module/${field.id}`,
        json('DELETE'),
      )

      module.fields = module.fields.filter(
        entry => entry.id !== field.id,
      )

      if (editingFieldId.value === field.id) {
        cancelEditingField()
      }
    }

    if (selection.value?.moduleId === module.id) {
      selection.value = null
    }

    const course = selectedCourse.value

    if (course) {
      course.modules = course.modules.filter(
        entry => entry.id !== module.id,
      )
    }

    await loadCourses()
  } catch (error) {
    moduleError.value = getError(error)
    await loadCourses()
  } finally {
    saving.value = false
  }
}

// --------------------------------------------------
// Quartalsfelder anlegen
// --------------------------------------------------

async function handleQuarterClick(
  module: CourseModule,
  quarter: number,
) {
  const course = selectedCourse.value

  if (
    !course ||
    busy.value ||
    draggedField.value ||
    editingFieldId.value !== null
  ) {
    return
  }

  fieldError.value = ''

  if (getFieldAtQuarter(module, quarter)) {
    fieldError.value = 'Dieses Quartal ist bereits belegt.'
    return
  }

  if (
    !selection.value ||
    selection.value.moduleId !== module.id
  ) {
    selection.value = {
      moduleId: module.id,
      startQuarter: quarter,
    }

    return
  }

  const start = Math.min(
    selection.value.startQuarter,
    quarter,
  )

  const end = Math.max(
    selection.value.startQuarter,
    quarter,
  )

  if (!isRangeAvailable(module, start, end)) {
    fieldError.value =
      'Zwischen diesen Quartalen befindet sich bereits ein anderes Feld.'
    return
  }

  saving.value = true

  try {
    await request(
      `/lehrgaenge/${course.id}/module`,
      json('POST', {
        bezeichnung: module.name,
        ...toDBQuarter(start),
        quartal_span: end - start + 1,
        lektionen: 0,
      }),
    )

    selection.value = null
    await loadCourses()
  } catch (error) {
    fieldError.value = getError(error)
  } finally {
    saving.value = false
  }
}

// --------------------------------------------------
// Lektionen und Bereich bearbeiten
// --------------------------------------------------

function editField(field: CourseField) {
  if (busy.value || draggedField.value) return

  editingFieldId.value = field.id
  editedLessons.value = field.lessons

  editedStartQuarter.value = field.startQuarter
  editedEndQuarter.value =
    field.startQuarter + field.quarterSpan - 1

  showRangeEditor.value = false
  selection.value = null
  fieldError.value = ''
}

function cancelEditingField() {
  editingFieldId.value = null
  showRangeEditor.value = false
  editedStartQuarter.value = 1
  editedEndQuarter.value = 1
  fieldError.value = ''
}

function openRangeEditor() {
  if (busy.value || !editingContext.value) return

  showRangeEditor.value = true
  fieldError.value = ''
}

async function finishEditingField() {
  const context = editingContext.value
  if (!context || busy.value) return

  if (
    !Number.isInteger(editedLessons.value) ||
    editedLessons.value < 0 ||
    editedLessons.value > 2147483647
  ) {
    fieldError.value =
      'Bitte eine gültige Lektionszahl eingeben.'
    return
  }

  const start = editedStartQuarter.value
  const end = editedEndQuarter.value

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    !isRangeAvailable(
      context.module,
      start,
      end,
      context.field.id,
    )
  ) {
    fieldError.value =
      'Bitte einen freien Bereich innerhalb von Q1 bis Q12 auswählen.'
    return
  }

  saving.value = true
  fieldError.value = ''

  try {
    const result = await request<SavedRange>(
      `/lehrgang-module/${context.field.id}/bereich`,
      json('PATCH', {
        startQuarter: start,
        endQuarter: end,
        lessons: editedLessons.value,
      }),
    )

    context.field.startQuarter = Number(result.startQuarter)
    context.field.quarterSpan = Number(result.quarterSpan)
    context.field.lessons = Number(result.lessons)

    cancelEditingField()
    await loadCourses()
  } catch (error) {
    fieldError.value = getError(error)
  } finally {
    saving.value = false
  }
}

async function removeField(fieldId: number) {
  if (busy.value) return

  if (!confirm('Möchtest du dieses Quartalsfeld löschen?')) {
    return
  }

  saving.value = true
  fieldError.value = ''

  try {
    await request(
      `/lehrgang-module/${fieldId}`,
      json('DELETE'),
    )

    const course = selectedCourse.value

    if (course) {
      for (const module of course.modules) {
        module.fields = module.fields.filter(
          field => field.id !== fieldId,
        )
      }

      course.modules = course.modules.filter(
        module => module.fields.length > 0,
      )
    }

    cancelEditingField()
    await loadCourses()
  } catch (error) {
    fieldError.value = getError(error)
  } finally {
    saving.value = false
  }
}

function getFieldAtStart(
  module: CourseModule,
  quarter: number,
) {
  return module.fields.find(
    field => field.startQuarter === quarter,
  )
}

function getFieldAtQuarter(
  module: CourseModule,
  quarter: number,
) {
  return module.fields.find(
    field =>
      quarter >= field.startQuarter &&
      quarter < field.startQuarter + field.quarterSpan,
  )
}

function isRangeAvailable(
  module: CourseModule,
  start: number,
  end: number,
  ignoredFieldId: number | null = null,
) {
  if (
    start < 1 ||
    end > quarters.length ||
    end < start
  ) {
    return false
  }

  return !module.fields.some(field => {
    if (field.id === ignoredFieldId) return false

    const fieldEnd =
      field.startQuarter + field.quarterSpan - 1

    return start <= fieldEnd && end >= field.startQuarter
  })
}

function shouldRenderQuarter(
  module: CourseModule,
  quarter: number,
) {
  const field = getFieldAtQuarter(module, quarter)

  return !field || field.startQuarter === quarter
}

function isSelectionStart(
  moduleId: number,
  quarter: number,
) {
  return (
    selection.value?.moduleId === moduleId &&
    selection.value?.startQuarter === quarter
  )
}

function cancelSelection() {
  selection.value = null
  fieldError.value = ''
}

// --------------------------------------------------
// Drag-and-drop
// --------------------------------------------------

function clearDrag() {
  draggedField.value = null
  dropTarget.value = null
}

function startDrag(
  event: DragEvent,
  module: CourseModule,
  field: CourseField,
) {
  if (
    busy.value ||
    editingFieldId.value !== null ||
    selectedCourseId.value === null ||
    !event.dataTransfer
  ) {
    event.preventDefault()
    return
  }

  draggedField.value = {
    courseId: selectedCourseId.value,
    moduleId: module.id,
    fieldId: field.id,
  }

  dropTarget.value = null
  selection.value = null
  fieldError.value = ''

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(field.id))
}

function findDraggedField(module: CourseModule) {
  const dragged = draggedField.value

  if (
    !dragged ||
    dragged.courseId !== selectedCourseId.value ||
    dragged.moduleId !== module.id
  ) {
    return undefined
  }

  return module.fields.find(
    field => field.id === dragged.fieldId,
  )
}

function quarterAtPointer(
  event: DragEvent,
  module: CourseModule,
  cellStartQuarter: number,
) {
  const cell = event.currentTarget as HTMLTableCellElement
  const rect = cell.getBoundingClientRect()

  const span =
    getFieldAtStart(module, cellStartQuarter)?.quarterSpan ?? 1

  if (rect.width <= 0) return cellStartQuarter

  const relativePosition =
    (event.clientX - rect.left) / rect.width

  const offset = Math.max(
    0,
    Math.min(
      span - 1,
      Math.floor(relativePosition * span),
    ),
  )

  return cellStartQuarter + offset
}

function canDropAt(
  module: CourseModule,
  quarter: number,
) {
  const field = findDraggedField(module)
  if (!field || busy.value) return false

  return isRangeAvailable(
    module,
    quarter,
    quarter + field.quarterSpan - 1,
    field.id,
  )
}

function handleDragOver(
  event: DragEvent,
  module: CourseModule,
  cellStartQuarter: number,
) {
  if (!draggedField.value) return

  event.preventDefault()

  const quarter = quarterAtPointer(
    event,
    module,
    cellStartQuarter,
  )

  const valid = canDropAt(module, quarter)

  dropTarget.value = {
    moduleId: module.id,
    quarter,
    valid,
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = valid ? 'move' : 'none'
  }
}

function clearDropTarget() {
  dropTarget.value = null
}

function dropCellClass(
  module: CourseModule,
  cellStartQuarter: number,
) {
  const target = dropTarget.value

  if (!target || target.moduleId !== module.id) {
    return {}
  }

  const span =
    getFieldAtStart(module, cellStartQuarter)?.quarterSpan ?? 1

  const containsTarget =
    target.quarter >= cellStartQuarter &&
    target.quarter < cellStartQuarter + span

  return {
    'drop-valid': containsTarget && target.valid,
    'drop-invalid': containsTarget && !target.valid,
  }
}

async function dropField(
  event: DragEvent,
  module: CourseModule,
  cellStartQuarter: number,
) {
  if (!draggedField.value) return

  event.preventDefault()

  const field = findDraggedField(module)

  const quarter = quarterAtPointer(
    event,
    module,
    cellStartQuarter,
  )

  if (!field) {
    fieldError.value =
      'Du kannst das Feld nur innerhalb derselben Modulzeile verschieben.'

    clearDrag()
    return
  }

  if (!canDropAt(module, quarter)) {
    fieldError.value =
      'Der Zielbereich ist belegt oder reicht über Q12 hinaus.'

    clearDrag()
    return
  }

  clearDrag()

  if (quarter === field.startQuarter) return

  saving.value = true
  fieldError.value = ''

  try {
    const result = await request<SavedPosition>(
      `/lehrgang-module/${field.id}/position`,
      json('PATCH', {
        startQuarter: quarter,
      }),
    )

    field.startQuarter = Number(result.startQuarter)
    field.quarterSpan = Number(result.quarterSpan)

    await loadCourses()
  } catch (error) {
    fieldError.value = getError(error)
  } finally {
    saving.value = false
  }
}

onMounted(loadCourses)
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/home" class="brand">
          Lehr<span>way</span>
        </router-link>

        <nav class="site-nav" aria-label="Hauptnavigation">
          <router-link to="/home" class="nav-link">
            Wochenplan
          </router-link>

          <router-link to="/lehrgang" class="nav-link">
            Lehrgänge
          </router-link>
        </nav>

        <UserMenu />
      </div>
    </header>

    <div class="page-intro">
      <h1>Lehrgänge verwalten</h1>
      <p>Organisiere Lehrgänge, Module und Lektionen.</p>
    </div>

    <main class="page-main">
      <p
        v-if="loading"
        class="status-message"
        role="status"
      >
        Lehrgänge werden geladen...
      </p>

      <p
        v-if="apiError"
        class="error-message status-message"
        role="alert"
      >
        {{ apiError }}
      </p>

      <!-- Lehrgangsliste -->
      <aside class="panel">
        <h2>Lehrgänge</h2>

        <button
          type="button"
          class="primary-button"
          :disabled="busy"
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
            maxlength="255"
            :disabled="busy"
            required
          >

          <label for="semesteranzahl">
            Anzahl Semester
          </label>

          <select
            id="semesteranzahl"
            v-model.number="newCourseSemesters"
            :disabled="busy"
          >
            <option :value="2">2 Semester</option>
            <option :value="4">4 Semester</option>
            <option :value="6">6 Semester</option>
          </select>

          <button
            type="submit"
            class="primary-button"
            :disabled="busy"
          >
            Erstellen
          </button>

          <button
            type="button"
            :disabled="busy"
            @click="cancelCreateCourse"
          >
            Abbrechen
          </button>

          <p
            v-if="createCourseError"
            class="error-message"
            role="alert"
          >
            {{ createCourseError }}
          </p>
        </form>

        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Lehrgänge suchen"
          aria-label="Lehrgänge suchen"
        >

        <ul class="item-list">
          <li
            v-for="course in filteredCourses"
            :key="course.id"
          >
            <button
              type="button"
              class="list-button"
              :class="{
                selected: selectedCourseId === course.id,
              }"
              :disabled="busy"
              @click="selectCourse(course.id)"
            >
              {{ course.name }}
            </button>
          </li>
        </ul>

        <p
          v-if="
            !loading &&
            filteredCourses.length === 0
          "
        >
          Keine Lehrgänge gefunden.
        </p>
      </aside>

      <!-- Lehrgang bearbeiten -->
      <section class="panel">
        <h2>Lehrgang bearbeiten</h2>

        <div v-if="selectedCourse">
          <h3>{{ selectedCourse.name }}</h3>

          <form
            class="form-stack"
            @submit.prevent="renameCourse"
          >
            <label for="course-name">
              Lehrgangsname
            </label>

            <input
              id="course-name"
              v-model="editedCourseName"
              type="text"
              maxlength="255"
              :disabled="busy"
              required
            >

            <button
              type="submit"
              class="primary-button"
              :disabled="busy"
            >
              Namen speichern
            </button>

            <p
              v-if="editCourseError"
              class="error-message"
              role="alert"
            >
              {{ editCourseError }}
            </p>
          </form>

          <hr>

          <h3>Lehrplan</h3>

          <p class="help-text">
            Klicke auf ein Lektionenfeld, um die Lektionen
            zu bearbeiten. Über „Quartale verbinden / Länge ändern“
            wählst du Start- und Endquartal.
            Zum Verschieben ziehst du das geschlossene Feld
            auf ein anderes Quartal derselben Modulzeile.
          </p>

          <p class="help-text">
            Neue Bereiche legst du an, indem du zuerst auf
            ein freies Startquartal und danach auf ein freies
            Endquartal desselben Moduls klickst.
          </p>

          <p
            v-if="draggedField && dropTarget"
            class="drag-notice"
            role="status"
          >
            <template v-if="dropTarget.valid">
              Neuer Start: Q{{ dropTarget.quarter }}.
              Zum Verschieben loslassen.
            </template>

            <template v-else>
              Hier kann das Feld nicht abgelegt werden.
            </template>
          </p>

          <div
            class="table-wrapper"
            @dragleave.self="clearDropTarget"
          >
            <table>
              <thead>
              <tr>
                <th rowspan="3">
                  <div class="module-heading">
                    <span>Module</span>

                    <button
                      type="button"
                      class="add-module-button"
                      :disabled="busy"
                      :aria-expanded="showModuleForm"
                      aria-controls="new-module-row"
                      @click="openModuleForm"
                    >
                      + Neues Modul hinzufügen
                    </button>
                  </div>
                </th>

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
                <th
                  v-for="quarter in quarters"
                  :key="quarter"
                >
                  Q{{ quarter }}
                </th>
              </tr>
              </thead>

              <tbody>
              <!-- Vorhandene Module -->
              <tr
                v-for="module in selectedCourse.modules"
                :key="module.id"
              >
                <th>
                  <div class="module-name">
                    {{ module.name }}
                  </div>

                  <button
                    type="button"
                    class="danger-button"
                    :disabled="busy"
                    @click="removeModule(module)"
                  >
                    Entfernen
                  </button>
                </th>

                <template
                  v-for="quarter in quarters"
                  :key="quarter"
                >
                  <td
                    v-if="
                        shouldRenderQuarter(module, quarter)
                      "
                    :colspan="
                        getFieldAtStart(module, quarter)?.quarterSpan ?? 1
                      "
                    :class="
                        dropCellClass(module, quarter)
                      "
                    @dragover="
                        handleDragOver($event, module, quarter)
                      "
                    @drop="
                        dropField($event, module, quarter)
                      "
                  >
                    <template
                      v-if="
                          getFieldAtStart(module, quarter)
                        "
                    >
                      <!-- Geöffnetes Lektionenfeld -->
                      <form
                        v-if="
                            editingFieldId ===
                            getFieldAtStart(module, quarter)!.id
                          "
                        class="lesson-editor"
                        @submit.prevent="finishEditingField"
                      >
                        <label
                          :for="
                              `lessons-${getFieldAtStart(module, quarter)!.id}`
                            "
                        >
                          Lektionen gesamt
                        </label>

                        <input
                          :id="
                              `lessons-${getFieldAtStart(module, quarter)!.id}`
                            "
                          v-model.number="editedLessons"
                          type="number"
                          min="0"
                          max="2147483647"
                          step="1"
                          :disabled="busy"
                          required
                        >

                        <button
                          v-if="!showRangeEditor"
                          type="button"
                          class="range-button"
                          :disabled="busy"
                          @click="openRangeEditor"
                        >
                          Quartale verbinden / Länge ändern
                        </button>

                        <div
                          v-if="showRangeEditor"
                          class="range-editor"
                        >
                          <label
                            :for="
                                `range-start-${getFieldAtStart(module, quarter)!.id}`
                              "
                          >
                            Von Quartal:
                          </label>

                          <select
                            :id="
                                `range-start-${getFieldAtStart(module, quarter)!.id}`
                              "
                            v-model.number="editedStartQuarter"
                            :disabled="busy"
                          >
                            <option
                              v-for="option in startQuarterOptions"
                              :key="option.quarter"
                              :value="option.quarter"
                              :disabled="!option.available"
                            >
                              Q{{ option.quarter }}
                              {{
                                option.available
                                  ? ''
                                  : '– nicht verfügbar'
                              }}
                            </option>
                          </select>

                          <label
                            :for="
                                `range-end-${getFieldAtStart(module, quarter)!.id}`
                              "
                          >
                            Bis Quartal:
                          </label>

                          <select
                            :id="
                                `range-end-${getFieldAtStart(module, quarter)!.id}`
                              "
                            v-model.number="editedEndQuarter"
                            :disabled="busy"
                          >
                            <option
                              v-for="option in endQuarterOptions"
                              :key="option.quarter"
                              :value="option.quarter"
                              :disabled="!option.available"
                            >
                              Q{{ option.quarter }}
                              {{
                                option.available
                                  ? ''
                                  : '– nicht verfügbar'
                              }}
                            </option>
                          </select>

                          <p class="range-preview">
                            {{ editedRangeText }}
                          </p>
                        </div>

                        <button
                          type="submit"
                          class="primary-button"
                          :disabled="busy"
                        >
                          Speichern
                        </button>

                        <button
                          type="button"
                          :disabled="busy"
                          @click="cancelEditingField"
                        >
                          Abbrechen
                        </button>

                        <button
                          type="button"
                          class="danger-button"
                          :disabled="busy"
                          @click="
                              removeField(
                                getFieldAtStart(module, quarter)!.id,
                              )
                            "
                        >
                          Löschen
                        </button>

                        <p
                          v-if="fieldError"
                          class="error-message"
                          role="alert"
                        >
                          {{ fieldError }}
                        </p>
                      </form>

                      <!-- Geschlossenes Lektionenfeld -->
                      <button
                        v-else
                        type="button"
                        class="lesson-button"
                        :class="{
                            dragging:
                              draggedField?.fieldId ===
                              getFieldAtStart(module, quarter)!.id,
                          }"
                        :disabled="busy"
                        :draggable="
                            !busy && editingFieldId === null
                          "
                        title="Klicken zum Bearbeiten, ziehen zum Verschieben"
                        @click="
                            editField(
                              getFieldAtStart(module, quarter)!,
                            )
                          "
                        @dragstart="
                            startDrag(
                              $event,
                              module,
                              getFieldAtStart(module, quarter)!,
                            )
                          "
                        @dragend="clearDrag"
                      >
                          <span>
                            {{
                              getFieldAtStart(module, quarter)!.lessons
                            }}
                            Lektionen
                          </span>

                        <!-- Untertitel bei jedem Feld -->
                        <small class="field-range">
                          {{
                            getFieldRangeText(
                              getFieldAtStart(module, quarter)!,
                            )
                          }}
                        </small>
                      </button>
                    </template>

                    <!-- Freies Quartal -->
                    <button
                      v-else
                      type="button"
                      class="quarter-button"
                      :class="{
                          selected: isSelectionStart(
                            module.id,
                            quarter,
                          ),
                        }"
                      :disabled="
                          busy || editingFieldId !== null
                        "
                      @click="
                          handleQuarterClick(module, quarter)
                        "
                    >
                      {{
                        isSelectionStart(module.id, quarter)
                          ? '●'
                          : '+'
                      }}
                    </button>
                  </td>
                </template>
              </tr>

              <!-- Neues Modul direkt in der Tabelle -->
              <tr
                v-if="showModuleForm"
                id="new-module-row"
                class="new-module-row"
              >
                <td>
                  <form
                    id="new-module-form"
                    class="inline-module-form"
                    @submit.prevent="addModule"
                  >
                    <label for="module-name">
                      Neues Modul
                    </label>

                    <input
                      id="module-name"
                      ref="moduleNameInput"
                      v-model="newModuleName"
                      type="text"
                      placeholder="Modulname, z. B. M117"
                      maxlength="50"
                      :disabled="busy"
                      required
                    >

                    <button
                      type="submit"
                      class="primary-button"
                      :disabled="
                          busy || !newModuleName.trim()
                        "
                    >
                      Modul speichern
                    </button>

                    <button
                      type="button"
                      :disabled="busy"
                      @click="cancelModuleForm"
                    >
                      Abbrechen
                    </button>

                    <p
                      v-if="moduleError"
                      class="error-message"
                      role="alert"
                    >
                      {{ moduleError }}
                    </p>
                  </form>
                </td>

                <td
                  :colspan="quarters.length"
                  class="new-module-placeholder"
                >
                  Gib links den Modulnamen ein und klicke
                  auf „Modul speichern“.
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <p
            v-if="
              selectedCourse.modules.length === 0 &&
              !showModuleForm
            "
          >
            Noch keine Module vorhanden.
          </p>

          <div
            v-if="selection"
            class="selection-notice"
          >
            <p>
              Startquartal Q{{ selection.startQuarter }}
              ausgewählt. Wähle ein zweites freies
              Quartal im gleichen Modul.
            </p>

            <button
              type="button"
              :disabled="busy"
              @click="cancelSelection"
            >
              Auswahl abbrechen
            </button>
          </div>

          <p
            v-if="
              fieldError &&
              editingFieldId === null
            "
            class="error-message"
            role="alert"
          >
            {{ fieldError }}
          </p>

          <p
            v-if="moduleError && !showModuleForm"
            class="error-message"
            role="alert"
          >
            {{ moduleError }}
          </p>

          <hr>

          <button
            type="button"
            class="danger-button delete-course"
            :disabled="busy"
            @click="deleteCourse"
          >
            Lehrgang löschen
          </button>
        </div>

        <p v-else>Kein Lehrgang ausgewählt.</p>
      </section>
    </main>

    <Footer />
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
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
  border-color: #2563eb;
}

button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
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

.module-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.add-module-button {
  max-width: 180px;
  padding: 7px 10px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: white;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.add-module-button:hover:not(:disabled) {
  background: #dbeafe;
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

.quarter-button.selected {
  background: #2563eb;
  color: white;
}

.lesson-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 8px;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.lesson-button[draggable="true"] {
  cursor: grab;
}

.lesson-button[draggable="true"]:active {
  cursor: grabbing;
}

.lesson-button.dragging {
  opacity: 0.4;
}

.field-range {
  font-size: 11px;
  font-weight: 400;
}

.lesson-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
  margin: 0;
  text-align: left;
}

.lesson-editor label {
  font-size: 12px;
  font-weight: 600;
}

.lesson-editor input,
.lesson-editor select,
.lesson-editor button {
  padding: 7px;
}

.range-button {
  border: 1px solid #93c5fd;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.range-button:hover:not(:disabled) {
  background: #dbeafe;
}

.range-editor {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 8px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.range-preview {
  margin: 0;
  color: #1d4ed8;
  font-size: 12px;
}

td.drop-valid {
  background: #dcfce7;
  box-shadow: inset 0 0 0 2px #16a34a;
}

td.drop-invalid {
  background: #fee2e2;
  box-shadow: inset 0 0 0 2px #dc2626;
}

.selection-notice,
.drag-notice {
  padding: 12px 16px;
  margin: 16px 0;
  background: #eff6ff;
  border-radius: 10px;
  color: #1d4ed8;
}

.help-text {
  color: #64748b;
}

.new-module-row > td {
  background: #f8fafc;
  vertical-align: top;
}

.inline-module-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 180px;
  margin: 0;
  text-align: left;
}

.inline-module-form label {
  font-weight: 600;
}

.new-module-placeholder {
  padding: 20px;
  color: #64748b;
  text-align: left;
}

.error-message {
  color: #dc2626;
  overflow-wrap: anywhere;
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
}
</style>
