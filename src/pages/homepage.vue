<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { request, json } from '../services/lehrway-api'
import Footer from '@/components/Footer.vue'
import UserMenu from '@/components/UserMenu.vue'
import WeeklySchedule from '@/components/WeeklySchedule.vue'
import ClassEditor from '@/components/ClassEditor.vue'
import { confirmAction } from '@/composables/useConfirm'

import type {
  ClassLabel,
  ClassRule,
  LabelColorChange,
  LabelRemoval,
  RoomCapacity,
  SchoolClass,
  Weekday,
} from '@/types/lehrway'

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

const classes = ref<SchoolClass[]>([])
const rules = ref<ClassRule[]>([])
const rooms = ref<RoomCapacity[]>([])
const courses = ref<DBLehrgang[]>([])
const labels = ref<ClassLabel[]>([])

const searchQuery = ref('')
const selectedClassId = ref<number | null>(null)

const loading = ref(false)
const saving = ref(false)
const labelSaving = ref(false)
const labelsLoading = ref(false)
const labelsReady = ref(false)

const apiError = ref('')
const classError = ref('')
const editError = ref('')
const labelLoadError = ref('')

const showCreateClass = ref(false)
const newClassName = ref('')
const selectedCourseId = ref<number | null>(null)

const currentYear = new Date().getFullYear()
const schoolYear =
  `${currentYear}/${String(currentYear + 1).slice(-2)}`

const busy = computed(() =>
  loading.value || saving.value || labelSaving.value,
)

const selectedClass = computed(() =>
  classes.value.find(
    klasse => klasse.id === selectedClassId.value,
  ) ?? null,
)

const selectedLabels = computed(() =>
  labels.value.filter(
    label => label.klasse_id === selectedClassId.value,
  ),
)

const filteredClasses = computed(() => {
  const search = searchQuery.value.trim().toLowerCase()

  return classes.value.filter(
    klasse => klasse.name.toLowerCase().includes(search),
  )
})

function getError(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Ein unbekannter Fehler ist aufgetreten.'
}

function normalizeColor(value: unknown) {
  return typeof value === 'string' &&
  /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : '#0d6efd'
}

async function loadLabels() {
  if (labelsLoading.value) return

  labelsLoading.value = true
  labelLoadError.value = ''

  try {
    const rows = await request<ClassLabel[]>('/klasse-labels')

    if (!Array.isArray(rows)) {
      throw new Error('Die API hat keine Label-Liste zurückgegeben.')
    }

    const result = new Map<string, ClassLabel>()

    for (const row of rows) {
      const classId = Number(row.klasse_id)
      const labelId = Number(row.label_id)

      if (
        !Number.isSafeInteger(classId) ||
        classId <= 0 ||
        !Number.isSafeInteger(labelId) ||
        labelId <= 0 ||
        typeof row.name !== 'string'
      ) {
        throw new Error('Die API hat ungültige Label-Daten zurückgegeben.')
      }

      result.set(`${classId}:${labelId}`, {
        klasse_id: classId,
        label_id: labelId,
        name: row.name,
        farbe: normalizeColor(row.farbe),
      })
    }

    labels.value = [...result.values()]
    labelsReady.value = true
  } catch (error) {
    labelsReady.value = false
    labelLoadError.value = getError(error)
  } finally {
    labelsLoading.value = false
  }
}

async function loadData() {
  if (loading.value) return

  loading.value = true
  apiError.value = ''

  const labelRequest = loadLabels()

  try {
    const [
      dbClasses,
      dbRooms,
      dbRules,
      assignments,
      dbCourses,
    ] = await Promise.all([
      request<DBClass[]>('/klassen'),
      request<DBRoom[]>('/ressourcen'),
      request<DBRule[]>('/regeln'),
      request<DBAssignment[]>('/klasse-ressourcen'),
      request<DBLehrgang[]>('/lehrgaenge'),
    ])

    courses.value = dbCourses.map(course => ({
      id: Number(course.id),
      bezeichnung: course.bezeichnung,
    }))

    rooms.value = dbRooms.map(room => ({
      id: Number(room.id),
      day: room.wochentag,
      capacity: Number(room.anzahl_raeume),
    }))

    classes.value = dbClasses.map(klasse => ({
      id: Number(klasse.id),
      name: klasse.bezeichnung,
      lehrgang_id:
        klasse.lehrgang_id == null
          ? null
          : Number(klasse.lehrgang_id),
      schoolDays: dbRooms
        .filter(room =>
          assignments.some(assignment =>
            Number(assignment.klasse_id) === Number(klasse.id) &&
            Number(assignment.ressourcen_id) === Number(room.id),
          ),
        )
        .map(room => room.wochentag),
    }))

    rules.value = dbRules.map(rule => ({
      id: Number(rule.id),
      classAId: Number(rule.klasse_a_id),
      classBId: Number(rule.klasse_b_id),
    }))

    if (
      selectedClassId.value !== null &&
      !classes.value.some(
        klasse => klasse.id === selectedClassId.value,
      )
    ) {
      selectedClassId.value = null
    }
  } catch (error) {
    apiError.value = getError(error)
  } finally {
    await labelRequest
    loading.value = false
  }
}

