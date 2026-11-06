<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { request, json } from '../services/lehrway-api'
import Footer from '@/components/Footer.vue'
import UserMenu from '@/components/UserMenu.vue'
import CoursePlan from '@/components/CoursePlan.vue'
import { confirmAction } from '@/composables/useConfirm'

import type {
  Course,
  CourseFieldMove,
  CourseFieldUpdate,
  CourseModule,
  NewCourseField,
} from '@/types/lehrway'

interface DBLehrgang {
  id: number
  bezeichnung: string
  semesteranzahl: number
}

interface DBModul {
  id: number
  bezeichnung: string
  lehrjahr: number
  semester: number
  quartal: number
  quartal_span: number
  lektionen: number | null
  lehrgang_id: number
}

interface SavedRange {
  startQuarter: number
  quarterSpan: number
  lessons: number
}

interface SavedPosition {
  startQuarter: number
  quarterSpan: number
}

const courses = ref<Course[]>([])
const selectedCourseId = ref<number | null>(null)
const searchQuery = ref('')

const loading = ref(false)
const saving = ref(false)
const apiError = ref('')
const planError = ref('')
const successVersion = ref(0)

const showCreateCourse = ref(false)
const newCourseName = ref('')
const newCourseSemesters = ref(6)
const editedCourseName = ref('')
const createCourseError = ref('')
const editCourseError = ref('')

const busy = computed(() => loading.value || saving.value)

const selectedCourse = computed(() =>
  courses.value.find(
    course => course.id === selectedCourseId.value,
  ) ?? null,
)

const filteredCourses = computed(() => {
  const search = searchQuery.value.trim().toLowerCase()

  return courses.value.filter(
    course => course.name.toLowerCase().includes(search),
  )
})

function getError(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Ein unbekannter Fehler ist aufgetreten.'
}

function toDBQuarter(quarter: number) {
  const lehrjahr = Math.floor((quarter - 1) / 4) + 1
  const quartal = ((quarter - 1) % 4) + 1
  const semester =
    (lehrjahr - 1) * 2 + Math.ceil(quartal / 2)

  return { lehrjahr, semester, quartal }
}

async function loadCourses() {
  loading.value = true
  apiError.value = ''

  try {
    const dbCourses = await request<DBLehrgang[]>('/lehrgaenge')

    const result = await Promise.all(
      dbCourses.map(async course => {
        const rows = await request<DBModul[]>(
          `/lehrgaenge/${course.id}/module`,
        )

        const modules = new Map<string, CourseModule>()

        for (const row of rows) {
          const key = row.bezeichnung.trim().toLowerCase()
          let module = modules.get(key)

          if (!module) {
            module = {
              id: Number(row.id),
              name: row.bezeichnung,
              fields: [],
            }

            modules.set(key, module)
          }

          module.fields.push({
            id: Number(row.id),
            startQuarter:
              (Number(row.lehrjahr) - 1) * 4 +
              Number(row.quartal),
            quarterSpan: Number(row.quartal_span ?? 1),
            lessons: Number(row.lektionen ?? 0),
          })
        }

        return {
          id: Number(course.id),
          name: course.bezeichnung,
          semesteranzahl: Number(course.semesteranzahl),
          modules: [...modules.values()],
        }
      }),
    )

    courses.value = result

    if (
      selectedCourseId.value !== null &&
      !courses.value.some(
        course => course.id === selectedCourseId.value,
      )
    ) {
      selectedCourseId.value = null
    }
  } catch (error) {
    apiError.value = getError(error)
  } finally {
    loading.value = false
  }
}

function selectCourse(id: number) {
  if (busy.value) return

  selectedCourseId.value = id
  editedCourseName.value = selectedCourse.value?.name ?? ''
  editCourseError.value = ''
  planError.value = ''
}

