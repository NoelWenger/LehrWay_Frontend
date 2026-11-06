<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { request, json } from '../services/lehrway-api'
import LabelColorPicker from '@/components/LabelColorPicker.vue'

interface ClassLabel {
  klasse_id: number
  label_id: number
  name: string
  farbe: string
}

interface ExistingLabel {
  id: number
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

const mode = ref<'existing' | 'new'>('existing')

const existingLabels = ref<ExistingLabel[]>([])
const existingLabelsLoading = ref(false)
const existingLabelsError = ref('')
const selectedExistingId = ref<number | null>(null)

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

// Bereits zugeordnete Labels nicht erneut anbieten.
const availableLabels = computed(() =>
  existingLabels.value.filter(
    label =>
      !props.labels.some(
        assigned => assigned.label_id === label.id,
      ),
  ),
)

const selectedExistingLabel = computed(() =>
  availableLabels.value.find(
    label => label.id === selectedExistingId.value,
  ),
)

// Erkennt auch einen vorhandenen Namen im Formular „Neues Label“.
const existingNameLabel = computed(() => {
  const name = newLabelName.value.trim().toLowerCase()

  if (!name) return undefined

  return existingLabels.value.find(
    label => label.name.trim().toLowerCase() === name,
  )
})

const newLabelPreviewColor = computed(() =>
  existingNameLabel.value?.farbe ?? newLabelColor.value,
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

function changeMode(value: 'existing' | 'new') {
  if (busy.value) return

  mode.value = value
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
// Alle vorhandenen Labels laden
// --------------------------------------------------

async function loadExistingLabels() {
  if (existingLabelsLoading.value) return

  existingLabelsLoading.value = true
  existingLabelsError.value = ''

  try {
    const rows = await request<ExistingLabel[]>('/labels')

    if (!Array.isArray(rows)) {
      throw new Error(
        'Die API hat keine Label-Liste zurückgegeben.',
      )
    }

    const normalized = rows.map(row => {
      const id = Number(row.id)

      if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        typeof row.name !== 'string'
      ) {
        throw new Error(
          'Die API hat ungültige Label-Daten zurückgegeben.',
        )
      }

      return {
        id,
        name: row.name,
        farbe: normalizeColor(row.farbe),
      }
    })

    existingLabels.value = normalized

    if (
      selectedExistingId.value !== null &&
      !availableLabels.value.some(
        label => label.id === selectedExistingId.value,
      )
    ) {
      selectedExistingId.value = null
    }
  } catch (value) {
    existingLabelsError.value = getError(value)
  } finally {
    existingLabelsLoading.value = false
  }
}

function updateCatalog(assignment: ClassLabel) {
  const existing = existingLabels.value.find(
    label => label.id === assignment.label_id,
  )

  if (existing) {
    existing.name = assignment.name
    existing.farbe = assignment.farbe
  } else {
    existingLabels.value.push({
      id: assignment.label_id,
      name: assignment.name,
      farbe: assignment.farbe,
    })
  }

  existingLabels.value.sort(
    (first, second) => first.name.localeCompare(second.name),
  )
}

// --------------------------------------------------
// Vorhandenes oder neues Label zuordnen
// --------------------------------------------------

async function saveAssignment(name: string, color: string) {
  if (busy.value || !props.ready) return

  error.value = ''
  setSaving(true)

  try {
    const result = await request<ClassLabel>(
      `/klassen/${props.classId}/labels`,
      json('POST', {
        name,
        farbe: normalizeColor(color),
      }),
    )

    const assignment = normalizeLabel(result)

    updateCatalog(assignment)
    emit('saved', assignment)

    newLabelName.value = ''
    selectedExistingId.value = null
  } catch (value) {
    error.value = getError(value)
  } finally {
    setSaving(false)
  }
}

async function addExistingLabel() {
  if (busy.value || !props.ready) return

  const label = selectedExistingLabel.value

  if (!label) {
    error.value = 'Bitte ein vorhandenes Label auswählen.'
    return
  }

  await saveAssignment(label.name, label.farbe)
}

async function addNewLabel() {
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
      'Diese Klasse hat dieses Label bereits.'
    return
  }

  await saveAssignment(name, newLabelPreviewColor.value)
}

// --------------------------------------------------
// Gemeinsame Farbe ändern
// --------------------------------------------------

function toggleColorEditor(labelId: number) {
  if (busy.value || !props.ready) return

  editingColorId.value =
    editingColorId.value === labelId ? null : labelId

  error.value = ''
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

    const labelId = Number(result.label_id)
    const savedColor = normalizeColor(result.farbe)

    const catalogLabel = existingLabels.value.find(
      entry => entry.id === labelId,
    )

    if (catalogLabel) {
      catalogLabel.farbe = savedColor
    }

    emit('color-changed', {
      label_id: labelId,
      farbe: savedColor,
    })
  } catch (value) {
    error.value = getError(value)
  } finally {
    setSaving(false)
  }
}

