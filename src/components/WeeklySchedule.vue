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
function getPotentialConflictText(
  klasse: SchoolClass,
  day: Weekday,
) {
  // Nur leere Felder prüfen.
  if (hasSchool(klasse, day)) return ''

  // Betroffene andere Klassen nur einmal zählen.
  const conflictingClassIds = new Set<number>()

  for (const rule of props.rules) {
    if (
      rule.classAId !== klasse.id &&
      rule.classBId !== klasse.id
    ) {
      continue
    }

    const otherId = getOtherClassId(rule, klasse.id)

    const otherClass = props.classes.find(
      entry => entry.id === otherId,
    )

    if (otherClass && hasSchool(otherClass, day)) {
      conflictingClassIds.add(otherId)
    }
  }

  let conflictCount = conflictingClassIds.size

  // Eine zusätzliche Klasse benötigt einen weiteren Raum.
  // Raumknappheit zählt als eine weitere Konfliktursache.
  if (getUsedRooms(day) + 1 > getRoomCapacity(day)) {
    conflictCount += 1
  }

  if (conflictCount === 0) return ''

  return conflictCount === 1
    ? 'Es entsteht ein Konflikt'
    : 'Es entstehen Konflikte'
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
              :title="getPotentialConflictText(klasse, day)"
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

