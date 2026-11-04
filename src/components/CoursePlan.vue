<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import CourseFieldEditor from '@/components/CourseFieldEditor.vue'

import type {
  Course,
  CourseField,
  CourseFieldMove,
  CourseFieldUpdate,
  CourseModule,
  NewCourseField,
} from '@/types/lehrway'

const props = defineProps<{
  course: Course
  busy: boolean
  error: string
  successVersion: number
}>()

const emit = defineEmits<{
  'add-module': [name: string]
  'remove-module': [module: CourseModule]
  'add-field': [field: NewCourseField]
  'save-field': [field: CourseFieldUpdate]
  'remove-field': [fieldId: number]
  'move-field': [field: CourseFieldMove]
}>()

const quarters = Array.from({ length: 12 }, (_, i) => i + 1)

const showModuleForm = ref(false)
const newModuleName = ref('')
const moduleNameInput = ref<HTMLInputElement | null>(null)

const editingFieldId = ref<number | null>(null)
const localError = ref('')

const selection = ref<{
  moduleId: number
  startQuarter: number
} | null>(null)

const dragged = ref<{
  moduleId: number
  fieldId: number
} | null>(null)

const dropTarget = ref<{
  moduleId: number
  quarter: number
  valid: boolean
} | null>(null)

// Nach einer erfolgreich gespeicherten Planänderung
// werden offene Eingaben und Auswahlen geschlossen.
watch(
  () => props.successVersion,
  () => {
    showModuleForm.value = false
    newModuleName.value = ''
    editingFieldId.value = null
    selection.value = null
    localError.value = ''
    clearDrag()
  },
)

function getFieldAtStart(module: CourseModule, quarter: number) {
  return module.fields.find(
    field => field.startQuarter === quarter,
  )
}

function getFieldAtQuarter(module: CourseModule, quarter: number) {
  return module.fields.find(field =>
    quarter >= field.startQuarter &&
    quarter < field.startQuarter + field.quarterSpan,
  )
}

function shouldRenderQuarter(module: CourseModule, quarter: number) {
  const field = getFieldAtQuarter(module, quarter)
  return !field || field.startQuarter === quarter
}

function rangeAvailable(
  module: CourseModule,
  start: number,
  end: number,
  ignoredId: number | null = null,
) {
  if (start < 1 || end > 12 || end < start) return false

  return !module.fields.some(field => {
    if (field.id === ignoredId) return false

    const fieldEnd =
      field.startQuarter + field.quarterSpan - 1

    return start <= fieldEnd && end >= field.startQuarter
  })
}

function fieldRangeText(field: CourseField) {
  const end = field.startQuarter + field.quarterSpan - 1

  return field.quarterSpan === 1
    ? `Q${field.startQuarter}`
    : `Q${field.startQuarter}–Q${end}`
}

async function openModuleForm() {
  if (props.busy) return

  showModuleForm.value = true
  localError.value = ''

  await nextTick()

  moduleNameInput.value?.focus({ preventScroll: true })
  moduleNameInput.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  })
}

function cancelModuleForm() {
  if (props.busy) return

  showModuleForm.value = false
  newModuleName.value = ''
  localError.value = ''
}

