<script setup lang="ts">
defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string]
}>()

const colors = [
  { name: 'Blau', value: '#0d6efd' },
  { name: 'Dunkelblau', value: '#1e3a8a' },
  { name: 'Hellblau', value: '#93c5fd' },
  { name: 'Türkis', value: '#0dcaf0' },
  { name: 'Petrol', value: '#0f766e' },
  { name: 'Grün', value: '#198754' },
  { name: 'Hellgrün', value: '#86efac' },
  { name: 'Limette', value: '#a3e635' },
  { name: 'Gelb', value: '#ffc107' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Rot', value: '#dc3545' },
  { name: 'Dunkelrot', value: '#991b1b' },
  { name: 'Rosa', value: '#f9a8d4' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Violett', value: '#7c3aed' },
  { name: 'Lavendel', value: '#c4b5fd' },
  { name: 'Braun', value: '#92400e' },
  { name: 'Grau', value: '#6c757d' },
  { name: 'Weiß', value: '#ffffff' },
  { name: 'Schwarz', value: '#212529' },
]

function selectCustomColor(event: Event) {
  const input = event.target as HTMLInputElement

  emit('update:modelValue', input.value.toLowerCase())
}
</script>

<template>
  <fieldset class="color-picker" :disabled="disabled">
    <legend>Farbe auswählen</legend>

    <div class="color-grid">
      <button
        v-for="color in colors"
        :key="color.value"
        type="button"
        class="color-swatch"
        :class="{
          selected: modelValue.toLowerCase() === color.value,
        }"
        :style="{ backgroundColor: color.value }"
        :aria-label="color.name"
        :aria-pressed="
          modelValue.toLowerCase() === color.value
        "
        :title="color.name"
        @click="emit('update:modelValue', color.value)"
      >
        <span
          v-if="modelValue.toLowerCase() === color.value"
          class="selection-mark"
          aria-hidden="true"
        >
          ✓
        </span>
      </button>
    </div>

    <label class="custom-color">
      <span>Eigene Farbe</span>

      <input
        type="color"
        :value="modelValue"
        :disabled="disabled"
        @change="selectCustomColor"
      >
    </label>
  </fieldset>
</template>

<style scoped>
.color-picker {
  min-width: 0;
  margin: 0;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.color-picker legend {
  padding: 0 5px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  justify-items: center;
  gap: 10px;
  padding: 4px;
}

.color-swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 50%;
  cursor: pointer;
}

.color-swatch.selected {
  outline: 2px solid #172033;
  outline-offset: 3px;
}

.color-swatch:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 3px;
}

.selection-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: white;
  color: #172033;
  font-size: 12px;
  font-weight: 800;
}

.custom-color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 15px;
  color: #64748b;
  font-size: 12px;
}

.custom-color input {
  width: 42px;
  height: 30px;
  box-sizing: border-box;
  padding: 2px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.color-picker:disabled {
  opacity: 0.55;
}

.color-picker:disabled button,
.color-picker:disabled input {
  cursor: not-allowed;
}
</style>
