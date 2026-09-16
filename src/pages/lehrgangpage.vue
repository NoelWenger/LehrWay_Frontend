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

          <p>
            Klicke auf ein Quartal, um ein Feld zu erstellen.
            Klicke danach auf ein zweites Quartal desselben Moduls,
            um mehrere Quartale zu verbinden.
          </p>

          <table>
            <thead>
            <tr>
              <th rowspan="3">Module</th>

              <th colspan="4">Lehrjahr 1</th>
              <th colspan="4">Lehrjahr 2</th>
              <th colspan="4">Lehrjahr 3</th>
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

              <template
                v-for="quarter in quarters"
                :key="quarter"
              >
                <td
                  v-if="shouldRenderQuarter(module, quarter)"
                  :colspan="getFieldAtStart(module, quarter)?.quarterSpan ?? 1"
                >
                  <div v-if="getFieldAtStart(module, quarter)">
                    <input
                      v-model.number="getFieldAtStart(module, quarter)!.lessons"
                      type="number"
                      min="0"
                      placeholder="Lektionen"
                    >

                    <button
                      type="button"
                      @click="removeField(
                          module,
                          getFieldAtStart(module, quarter)!.id
                        )"
                    >
                      ×
                    </button>
                  </div>

                  <button
                    v-else
                    type="button"
                    @click="handleQuarterClick(module, quarter)"
                  >
                    {{
                      isSelectionStart(module.id, quarter)
                        ? '●'
                        : '+'
                    }}
                  </button>
                </td>
              </template>
            </tr>
            </tbody>
          </table>

          <p v-if="selectedCourse.modules.length === 0">
            Noch keine Module vorhanden.
          </p>

          <p v-if="selection">
            Startquartal Q{{ selection.startQuarter }} ausgewählt.
            Wähle ein zweites freies Quartal im gleichen Modul.
          </p>

          <button
            v-if="selection"
            type="button"
            @click="cancelSelection"
          >
            Auswahl abbrechen
          </button>

          <p v-if="fieldError">
            {{ fieldError }}
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

interface CourseField {
  id: number
  startQuarter: number
  quarterSpan: number
  lessons: number | null
}

interface CourseModule {
  id: number
  name: string
  fields: CourseField[]
}

interface Course {
  id: number
  name: string
  modules: CourseModule[]
}

interface QuarterSelection {
  moduleId: number
  startQuarter: number
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
        name: 'M117',
        fields: []
      },
      {
        id: 102,
        name: 'M122',
        fields: []
      },
      {
        id: 103,
        name: 'M164',
        fields: []
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
const fieldError = ref('')

const selection = ref<QuarterSelection | null>(null)

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

  selection.value = null
  editCourseError.value = ''
  moduleError.value = ''
  fieldError.value = ''

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
  selection.value = null
  editedCourseName.value = ''
  editCourseError.value = ''
  newModuleName.value = ''
  moduleError.value = ''
  fieldError.value = ''
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
    name,
    fields: []
  })

  newModuleName.value = ''
}

function removeModule(moduleId: number) {
  if (!selectedCourse.value) return

  selectedCourse.value.modules =
    selectedCourse.value.modules.filter(
      module => module.id !== moduleId
    )

  if (selection.value?.moduleId === moduleId) {
    selection.value = null
  }
}

function handleQuarterClick(
  module: CourseModule,
  quarter: number
) {
  fieldError.value = ''

  if (isQuarterOccupied(module, quarter)) {
    fieldError.value =
      'Dieses Quartal ist bereits belegt.'
    return
  }

  if (!selection.value) {
    selection.value = {
      moduleId: module.id,
      startQuarter: quarter
    }

    return
  }

  if (selection.value.moduleId !== module.id) {
    selection.value = {
      moduleId: module.id,
      startQuarter: quarter
    }

    return
  }

  const startQuarter = Math.min(
    selection.value.startQuarter,
    quarter
  )

  const endQuarter = Math.max(
    selection.value.startQuarter,
    quarter
  )

  if (
    !isRangeAvailable(
      module,
      startQuarter,
      endQuarter
    )
  ) {
    fieldError.value =
      'Zwischen diesen Quartalen befindet sich bereits ein anderes Feld.'

    return
  }

  createField(
    module,
    startQuarter,
    endQuarter
  )

  selection.value = null
}

function createField(
  module: CourseModule,
  startQuarter: number,
  endQuarter: number
) {
  module.fields.push({
    id: Date.now(),
    startQuarter,
    quarterSpan:
      endQuarter - startQuarter + 1,
    lessons: null
  })
}

function removeField(
  module: CourseModule,
  fieldId: number
) {
  module.fields = module.fields.filter(
    field => field.id !== fieldId
  )

  fieldError.value = ''
}

function cancelSelection() {
  selection.value = null
  fieldError.value = ''
}

function getFieldAtStart(
  module: CourseModule,
  quarter: number
) {
  return module.fields.find(
    field =>
      field.startQuarter === quarter
  )
}

function getFieldAtQuarter(
  module: CourseModule,
  quarter: number
) {
  return module.fields.find(field => {
    const endQuarter =
      field.startQuarter +
      field.quarterSpan -
      1

    return (
      quarter >= field.startQuarter &&
      quarter <= endQuarter
    )
  })
}

function isQuarterOccupied(
  module: CourseModule,
  quarter: number
) {
  return (
    getFieldAtQuarter(
      module,
      quarter
    ) !== undefined
  )
}

function isRangeAvailable(
  module: CourseModule,
  startQuarter: number,
  endQuarter: number
) {
  for (
    let quarter = startQuarter;
    quarter <= endQuarter;
    quarter++
  ) {
    if (isQuarterOccupied(module, quarter)) {
      return false
    }
  }

  return true
}

function shouldRenderQuarter(
  module: CourseModule,
  quarter: number
) {
  const field = getFieldAtQuarter(
    module,
    quarter
  )

  if (!field) {
    return true
  }

  return field.startQuarter === quarter
}

function isSelectionStart(
  moduleId: number,
  quarter: number
) {
  return (
    selection.value?.moduleId === moduleId &&
    selection.value?.startQuarter === quarter
  )
}
</script>