async function createCourse() {
  if (busy.value) return

  const name = newCourseName.value.trim()
  createCourseError.value = ''

  if (!name || Array.from(name).length > 255) {
    createCourseError.value =
      'Bitte einen Lehrgangsnamen mit 1 bis 255 Zeichen eingeben.'
    return
  }

  if (
    courses.value.some(
      course => course.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    createCourseError.value = 'Dieser Lehrgang existiert bereits.'
    return
  }

  saving.value = true

  try {
    await request('/lehrgaenge', json('POST', {
      bezeichnung: name,
      semesteranzahl: newCourseSemesters.value,
    }))

    newCourseName.value = ''
    newCourseSemesters.value = 6
    showCreateCourse.value = false

    await loadCourses()
  } catch (error) {
    createCourseError.value = getError(error)
  } finally {
    saving.value = false
  }
}

function cancelCreateCourse() {
  if (busy.value) return

  showCreateCourse.value = false
  newCourseName.value = ''
  createCourseError.value = ''
}

async function renameCourse() {
  const course = selectedCourse.value
  if (!course || busy.value) return

  const name = editedCourseName.value.trim()
  editCourseError.value = ''

  if (!name || Array.from(name).length > 255) {
    editCourseError.value =
      'Bitte einen Lehrgangsnamen mit 1 bis 255 Zeichen eingeben.'
    return
  }

  if (
    courses.value.some(
      other =>
        other.id !== course.id &&
        other.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    editCourseError.value = 'Dieser Lehrgang existiert bereits.'
    return
  }

  saving.value = true

  try {
    await request(
      `/lehrgaenge/${course.id}`,
      json('PUT', { bezeichnung: name }),
    )

    course.name = name
    await loadCourses()
  } catch (error) {
    editCourseError.value = getError(error)
  } finally {
    saving.value = false
  }
}

async function deleteCourse() {
  const course = selectedCourse.value
  if (!course || busy.value) return

  const confirmed = await confirmAction({
    title: 'Lehrgang löschen?',
    message:
      `Möchtest du den Lehrgang „${course.name}“ wirklich löschen?`,
    confirmLabel: 'Lehrgang löschen',
    tone: 'danger',
  })

  if (!confirmed) return

  saving.value = true

  try {
    await request(`/lehrgaenge/${course.id}`, json('DELETE'))

    courses.value = courses.value.filter(
      entry => entry.id !== course.id,
    )

    selectedCourseId.value = null
    editedCourseName.value = ''

    await loadCourses()
  } catch (error) {
    apiError.value = getError(error)
  } finally {
    saving.value = false
  }
}

// --------------------------------------------------
// Aktionen aus CoursePlan speichern
// --------------------------------------------------

async function savePlanChange(
  operation: () => Promise<void>,
) {
  if (busy.value) return

  saving.value = true
  planError.value = ''

  try {
    await operation()
    await loadCourses()

    // CoursePlan schließt danach erfolgreiche Eingaben.
    successVersion.value += 1
  } catch (error) {
    planError.value = getError(error)

    // Bei teilweise ausgeführten Modul-Löschungen
    // den tatsächlichen Datenbankstand erneut laden.
    await loadCourses()
  } finally {
    saving.value = false
  }
}

async function addModule(name: string) {
  const course = selectedCourse.value
  if (!course) return

  await savePlanChange(async () => {
    await request(
      `/lehrgaenge/${course.id}/module`,
      json('POST', {
        bezeichnung: name,
        ...toDBQuarter(1),
        quartal_span: 1,
        lektionen: 0,
      }),
    )
  })
}

async function removeModule(module: CourseModule) {
  if (busy.value) return

  const confirmed = await confirmAction({
    title: 'Modul entfernen?',
    message:
      `Möchtest du das Modul „${module.name}“ entfernen? ` +
      'Seine Quartalsfelder werden ebenfalls gelöscht.',
    confirmLabel: 'Modul entfernen',
    tone: 'danger',
  })

  if (!confirmed) return

  await savePlanChange(async () => {
    for (const field of [...module.fields]) {
      await request(`/lehrgang-module/${field.id}`, json('DELETE'))

      module.fields = module.fields.filter(
        entry => entry.id !== field.id,
      )
    }

    const course = selectedCourse.value

    if (course) {
      course.modules = course.modules.filter(
        entry => entry.id !== module.id,
      )
    }
  })
}

async function addField(field: NewCourseField) {
  const course = selectedCourse.value
  if (!course) return

  await savePlanChange(async () => {
    await request(
      `/lehrgaenge/${course.id}/module`,
      json('POST', {
        bezeichnung: field.moduleName,
        ...toDBQuarter(field.startQuarter),
        quartal_span:
          field.endQuarter - field.startQuarter + 1,
        lektionen: 0,
      }),
    )
  })
}

async function saveField(update: CourseFieldUpdate) {
  await savePlanChange(async () => {
    const result = await request<SavedRange>(
      `/lehrgang-module/${update.fieldId}/bereich`,
      json('PATCH', {
        startQuarter: update.startQuarter,
        endQuarter: update.endQuarter,
        lessons: update.lessons,
      }),
    )

    const course = selectedCourse.value

    if (course) {
      for (const module of course.modules) {
        const field = module.fields.find(
          entry => entry.id === update.fieldId,
        )

        if (field) {
          field.startQuarter = Number(result.startQuarter)
          field.quarterSpan = Number(result.quarterSpan)
          field.lessons = Number(result.lessons)
        }
      }
    }
  })
}

async function removeField(fieldId: number) {
  if (busy.value) return

  const confirmed = await confirmAction({
    title: 'Quartalsfeld löschen?',
    message:
      'Möchtest du dieses Quartalsfeld mit seinen Lektionen wirklich löschen?',
    confirmLabel: 'Feld löschen',
    tone: 'danger',
  })

  if (!confirmed) return

  await savePlanChange(async () => {
    await request(`/lehrgang-module/${fieldId}`, json('DELETE'))

    const course = selectedCourse.value

    if (course) {
      for (const module of course.modules) {
        module.fields = module.fields.filter(
          field => field.id !== fieldId,
        )
      }

      course.modules = course.modules.filter(
        module => module.fields.length > 0,
      )
    }
  })
}

async function moveField(move: CourseFieldMove) {
  await savePlanChange(async () => {
    const result = await request<SavedPosition>(
      `/lehrgang-module/${move.fieldId}/position`,
      json('PATCH', {
        startQuarter: move.startQuarter,
      }),
    )

    const course = selectedCourse.value

    if (course) {
      for (const module of course.modules) {
        const field = module.fields.find(
          entry => entry.id === move.fieldId,
        )

        if (field) {
          field.startQuarter = Number(result.startQuarter)
          field.quarterSpan = Number(result.quarterSpan)
        }
      }
    }
  })
}

onMounted(loadCourses)
</script>

  <template>
    <div class="page-shell page-course">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/home" class="brand">
          Lehr<span>way</span>
        </router-link>

        <nav class="site-nav" aria-label="Hauptnavigation">
          <router-link to="/home" class="nav-link">
            Wochenplan
          </router-link>

          <router-link to="/lehrgang" class="nav-link">
            Lehrgänge
          </router-link>
        </nav>

        <UserMenu />
      </div>
    </header>

    <div class="page-intro">
      <h1>Lehrgänge verwalten</h1>
      <p>Organisiere Lehrgänge, Module und Lektionen.</p>
    </div>

    <main class="page-main">
      <p v-if="loading" class="status-message" role="status">
        Lehrgänge werden geladen...
      </p>

      <p
        v-if="apiError"
        class="status-message error"
        role="alert"
      >
        {{ apiError }}
      </p>

      <aside class="panel">
        <h2>Lehrgänge</h2>

        <button
          type="button"
          class="primary-button"
          :disabled="busy"
          @click="showCreateCourse = true"
        >
          + Lehrgang erstellen
        </button>

        <form
          v-if="showCreateCourse"
          class="form-stack"
          @submit.prevent="createCourse"
        >
          <input
            v-model="newCourseName"
            type="text"
            placeholder="Lehrgangsname"
            maxlength="255"
            :disabled="busy"
            required
          >

          <label for="semesteranzahl">Anzahl Semester</label>

          <select
            id="semesteranzahl"
            v-model.number="newCourseSemesters"
            :disabled="busy"
          >
            <option :value="2">2 Semester</option>
            <option :value="4">4 Semester</option>
            <option :value="6">6 Semester</option>
          </select>

          <button
            type="submit"
            class="primary-button"
            :disabled="busy"
          >
            Erstellen
          </button>

          <button
            type="button"
            :disabled="busy"
            @click="cancelCreateCourse"
          >
            Abbrechen
          </button>

          <p v-if="createCourseError" class="error" role="alert">
            {{ createCourseError }}
          </p>
        </form>

        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          placeholder="Lehrgänge suchen"
          aria-label="Lehrgänge suchen"
        >

        <ul class="item-list">
          <li v-for="course in filteredCourses" :key="course.id">
            <button
              type="button"
              class="list-button"
              :class="{ selected: selectedCourseId === course.id }"
              :disabled="busy"
              @click="selectCourse(course.id)"
            >
              {{ course.name }}
            </button>
          </li>
        </ul>

        <p v-if="!loading && filteredCourses.length === 0">
          Keine Lehrgänge gefunden.
        </p>
      </aside>

      <section class="panel">
        <h2>Lehrgang bearbeiten</h2>

        <template v-if="selectedCourse">
          <h3>{{ selectedCourse.name }}</h3>

          <form class="form-stack" @submit.prevent="renameCourse">
            <label for="course-name">Lehrgangsname</label>

            <input
              id="course-name"
              v-model="editedCourseName"
              type="text"
              maxlength="255"
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

            <p v-if="editCourseError" class="error" role="alert">
              {{ editCourseError }}
            </p>
          </form>

          <hr>

          <CoursePlan
            :key="selectedCourse.id"
            :course="selectedCourse"
            :busy="busy"
            :error="planError"
            :success-version="successVersion"
            @add-module="addModule"
            @remove-module="removeModule"
            @add-field="addField"
            @save-field="saveField"
            @remove-field="removeField"
            @move-field="moveField"
          />

          <hr>

          <button
            type="button"
            class="danger-button"
            :disabled="busy"
            @click="deleteCourse"
          >
            Lehrgang löschen
          </button>
        </template>

        <p v-else>Kein Lehrgang ausgewählt.</p>
      </section>
    </main>

    <Footer />
  </div>
</template>