async function saveChange(
  operation: () => Promise<void>,
  setError: (message: string) => void,
) {
  if (busy.value) return

  saving.value = true
  setError('')

  try {
    await operation()
    await loadData()
  } catch (error) {
    setError(getError(error))
  } finally {
    saving.value = false
  }
}

function selectClass(id: number) {
  if (busy.value) return

  selectedClassId.value = id
  editError.value = ''
}

async function createClass() {
  const name = newClassName.value.trim()
  classError.value = ''

  if (!name || Array.from(name).length > 50) {
    classError.value =
      'Bitte einen Klassennamen mit 1 bis 50 Zeichen eingeben.'
    return
  }

  const courseId = selectedCourseId.value

  if (courseId === null) {
    classError.value = 'Bitte einen Lehrgang auswählen.'
    return
  }

  await saveChange(async () => {
    await request('/klassen', json('POST', {
      bezeichnung: name,
      lehrgang_id: courseId,
      anzahl_schultage_woche: 0,
    }))

    newClassName.value = ''
    selectedCourseId.value = null
    showCreateClass.value = false
  }, message => {
    classError.value = message
  })
}

function cancelCreateClass() {
  if (busy.value) return

  showCreateClass.value = false
  newClassName.value = ''
  selectedCourseId.value = null
  classError.value = ''
}

async function renameClass(value: string) {
  const klasse = selectedClass.value
  if (!klasse || busy.value) return

  const name = value.trim()
  editError.value = ''

  if (!name || Array.from(name).length > 50) {
    editError.value =
      'Bitte einen Klassennamen mit 1 bis 50 Zeichen eingeben.'
    return
  }

  await saveChange(async () => {
    await request(
      `/klassen/${klasse.id}`,
      json('PUT', { bezeichnung: name }),
    )

    klasse.name = name
  }, message => {
    editError.value = message
  })
}

async function deleteClass() {
  const klasse = selectedClass.value
  if (!klasse || busy.value) return

  const confirmed = await confirmAction({
    title: 'Klasse löschen?',
    message:
      `Möchtest du die Klasse „${klasse.name}“ wirklich löschen? ` +
      'Ihre Module und Zuordnungen werden ebenfalls entfernt.',
    confirmLabel: 'Klasse löschen',
    tone: 'danger',
  })

  if (!confirmed) return

  await saveChange(async () => {
    await request(`/klassen/${klasse.id}`, json('DELETE'))

    classes.value = classes.value.filter(
      entry => entry.id !== klasse.id,
    )

    labels.value = labels.value.filter(
      label => label.klasse_id !== klasse.id,
    )

    selectedClassId.value = null
  }, message => {
    apiError.value = message
  })
}

async function toggleSchoolDay(classId: number, day: Weekday) {
  const klasse = classes.value.find(entry => entry.id === classId)
  const room = rooms.value.find(entry => entry.day === day)

  if (!klasse || busy.value) return

  if (!room) {
    apiError.value = `Keine Ressource für ${day} gefunden.`
    return
  }

  const assigned = klasse.schoolDays.includes(day)

  await saveChange(async () => {
    if (assigned) {
      await request(
        `/klasse-ressourcen/${classId}/${room.id}`,
        json('DELETE'),
      )
    } else {
      await request('/klasse-ressourcen', json('POST', {
        klasse_id: classId,
        ressourcen_id: room.id,
      }))
    }
  }, message => {
    apiError.value = message
  })
}