function addModule() {
  if (props.busy) return

  const name = newModuleName.value.trim()
  localError.value = ''

  if (!name || Array.from(name).length > 50) {
    localError.value =
      'Bitte einen Modulnamen mit 1 bis 50 Zeichen eingeben.'
    return
  }

  if (
    props.course.modules.some(
      module => module.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    localError.value = 'Dieses Modul existiert bereits.'
    return
  }

  emit('add-module', name)
}

function selectQuarter(module: CourseModule, quarter: number) {
  if (
    props.busy ||
    dragged.value ||
    editingFieldId.value !== null
  ) {
    return
  }

  localError.value = ''

  if (getFieldAtQuarter(module, quarter)) return

  if (!selection.value || selection.value.moduleId !== module.id) {
    selection.value = {
      moduleId: module.id,
      startQuarter: quarter,
    }
    return
  }

  const start = Math.min(selection.value.startQuarter, quarter)
  const end = Math.max(selection.value.startQuarter, quarter)

  if (!rangeAvailable(module, start, end)) {
    localError.value =
      'Zwischen diesen Quartalen befindet sich bereits ein anderes Feld.'
    return
  }

  emit('add-field', {
    moduleName: module.name,
    startQuarter: start,
    endQuarter: end,
  })
}

function editField(field: CourseField) {
  if (props.busy || dragged.value) return

  editingFieldId.value = field.id
  selection.value = null
  localError.value = ''
}

function cancelEditing() {
  editingFieldId.value = null
  localError.value = ''
}

function isSelectionStart(moduleId: number, quarter: number) {
  return selection.value?.moduleId === moduleId &&
    selection.value?.startQuarter === quarter
}

function clearDrag() {
  dragged.value = null
  dropTarget.value = null
}

function startDrag(
  event: DragEvent,
  module: CourseModule,
  field: CourseField,
) {
  if (
    props.busy ||
    editingFieldId.value !== null ||
    !event.dataTransfer
  ) {
    event.preventDefault()
    return
  }

  dragged.value = {
    moduleId: module.id,
    fieldId: field.id,
  }

  selection.value = null
  localError.value = ''
  dropTarget.value = null

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(field.id))
}

function findDraggedField(module: CourseModule) {
  if (!dragged.value || dragged.value.moduleId !== module.id) {
    return undefined
  }

  return module.fields.find(
    field => field.id === dragged.value?.fieldId,
  )
}

function quarterAtPointer(
  event: DragEvent,
  module: CourseModule,
  cellStart: number,
) {
  const cell = event.currentTarget as HTMLTableCellElement
  const rect = cell.getBoundingClientRect()
  const span = getFieldAtStart(module, cellStart)?.quarterSpan ?? 1

  if (rect.width <= 0) return cellStart

  const relative = (event.clientX - rect.left) / rect.width

  const offset = Math.max(
    0,
    Math.min(span - 1, Math.floor(relative * span)),
  )

  return cellStart + offset
}

function canDropAt(module: CourseModule, quarter: number) {
  const field = findDraggedField(module)

  return !!field &&
    !props.busy &&
    rangeAvailable(
      module,
      quarter,
      quarter + field.quarterSpan - 1,
      field.id,
    )
}

function dragOver(
  event: DragEvent,
  module: CourseModule,
  cellStart: number,
) {
  if (!dragged.value) return

  event.preventDefault()

  const quarter = quarterAtPointer(event, module, cellStart)
  const valid = canDropAt(module, quarter)

  dropTarget.value = {
    moduleId: module.id,
    quarter,
    valid,
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = valid ? 'move' : 'none'
  }
}

function dropClass(module: CourseModule, cellStart: number) {
  const target = dropTarget.value

  if (!target || target.moduleId !== module.id) return {}

  const span = getFieldAtStart(module, cellStart)?.quarterSpan ?? 1

  const contains =
    target.quarter >= cellStart &&
    target.quarter < cellStart + span

  return {
    'drop-valid': contains && target.valid,
    'drop-invalid': contains && !target.valid,
  }
}

function dropField(
  event: DragEvent,
  module: CourseModule,
  cellStart: number,
) {
  if (!dragged.value) return

  event.preventDefault()

  const field = findDraggedField(module)
  const quarter = quarterAtPointer(event, module, cellStart)

  if (!field) {
    localError.value =
      'Das Feld kann nur innerhalb derselben Modulzeile verschoben werden.'
    clearDrag()
    return
  }

  if (!canDropAt(module, quarter)) {
    localError.value =
      'Der Zielbereich ist belegt oder reicht über Q12 hinaus.'
    clearDrag()
    return
  }

  clearDrag()

  if (field.startQuarter === quarter) return

  emit('move-field', {
    fieldId: field.id,
    startQuarter: quarter,
  })
}
</script>

