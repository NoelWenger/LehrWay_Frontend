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
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  save: [update: CourseFieldUpdate]
  cancel: []
  delete: [fieldId: number]
}>()

const quarters = Array.from({ length: 12 }, (_, i) => i + 1)

const lessons = ref(props.field.lessons)
const startQuarter = ref(props.field.startQuarter)
const endQuarter = ref(
  props.field.startQuarter + props.field.quarterSpan - 1,
)

const showRangeEditor = ref(false)
const localError = ref('')

function rangeAvailable(start: number, end: number) {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end > 12 ||
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
  quarters.map(quarter => ({
    quarter,
    available: rangeAvailable(quarter, endQuarter.value),
  })),
)

const endOptions = computed(() =>
  quarters.map(quarter => ({
    quarter,
    available: rangeAvailable(startQuarter.value, quarter),
  })),
)

const rangeText = computed(() => {
  const count = endQuarter.value - startQuarter.value + 1

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
    localError.value = 'Bitte eine gültige Lektionszahl eingeben.'
    return
  }

  if (!rangeAvailable(startQuarter.value, endQuarter.value)) {
    localError.value =
      'Bitte einen freien Bereich innerhalb von Q1 bis Q12 auswählen.'
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
  <form class="lesson-editor" @submit.prevent="save">
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

    <div v-if="showRangeEditor" class="range-editor">
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
          {{ option.available ? '' : '– nicht verfügbar' }}
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
          {{ option.available ? '' : '– nicht verfügbar' }}
        </option>
      </select>

      <p class="range-preview">{{ rangeText }}</p>
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

<style scoped>
.lesson-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
  margin: 0;
  text-align: left;
}

label {
  font-size: 12px;
  font-weight: 600;
}

input,
select,
button {
  box-sizing: border-box;
  padding: 7px;
  font-family: inherit;
}

input,
select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.primary-button {
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
}

.range-button {
  border: 1px solid #93c5fd;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
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

.danger-button {
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
}

.error-message {
  margin: 0;
  color: #dc2626;
  overflow-wrap: anywhere;
}
</style>
