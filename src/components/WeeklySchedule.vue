<script setup lang="ts">
import { confirmAction } from '@/composables/useConfirm'
import { computed } from 'vue'
import type {
  ClassLabel,
  ClassRule,
  RoomCapacity,
  SchoolClass,
  Weekday,
} from '@/types/lehrway'

const props = defineProps<{
  classes: SchoolClass[]
  rules: ClassRule[]
  rooms: RoomCapacity[]
  labels: ClassLabel[]
  selectedClassId: number | null
  schoolYear: string
  busy: boolean
  loading: boolean
  lastLoadedAt: number | null
  refreshError: string
}>()

const emit = defineEmits<{
  'toggle-day': [classId: number, day: Weekday]
  'change-capacity': [day: Weekday, amount: number]
  'change-year': [direction: number]
  refresh: []
}>()

const lastLoadedTime = computed(() =>
  props.lastLoadedAt === null
    ? ''
    : new Intl.DateTimeFormat('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(props.lastLoadedAt)),
)

const lastLoadedDate = computed(() =>
  props.lastLoadedAt === null
    ? undefined
    : new Date(props.lastLoadedAt).toISOString(),
)

const weekdays: Weekday[] = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
]

function hasSchool(klasse: SchoolClass, day: Weekday) {
  return klasse.schoolDays.includes(day)
}

function getLabels(classId: number) {
  return props.labels.filter(label => label.klasse_id === classId)
}

function getUsedRooms(day: Weekday) {
  return props.classes.filter(klasse => hasSchool(klasse, day)).length
}

function getRoomCapacity(day: Weekday) {
  return props.rooms.find(room => room.day === day)?.capacity ?? 0
}

function getMissingRooms(day: Weekday) {
  return Math.max(0, getUsedRooms(day) - getRoomCapacity(day))
}

// Prüft auch bei einem leeren Feld, welche Klassen am Tag Schule haben.
function getConflictingClasses(klasse: SchoolClass, day: Weekday) {
  const otherIds = new Set(
    props.rules
      .filter(rule =>
        rule.classAId === klasse.id ||
        rule.classBId === klasse.id,
      )
      .map(rule =>
        rule.classAId === klasse.id
          ? rule.classBId
          : rule.classAId,
      ),
  )

  return props.classes.filter(other =>
    other.id !== klasse.id &&
    otherIds.has(other.id) &&
    hasSchool(other, day),
  )
}

function getCellConflicts(klasse: SchoolClass, day: Weekday) {
  const messages = getConflictingClasses(klasse, day).map(other =>
    `${klasse.name} und ${other.name} dürfen am ${day} nicht gleichzeitig Schule haben.`,
  )

  const active = hasSchool(klasse, day)

  // Bei einem leeren Feld zählt die Klasse für die Vorschau bereits mit.
  const used = getUsedRooms(day) + (active ? 0 : 1)
  const missing = Math.max(0, used - getRoomCapacity(day))

  if (missing > 0) {
    messages.push(
      active
        ? `Am ${day}: ${missing === 1 ? 'Ein Raum' : missing + ' Räume'} zu wenig.`
        : `Wenn du diesen Schultag aktivierst, ${missing === 1 ? 'fehlt ein Raum' : 'fehlen ' + missing + ' Räume'}.`,
    )
  }

  return messages
}

const schoolDayCells = computed(() =>
  props.classes.map(klasse => ({
    klasse,
    days: weekdays.map(day => ({
      day,
      active: hasSchool(klasse, day),
      conflicts: getCellConflicts(klasse, day),
    })),
  })),
)

async function handleSchoolDayClick(klasse: SchoolClass, day: Weekday) {
  if (props.busy) return

  const active = hasSchool(klasse, day)
  const conflicts = getCellConflicts(klasse, day)

  if (conflicts.length > 0) {
    const confirmed = await confirmAction({
      title: active
        ? 'Schultag entfernen?'
        : 'Schultag trotz Konflikt aktivieren?',
      context: `${klasse.name} · ${day}`,
      message: conflicts.map(conflict => `• ${conflict}`).join('\n'),
      question: active
        ? 'Möchtest du den Schultag aus dem Wochenplan entfernen?'
        : 'Möchtest du den Schultag trotzdem aktivieren?',
      confirmLabel: active
        ? 'Schultag entfernen'
        : 'Trotzdem aktivieren',
      cancelLabel: 'Abbrechen',
      tone: active ? 'danger' : 'neutral',
    })

    if (!confirmed || props.busy) return

    const currentClass = props.classes.find(entry => entry.id === klasse.id)

    if (!currentClass || hasSchool(currentClass, day) !== active) return
  }

  emit('toggle-day', klasse.id, day)
}

function handleDirectSchoolDayClick(classId: number, day: Weekday) {
  if (props.busy) return

  emit('toggle-day', classId, day)
}

