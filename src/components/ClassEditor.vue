<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ClassLabels from '@/components/ClassLabels.vue'

import type {
  ClassLabel,
  ClassRule,
  LabelColorChange,
  LabelRemoval,
  SchoolClass,
} from '@/types/lehrway'

const props = defineProps<{
  schoolClass: SchoolClass | null
  classes: SchoolClass[]
  rules: ClassRule[]
  labels: ClassLabel[]
  busy: boolean
  error: string
  labelsLoading: boolean
  labelsReady: boolean
  labelLoadError: string
}>()

const emit = defineEmits<{
  rename: [name: string]
  delete: []
  'add-rule': [otherClassId: number]
  'remove-rule': [ruleId: number]
  'reload-labels': []
  'label-busy': [busy: boolean]
  'label-saved': [label: ClassLabel]
  'label-color-changed': [change: LabelColorChange]
  'label-removed': [removal: LabelRemoval]
}>()

const editedName = ref('')
const selectedRuleClassId = ref<number | null>(null)

watch(
  () => [
    props.schoolClass?.id,
    props.schoolClass?.name,
  ],
  () => {
    editedName.value = props.schoolClass?.name ?? ''
    selectedRuleClassId.value = null
  },
  { immediate: true },
)

const classRules = computed(() =>
  props.rules.filter(rule =>
    rule.classAId === props.schoolClass?.id ||
    rule.classBId === props.schoolClass?.id,
  ),
)

const availableClasses = computed(() =>
  props.classes.filter(klasse =>
    klasse.id !== props.schoolClass?.id &&
    !classRules.value.some(rule =>
      rule.classAId === klasse.id ||
      rule.classBId === klasse.id,
    ),
  ),
)

function otherClassName(rule: ClassRule) {
  const classId = props.schoolClass?.id

  const otherId = rule.classAId === classId
    ? rule.classBId
    : rule.classAId

  return props.classes.find(
    klasse => klasse.id === otherId,
  )?.name ?? 'Unbekannt'
}

function addRule() {
  if (
    props.busy ||
    selectedRuleClassId.value === null
  ) {
    return
  }

  emit('add-rule', selectedRuleClassId.value)
  selectedRuleClassId.value = null
}
</script>

<template>
  <section>
    <h2>Klasse bearbeiten</h2>

    <template v-if="schoolClass">
      <h3>{{ schoolClass.name }}</h3>

      <form
        class="form-stack"
        @submit.prevent="emit('rename', editedName)"
      >
        <label for="class-name">Klassenname</label>

        <input
          id="class-name"
          v-model="editedName"
          type="text"
          maxlength="50"
          :disabled="busy"
          required
        >

        <button
          type="submit"
          class="primary-button"
          :disabled="busy"
        >
          Namen speichern
        </button>

        <p v-if="error" class="error-message" role="alert">
          {{ error }}
        </p>
      </form>

      <ClassLabels
        :key="schoolClass.id"
        :class-id="schoolClass.id"
        :labels="labels"
        :loading="labelsLoading"
        :ready="labelsReady"
        :load-error="labelLoadError"
        :disabled="busy"
        @reload="emit('reload-labels')"
        @busy-change="emit('label-busy', $event)"
        @saved="emit('label-saved', $event)"
        @color-changed="emit('label-color-changed', $event)"
        @removed="emit('label-removed', $event)"
      />

      <h3>Regeln</h3>

      <form class="form-stack" @submit.prevent="addRule">
        <label for="rule-class">
          Darf nicht am gleichen Tag wie:
        </label>

        <select
          id="rule-class"
          v-model="selectedRuleClassId"
          :disabled="busy"
        >
          <option :value="null">Klasse auswählen</option>

          <option
            v-for="klasse in availableClasses"
            :key="klasse.id"
            :value="klasse.id"
          >
            {{ klasse.name }}
          </option>
        </select>

        <button
          type="submit"
          :disabled="
            busy || selectedRuleClassId === null
          "
        >
          Regel hinzufügen
        </button>
      </form>

      <ul class="rule-list">
        <li v-for="rule in classRules" :key="rule.id">
          <span>{{ otherClassName(rule) }}</span>

          <button
            type="button"
            :disabled="busy"
            @click="emit('remove-rule', rule.id)"
          >
            Entfernen
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="danger-button"
        :disabled="busy"
        @click="emit('delete')"
      >
        Klasse löschen
      </button>
    </template>

    <p v-else>Wähle eine Klasse aus.</p>
  </section>
</template>

<style scoped>
h2 {
  margin-top: 0;
  font-size: 20px;
}

h3 {
  margin-top: 24px;
  font-size: 16px;
}

button,
input,
select {
  font-family: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

input:focus,
select:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0;
}

.primary-button {
  padding: 11px 14px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-weight: 600;
}

.rule-list {
  list-style: none;
  padding: 0;
}

.rule-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.error-message {
  margin: 0;
  color: #dc2626;
  overflow-wrap: anywhere;
}

.danger-button {
  padding: 10px 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
}
</style>
