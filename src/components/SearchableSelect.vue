<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

type OptionValue = string | number | null

interface Option {
  value: OptionValue
  label: string
}

const props = defineProps<{
  id: string
  modelValue: OptionValue
  options: Option[]
  placeholder: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: OptionValue]
}>()

const open = ref(false)
const search = ref('')
const trigger = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const selectedLabel = computed(() =>
  props.options.find(option => option.value === props.modelValue)?.label ??
  props.placeholder,
)

const filteredOptions = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('de-CH')

  return props.options.filter(option =>
    option.label.toLocaleLowerCase('de-CH').includes(query),
  )
})

function close(restoreFocus = false) {
  open.value = false

  if (restoreFocus) trigger.value?.focus()
}

async function toggle() {
  if (props.disabled) return

  if (open.value) {
    close()
    return
  }

  search.value = ''
  open.value = true
  await nextTick()
  searchInput.value?.focus()
}

function choose(value: OptionValue) {
  emit('update:modelValue', value)
  close(true)
}

function handleFocusOut(event: FocusEvent) {
  const root = event.currentTarget as HTMLElement

  if (!(event.relatedTarget instanceof Node) ||
    !root.contains(event.relatedTarget)) {
    close()
  }
}

watch(() => props.disabled, disabled => {
  if (disabled) close()
})
</script>

<template>
  <div
    class="picker"
    @focusout="handleFocusOut"
    @keydown.esc="open && ($event.stopPropagation(), close(true))"
  >
    <button
      :id="id"
      ref="trigger"
      type="button"
      class="picker-trigger"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-controls="`${id}-options`"
      @click="toggle"
    >
      <span>{{ selectedLabel }}</span>
    </button>

    <div v-show="open" :id="`${id}-options`" class="picker-panel">
      <input
        ref="searchInput"
        v-model="search"
        type="search"
        :aria-label="`${placeholder}: Optionen durchsuchen`"
        placeholder="Suchen …"
        @keydown.enter.prevent
      >

      <p v-if="!filteredOptions.length" class="picker-empty" role="status">
        Keine passenden Optionen.
      </p>

      <ul v-else class="picker-options">
        <li v-for="option in filteredOptions" :key="option.value ?? ''">
          <button
            type="button"
            class="picker-option"
            :aria-pressed="option.value === modelValue"
            @click="choose(option.value)"
          >
            {{ option.label }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.picker {
  min-width: 0;
}

.picker .picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
}

.picker-trigger span,
.picker-option {
  overflow-wrap: anywhere;
}

.picker-panel {
  margin-top: 6px;
  padding: 8px;
  border: 1px solid #d5ded6;
  border-radius: 10px;
  background: #fff;
}

.picker-panel input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

.picker-options {
  max-height: 180px;
  overflow-y: auto;
  margin: 6px 0 0;
  padding: 4px;
  list-style: none;
}

.picker .picker-option {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
}

.picker .picker-option:hover,
.picker .picker-option[aria-pressed="true"] {
  background: #e8f1e9;
  color: #205447;
}

.picker-empty {
  margin: 8px 4px 0;
  font-size: 0.875rem;
}
</style>
