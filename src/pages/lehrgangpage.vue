<template>
  <div>
    <header>
      <h1>Lehrway</h1>

      <nav>
        <router-link to="/home">Wochenplan</router-link>
        <router-link to="/lehrgang">Lehrgänge</router-link>
      </nav>
    </header>

    <main>
      <aside>
        <h2>Lehrgänge</h2>

        <button type="button" @click="showCreateCourse = true">
          Lehrgang erstellen
        </button>

        <form v-if="showCreateCourse" @submit.prevent="createCourse">
          <input
            v-model="newCourseName"
            type="text"
            placeholder="Lehrgangsname"
          >

          <button type="submit">
            Erstellen
          </button>

          <button type="button" @click="cancelCreateCourse">
            Abbrechen
          </button>

          <p v-if="createCourseError">
            {{ createCourseError }}
          </p>
        </form>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Lehrgänge suchen"
        >

        <ul>
          <li
            v-for="course in filteredCourses"
            :key="course.id"
          >
            <button
              type="button"
              @click="selectCourse(course.id)"
            >
              {{ course.name }}
            </button>
          </li>
        </ul>
      </aside>

      <section>
        <h2>Lehrgang bearbeiten</h2>

        <div v-if="selectedCourse">
          <h3>{{ selectedCourse.name }}</h3>

          <form @submit.prevent="renameCourse">
            <label>
              Lehrgangsname

              <input
                v-model="editedCourseName"
                type="text"
              >
            </label>

            <button type="submit">
              Namen speichern
            </button>

            <p v-if="editCourseError">
              {{ editCourseError }}
            </p>
          </form>

          <hr>

          <h3>Lehrplan</h3>

          <table>
            <thead>
            <tr>
              <th rowspan="3">
                Module
              </th>

              <th colspan="4">
                Lehrjahr 1
              </th>

              <th colspan="4">
                Lehrjahr 2
              </th>

              <th colspan="4">
                Lehrjahr 3
              </th>
            </tr>

            <tr>
              <th colspan="2">Semester 1</th>
              <th colspan="2">Semester 2</th>
              <th colspan="2">Semester 3</th>
              <th colspan="2">Semester 4</th>
              <th colspan="2">Semester 5</th>
              <th colspan="2">Semester 6</th>
            </tr>

            <tr>
              <th
                v-for="quarter in quarters"
                :key="quarter"
              >
                Q{{ quarter }}
              </th>
            </tr>
            </thead>

            <tbody>
            <tr
              v-for="module in selectedCourse.modules"
              :key="module.id"
            >
              <th>
                <input
                  v-model="module.name"
                  type="text"
                >

                <button
                  type="button"
                  @click="removeModule(module.id)"
                >
                  Entfernen
                </button>
              </th>

              <td
                v-for="quarter in quarters"
                :key="quarter"
              >
                <button
                  type="button"
                  @click="selectQuarter(module.id, quarter)"
                >
                  {{ isQuarterSelected(module.id, quarter) ? '●' : '○' }}
                </button>
              </td>
            </tr>
            </tbody>
          </table>

          <p v-if="selectedCourse.modules.length === 0">
            Noch keine Module vorhanden.
          </p>

          <form @submit.prevent="addModule">
            <input
              v-model="newModuleName"
              type="text"
              placeholder="Modulname"
            >

            <button type="submit">
              Modul hinzufügen
            </button>
          </form>

          <p v-if="moduleError">
            {{ moduleError }}
          </p>

          <hr>

          <button
            type="button"
            @click="deleteCourse"
          >
            Lehrgang löschen
          </button>
        </div>

        <p v-else>
          Kein Lehrgang ausgewählt.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface CourseModule {
  id: number
  name: string
}

interface Course {
  id: number
  name: string
  modules: CourseModule[]
}

interface SelectedQuarter {
  moduleId: number
  quarter: number
}

const quarters = [
  1, 2, 3, 4,
  5, 6, 7, 8,
  9, 10, 11, 12
]

const courses = ref<Course[]>([
  {
    id: 1,
    name: 'IMS',
    modules: [
      {
        id: 101,
        name: 'M117'
      },
      {
        id: 102,
        name: 'M122'
      },
      {
        id: 103,
        name: 'M164'
      }
    ]
  },
  {
    id: 2,
    name: 'Informatiker/in Applikationsentwicklung',
    modules: []
  },
  {
    id: 3,
    name: 'Informatiker/in Plattformentwicklung',
    modules: []
  }
])

