<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'

import Footer from '@/components/Footer.vue'
import UserMenu from '@/components/UserMenu.vue'
import { request } from '@/services/lehrway-api'

interface Entry {
  id: string
  username: string
  description: string
  createdAt: string | null
  before: Record<string, unknown>[]
  after: Record<string, unknown>[]
}

interface Page {
  entries: Entry[]
  nextCursor: string | null
}

interface Filters {
  search: string
  username: string
  action: string
  from: string
  to: string
}

const emptyFilters = (): Filters => ({
  search: '',
  username: '',
  action: '',
  from: '',
  to: '',
})

const draft = reactive<Filters>(emptyFilters())
const applied = ref<Filters>(emptyFilters())

const entries = ref<Entry[]>([])
const cursor = ref<string | null>(null)
const loading = ref(false)
const error = ref('')

const usernames = ref<string[]>([])
const optionsLoading = ref(false)
const optionsError = ref('')

function normalized(filters: Filters): Filters {
  return {
    ...filters,
    search: filters.search.trim(),
  }
}

const filtersChanged = computed(() =>
  JSON.stringify(normalized(draft)) !==
  JSON.stringify(applied.value),
)

const names: Record<string, string> = {
  bezeichnung: 'Name',
  name: 'Label',
  klasse: 'Klasse',
  klasse_a: 'Erste Klasse',
  klasse_b: 'Zweite Klasse',
  semesteranzahl: 'Semester',
  lehrjahr: 'Lehrjahr',
  quartal: 'Quartal im Lehrjahr',
  quartal_span: 'Quartale',
  lektionen: 'Lektionen',
  farbe: 'Farbe',
  notizen: 'Notizen',
  anzahl_schultage_woche: 'Schultage pro Woche',
  wochentag: 'Wochentag',
  anzahl_raeume: 'Räume',
}

function details(
  rows: Record<string, unknown>[],
) {
  return rows
    .map(row =>
      Object.entries(row)
        .filter(([key]) => names[key])
        .map(([key, value]) =>
          names[key] + ': ' + (value ?? '–'),
        )
        .join(' · '),
    )
    .join('\n')
}

function date(value: string | null) {
  if (!value) return 'Zeitpunkt nicht bekannt'

  return new Intl.DateTimeFormat('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

// Die Auswahl gilt in der lokalen Zeitzone des Browsers.
// Beim Enddatum wird der gesamte gewählte Tag eingeschlossen.
function dayBoundary(
  value: string,
  followingDay = false,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(
      'Bitte ein gültiges Datum auswählen.',
    )
  }

  const [year, month, day] =
    value.split('-').map(Number)

  const result = new Date(0)

  result.setFullYear(
    year!,
    month! - 1,
    day!,
  )

  result.setHours(0, 0, 0, 0)

  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month! - 1 ||
    result.getDate() !== day
  ) {
    throw new Error(
      'Bitte ein gültiges Datum auswählen.',
    )
  }

  if (followingDay) {
    result.setDate(result.getDate() + 1)
  }

  return result.toISOString()
}

function queryFor(
  filters: Filters,
  next: string | null,
) {
  if (
    filters.from &&
    filters.to &&
    filters.from > filters.to
  ) {
    throw new Error(
      'Das Enddatum darf nicht vor dem Startdatum liegen.',
    )
  }

  const query = new URLSearchParams()

  if (filters.search) {
    query.set('q', filters.search)
  }

  if (filters.username) {
    query.set('username', filters.username)
  }

  if (filters.action) {
    query.set('action', filters.action)
  }

  if (filters.from) {
    query.set(
      'from',
      dayBoundary(filters.from),
    )
  }

  if (filters.to) {
    query.set(
      'until',
      dayBoundary(filters.to, true),
    )
  }

  if (next) {
    query.set('before', next)
  }

  return query.size
    ? '?' + query.toString()
    : ''
}

