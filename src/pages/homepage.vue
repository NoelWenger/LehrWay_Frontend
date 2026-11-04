<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { request, json } from '../services/lehrway-api'
import Footer from '@/components/Footer.vue'
import UserMenu from '@/components/UserMenu.vue'

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

interface DBClassLabel {
  klasse_id: number
  label_id: number
  name: string
  farbe: string
}

const weekdays: Weekday[] = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
]

const labelColors = [
  { name: 'Blau', value: '#0d6efd' },
  { name: 'Grau', value: '#6c757d' },
  { name: 'Grün', value: '#198754' },
  { name: 'Rot', value: '#dc3545' },
  { name: 'Gelb', value: '#ffc107' },
  { name: 'Türkis', value: '#0dcaf0' },
  { name: 'Hell', value: '#f8f9fa' },
  { name: 'Dunkel', value: '#212529' },
]

const defaultLabelColor = '#0d6efd'

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

// Labels
const classLabels = ref<DBClassLabel[]>([])
const newLabelName = ref('')
const newLabelColor = ref(defaultLabelColor)
const labelError = ref('')
const labelLoadError = ref('')
const labelsLoading = ref(false)
const labelsLoaded = ref(false)
const labelSaving = ref(false)

const schoolYearLabel = computed(() =>
  `${currentYear.value}/${String(currentYear.value + 1).slice(-2)}`,
)

const filteredClasses = computed(() =>
  classes.value.filter(klasse =>
    klasse.name.toLowerCase().includes(
      searchQuery.value.toLowerCase(),
    ),
  ),
)

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

const labelsBusy = computed(() =>
  loading.value ||
  labelsLoading.value ||
  labelSaving.value,
)

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Ein unbekannter Fehler ist aufgetreten.'
}

// --------------------------------------------------
// Farben und Label-Darstellung
// --------------------------------------------------

function normalizeColor(value: unknown): string {
  return typeof value === 'string' &&
  /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : defaultLabelColor
}

// Je nach Hintergrund schwarze oder weiße Schrift wählen.
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

  const red = channels[0] ?? 0
  const green = channels[1] ?? 0
  const blue = channels[2] ?? 0

  const luminance =
    0.2126 * red +
    0.7152 * green +
    0.0722 * blue

  return luminance > 0.179 ? '#000000' : '#ffffff'
}

function badgeStyle(color: string) {
  const background = normalizeColor(color)

  return {
    backgroundColor: background,
    color: getLabelTextColor(background),
  }
}

function getClassLabels(classId: number | null) {
  if (classId === null) return []

  return classLabels.value.filter(
    label => label.klasse_id === classId,
  )
}

function normalizeLabel(row: DBClassLabel): DBClassLabel {
  const classId = Number(row.klasse_id)
  const labelId = Number(row.label_id)

  if (
    !Number.isSafeInteger(classId) ||
    classId <= 0 ||
    !Number.isSafeInteger(labelId) ||
    labelId <= 0 ||
    typeof row.name !== 'string'
  ) {
    throw new Error(
      'Die API hat ungültige Label-Daten zurückgegeben.',
    )
  }

  return {
    klasse_id: classId,
    label_id: labelId,
    name: row.name,
    farbe: normalizeColor(row.farbe),
  }
}

// --------------------------------------------------
// Labels unabhängig laden
// --------------------------------------------------

