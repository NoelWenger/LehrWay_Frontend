
const API_URL = 'http://localhost:3000/api'

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || `API-Fehler: ${response.status}`
    )
  }

  return data as T
}

// Datentypen passend zur Datenbank

export interface Lehrgang {
  id: number
  bezeichnung: string
  semesteranzahl: number
}

export interface Klasse {
  id: number
  bezeichnung: string
  lehrgang_id: number
  notizen: string | null
  anzahl_schultage_woche: number
}

export interface LehrgangModul {
  id: number
  bezeichnung: string
  lehrjahr: number
  semester: number
  quartal: number
  lektionen: number
  lehrgang_id: number
}

// LEHRGÄNGE

export function getLehrgaenge() {
  return apiRequest<Lehrgang[]>('/lehrgaenge')
}

export function createLehrgang(
  lehrgang: Omit<Lehrgang, 'id'>
) {
  return apiRequest<Lehrgang>('/lehrgaenge', {
    method: 'POST',
    body: JSON.stringify(lehrgang)
  })
}

export function updateLehrgang(
  id: number,
  lehrgang: Partial<Omit<Lehrgang, 'id'>>
) {
  return apiRequest<Lehrgang>(`/lehrgaenge/${id}`, {
    method: 'PUT',
    body: JSON.stringify(lehrgang)
  })
}

export function deleteLehrgang(id: number) {
  return apiRequest<void>(`/lehrgaenge/${id}`, {
    method: 'DELETE'
  })
}

// KLASSEN

export function getKlassen() {
  return apiRequest<Klasse[]>('/klassen')
}

export function createKlasse(
  klasse: Omit<Klasse, 'id'>
) {
  return apiRequest<Klasse>('/klassen', {
    method: 'POST',
    body: JSON.stringify(klasse)
  })
}

export function updateKlasse(
  id: number,
  klasse: Partial<Omit<Klasse, 'id'>>
) {
  return apiRequest<Klasse>(`/klassen/${id}`, {
    method: 'PUT',
    body: JSON.stringify(klasse)
  })
}

export function deleteKlasse(id: number) {
  return apiRequest<void>(`/klassen/${id}`, {
    method: 'DELETE'
  })
}

// LEHRGANG-MODULE

export function getLehrgangModule(lehrgangId: number) {
  return apiRequest<LehrgangModul[]>(
    `/lehrgaenge/${lehrgangId}/module`
  )
}

// REGISTRIERUNG – bereits im Backend vorhanden

export function register(email: string, password: string) {
  return apiRequest<{ success: boolean; message: string }>(
    '/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }
  )
}
