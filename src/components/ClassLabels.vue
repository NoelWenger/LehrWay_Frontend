<script setup lang="ts">
import { computed, ref } from 'vue'
import { request, json } from '../services/lehrway-api'
import LabelColorPicker from '@/components/LabelColorPicker.vue'

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

const props = defineProps<{
  classId: number
  labels: ClassLabel[]
  loading: boolean
  ready: boolean
  loadError: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  reload: []
  'busy-change': [busy: boolean]
  saved: [label: ClassLabel]
  'color-changed': [change: LabelColorChange]
  removed: [removal: LabelRemoval]
}>()

const newLabelName = ref('')
const newLabelColor = ref('#0d6efd')
const editingColorId = ref<number | null>(null)
const saving = ref(false)
const error = ref('')

const busy = computed(() =>
  saving.value || props.loading || props.disabled,
)

const editingColorLabel = computed(() =>
  props.labels.find(
    label => label.label_id === editingColorId.value,
  ),
)

function getError(value: unknown): string {
  return value instanceof Error
    ? value.message
    : 'Ein unbekannter Fehler ist aufgetreten.'
}

function normalizeColor(value: unknown): string {
  return typeof value === 'string' &&
  /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : '#0d6efd'
}

function getTextColor(color: string): string {
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
    color: getTextColor(background),
  }
}

function setSaving(value: boolean) {
  saving.value = value
  emit('busy-change', value)
}

function toggleColorEditor(labelId: number) {
  if (busy.value || !props.ready) return

  editingColorId.value =
    editingColorId.value === labelId ? null : labelId

  error.value = ''
}

function normalizeLabel(row: ClassLabel): ClassLabel {
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

  return {
    klasse_id: classId,
    label_id: labelId,
    name: row.name,
    farbe: normalizeColor(row.farbe),
  }
}