async function loadLabels() {
  if (labelsLoading.value) return

  labelsLoading.value = true
  labelLoadError.value = ''

  try {
    const rows = await request<DBClassLabel[]>(
      '/klasse-labels',
    )

    if (!Array.isArray(rows)) {
      throw new Error(
        'Die API hat keine Label-Liste zurückgegeben.',
      )
    }

    const normalized = rows.map(normalizeLabel)
    const uniqueLabels = new Map<string, DBClassLabel>()

    for (const label of normalized) {
      const key = `${label.klasse_id}:${label.label_id}`
      uniqueLabels.set(key, label)
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
      resetLabelForm()
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

function resetLabelForm() {
  newLabelName.value = ''
  newLabelColor.value = defaultLabelColor
  labelError.value = ''
}

function selectClass(id: number) {
  if (labelSaving.value) return

  selectedClassId.value = id
  editedClassName.value =
    classes.value.find(klasse => klasse.id === id)?.name ?? ''

  selectedRuleClassId.value = null
  editClassError.value = ''
  resetLabelForm()
}

// --------------------------------------------------
// Klassen erstellen und bearbeiten
// --------------------------------------------------

async function createClass() {
  const name = newClassName.value.trim()
  classError.value = ''

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
      anzahl_schultage_woche: 0,
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

async function renameClass() {
  if (!selectedClass.value) return

  const name = editedClassName.value.trim()

  if (!name) {
    editClassError.value =
      'Der Klassenname darf nicht leer sein.'
    return
  }

  try {
    await request(
      `/klassen/${selectedClass.value.id}`,
      json('PUT', { bezeichnung: name }),
    )

    editClassError.value = ''
    await loadData()
  } catch (error) {
    editClassError.value = getError(error)
  }
}

async function deleteClass() {
  if (!selectedClass.value || labelSaving.value) return

  if (!confirm('Möchtest du diese Klasse wirklich löschen?')) {
    return
  }

  const classId = selectedClass.value.id

  try {
    await request(
      `/klassen/${classId}`,
      json('DELETE'),
    )

    classLabels.value = classLabels.value.filter(
      label => label.klasse_id !== classId,
    )

    selectedClassId.value = null
    resetLabelForm()

    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
}

// --------------------------------------------------
// Schultage und Räume
// --------------------------------------------------

function hasSchool(
  klasse: SchoolClass,
  day: Weekday,
) {
  return klasse.schoolDays.includes(day)
}

async function toggleSchoolDay(
  klasse: SchoolClass,
  day: Weekday,
) {
  const room = roomCapacities.value.find(
    entry => entry.day === day,
  )

  if (!room) {
    apiError.value = `Keine Ressource für ${day} gefunden.`
    return
  }

  try {
    if (hasSchool(klasse, day)) {
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

    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
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
  const room = roomCapacities.value.find(
    entry => entry.day === day,
  )

  if (!room) return

  try {
    await request(
      `/ressourcen/${room.id}`,
      json('PUT', {
        anzahl_raeume: Math.max(0, room.capacity + amount),
      }),
    )

    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
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
// Klassenregeln
// --------------------------------------------------

async function addRule() {
  if (
    !selectedClass.value ||
    selectedRuleClassId.value === null
  ) {
    return
  }

  try {
    await request('/regeln', json('POST', {
      klasse_a_id: selectedClass.value.id,
      klasse_b_id: selectedRuleClassId.value,
    }))

    selectedRuleClassId.value = null
    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
}

async function removeRule(ruleId: number) {
  try {
    await request(
      `/regeln/${ruleId}`,
      json('DELETE'),
    )

    await loadData()
  } catch (error) {
    apiError.value = getError(error)
  }
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

function hasConflict(
  klasse: SchoolClass,
  day: Weekday,
) {
  return getConflictingClasses(klasse, day).length > 0
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

// --------------------------------------------------
// Labels hinzufügen, einfärben und entfernen
// --------------------------------------------------

async function addLabel() {
  const classId = selectedClassId.value
  const name = newLabelName.value.trim()

  if (
    classId === null ||
    labelsBusy.value ||
    !labelsLoaded.value
  ) {
    return
  }

  labelError.value = ''

  if (!name || Array.from(name).length > 50) {
    labelError.value =
      'Bitte ein Label mit 1 bis 50 Zeichen eingeben.'
    return
  }

  if (
    selectedClassLabels.value.some(
      label =>
        label.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    labelError.value =
      'Diese Klasse hat dieses Label bereits. ' +
      'Du kannst seine Farbe direkt am Label ändern.'
    return
  }

  labelSaving.value = true

  try {
    const result = await request<DBClassLabel>(
      `/klassen/${classId}/labels`,
      json('POST', {
        name,
        farbe: normalizeColor(newLabelColor.value),
      }),
    )

    const assignment = normalizeLabel(result)

    classLabels.value = classLabels.value.filter(
      label =>
        label.klasse_id !== assignment.klasse_id ||
        label.label_id !== assignment.label_id,
    )

    classLabels.value.push(assignment)

    newLabelName.value = ''
  } catch (error) {
    labelError.value = getError(error)
  } finally {
    labelSaving.value = false
  }
}

async function changeLabelColor(
  label: DBClassLabel,
  event: Event,
) {
  const input = event.target as HTMLInputElement

  if (labelsBusy.value || !labelsLoaded.value) {
    input.value = label.farbe
    return
  }

  const color = normalizeColor(input.value)

  if (color === label.farbe) return

  labelError.value = ''
  labelSaving.value = true

  try {
    const result = await request<{
      klasse_id: number
      label_id: number
      farbe: string
    }>(
      `/klassen/${label.klasse_id}/labels/${label.label_id}/farbe`,
      json('PATCH', { farbe: color }),
    )

    label.farbe = normalizeColor(result.farbe)
  } catch (error) {
    input.value = label.farbe
    labelError.value = getError(error)
  } finally {
    labelSaving.value = false
  }
}

async function removeLabel(labelId: number) {
  const classId = selectedClassId.value

  if (
    classId === null ||
    labelsBusy.value ||
    !labelsLoaded.value
  ) {
    return
  }

  labelError.value = ''
  labelSaving.value = true

  try {
    await request(
      `/klassen/${classId}/labels/${labelId}`,
      json('DELETE'),
    )

    classLabels.value = classLabels.value.filter(
      label =>
        label.klasse_id !== classId ||
        label.label_id !== labelId,
    )
  } catch (error) {
    labelError.value = getError(error)
  } finally {
    labelSaving.value = false
  }
}

// Schuljahre sind noch nicht in der Datenbank zugeordnet.
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
            required
          >

          <select v-model="selectedLehrgangId" required>
            <option :value="null">
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

          <button type="submit" class="primary-button">
            Erstellen
          </button>

          <button
            type="button"
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
              :disabled="labelSaving"
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
              aria-label="Vorheriges Schuljahr"
              @click="changeSchoolYear(-1)"
            >
              ←
            </button>

            <strong>{{ schoolYearLabel }}</strong>

            <button
              type="button"
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

                <!-- Labels der ausgewählten Klasse -->
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
                      class="label-badge table-label-badge"
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
                  @click="toggleSchoolDay(klasse, day)"
                >
                  {{
                    hasSchool(klasse, day)
                      ? 'Schule'
                      : '–'
                  }}

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
                      :aria-label="`${day}: Raumanzahl erhöhen`"
                      @click="changeRoomCapacity(day, 1)"
                    >
                      ▲
                    </button>

                    <button
                      type="button"
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
              required
            >

            <button
              type="submit"
              class="primary-button"
            >
              Namen speichern
            </button>

            <p v-if="editClassError" class="api-error">
              {{ editClassError }}
            </p>
          </form>

          <!-- Labels -->
          <h3>Labels</h3>

          <p
            v-if="labelsLoading"
            class="help-text"
            role="status"
          >
            Labels werden geladen...
          </p>

          <div
            v-if="labelLoadError"
            class="label-load-error"
          >
            <p class="api-error" role="alert">
              Labels konnten nicht geladen werden:
              {{ labelLoadError }}
            </p>

            <button
              type="button"
              :disabled="labelsBusy"
              @click="loadLabels"
            >
              Labels erneut laden
            </button>
          </div>

          <ul class="class-labels">
            <li
              v-for="label in selectedClassLabels"
              :key="label.label_id"
              class="label-badge editable-label"
              :style="badgeStyle(label.farbe)"
            >
              <span class="label-name">
                {{ label.name }}
              </span>

              <input
                class="badge-color-input"
                type="color"
                :value="label.farbe"
                :disabled="labelsBusy || !labelsLoaded"
                :aria-label="`Farbe für ${label.name} ändern`"
                title="Labelfarbe ändern"
                @change="changeLabelColor(label, $event)"
              >

              <button
                type="button"
                class="remove-label-button"
                :disabled="labelsBusy || !labelsLoaded"
                :aria-label="
                  `Label ${label.name} von dieser Klasse entfernen`
                "
                @click="removeLabel(label.label_id)"
              >
                ×
              </button>
            </li>
          </ul>

          <p
            v-if="
              labelsLoaded &&
              !labelsLoading &&
              selectedClassLabels.length === 0
            "
            class="help-text"
          >
            Noch keine Labels vorhanden.
          </p>

          <p
            v-if="selectedClassLabels.length"
            class="help-text label-help"
          >
            Über das kleine Farbfeld kannst du die Farbe ändern.
          </p>

          <form
            class="form-stack label-form"
            @submit.prevent="addLabel"
          >
            <label for="new-class-label">
              Neues Stichwort
            </label>

            <input
              id="new-class-label"
              v-model="newLabelName"
              type="text"
              placeholder="Zum Beispiel ÜK vorhanden"
              maxlength="50"
              :disabled="labelsBusy || !labelsLoaded"
              required
            >

            <fieldset
              class="label-color-fieldset"
              :disabled="labelsBusy || !labelsLoaded"
            >
              <legend>Farbe auswählen</legend>

              <div class="color-palette">
                <button
                  v-for="color in labelColors"
                  :key="color.value"
                  type="button"
                  class="color-swatch"
                  :class="{
                    'color-swatch-selected':
                      newLabelColor === color.value,
                  }"
                  :style="{
                    backgroundColor: color.value,
                    color: getLabelTextColor(color.value),
                  }"
                  :aria-label="color.name"
                  :aria-pressed="newLabelColor === color.value"
                  :title="color.name"
                  @click="newLabelColor = color.value"
                >
                  <span
                    v-if="newLabelColor === color.value"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </button>
              </div>

              <div class="custom-color-row">
                <label for="new-label-color">
                  Eigene Farbe
                </label>

                <input
                  id="new-label-color"
                  v-model="newLabelColor"
                  type="color"
                  class="custom-color-input"
                >
              </div>
            </fieldset>

            <div class="label-preview">
              <span class="preview-caption">
                Vorschau
              </span>

              <span
                class="label-badge"
                :style="badgeStyle(newLabelColor)"
              >
                {{ newLabelName.trim() || 'Dein Label' }}
              </span>
            </div>

            <button
              type="submit"
              class="primary-button"
              :disabled="
                labelsBusy ||
                !labelsLoaded ||
                !newLabelName.trim()
              "
            >
              Label hinzufügen
            </button>

            <p
              v-if="labelSaving"
              class="help-text"
              role="status"
            >
              Label wird gespeichert...
            </p>

            <p
              v-if="labelError"
              class="api-error"
              role="alert"
            >
              {{ labelError }}
            </p>
          </form>

          <!-- Regeln -->
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

            <button type="submit">
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
                @click="removeRule(rule.id)"
              >
                Entfernen
              </button>
            </li>
          </ul>

          <button
            type="button"
            class="danger-button"
            :disabled="labelSaving"
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

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
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
  outline-offset: 3px;
}

.primary-button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 11px 14px;
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
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
}

/* Farbige Pill-Labels */
.help-text {
  color: #64748b;
  font-size: 13px;
}

.label-help {
  line-height: 1.5;
}

.label-load-error {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 12px 0;
}

.class-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin: 14px 0;
  list-style: none;
}

.label-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  max-width: 100%;
  box-sizing: border-box;
  padding: 5px 11px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.editable-label {
  padding-right: 6px;
}

.label-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.table-label-badge {
  padding: 4px 8px;
  font-size: 11px;
}

.remove-label-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 23px;
  height: 23px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 19px;
  line-height: 1;
}

.remove-label-button:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.15);
}

.badge-color-input {
  width: 19px;
  height: 19px;
  min-width: 19px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid currentColor;
  border-radius: 50%;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
}

.badge-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.badge-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}

.badge-color-input::-moz-color-swatch {
  border: none;
  border-radius: 50%;
}

.badge-color-input:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* Farbauswahl */
.label-color-fieldset {
  min-width: 0;
  margin: 0;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.label-color-fieldset legend {
  padding: 0 4px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  padding: 3px;
}

.color-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 50%;
  font-size: 15px;
  font-weight: 700;
}

.color-swatch-selected {
  outline: 2px solid #172033;
  outline-offset: 2px;
}

.custom-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.custom-color-row label {
  color: #64748b;
  font-size: 12px;
}

.custom-color-input {
  width: 42px;
  height: 30px;
  padding: 2px;
  cursor: pointer;
}

.label-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 0;
}

.preview-caption {
  color: #64748b;
  font-size: 12px;
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
}
</style>
