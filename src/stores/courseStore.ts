import { ref } from 'vue'

export interface CourseField {
  id: number
  startQuarter: number
  quarterSpan: number
  lessons: number | null
}

export interface CourseModule {
  id: number
  name: string
  fields: CourseField[]
}

export interface Course {
  id: number
  name: string
  modules: CourseModule[]
}

export const courses = ref<Course[]>([
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
