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

          <h3>Semester</h3>

          <button
            type="button"
            @click="addSemester"
          >
            Semester hinzufügen
          </button>

          <div
            v-for="(semester, semesterIndex) in selectedCourse.semesters"
            :key="semester.id"
          >
            <h4>
              Semester {{ semesterIndex + 1 }}
            </h4>

            <button
              type="button"
              @click="removeSemester(semester.id)"
            >
              Semester entfernen
            </button>

            <h5>Module</h5>

            <form @submit.prevent="addModule(semester.id)">
              <input
                v-model="newModuleNames[semester.id]"
                type="text"
                placeholder="Modulname"
              >

              <button type="submit">
                Modul hinzufügen
              </button>
            </form>

            <ul>
              <li
                v-for="module in semester.modules"
                :key="module.id"
              >
                <input
                  v-model="module.name"
                  type="text"
                >

                <button
                  type="button"
                  @click="removeModule(semester.id, module.id)"
                >
                  Entfernen
                </button>
              </li>
            </ul>

            <p v-if="semester.modules.length === 0">
              Noch keine Module vorhanden.
            </p>

            <hr>
          </div>

          <p v-if="selectedCourse.semesters.length === 0">
            Noch keine Semester vorhanden.
          </p>

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

interface Module {
  id: number
  name: string
}

interface Semester {
  id: number
  modules: Module[]
}

interface Course {
  id: number
  name: string
  semesters: Semester[]
}

const courses = ref<Course[]>([
  {
    id: 1,
    name: 'IMS',
    semesters: [
      {
        id: 101,
        modules: [
          {
            id: 1001,
            name: 'M117'
          },
          {
            id: 1002,
            name: 'M122'
          }
        ]
      },
      {
        id: 102,
        modules: [
          {
            id: 1003,
            name: 'M164'
          }
        ]
      }
    ]
  },
  {
    id: 2,
    name: 'Informatiker/in Applikationsentwicklung',
    semesters: []
  },
  {
    id: 3,
    name: 'Informatiker/in Plattformentwicklung',
    semesters: []
  }
])

const searchQuery = ref('')
const selectedCourseId = ref<number | null>(null)

const showCreateCourse = ref(false)
const newCourseName = ref('')
const createCourseError = ref('')

const editedCourseName = ref('')
const editCourseError = ref('')

const newModuleNames = ref<Record<number, string>>({})

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
    semesters: []
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
}

function addSemester() {
  if (!selectedCourse.value) return

  selectedCourse.value.semesters.push({
    id: Date.now(),
    modules: []
  })
}

function removeSemester(semesterId: number) {
  if (!selectedCourse.value) return

  selectedCourse.value.semesters =
    selectedCourse.value.semesters.filter(
      semester => semester.id !== semesterId
    )

  delete newModuleNames.value[semesterId]
}

function addModule(semesterId: number) {
  if (!selectedCourse.value) return

  const moduleName =
    newModuleNames.value[semesterId]?.trim()

  if (!moduleName) return

  const semester =
    selectedCourse.value.semesters.find(
      semester => semester.id === semesterId
    )

  if (!semester) return

  semester.modules.push({
    id: Date.now(),
    name: moduleName
  })

  newModuleNames.value[semesterId] = ''
}

function removeModule(
  semesterId: number,
  moduleId: number
) {
  if (!selectedCourse.value) return

  const semester =
    selectedCourse.value.semesters.find(
      semester => semester.id === semesterId
    )

  if (!semester) return

  semester.modules = semester.modules.filter(
    module => module.id !== moduleId
  )
}
</script>
