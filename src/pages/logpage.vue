<script setup lang="ts">
import { onMounted, ref } from 'vue'

import Footer from '@/components/Footer.vue'
import UserMenu from '@/components/UserMenu.vue'

import {
  request,
} from '@/services/lehrway-api'

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

const entries = ref<Entry[]>([])
const cursor = ref<string | null>(null)
const loading = ref(false)
const error = ref('')

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
  anzahl_schultage_woche:
    'Schultage pro Woche',
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
          names[key] +
          ': ' +
          (value ?? '–'),
        )
        .join(' · '),
    )
    .join('\n')
}

function date(value: string | null) {
  if (!value) {
    return 'Zeitpunkt nicht bekannt'
  }

  return new Intl.DateTimeFormat(
    'de-CH',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value))
}

async function load(more = false) {
  if (loading.value) return

  const next = more
    ? cursor.value
    : null

  if (more && !next) return

  loading.value = true
  error.value = ''

  try {
    const result = await request<Page>(
      '/logs' +
      (
        next
          ? '?before=' +
          encodeURIComponent(next)
          : ''
      ),
    )

    entries.value = more
      ? [
        ...entries.value,
        ...result.entries,
      ]
      : result.entries

    cursor.value = result.nextCursor
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : 'Der Verlauf konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <div class="page-shell page-logs">
    <header class="site-header">
      <div class="header-inner">
        <RouterLink
          to="/home"
          class="brand"
        >
          Lehr<span>way</span>
        </RouterLink>

        <nav
          class="site-nav"
          aria-label="Hauptnavigation"
        >
          <RouterLink
            to="/home"
            class="nav-link"
          >
            Wochenplan
          </RouterLink>

          <RouterLink
            to="/lehrgang"
            class="nav-link"
          >
            Lehrgänge
          </RouterLink>

          <RouterLink
            to="/logs"
            class="nav-link"
          >
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
            @click="load()"
          >
            Aktualisieren
          </button>
        </div>

        <p
          v-if="error"
          class="error-message"
          role="alert"
        >
          {{ error }}
        </p>

        <p
          v-if="loading"
          role="status"
        >
          Änderungen werden geladen …
        </p>

        <p
          v-if="
            !loading &&
            !error &&
            !entries.length
          "
        >
          Noch keine Änderungen vorhanden.
        </p>

        <ol class="log-list">
          <li
            v-for="entry in entries"
            :key="entry.id"
            class="log-entry"
          >
            <div class="log-meta">
              <strong>
                {{ entry.username }}
              </strong>

              <time
                :datetime="
                  entry.createdAt ||
                  undefined
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
              <summary>
                Änderung ansehen
              </summary>

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
          @click="load(true)"
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

@media (max-width: 600px) {
  .log-comparison {
    grid-template-columns: 1fr;
  }

  .log-main {
    padding-inline: 16px;
  }
}
</style>