<template>
  <section>
    <h3>Lehrplan</h3>

    <p class="help-text">
      Klicke auf ein Lektionenfeld, um die Lektionen und den
      Quartalsbereich zu bearbeiten. Ziehe ein geschlossenes Feld
      innerhalb derselben Modulzeile, um es zu verschieben.
      Neue Bereiche legst du über zwei freie Quartale an.
    </p>

    <p
      v-if="dragged && dropTarget"
      class="notice"
      role="status"
    >
      {{
        dropTarget.valid
          ? `Neuer Start: Q${dropTarget.quarter}. Zum Verschieben loslassen.`
          : 'Hier kann das Feld nicht abgelegt werden.'
      }}
    </p>

    <div class="table-wrapper">
      <table>
        <thead>
        <tr>
          <th rowspan="3">
            <div class="module-heading">
              <span>Module</span>

              <button
                type="button"
                class="add-module-button"
                :disabled="busy"
                :aria-expanded="showModuleForm"
                aria-controls="new-module-row"
                @click="openModuleForm"
              >
                + Neues Modul hinzufügen
              </button>
            </div>
          </th>

          <th colspan="4">Lehrjahr 1</th>
          <th colspan="4">Lehrjahr 2</th>
          <th colspan="4">Lehrjahr 3</th>
        </tr>

        <tr>
          <th
            v-for="semester in 6"
            :key="semester"
            colspan="2"
          >
            Semester {{ semester }}
          </th>
        </tr>

        <tr>
          <th v-for="quarter in quarters" :key="quarter">
            Q{{ quarter }}
          </th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="module in course.modules" :key="module.id">
          <th>
            <div class="module-name">{{ module.name }}</div>

            <button
              type="button"
              class="danger-button"
              :disabled="busy"
              @click="emit('remove-module', module)"
            >
              Entfernen
            </button>
          </th>

          <template v-for="quarter in quarters" :key="quarter">
            <td
              v-if="shouldRenderQuarter(module, quarter)"
              :colspan="
                  getFieldAtStart(module, quarter)?.quarterSpan ?? 1
                "
              :class="dropClass(module, quarter)"
              @dragover="dragOver($event, module, quarter)"
              @drop="dropField($event, module, quarter)"
            >
              <template v-if="getFieldAtStart(module, quarter)">
                <CourseFieldEditor
                  v-if="
                      editingFieldId ===
                      getFieldAtStart(module, quarter)!.id
                    "
                  :key="getFieldAtStart(module, quarter)!.id"
                  :field="getFieldAtStart(module, quarter)!"
                  :module="module"
                  :busy="busy"
                  :error="error"
                  @save="emit('save-field', $event)"
                  @cancel="cancelEditing"
                  @delete="emit('remove-field', $event)"
                />

                <button
                  v-else
                  type="button"
                  class="lesson-button"
                  :class="{
                      dragging:
                        dragged?.fieldId ===
                        getFieldAtStart(module, quarter)!.id,
                    }"
                  :disabled="busy"
                  :draggable="
                      !busy && editingFieldId === null
                    "
                  title="Klicken zum Bearbeiten, ziehen zum Verschieben"
                  @click="
                      editField(getFieldAtStart(module, quarter)!)
                    "
                  @dragstart="
                      startDrag(
                        $event,
                        module,
                        getFieldAtStart(module, quarter)!,
                      )
                    "
                  @dragend="clearDrag"
                >
                    <span>
                      {{ getFieldAtStart(module, quarter)!.lessons }}
                      Lektionen
                    </span>

                  <small>
                    {{
                      fieldRangeText(
                        getFieldAtStart(module, quarter)!,
                      )
                    }}
                  </small>
                </button>
              </template>

              <button
                v-else
                type="button"
                class="quarter-button"
                :class="{
                    selected: isSelectionStart(module.id, quarter),
                  }"
                :disabled="busy || editingFieldId !== null"
                @click="selectQuarter(module, quarter)"
              >
                {{
                  isSelectionStart(module.id, quarter) ? '●' : '+'
                }}
              </button>
            </td>
          </template>
        </tr>

        <tr
          v-if="showModuleForm"
          id="new-module-row"
          class="new-module-row"
        >
          <td>
            <form
              class="module-form"
              @submit.prevent="addModule"
            >
              <label for="new-module-name">Neues Modul</label>

              <input
                id="new-module-name"
                ref="moduleNameInput"
                v-model="newModuleName"
                type="text"
                placeholder="Modulname, z. B. M117"
                maxlength="50"
                :disabled="busy"
                required
              >

              <button
                type="submit"
                class="primary-button"
                :disabled="busy || !newModuleName.trim()"
              >
                Modul speichern
              </button>

              <button
                type="button"
                :disabled="busy"
                @click="cancelModuleForm"
              >
                Abbrechen
              </button>
            </form>
          </td>

          <td :colspan="quarters.length" class="placeholder">
            Gib links den Modulnamen ein und klicke auf
            „Modul speichern“.
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <p v-if="course.modules.length === 0 && !showModuleForm">
      Noch keine Module vorhanden.
    </p>

    <div v-if="selection" class="notice">
      <p>
        Startquartal Q{{ selection.startQuarter }} ausgewählt.
        Wähle ein zweites freies Quartal im gleichen Modul.
      </p>

      <button
        type="button"
        :disabled="busy"
        @click="selection = null"
      >
        Auswahl abbrechen
      </button>
    </div>

    <p v-if="localError" class="error-message" role="alert">
      {{ localError }}
    </p>

    <p
      v-if="error && editingFieldId === null"
      class="error-message"
      role="alert"
    >
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
h3 {
  margin-top: 24px;
  font-size: 17px;
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
  opacity: 0.6;
}