async function changeCapacity(day: Weekday, amount: number) {
  const room = rooms.value.find(entry => entry.day === day)
  if (!room || busy.value) return

  await saveChange(async () => {
    await request(
      `/ressourcen/${room.id}`,
      json('PUT', {
        anzahl_raeume: Math.max(0, room.capacity + amount),
      }),
    )
  }, message => {
    apiError.value = message
  })
}

async function addRule(otherId: number) {
  const klasse = selectedClass.value
  if (!klasse || busy.value) return

  await saveChange(async () => {
    await request('/regeln', json('POST', {
      klasse_a_id: klasse.id,
      klasse_b_id: otherId,
    }))
  }, message => {
    apiError.value = message
  })
}

async function removeRule(ruleId: number) {
  await saveChange(async () => {
    await request(`/regeln/${ruleId}`, json('DELETE'))
  }, message => {
    apiError.value = message
  })
}

function onLabelSaved(assignment: ClassLabel) {
  for (const label of labels.value) {
    if (label.label_id === assignment.label_id) {
      label.name = assignment.name
      label.farbe = assignment.farbe
    }
  }

  labels.value = labels.value.filter(
    label =>
      label.klasse_id !== assignment.klasse_id ||
      label.label_id !== assignment.label_id,
  )

  labels.value.push(assignment)
}

function onLabelColorChanged(change: LabelColorChange) {
  for (const label of labels.value) {
    if (label.label_id === change.label_id) {
      label.farbe = normalizeColor(change.farbe)
    }
  }
}

function onLabelRemoved(removal: LabelRemoval) {
  labels.value = labels.value.filter(
    label =>
      label.klasse_id !== removal.klasse_id ||
      label.label_id !== removal.label_id,
  )
}

function changeSchoolYear(_direction: number) {
  apiError.value =
    'Der Schuljahreswechsel benötigt noch eine ' +
    'Schuljahr-Zuordnung in der Datenbank.'
}

onMounted(loadData)
</script>

<template>
  <div class="page-shell page-home">
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
      <h1>Wochenübersicht</h1>
      <p>Plane Klassen, Schultage und verfügbare Räume.</p>
    </div>

    <main class="page-main">
      <p v-if="loading" class="status-message" role="status">
        Daten werden geladen...
      </p>

      <p v-if="apiError" class="status-message error" role="alert">
        {{ apiError }}
      </p>

      <aside class="panel">
        <h2>Klassen</h2>

        <button
          type="button"
          class="primary-button"
          :disabled="busy"
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
            maxlength="50"
            :disabled="busy"
            required
          >

          <select
            v-model="selectedCourseId"
            :disabled="busy"
            required
          >
            <option :value="null" disabled>
              Lehrgang auswählen
            </option>
            <option
              v-for="course in courses"
              :key="course.id"
              :value="course.id"
            >
              {{ course.bezeichnung }}
            </option>
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
            @click="cancelCreateClass"
          >
            Abbrechen
          </button>

          <p v-if="classError" class="error" role="alert">
            {{ classError }}
          </p>
        </form>

        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          placeholder="Klassen suchen"
          aria-label="Klassen suchen"
        >

        <ul class="item-list">
          <li v-for="klasse in filteredClasses" :key="klasse.id">
            <button
              type="button"
              class="list-button"
              :class="{ selected: selectedClassId === klasse.id }"
              :disabled="busy"
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

      <WeeklySchedule
        class="panel"
        :classes="classes"
        :rules="rules"
        :rooms="rooms"
        :labels="labels"
        :selected-class-id="selectedClassId"
        :school-year="schoolYear"
        :busy="busy"
        @toggle-day="toggleSchoolDay"
        @change-capacity="changeCapacity"
        @change-year="changeSchoolYear"
      />

      <ClassEditor
        class="panel class-editor"
        :school-class="selectedClass"
        :classes="classes"
        :rules="rules"
        :labels="selectedLabels"
        :busy="busy"
        :error="editError"
        :labels-loading="labelsLoading"
        :labels-ready="labelsReady"
        :label-load-error="labelLoadError"
        @rename="renameClass"
        @delete="deleteClass"
        @add-rule="addRule"
        @remove-rule="removeRule"
        @reload-labels="loadLabels"
        @label-busy="labelSaving = $event"
        @label-saved="onLabelSaved"
        @label-color-changed="onLabelColorChanged"
        @label-removed="onLabelRemoved"
      />
    </main>

    <Footer />
  </div>
</template>