async function loadUsers() {
  if (optionsLoading.value) return

  optionsLoading.value = true
  optionsError.value = ''

  try {
    const result = await request<{
      usernames: string[]
    }>('/logs/filter-options')

    usernames.value = result.usernames
  } catch (cause) {
    optionsError.value =
      cause instanceof Error
        ? cause.message
        : 'Benutzerliste konnte nicht geladen werden.'
  } finally {
    optionsLoading.value = false
  }
}

async function load(
  filters: Filters,
  more = false,
) {
  if (loading.value) return

  const next = more
    ? cursor.value
    : null

  if (more && !next) return

  error.value = ''

  const selection = normalized(filters)
  let query: string

  try {
    query = queryFor(selection, next)
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : 'Bitte die Filter prüfen.'

    return
  }

  loading.value = true

  try {
    const result = await request<Page>(
      '/logs' + query,
    )

    entries.value = more
      ? [...entries.value, ...result.entries]
      : result.entries

    cursor.value = result.nextCursor
    applied.value = selection
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : 'Der Verlauf konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

async function applyFilters() {
  await load(draft)
}

async function resetFilters() {
  if (loading.value) return

  Object.assign(draft, emptyFilters())

  await load(draft)
}

async function refresh() {
  await Promise.all([
    load(applied.value),
    loadUsers(),
  ])
}

onMounted(() => refresh())
</script>

<template>
  <div class="page-shell page-logs">
    <header class="site-header">
      <div class="header-inner">
        <RouterLink to="/home" class="brand">
          Lehr<span>way</span>
        </RouterLink>

        <nav
          class="site-nav"
          aria-label="Hauptnavigation"
        >
          <RouterLink to="/home" class="nav-link">
            Wochenplan
          </RouterLink>

          <RouterLink to="/lehrgang" class="nav-link">
            Lehrgänge
          </RouterLink>

          <RouterLink to="/logs" class="nav-link">
            Logs
          </RouterLink>
        </nav>

        <UserMenu />
      </div>
    </header>

    <div class="page-intro">
      <h1>Änderungsverlauf</h1>

      <p>
        Die letzten Änderungen aller Benutzer
        an der gemeinsamen Planung.
      </p>
    </div>

    <main class="log-main">
      <section class="panel">
        <div class="log-heading">
          <h2>Letzte Änderungen</h2>

          <button
            type="button"
            :disabled="loading"
            @click="refresh()"
          >
            Aktualisieren
          </button>
        </div>

        <form
          class="log-filters"
          @submit.prevent="applyFilters"
        >
          <div class="filter-field">
            <label for="log-search">Suche</label>

            <input
              id="log-search"
              v-model="draft.search"
              type="search"
              maxlength="120"
              placeholder="Zum Beispiel D24a oder IMS"
              :disabled="loading"
            >
          </div>

          <div class="filter-field">
            <label for="log-user">Benutzer</label>

            <select
              id="log-user"
              v-model="draft.username"
              :disabled="loading || optionsLoading"
            >
              <option value="">Alle Benutzer</option>

              <option
                v-for="username in usernames"
                :key="username"
                :value="username"
              >
                {{ username }}
              </option>
            </select>
          </div>

          <div class="filter-field">
            <label for="log-action">
              Änderungsart
            </label>

            <select
              id="log-action"
              v-model="draft.action"
              :disabled="loading"
            >
              <option value="">Alle Änderungen</option>
              <option value="hinzugefügt">Hinzugefügt</option>
              <option value="geändert">Geändert</option>
              <option value="entfernt">Entfernt</option>
            </select>
          </div>

          <div class="filter-field">
            <label for="log-from">Von</label>

            <input
              id="log-from"
              v-model="draft.from"
              type="date"
              :disabled="loading"
            >
          </div>

          <div class="filter-field">
            <label for="log-to">
              Bis einschließlich
            </label>

            <input
              id="log-to"
              v-model="draft.to"
              type="date"
              :disabled="loading"
            >
          </div>

          <div class="filter-actions">
            <button
              type="submit"
              class="primary-button"
              :disabled="loading"
            >
              Filter anwenden
            </button>

            <button
              type="button"
              :disabled="loading"
              @click="resetFilters"
            >
              Zurücksetzen
            </button>
          </div>
        </form>

        <p
          v-if="optionsError"
          class="error-message"
          role="alert"
        >
          {{ optionsError }}

          <button
            type="button"
            :disabled="optionsLoading"
            @click="loadUsers"
          >
            Erneut versuchen
          </button>
        </p>

        <p
          v-if="filtersChanged"
          class="filter-note"
          role="status"
        >
          Filter geändert. Klicke auf „Filter anwenden“,
          um die Auswahl zu übernehmen.
          Die Liste zeigt noch die zuletzt geladene Auswahl.
        </p>

        <p
          v-if="error"
          class="error-message"
          role="alert"
        >
          {{ error }}
        </p>

        <p v-if="loading" role="status">
          Änderungen werden geladen …
        </p>

        <p
          v-if="
            !loading &&
            !error &&
            !entries.length
          "
        >
          Keine Einträge für diese Auswahl gefunden.
        </p>

        <p
          v-if="!loading && entries.length"
          class="filter-note"
          role="status"
        >
          {{ entries.length }}
          {{
            entries.length === 1
              ? 'Eintrag geladen'
              : 'Einträge geladen'
          }}
        </p>

        <ol class="log-list">
          <li
            v-for="entry in entries"
            :key="entry.id"
            class="log-entry"
          >
            <div class="log-meta">
              <strong>{{ entry.username }}</strong>

              <time
                :datetime="
                  entry.createdAt || undefined
                "
              >
                {{ date(entry.createdAt) }}
              </time>
            </div>

            <p class="log-description">
              {{ entry.description }}
            </p>

            <details
              v-if="
                entry.before.length ||
                entry.after.length
              "
            >
              <summary>Änderung ansehen</summary>

              <div class="log-comparison">
                <div>
                  <h3>Vorher</h3>
                  <p>
                    {{
                      details(entry.before) ||
                      'Nicht vorhanden'
                    }}
                  </p>
                </div>

                <div>
                  <h3>Nachher</h3>
                  <p>
                    {{
                      details(entry.after) ||
                      'Nicht vorhanden'
                    }}
                  </p>
                </div>
              </div>
            </details>
          </li>
        </ol>

        <button
          v-if="cursor"
          type="button"
          :disabled="loading"
          @click="load(applied, true)"
        >
          Weitere Änderungen laden
        </button>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.log-main {
  flex: 1;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 0 24px 48px;
  box-sizing: border-box;
}

.log-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.log-heading h2 {
  margin: 0;
}

.log-filters {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0 18px;
  padding: 20px;
  border: 1px solid #dfe6df;
  border-radius: 14px;
  background: #f7f9f6;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.filter-field label {
  color: #52665c;
  font-size: 12px;
  font-weight: 600;
}

.page-logs .filter-field input,
.page-logs .filter-field select {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 13px;
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.page-logs .filter-actions button {
  width: auto;
  margin: 0;
  padding: 10px 12px;
  font-size: 12px;
}

.filter-note {
  color: #61706b;
  font-size: 12px;
  line-height: 1.6;
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 24px 0;
}

.log-entry {
  padding: 22px 0;
  border-top: 1px solid #dfe6df;
}

.log-meta {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  flex-wrap: wrap;
  font-size: 13px;
  color: #61706b;
}

.log-meta strong {
  color: #205447;
}

.log-description {
  margin: 10px 0;
  font-weight: 600;
}

.log-entry summary {
  cursor: pointer;
  color: #205447;
  font-size: 13px;
}

.log-comparison {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.log-comparison > div {
  padding: 16px;
  border-radius: 12px;
  background: #f3f6f2;
}

.log-comparison h3 {
  margin: 0 0 8px;
  font-size: 13px;
}

.log-comparison p {
  margin: 0;
  font-size: 13px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
}

@media (max-width: 800px) {
  .log-filters {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .log-comparison {
    grid-template-columns: 1fr;
  }

  .log-main {
    padding-inline: 16px;
  }
}

@media (max-width: 520px) {
  .log-filters {
    grid-template-columns: 1fr;
    padding: 14px;
  }
}
</style>