const searchQuery = ref('')
const selectedCourseId = ref<number | null>(null)

const showCreateCourse = ref(false)
const newCourseName = ref('')
const createCourseError = ref('')

const editedCourseName = ref('')
const editCourseError = ref('')

const newModuleName = ref('')
const moduleError = ref('')

const selectedQuarter = ref<SelectedQuarter | null>(null)

const filteredCourses = computed(() =>
  courses.value.filter(course =>
    course.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  )
)

const selectedCourse = computed(() =>
  courses.value.find(
    course => course.id === selectedCourseId.value
  )
)

function selectCourse(courseId: number) {
  selectedCourseId.value = courseId

  editCourseError.value = ''
  moduleError.value = ''
  selectedQuarter.value = null

  const course = courses.value.find(
    course => course.id === courseId
  )

  editedCourseName.value = course?.name ?? ''
}

function createCourse() {
  const name = newCourseName.value.trim()

  createCourseError.value = ''

  if (!name) {
    createCourseError.value =
      'Der Lehrgangsname darf nicht leer sein.'
    return
  }

  const courseAlreadyExists = courses.value.some(
    course =>
      course.name.trim().toLowerCase() ===
      name.toLowerCase()
  )

  if (courseAlreadyExists) {
    createCourseError.value =
      'Ein Lehrgang mit diesem Namen existiert bereits.'
    return
  }

  courses.value.push({
    id: Date.now(),
    name,
    modules: []
  })

  newCourseName.value = ''
  showCreateCourse.value = false
}

function cancelCreateCourse() {
  newCourseName.value = ''
  createCourseError.value = ''
  showCreateCourse.value = false
}

function renameCourse() {
  if (!selectedCourse.value) return

  const name = editedCourseName.value.trim()

  editCourseError.value = ''

  if (!name) {
    editCourseError.value =
      'Der Lehrgangsname darf nicht leer sein.'
    return
  }

  const courseAlreadyExists = courses.value.some(
    course =>
      course.id !== selectedCourse.value?.id &&
      course.name.trim().toLowerCase() ===
      name.toLowerCase()
  )

  if (courseAlreadyExists) {
    editCourseError.value =
      'Ein Lehrgang mit diesem Namen existiert bereits.'
    return
  }

  selectedCourse.value.name = name
  editedCourseName.value = name
}

function deleteCourse() {
  if (!selectedCourse.value) return

  const courseId = selectedCourse.value.id

  courses.value = courses.value.filter(
    course => course.id !== courseId
  )

  selectedCourseId.value = null
  editedCourseName.value = ''
  editCourseError.value = ''
  newModuleName.value = ''
  moduleError.value = ''
  selectedQuarter.value = null
}

function addModule() {
  if (!selectedCourse.value) return

  const name = newModuleName.value.trim()

  moduleError.value = ''

  if (!name) {
    moduleError.value =
      'Der Modulname darf nicht leer sein.'
    return
  }

  const moduleAlreadyExists =
    selectedCourse.value.modules.some(
      module =>
        module.name.trim().toLowerCase() ===
        name.toLowerCase()
    )

  if (moduleAlreadyExists) {
    moduleError.value =
      'Ein Modul mit diesem Namen existiert bereits.'
    return
  }

  selectedCourse.value.modules.push({
    id: Date.now(),
    name
  })

  newModuleName.value = ''
}

function removeModule(moduleId: number) {
  if (!selectedCourse.value) return

  selectedCourse.value.modules =
    selectedCourse.value.modules.filter(
      module => module.id !== moduleId
    )

  if (
    selectedQuarter.value?.moduleId === moduleId
  ) {
    selectedQuarter.value = null
  }
}

function selectQuarter(
  moduleId: number,
  quarter: number
) {
  if (
    selectedQuarter.value?.moduleId === moduleId &&
    selectedQuarter.value?.quarter === quarter
  ) {
    selectedQuarter.value = null
    return
  }

  selectedQuarter.value = {
    moduleId,
    quarter
  }
}

function isQuarterSelected(
  moduleId: number,
  quarter: number
) {
  return (
    selectedQuarter.value?.moduleId === moduleId &&
    selectedQuarter.value?.quarter === quarter
  )
}
</script>
