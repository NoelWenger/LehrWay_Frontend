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

function hasSchool(
  klasse: SchoolClass,
  day: Weekday,
) {
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
  return Math.max(
    0,
    getUsedRooms(day) - getRoomCapacity(day),
  )
}

// Prüft die anderen Klassen unabhängig davon,
// ob der betrachtete Schultag bereits aktiviert ist.
function getConflictingClasses(
  klasse: SchoolClass,
  day: Weekday,
) {
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

function getCellConflicts(
  klasse: SchoolClass,
  day: Weekday,
) {
  const messages = getConflictingClasses(
    klasse,
    day,
  ).map(other =>
    `${klasse.name} und ${other.name} dürfen am ${day} nicht gleichzeitig Schule haben.`,
  )

  const active = hasSchool(klasse, day)

  // Bei einem leeren Feld wird die zusätzliche Klasse
  // für die Vorschau bereits mitgezählt.
  const used =
    getUsedRooms(day) + (active ? 0 : 1)

  const missing = Math.max(
    0,
    used - getRoomCapacity(day),
  )

  if (missing > 0) {
    messages.push(
      active
        ? `Am ${day}: ${missing === 1 ? 'Ein Raum' : missing + ' Räume'} zu wenig.`
        : `Wenn du diesen Schultag aktivierst, ${missing === 1 ? 'fehlt ein Raum' : 'fehlen ' + missing + ' Räume'}.`,
    )
  }

  return messages
}

function getConflictHeading(
  klasse: SchoolClass,
  day: Weekday,
) {
  const count =
    getCellConflicts(klasse, day).length

  if (hasSchool(klasse, day)) {
    return count === 1
      ? 'Konflikt'
      : 'Konflikte'
  }

  return count === 1
    ? 'Möglicher Konflikt'
    : 'Mögliche Konflikte'
}

// Der bisherige kurze Hinweis beim Überfahren bleibt erhalten.
function getPotentialConflictText(
  klasse: SchoolClass,
  day: Weekday,
) {
  if (hasSchool(klasse, day)) return ''

  const count =
    getCellConflicts(klasse, day).length

  if (count === 0) return ''

  return count === 1
    ? 'Es entsteht ein Konflikt'
    : 'Es entstehen Konflikte'
}

function getRoomConflictText(day: Weekday) {
  const missing = getMissingRooms(day)

  return `${
    missing === 1
      ? 'Ein Raum'
      : missing + ' Räume'
  } zu wenig.`
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
    color:
      luminance > 0.179
        ? '#000000'
        : '#ffffff',
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
        <tr
          v-for="klasse in classes"
          :key="klasse.id"
        >
          <th
            scope="row"
            class="class-name-cell"
            :class="{
                selected:
                  selectedClassId === klasse.id,
              }"
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
              :aria-pressed="hasSchool(klasse, day)"
              :aria-label="`${klasse.name}, ${day}: Schultag ${hasSchool(klasse, day) ? 'deaktivieren' : 'aktivieren'}`"
              :title="
                  getPotentialConflictText(klasse, day)
                "
              @click="
                  emit('toggle-day', klasse.id, day)
                "
            >
              {{
                hasSchool(klasse, day)
                  ? 'Schule'
                  : '–'
              }}
            </button>

            <details
              v-if="
                  getCellConflicts(klasse, day).length
                "
              class="conflict-hint"
              :class="{
                  potential:
                    !hasSchool(klasse, day),
                }"
            >
              <summary
                :aria-label="`${klasse.name}, ${day}: ${getConflictHeading(klasse, day)} – Erklärung`"
              >
                {{
                  getConflictHeading(klasse, day)
                }}
              </summary>

              <div class="conflict-explanation">
                <p class="hint-context">
                  {{ klasse.name }} · {{ day }}
                </p>

                <p v-if="!hasSchool(klasse, day)">
                  Beim Aktivieren dieses Schultags:
                </p>

                <ul>
                  <li
                    v-for="message in getCellConflicts(
                        klasse,
                        day,
                      )"
                    :key="message"
                  >
                    {{ message }}
                  </li>
                </ul>
              </div>
            </details>
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

              <details
                v-if="getMissingRooms(day) > 0"
                class="conflict-hint room-hint"
              >
                <summary
                  :aria-label="`${day}: Raumkonflikt – Erklärung`"
                >
                  {{
                    getMissingRooms(day) === 1
                      ? 'Raum fehlt'
                      : 'Räume fehlen'
                  }}
                </summary>

                <div class="conflict-explanation">
                  <p class="hint-context">
                    {{ day }}
                  </p>

                  <p>
                    {{ getRoomUsageText(day) }}
                  </p>

                  <p>
                    {{ getRoomConflictText(day) }}
                  </p>
                </div>
              </details>

              <div>
                <button
                  type="button"
                  :disabled="busy"
                  :aria-label="`${day}: Raumanzahl erhöhen`"
                  @click="
                      emit('change-capacity', day, 1)
                    "
                >
                  ▲
                </button>

                <button
                  type="button"
                  :disabled="
                      busy ||
                      getRoomCapacity(day) === 0
                    "
                  :aria-label="`${day}: Raumanzahl verringern`"
                  @click="
                      emit('change-capacity', day, -1)
                    "
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
.schedule .conflict-hint {
  margin-top: 8px;
  color: #a13232;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}

.schedule .conflict-hint.potential {
  color: #66736e;
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

.conflict-explanation ul {
  margin: 0;
  padding-left: 16px;
}

.conflict-explanation li + li {
  margin-top: 7px;
}

.schedule .room-hint {
  width: 100%;
  margin-top: 0;
}
</style>
