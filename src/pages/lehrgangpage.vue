<template>
  <div>
    <header>
      <h1>Lehrway</h1>

      <nav>
        <router-link to="/">Wochenplan</router-link>
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

interface Course {
  id: number
  name: string
}

const courses = ref<Course[]>([
  {
    id: 1,
    name: 'IMS'
  },
  {
    id: 2,
    name: 'Informatiker/in Applikationsentwicklung'
  },
  {
    id: 3,
    name: 'Informatiker/in Plattformentwicklung'
  }
])

const searchQuery = ref('')
const selectedCourseId = ref<number | null>(null)

const showCreateCourse = ref(false)
const newCourseName = ref('')
const createCourseError = ref('')

const editedCourseName = ref('')
const editCourseError = ref('')

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
    name
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
</script>
