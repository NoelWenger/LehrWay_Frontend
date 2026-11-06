<script setup lang="ts">
import { computed, ref } from 'vue'

import type {
  CourseField,
  CourseFieldUpdate,
  CourseModule,
} from '@/types/lehrway'

const props = defineProps<{
  field: CourseField
  module: CourseModule
  quarterCount: number
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  save: [update: CourseFieldUpdate]
  cancel: []
  delete: [fieldId: number]
}>()

const quarters = computed(() =>
  Array.from(
    { length: props.quarterCount },
    (_, index) => index + 1,
  ),
)

const lessons = ref(props.field.lessons)
const startQuarter = ref(props.field.startQuarter)

const endQuarter = ref(
  props.field.startQuarter +
  props.field.quarterSpan -
  1,
)

const showRangeEditor = ref(false)
const localError = ref('')

function rangeAvailable(start: number, end: number) {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end > props.quarterCount ||
    end < start
  ) {
    return false
  }

  return !props.module.fields.some(field => {
    if (field.id === props.field.id) return false

    const fieldEnd =
      field.startQuarter + field.quarterSpan - 1

    return start <= fieldEnd && end >= field.startQuarter
  })
}

const startOptions = computed(() =>
  quarters.value.map(quarter => ({
    quarter,
    available: rangeAvailable(
      quarter,
      endQuarter.value,
    ),
  })),
)

const endOptions = computed(() =>
  quarters.value.map(quarter => ({
    quarter,
    available: rangeAvailable(
      startQuarter.value,
      quarter,
    ),
  })),
)

const rangeText = computed(() => {
  const count =
    endQuarter.value - startQuarter.value + 1

  return count === 1
    ? `Q${startQuarter.value} · 1 Quartal`
    : `Q${startQuarter.value} bis Q${endQuarter.value} · ${count} Quartale`
})

function save() {
  if (props.busy) return

  localError.value = ''

  if (
    !Number.isInteger(lessons.value) ||
    lessons.value < 0 ||
    lessons.value > 2147483647
  ) {
    localError.value =
      'Bitte eine gültige Lektionszahl eingeben.'
    return
  }

  if (
    !rangeAvailable(
      startQuarter.value,
      endQuarter.value,
    )
  ) {
    localError.value =
      `Bitte einen freien Bereich innerhalb von Q1 bis Q${props.quarterCount} auswählen.`
    return
  }

  emit('save', {
    fieldId: props.field.id,
    startQuarter: startQuarter.value,
    endQuarter: endQuarter.value,
    lessons: lessons.value,
  })
}
</script>

<template>
  <form
    class="lesson-editor"
    @submit.prevent="save"
  >
    <label :for="`lessons-${field.id}`">
      Lektionen gesamt
    </label>

    <input
      :id="`lessons-${field.id}`"
      v-model.number="lessons"
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
      @click="showRangeEditor = true"
    >
      Quartale verbinden / Länge ändern
    </button>

    <div
      v-if="showRangeEditor"
      class="range-editor"
    >
      <label :for="`range-start-${field.id}`">
        Von Quartal:
      </label>

      <select
        :id="`range-start-${field.id}`"
        v-model.number="startQuarter"
        :disabled="busy"
      >
        <option
          v-for="option in startOptions"
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

      <label :for="`range-end-${field.id}`">
        Bis Quartal:
      </label>

      <select
        :id="`range-end-${field.id}`"
        v-model.number="endQuarter"
        :disabled="busy"
      >
        <option
          v-for="option in endOptions"
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
        {{ rangeText }}
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
      @click="emit('cancel')"
    >
      Abbrechen
    </button>

    <button
      type="button"
      class="danger-button"
      :disabled="busy"
      @click="emit('delete', field.id)"
    >
      Löschen
    </button>

    <p
      v-if="localError || error"
      class="error-message"
      role="alert"
    >
      {{ localError || error }}
    </p>
  </form>
</template>