async function addLabel() {
  if (busy.value || !props.ready) return

  const name = newLabelName.value.trim()
  error.value = ''

  if (!name || Array.from(name).length > 50) {
    error.value =
      'Bitte ein Label mit 1 bis 50 Zeichen eingeben.'
    return
  }

  if (
    props.labels.some(
      label =>
        label.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    error.value =
      'Diese Klasse hat dieses Label bereits. ' +
      'Du kannst seine Farbe über die Palette ändern.'
    return
  }

  setSaving(true)

  try {
    const result = await request<ClassLabel>(
      `/klassen/${props.classId}/labels`,
      json('POST', {
        name,
        farbe: normalizeColor(newLabelColor.value),
      }),
    )

    emit('saved', normalizeLabel(result))
    newLabelName.value = ''
  } catch (value) {
    error.value = getError(value)
  } finally {
    setSaving(false)
  }
}

async function changeEditingColor(color: string) {
  const label = editingColorLabel.value

  if (!label || busy.value || !props.ready) return

  const normalized = normalizeColor(color)
  if (normalized === normalizeColor(label.farbe)) return

  error.value = ''
  setSaving(true)

  try {
    const result = await request<LabelColorChange>(
      `/klassen/${props.classId}/labels/${label.label_id}/farbe`,
      json('PATCH', {
        farbe: normalized,
      }),
    )

    emit('color-changed', {
      label_id: Number(result.label_id),
      farbe: normalizeColor(result.farbe),
    })
  } catch (value) {
    error.value = getError(value)
  } finally {
    setSaving(false)
  }
}

async function removeLabel(labelId: number) {
  if (busy.value || !props.ready) return

  error.value = ''
  setSaving(true)

  try {
    await request(
      `/klassen/${props.classId}/labels/${labelId}`,
      json('DELETE'),
    )

    emit('removed', {
      klasse_id: props.classId,
      label_id: labelId,
    })

    if (editingColorId.value === labelId) {
      editingColorId.value = null
    }
  } catch (value) {
    error.value = getError(value)
  } finally {
    setSaving(false)
  }
}
</script>

<template>
  <section class="class-label-section">
    <h3>Labels</h3>

    <p v-if="loading" class="help-text" role="status">
      Labels werden geladen...
    </p>

    <div v-if="loadError" class="load-error">
      <p class="error-message" role="alert">
        Labels konnten nicht geladen werden:
        {{ loadError }}
      </p>

      <button
        type="button"
        :disabled="busy"
        @click="emit('reload')"
      >
        Labels erneut laden
      </button>
    </div>

    <ul class="class-labels">
      <li
        v-for="label in labels"
        :key="label.label_id"
        class="label-badge editable-label"
        :style="badgeStyle(label.farbe)"
      >
        <span class="label-name">
          {{ label.name }}
        </span>

        <button
          type="button"
          class="badge-color-button"
          :disabled="busy || !ready"
          :aria-label="`Farbe für ${label.name} ändern`"
          :aria-expanded="editingColorId === label.label_id"
          :aria-controls="`label-color-editor-${classId}`"
          title="Labelfarbe ändern"
          @click="toggleColorEditor(label.label_id)"
        >
          <span aria-hidden="true">🎨</span>
        </button>

        <button
          type="button"
          class="remove-label-button"
          :disabled="busy || !ready"
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
      v-if="ready && !loading && labels.length === 0"
      class="help-text"
    >
      Noch keine Labels vorhanden.
    </p>

    <div
      v-if="editingColorLabel"
      :id="`label-color-editor-${classId}`"
      class="existing-color-editor"
    >
      <div class="color-editor-heading">
        <strong>{{ editingColorLabel.name }}</strong>

        <button
          type="button"
          :disabled="saving"
          aria-label="Farbauswahl schließen"
          @click="editingColorId = null"
        >
          ×
        </button>
      </div>

      <p class="help-text">
        Diese Farbe gilt für alle Klassen mit diesem Label.
      </p>

      <LabelColorPicker
        :model-value="editingColorLabel.farbe"
        :disabled="busy || !ready"
        @update:model-value="changeEditingColor"
      />
    </div>

    <form class="label-form" @submit.prevent="addLabel">
      <label :for="`new-class-label-${classId}`">
        Neues Stichwort
      </label>

      <input
        :id="`new-class-label-${classId}`"
        v-model="newLabelName"
        type="text"
        placeholder="Zum Beispiel ÜK vorhanden"
        maxlength="50"
        :disabled="busy || !ready"
        required
      >

      <LabelColorPicker
        v-model="newLabelColor"
        :disabled="busy || !ready"
      />

      <div class="label-preview">
        <span class="preview-caption">Vorschau</span>

        <span
          class="label-badge"
          :style="badgeStyle(newLabelColor)"
        >
          {{ newLabelName.trim() || 'Dein Label' }}
        </span>
      </div>

      <p class="help-text">
        Existiert der Labelname bereits, wird dessen gemeinsame
        Farbe übernommen. Über die Palette am Label kannst du
        sie für alle Klassen ändern.
      </p>

      <button
        type="submit"
        class="primary-button"
        :disabled="busy || !ready || !newLabelName.trim()"
      >
        Label hinzufügen
      </button>
    </form>

    <p v-if="saving" class="help-text" role="status">
      Änderung wird gespeichert...
    </p>

    <p v-if="error" class="error-message" role="alert">
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
.class-label-section {
  margin-top: 24px;
}

h3 {
  margin: 0 0 14px;
  font-size: 16px;
}

button,
input {
  font-family: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}

.help-text {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.error-message {
  margin: 10px 0;
  color: #dc2626;
  overflow-wrap: anywhere;
}

.load-error {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
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

.badge-color-button,
.remove-label-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
}

.badge-color-button {
  border: 1px solid currentColor;
  font-size: 13px;
}

.remove-label-button {
  font-size: 19px;
  line-height: 1;
}

.badge-color-button:hover:not(:disabled),
.remove-label-button:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.12);
}

.existing-color-editor {
  margin: 12px 0 18px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}

.color-editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.color-editor-heading strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.color-editor-heading button {
  flex-shrink: 0;
  padding: 2px 7px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  font-size: 22px;
}

.label-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0;
}

.label-form > input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.label-form > input:focus {
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

.label-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  padding: 8px 0;
}

.preview-caption {
  color: #64748b;
  font-size: 12px;
}
</style>
