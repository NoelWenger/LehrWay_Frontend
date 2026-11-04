<script setup lang="ts">
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
}>()

const emit = defineEmits<{
  'toggle-day': [classId: number, day: Weekday]
  'change-capacity': [day: Weekday, amount: number]
  'change-year': [direction: number]
}>()

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
  return props.labels.filter(
    label => label.klasse_id === classId,
  )
}

function getUsedRooms(day: Weekday) {
  return props.classes.filter(
    klasse => hasSchool(klasse, day),
  ).length
}

function getRoomCapacity(day: Weekday) {
  return props.rooms.find(
    room => room.day === day,
  )?.capacity ?? 0
}

function getMissingRooms(day: Weekday) {
  return getUsedRooms(day) - getRoomCapacity(day)
}

function getRoomConflictText(day: Weekday) {
  const missing = getMissingRooms(day)

  return `${missing} ${missing === 1 ? 'Raum' : 'Räume'} zu wenig`
}

function getOtherClassId(rule: ClassRule, classId: number) {
  return rule.classAId === classId
    ? rule.classBId
    : rule.classAId
}

function getConflictingClasses(
  klasse: SchoolClass,
  day: Weekday,
) {
  if (!hasSchool(klasse, day)) return []

  const otherIds = new Set(
    props.rules
      .filter(rule =>
        rule.classAId === klasse.id ||
        rule.classBId === klasse.id,
      )
      .map(rule => getOtherClassId(rule, klasse.id)),
  )

  return props.classes.filter(other =>
    otherIds.has(other.id) && hasSchool(other, day),
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
        <tr v-for="klasse in classes" :key="klasse.id">
          <th
            scope="row"
            class="class-name-cell"
            :class="{
                selected: selectedClassId === klasse.id,
              }"
          >
            <span>{{ klasse.name }}</span>

            <div
              v-if="
                  selectedClassId === klasse.id &&
                  getLabels(klasse.id).length
                "
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

          <td v-for="day in weekdays" :key="day">
            <button
              type="button"
              class="school-day-button"
              :class="{ active: hasSchool(klasse, day) }"
              :disabled="busy"
              :aria-pressed="hasSchool(klasse, day)"
              @click="emit('toggle-day', klasse.id, day)"
            >
              {{ hasSchool(klasse, day) ? 'Schule' : '–' }}

              <span
                v-if="getConflictingClasses(klasse, day).length"
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

          <td v-for="day in weekdays" :key="day">
            <div class="room-controls">
                <span>
                  {{ getUsedRooms(day) }} /
                  {{ getRoomCapacity(day) }}
                </span>

              <span
                v-if="getMissingRooms(day) > 0"
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
                  @click="emit('change-capacity', day, 1)"
                >
                  ▲
                </button>

                <button
                  type="button"
                  :disabled="
                      busy || getRoomCapacity(day) === 0
                    "
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
h2 {
  margin: 0;
  font-size: 20px;
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

.class-name-cell.selected {
  box-shadow: inset 3px 0 0 #2563eb;
}

.table-labels {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
  margin-top: 9px;
}

.label-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
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
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
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

.conflict {
  display: block;
  margin-top: 5px;
  color: #dc2626;
  font-size: 12px;
}
</style>
