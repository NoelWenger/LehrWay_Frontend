<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { request, json } from '../services/lehrway-api'
import Footer from '@/components/Footer.vue'
import UserMenu from '@/components/UserMenu.vue'
import ClassLabels from '@/components/ClassLabels.vue'

type Weekday =
  | 'Montag'
  | 'Dienstag'
  | 'Mittwoch'
  | 'Donnerstag'
  | 'Freitag'

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

interface ClassLabel {
  klasse_id: number
  label_id: number
  name: string
  farbe: string
}

interface LabelColorChange {
  label_id: number
  farbe: string
}

interface LabelRemoval {
  klasse_id: number
  label_id: number
}

const weekdays: Weekday[] = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
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
const saving = ref(false)

const classLabels = ref<ClassLabel[]>([])
const labelsLoading = ref(false)
const labelsLoaded = ref(false)
const labelLoadError = ref('')
const labelSaving = ref(false)

const busy = computed(() =>
  loading.value || saving.value || labelSaving.value,
)

const schoolYearLabel = computed(() =>
  `${currentYear.value}/${String(currentYear.value + 1).slice(-2)}`,
)

const filteredClasses = computed(() => {
  const search = searchQuery.value.trim().toLowerCase()

  return classes.value.filter(klasse =>
    klasse.name.toLowerCase().includes(search),
  )
})

const selectedClass = computed(() =>
  classes.value.find(
    klasse => klasse.id === selectedClassId.value,
  ),
)

const selectedClassRules = computed(() =>
  rules.value.filter(rule =>
    rule.classAId === selectedClassId.value ||
    rule.classBId === selectedClassId.value,
  ),
)

const availableRuleClasses = computed(() =>
  classes.value.filter(klasse =>
    klasse.id !== selectedClassId.value &&
    !selectedClassRules.value.some(rule =>
      rule.classAId === klasse.id ||
      rule.classBId === klasse.id,
    ),
  ),
)

const selectedClassLabels = computed(() =>
  getClassLabels(selectedClassId.value),
)

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Ein unbekannter Fehler ist aufgetreten.'
}

function normalizeColor(value: unknown): string {
  return typeof value === 'string' &&
  /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : '#0d6efd'
}

function getLabelTextColor(color: string): string {
  const hex = normalizeColor(color).slice(1)

  const channels = [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ].map(value => {
    const channel = value / 255

    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })

  const luminance =
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)

  return luminance > 0.179 ? '#000000' : '#ffffff'
}

function badgeStyle(color: string) {
  const background = normalizeColor(color)

  return {
    backgroundColor: background,
    color: getLabelTextColor(background),
  }
}

// --------------------------------------------------
// Labels laden und Ereignisse der Komponente übernehmen
// --------------------------------------------------

function getClassLabels(classId: number | null) {
  if (classId === null) return []

  return classLabels.value.filter(
    label => label.klasse_id === classId,
  )
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

    const uniqueLabels = new Map<string, ClassLabel>()

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

      uniqueLabels.set(`${classId}:${labelId}`, {
        klasse_id: classId,
        label_id: labelId,
        name: row.name,
        farbe: normalizeColor(row.farbe),
      })
    }

    classLabels.value = [...uniqueLabels.values()]
    labelsLoaded.value = true
  } catch (error) {
    labelsLoaded.value = false
    labelLoadError.value = getError(error)
  } finally {
    labelsLoading.value = false
  }
}

function onLabelSaved(assignment: ClassLabel) {
  // Bereits geladene Kopien desselben gemeinsamen Labels aktualisieren.
  for (const label of classLabels.value) {
    if (label.label_id === assignment.label_id) {
      label.name = assignment.name
      label.farbe = assignment.farbe
    }
  }

  classLabels.value = classLabels.value.filter(
    label =>
      label.klasse_id !== assignment.klasse_id ||
      label.label_id !== assignment.label_id,
  )

  classLabels.value.push(assignment)
}

function onLabelColorChanged(change: LabelColorChange) {
  for (const label of classLabels.value) {
    if (label.label_id === change.label_id) {
      label.farbe = normalizeColor(change.farbe)
    }
  }
}

function onLabelRemoved(removal: LabelRemoval) {
  classLabels.value = classLabels.value.filter(
    label =>
      label.klasse_id !== removal.klasse_id ||
      label.label_id !== removal.label_id,
  )
}

// --------------------------------------------------
// Wochenplan laden
// --------------------------------------------------