function getRoomConflictText(day: Weekday) {
  const missing = getMissingRooms(day)

  return `${missing === 1 ? 'Ein Raum' : missing + ' Räume'} zu wenig.`
}

function getRoomUsageText(day: Weekday) {
  const used = getUsedRooms(day)
  const capacity = getRoomCapacity(day)

  return `${day}: ${used} ${
    used === 1
      ? 'Klasse benötigt'
      : 'Klassen benötigen je'
  } einen Raum. Verfügbar: ${capacity} ${
    capacity === 1 ? 'Raum' : 'Räume'
  }.`
}

function badgeStyle(value: string) {
  const color = /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : '#0d6efd'

  const hex = color.slice(1)

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

  return {
    backgroundColor: color,
    color: luminance > 0.179 ? '#000000' : '#ffffff',
  }
}
</script>

<template>
  <section class="schedule">
    <div class="section-heading">
      <h2>Wochenansicht</h2>

      <div class="year-navigation">
        <button
          type="button"
          :disabled="busy"
          aria-label="Vorheriges Schuljahr"
          @click="emit('change-year', -1)"
        >
          ←
        </button>

        <strong>{{ schoolYear }}</strong>

        <button
          type="button"
          :disabled="busy"
          aria-label="Nächstes Schuljahr"
          @click="emit('change-year', 1)"
        >
          →
        </button>
      </div>
    </div>

    <div class="schedule-refresh">
      <div class="refresh-status" role="status" aria-live="polite">
        <p v-if="loading">Daten werden geladen …</p>

        <template v-else>
          <p v-if="refreshError" class="refresh-warning">
            Laden nicht vollständig erfolgreich:
            {{ refreshError }}
          </p>

          <p v-if="lastLoadedAt !== null">
            Zuletzt vollständig geladen um
            <time :datetime="lastLoadedDate">{{ lastLoadedTime }}</time>
          </p>

          <p v-else>Noch kein vollständiger Datenstand geladen.</p>
        </template>
      </div>

      <button
        type="button"
        class="refresh-schedule-button"
        :disabled="busy || loading"
        @click="emit('refresh')"
      >
        {{ loading ? 'Wird aktualisiert …' : 'Aktualisieren' }}
      </button>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
        <tr>
          <th scope="col">Klasse</th>
          <th v-for="day in weekdays" :key="day" scope="col">
            {{ day }}
          </th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="{ klasse, days } in schoolDayCells" :key="klasse.id">
          <th
            scope="row"
            class="class-name-cell"
            :class="{ selected: selectedClassId === klasse.id }"
          >
            <span>{{ klasse.name }}</span>

            <div
              v-if="getLabels(klasse.id).length"
              class="table-labels"
              :aria-label="`Labels von ${klasse.name}`"
            >
                <span
                  v-for="label in getLabels(klasse.id)"
                  :key="label.label_id"
                  class="label-badge"
                  :style="badgeStyle(label.farbe)"
                >
                  {{ label.name }}
                </span>
            </div>
          </th>

          <td v-for="cell in days" :key="cell.day">
            <div
              class="school-day-control"
              :class="{ 'is-split': cell.conflicts.length > 0 }"
            >
              <button
                type="button"
                class="school-day-button"
                :class="{
                    active: cell.active,
                    'has-potential-conflict':
                      !cell.active && cell.conflicts.length > 0,
                    'has-active-conflict':
                      cell.active && cell.conflicts.length > 0,
                  }"
                :disabled="busy"
                :aria-pressed="cell.active"
                :aria-label="`${klasse.name}, ${cell.day}: ${
                    cell.conflicts.length
                      ? 'Konflikte anzeigen'
                      : cell.active
                        ? 'Schultag entfernen'
                        : 'Schultag aktivieren'
                  }`"
                @click="handleSchoolDayClick(klasse, cell.day)"
              >
                {{ cell.active ? 'Schule' : '–' }}
              </button>

              <button
                v-if="cell.conflicts.length > 0"
                type="button"
                class="school-day-direct"
                :disabled="busy"
                :aria-label="`${klasse.name}, ${cell.day}: ${
                    cell.active
                      ? 'Schultag direkt entfernen'
                      : 'Schultag direkt aktivieren'
                  }`"
                :title="cell.active ? 'Direkt entfernen' : 'Direkt aktivieren'"
                @click="handleDirectSchoolDayClick(klasse.id, cell.day)"
              >
                {{ cell.active ? '−' : '+' }}
              </button>
            </div>
          </td>
        </tr>
        </tbody>

        <tfoot>
        <tr>
          <th scope="row">Räume</th>

          <td v-for="day in weekdays" :key="day">
            <div class="room-controls">
                <span>
                  {{ getUsedRooms(day) }} / {{ getRoomCapacity(day) }}
                </span>

              <details
                v-if="getMissingRooms(day) > 0"
                class="conflict-hint room-hint"
              >
                <summary :aria-label="`${day}: Raumkonflikt – Erklärung`">
                  {{ getMissingRooms(day) === 1 ? 'Raum fehlt' : 'Räume fehlen' }}
                </summary>

                <div class="conflict-explanation">
                  <p class="hint-context">{{ day }}</p>
                  <p>{{ getRoomUsageText(day) }}</p>
                  <p>{{ getRoomConflictText(day) }}</p>
                </div>
              </details>

              <div>
                <button
                  type="button"
                  :disabled="busy"
                  :aria-label="`${day}: Raumanzahl erhöhen`"
                  @click="emit('change-capacity', day, 1)"
                >
                  ▲
                </button>

                <button
                  type="button"
                  :disabled="busy || getRoomCapacity(day) === 0"
                  :aria-label="`${day}: Raumanzahl verringern`"
                  @click="emit('change-capacity', day, -1)"
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
</template>

<style scoped>
.schedule .school-day-control {
  display: inline-grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  max-width: 122px;
  vertical-align: middle;
}

.schedule .school-day-control.is-split {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.schedule .school-day-control > button {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 39px;
  margin: 0;
}

.schedule .school-day-control.is-split > .school-day-button {
  padding: 6px 4px;
  border-radius: 9px 0 0 9px;
}

.schedule .school-day-button.has-potential-conflict {
  border-color: #d6b44c;
  background: #fff4c7;
  color: #634900;
  font-weight: 600;
}

.schedule .school-day-button.has-potential-conflict:hover:not(:disabled) {
  border-color: #bb942a;
  background: #ffedaa;
}

.schedule .school-day-button.active.has-active-conflict {
  border-color: #dca09a;
  background: #fbe8e5;
  color: #922f29;
}

.schedule .school-day-button.active.has-active-conflict:hover:not(:disabled) {
  border-color: #c47770;
  background: #f6d7d3;
}

.schedule .school-day-control > .school-day-direct {
  padding: 0;
  border: 1px solid #cbd2cf;
  border-left: 0;
  border-radius: 0 9px 9px 0;
  background: #e9ecea;
  color: #39443f;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.schedule .school-day-control > .school-day-direct:hover:not(:disabled) {
  background: #dce2de;
}

.schedule .school-day-control > button:focus-visible {
  position: relative;
  z-index: 1;
}

.schedule .conflict-hint {
  margin-top: 8px;
  color: #a13232;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}

.conflict-hint > summary {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  padding: 5px 7px;
  border: 1px solid currentColor;
  border-radius: 8px;
  cursor: pointer;
  list-style: none;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.conflict-hint > summary::-webkit-details-marker {
  display: none;
}

.conflict-hint > summary::before {
  content: '+';
  flex-shrink: 0;
}

.conflict-hint[open] > summary::before {
  content: '−';
}

.conflict-hint > summary:hover {
  background: rgb(0 0 0 / 4%);
}

.conflict-hint > summary:focus-visible {
  outline: 3px solid #205447;
  outline-offset: 3px;
}

.conflict-explanation {
  margin-top: 8px;
  padding: 10px;
  border: 1px solid #dfe6df;
  border-radius: 8px;
  background: #f6f8f5;
  color: #34443d;
  overflow-wrap: anywhere;
}

.conflict-explanation p {
  margin: 0 0 8px;
}

.conflict-explanation p:last-child {
  margin-bottom: 0;
}

.conflict-explanation .hint-context {
  font-weight: 700;
}

.schedule .room-hint {
  width: 100%;
  margin-top: 0;
}

.schedule .section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 18px;
}

.schedule .year-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schedule .schedule-refresh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 22px;
  padding-top: 14px;
  border-top: 1px solid #e3e9e3;
}

.schedule .refresh-status {
  flex: 1 1 220px;
  color: #758079;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.refresh-status p {
  margin: 0;
}

.refresh-status .refresh-warning {
  margin-bottom: 4px;
  color: #a13232;
}

.schedule .refresh-schedule-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: auto;
  min-height: 34px;
  margin: 0;
  padding: 7px 12px;
  border: 1px solid #dce5dd;
  border-radius: 8px;
  background: #fff;
  color: #426354;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  box-shadow: none;
  cursor: pointer;
}

.schedule .refresh-schedule-button:hover:not(:disabled) {
  border-color: #b6cbbd;
  background: #eef4ef;
}

.schedule .refresh-schedule-button:focus-visible {
  outline: 3px solid #205447;
  outline-offset: 3px;
}

.schedule .refresh-schedule-button:disabled {
  opacity: 0.55;
  cursor: wait;
}
</style>