button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.help-text {
  color: #64748b;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin: 20px 0;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 10px 6px;
  border: 1px solid #e2e8f0;
  text-align: center;
}

thead th {
  background: #eff6ff;
  color: #1e40af;
}

tbody th {
  min-width: 150px;
  background: #f8fafc;
}

.module-heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.add-module-button {
  max-width: 180px;
  padding: 7px 10px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: white;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.module-name {
  margin-bottom: 10px;
  font-weight: 600;
}

.quarter-button {
  width: 100%;
  min-width: 32px;
  padding: 8px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fafc;
  color: #2563eb;
}

.quarter-button:hover:not(:disabled) {
  background: #dbeafe;
}

.quarter-button.selected {
  background: #2563eb;
  color: white;
}

.lesson-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 8px;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.lesson-button small {
  font-size: 11px;
  font-weight: 400;
}

.lesson-button[draggable="true"] {
  cursor: grab;
}

.lesson-button.dragging {
  opacity: 0.4;
}

td.drop-valid {
  background: #dcfce7;
  box-shadow: inset 0 0 0 2px #16a34a;
}

td.drop-invalid {
  background: #fee2e2;
  box-shadow: inset 0 0 0 2px #dc2626;
}

.notice {
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 10px;
  background: #eff6ff;
  color: #1d4ed8;
}

.new-module-row > td {
  background: #f8fafc;
  vertical-align: top;
}

.module-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 180px;
  margin: 0;
  text-align: left;
}

.module-form input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.placeholder {
  padding: 20px;
  color: #64748b;
  text-align: left;
}

.primary-button {
  padding: 11px 14px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-weight: 600;
}

.danger-button {
  padding: 8px 10px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
}

.error-message {
  color: #dc2626;
  overflow-wrap: anywhere;
}
</style>