async function loadData() {
  if (loading.value) return

  loading.value = true
  apiError.value = ''

  const labelsRequest = loadLabels()

  try {
    const [
      dbClasses,
      dbRooms,
      dbRules,
      assignments,
      dbLehrgaenge,
    ] = await Promise.all([
      request<DBClass[]>('/klassen'),
      request<DBRoom[]>('/ressourcen'),
      request<DBRule[]>('/regeln'),
      request<DBAssignment[]>('/klasse-ressourcen'),
      request<DBLehrgang[]>('/lehrgaenge'),
    ])

    lehrgaenge.value = dbLehrgaenge.map(course => ({
      id: Number(course.id),
      bezeichnung: course.bezeichnung,
    }))

    roomCapacities.value = dbRooms.map(room => ({
      id: Number(room.id),
      day: room.wochentag,
      capacity: Number(room.anzahl_raeume),
    }))

    classes.value = dbClasses.map(klasse => ({
      id: Number(klasse.id),
      name: klasse.bezeichnung,
      lehrgang_id:
        klasse.lehrgang_id === null
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
    classes.value = []
    rules.value = []
    roomCapacities.value = []
    lehrgaenge.value = []
  } finally {
    await labelsRequest
    loading.value = false
  }
}

function selectClass(id: number) {
  if (busy.value) return

  selectedClassId.value = id
  editedClassName.value =
    selectedClass.value?.name ?? ''

  selectedRuleClassId.value = null
  editClassError.value = ''
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

// --------------------------------------------------
// Klassen verwalten
// --------------------------------------------------

async function createClass() {
  if (busy.value) return

  const name = newClassName.value.trim()
  classError.value = ''

  if (!name || Array.from(name).length > 50) {
    classError.value =
      'Bitte einen Klassennamen mit 1 bis 50 Zeichen eingeben.'
    return
  }

  if (selectedLehrgangId.value === null) {
    classError.value = 'Bitte einen Lehrgang auswählen.'
    return
  }

  const courseId = selectedLehrgangId.value

  await saveChange(async () => {
    await request('/klassen', json('POST', {
      bezeichnung: name,
      lehrgang_id: courseId,
      anzahl_schultage_woche: 0,
    }))

    newClassName.value = ''
    selectedLehrgangId.value = null
    showCreateClass.value = false
  }, message => {
    classError.value = message
  })
}

function cancelCreateClass() {
  if (busy.value) return

  showCreateClass.value = false
  newClassName.value = ''
  selectedLehrgangId.value = null
  classError.value = ''
}

async function renameClass() {
  const klasse = selectedClass.value
  if (!klasse || busy.value) return

  const name = editedClassName.value.trim()
  editClassError.value = ''

  if (!name || Array.from(name).length > 50) {
    editClassError.value =
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
    editClassError.value = message
  })
}

async function deleteClass() {
  const klasse = selectedClass.value
  if (!klasse || busy.value) return

  if (!confirm('Möchtest du diese Klasse wirklich löschen?')) {
    return
  }

  await saveChange(async () => {
    await request(`/klassen/${klasse.id}`, json('DELETE'))

    classLabels.value = classLabels.value.filter(
      label => label.klasse_id !== klasse.id,
    )

    selectedClassId.value = null
    selectedRuleClassId.value = null
  }, message => {
    apiError.value = message
  })
}

// --------------------------------------------------
// Schultage und Räume
// --------------------------------------------------

function hasSchool(klasse: SchoolClass, day: Weekday) {
  return klasse.schoolDays.includes(day)
}

async function toggleSchoolDay(
  klasse: SchoolClass,
  day: Weekday,
) {
  if (busy.value) return

  const room = roomCapacities.value.find(
    entry => entry.day === day,
  )

  if (!room) {
    apiError.value = `Keine Ressource für ${day} gefunden.`
    return
  }

  const assigned = hasSchool(klasse, day)

  await saveChange(async () => {
    if (assigned) {
      await request(
        `/klasse-ressourcen/${klasse.id}/${room.id}`,
        json('DELETE'),
      )
    } else {
      await request('/klasse-ressourcen', json('POST', {
        klasse_id: klasse.id,
        ressourcen_id: room.id,
      }))
    }
  }, message => {
    apiError.value = message
  })
}

function getUsedRooms(day: Weekday) {
  return classes.value.filter(
    klasse => hasSchool(klasse, day),
  ).length
}

function getRoomCapacity(day: Weekday) {
  return roomCapacities.value.find(
    room => room.day === day,
  )?.capacity ?? 0
}

async function changeRoomCapacity(
  day: Weekday,
  amount: number,
) {
  if (busy.value) return

  const room = roomCapacities.value.find(
    entry => entry.day === day,
  )

  if (!room) return

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

function hasRoomConflict(day: Weekday) {
  return getUsedRooms(day) > getRoomCapacity(day)
}

function getRoomConflictText(day: Weekday) {
  const missing =
    getUsedRooms(day) - getRoomCapacity(day)

  return `${missing} ${missing === 1 ? 'Raum' : 'Räume'} zu wenig`
}

// --------------------------------------------------
// Konfliktregeln
// --------------------------------------------------

async function addRule() {
  const klasse = selectedClass.value
  const otherId = selectedRuleClassId.value

  if (!klasse || otherId === null || busy.value) return

  await saveChange(async () => {
    await request('/regeln', json('POST', {
      klasse_a_id: klasse.id,
      klasse_b_id: otherId,
    }))

    selectedRuleClassId.value = null
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

function getOtherClassId(
  rule: ClassRule,
  classId: number,
) {
  return rule.classAId === classId
    ? rule.classBId
    : rule.classAId
}

function getOtherClassName(
  rule: ClassRule,
  classId: number,
) {
  const id = getOtherClassId(rule, classId)

  return classes.value.find(
    klasse => klasse.id === id,
  )?.name ?? 'Unbekannt'
}

function getConflictingClasses(
  klasse: SchoolClass,
  day: Weekday,
) {
  if (!hasSchool(klasse, day)) return []

  return rules.value
    .filter(rule =>
      rule.classAId === klasse.id ||
      rule.classBId === klasse.id,
    )
    .map(rule =>
      classes.value.find(
        other =>
          other.id === getOtherClassId(rule, klasse.id),
      ),
    )
    .filter((other): other is SchoolClass =>
      other !== undefined && hasSchool(other, day),
    )
}

function getConflictText(
  klasse: SchoolClass,
  day: Weekday,
) {
  return getConflictingClasses(klasse, day)
    .map(other =>
      `${klasse.name} und ${other.name} ` +
      'dürfen nicht gleichzeitig Schule haben.',
    )
    .join('\n')
}

function changeSchoolYear(_direction: number) {
  apiError.value =
    'Der Schuljahreswechsel benötigt noch eine ' +
    'Schuljahr-Zuordnung in der Datenbank.'
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

      <p v-if="apiError" class="api-error" role="alert">
        {{ apiError }}
      </p>

      <!-- Klassenübersicht -->
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
            v-model="selectedLehrgangId"
            :disabled="busy"
            required
          >
            <option :value="null" disabled>
              Lehrgang auswählen
            </option>

            <option
              v-for="lehrgang in lehrgaenge"
              :key="lehrgang.id"
              :value="lehrgang.id"
            >
              {{ lehrgang.bezeichnung }}
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

          <p v-if="classError" class="api-error">
            {{ classError }}
          </p>
        </form>

        <input
          v-model="searchQuery"
          type="search"
          placeholder="Klassen suchen"
          aria-label="Klassen suchen"
          class="search-input"
        >

        <ul class="item-list">
          <li
            v-for="klasse in filteredClasses"
            :key="klasse.id"
          >
            <button
              type="button"
              class="list-button"
              :class="{
                selected: selectedClassId === klasse.id,
              }"
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

      <!-- Wochenplan -->
      <section class="panel">
        <div class="section-heading">
          <h2>Wochenansicht</h2>

          <div class="year-navigation">
            <button
              type="button"
              :disabled="busy"
              aria-label="Vorheriges Schuljahr"
              @click="changeSchoolYear(-1)"
            >
              ←
            </button>

            <strong>{{ schoolYearLabel }}</strong>

            <button
              type="button"
              :disabled="busy"
              aria-label="Nächstes Schuljahr"
              @click="changeSchoolYear(1)"
            >
              →
            </button>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
            <tr>
              <th scope="col">Klasse</th>

              <th
                v-for="day in weekdays"
                :key="day"
                scope="col"
              >
                {{ day }}
              </th>
            </tr>
            </thead>

            <tbody>
            <tr
              v-for="klasse in classes"
              :key="klasse.id"
            >
              <th
                scope="row"
                class="class-name-cell"
                :class="{
                    'selected-class-cell':
                      selectedClassId === klasse.id,
                  }"
              >
                  <span class="table-class-name">
                    {{ klasse.name }}
                  </span>

                <div
                  v-if="
                      selectedClassId === klasse.id &&
                      getClassLabels(klasse.id).length
                    "
                  class="table-labels"
                  :aria-label="`Labels von ${klasse.name}`"
                >
                    <span
                      v-for="label in getClassLabels(klasse.id)"
                      :key="label.label_id"
                      class="table-label-badge"
                      :style="badgeStyle(label.farbe)"
                    >
                      {{ label.name }}
                    </span>
                </div>
              </th>

              <td
                v-for="day in weekdays"
                :key="day"
              >
                <button
                  type="button"
                  class="school-day-button"
                  :class="{
                      active: hasSchool(klasse, day),
                    }"
                  :disabled="busy"
                  @click="toggleSchoolDay(klasse, day)"
                >
                  {{ hasSchool(klasse, day) ? 'Schule' : '–' }}

                  <span
                    v-if="
                        getConflictingClasses(klasse, day).length
                      "
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
              <th scope="row">Räume</th>

              <td
                v-for="day in weekdays"
                :key="day"
              >
                <div class="room-controls">
                    <span>
                      {{ getUsedRooms(day) }} /
                      {{ getRoomCapacity(day) }}
                    </span>

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
                      :disabled="busy"
                      :aria-label="`${day}: Raumanzahl erhöhen`"
                      @click="changeRoomCapacity(day, 1)"
                    >
                      ▲
                    </button>

                    <button
                      type="button"
                      :disabled="
                          busy || getRoomCapacity(day) === 0
                        "
                      :aria-label="`${day}: Raumanzahl verringern`"
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

          <form
            class="form-stack"
            @submit.prevent="renameClass"
          >
            <label for="class-name">
              Klassenname
            </label>

            <input
              id="class-name"
              v-model="editedClassName"
              type="text"
              maxlength="50"
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

            <p v-if="editClassError" class="api-error">
              {{ editClassError }}
            </p>
          </form>

          <!-- Ausgelagerte Label-Verwaltung -->
          <ClassLabels
            :key="selectedClass.id"
            :class-id="selectedClass.id"
            :labels="selectedClassLabels"
            :loading="labelsLoading"
            :ready="labelsLoaded"
            :load-error="labelLoadError"
            :disabled="loading || saving"
            @reload="loadLabels"
            @busy-change="labelSaving = $event"
            @saved="onLabelSaved"
            @color-changed="onLabelColorChanged"
            @removed="onLabelRemoved"
          />

          <h3>Regeln</h3>

          <form
            class="form-stack"
            @submit.prevent="addRule"
          >
            <label for="rule-class">
              Darf nicht am gleichen Tag wie:
            </label>

            <select
              id="rule-class"
              v-model="selectedRuleClassId"
              :disabled="busy"
            >
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

            <button
              type="submit"
              :disabled="
                busy || selectedRuleClassId === null
              "
            >
              Regel hinzufügen
            </button>
          </form>

          <ul class="rule-list">
            <li
              v-for="rule in selectedClassRules"
              :key="rule.id"
            >
              <span>
                {{
                  getOtherClassName(
                    rule,
                    selectedClass.id,
                  )
                }}
              </span>

              <button
                type="button"
                :disabled="busy"
                @click="removeRule(rule.id)"
              >
                Entfernen
              </button>
            </li>
          </ul>

          <button
            type="button"
            class="danger-button"
            :disabled="busy"
            @click="deleteClass"
          >
            Klasse löschen
          </button>
        </div>

        <p v-else>Wähle eine Klasse aus.</p>
      </aside>
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
  margin: 0 0 8px;
  font-size: 36px;
  font-weight: 800;
}

.page-intro p {
  margin: 0;
  color: #64748b;
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
  margin-top: 24px;
  font-size: 16px;
}

button {
  cursor: pointer;
  font-family: inherit;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
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

.class-name-cell {
  min-width: 110px;
  max-width: 190px;
  vertical-align: middle;
}

.table-class-name {
  display: block;
}

.selected-class-cell {
  box-shadow: inset 3px 0 0 #2563eb;
}

.table-labels {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
  margin-top: 9px;
}

.table-label-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
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

.api-error {
  overflow-wrap: anywhere;
}

.danger-button {
  padding: 10px 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
}

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
}
</style>