// --------------------------------------------------
// Zuordnung entfernen
// --------------------------------------------------

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

onMounted(loadExistingLabels)
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

    <!-- Bereits zugeordnete Labels -->
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

    <!-- Gemeinsame Farbe bearbeiten -->
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

    <!-- Zwischen Wiederverwenden und Erstellen wechseln -->
    <div
      class="mode-switch"
      role="group"
      aria-label="Label hinzufügen"
    >
      <button
        type="button"
        :class="{ active: mode === 'existing' }"
        :aria-pressed="mode === 'existing'"
        :disabled="busy"
        @click="changeMode('existing')"
      >
        Vorhandenes Label
      </button>

      <button
        type="button"
        :class="{ active: mode === 'new' }"
        :aria-pressed="mode === 'new'"
        :disabled="busy"
        @click="changeMode('new')"
      >
        Neues Label
      </button>
    </div>

    <!-- Vorhandenes Label verwenden -->
    <form
      v-if="mode === 'existing'"
      class="label-form"
      @submit.prevent="addExistingLabel"
    >
      <label :for="`existing-label-${classId}`">
        Label auswählen
      </label>

      <p
        v-if="existingLabelsLoading"
        class="help-text"
        role="status"
      >
        Vorhandene Labels werden geladen...
      </p>

      <div
        v-if="existingLabelsError"
        class="load-error"
      >
        <p class="error-message" role="alert">
          {{ existingLabelsError }}
        </p>
      </div>

      <select
        :id="`existing-label-${classId}`"
        v-model="selectedExistingId"
        :disabled="
          busy ||
          !ready ||
          existingLabelsLoading ||
          availableLabels.length === 0
        "
        required
      >
        <option :value="null" disabled>
          Label auswählen
        </option>

        <option
          v-for="label in availableLabels"
          :key="label.id"
          :value="label.id"
        >
          {{ label.name }}
        </option>
      </select>

      <div
        v-if="selectedExistingLabel"
        class="label-preview"
      >
        <span class="preview-caption">
          Vorschau
        </span>

        <span
          class="label-badge"
          :style="badgeStyle(selectedExistingLabel.farbe)"
        >
          {{ selectedExistingLabel.name }}
        </span>
      </div>

      <p
        v-if="
          !existingLabelsLoading &&
          !existingLabelsError &&
          availableLabels.length === 0
        "
        class="help-text"
      >
        Es gibt momentan keine weiteren Labels zur Auswahl.
        Du kannst unter „Neues Label“ eines erstellen.
      </p>

      <button
        type="submit"
        class="primary-button"
        :disabled="
          busy ||
          !ready ||
          existingLabelsLoading ||
          !selectedExistingLabel
        "
      >
        Label hinzufügen
      </button>

      <button
        type="button"
        class="refresh-button"
        :disabled="busy || existingLabelsLoading"
        @click="loadExistingLabels"
      >
        Liste aktualisieren
      </button>
    </form>

    <!-- Neues Label erstellen -->
    <form
      v-else
      class="label-form"
      @submit.prevent="addNewLabel"
    >
      <label :for="`new-class-label-${classId}`">
        Neues Stichwort
      </label>

      <input
        :id="`new-class-label-${classId}`"
        v-model="newLabelName"
        type="text"
        placeholder="Zum Beispiel Testing"
        maxlength="50"
        :disabled="busy || !ready"
        required
      >

      <p v-if="existingNameLabel" class="help-text">
        Dieses Label existiert bereits. Es wird mit seiner
        gespeicherten Farbe übernommen.
      </p>

      <LabelColorPicker
        v-model="newLabelColor"
        :disabled="busy || !ready || !!existingNameLabel"
      />

      <div class="label-preview">
        <span class="preview-caption">
          Vorschau
        </span>

        <span
          class="label-badge"
          :style="badgeStyle(newLabelPreviewColor)"
        >
          {{ newLabelName.trim() || 'Dein Label' }}
        </span>
      </div>

      <button
        type="submit"
        class="primary-button"
        :disabled="busy || !ready || !newLabelName.trim()"
      >
        {{
          existingNameLabel
            ? 'Vorhandenes Label hinzufügen'
            : 'Label erstellen'
        }}
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

