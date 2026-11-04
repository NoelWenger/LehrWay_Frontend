export type Weekday =
  | 'Montag'
  | 'Dienstag'
  | 'Mittwoch'
  | 'Donnerstag'
  | 'Freitag'

export interface SchoolClass {
  id: number
  name: string
  schoolDays: Weekday[]
  lehrgang_id: number | null
}

export interface ClassRule {
  id: number
  classAId: number
  classBId: number
}

export interface RoomCapacity {
  id: number
  day: Weekday
  capacity: number
}

export interface ClassLabel {
  klasse_id: number
  label_id: number
  name: string
  farbe: string
}

export interface LabelColorChange {
  label_id: number
  farbe: string
}

export interface LabelRemoval {
  klasse_id: number
  label_id: number
}

export interface CourseField {
  id: number
  startQuarter: number
  quarterSpan: number
  lessons: number
}

export interface CourseModule {
  id: number
  name: string
  fields: CourseField[]
}

export interface Course {
  id: number
  name: string
  semesteranzahl: number
  modules: CourseModule[]
}

export interface NewCourseField {
  moduleName: string
  startQuarter: number
  endQuarter: number
}

export interface CourseFieldUpdate {
  fieldId: number
  startQuarter: number
  endQuarter: number
  lessons: number
}

export interface CourseFieldMove {
  fieldId: number
  startQuarter: number
}
