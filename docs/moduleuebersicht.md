# Modulübersicht

Die Dateien in `src/pages` setzen die einzelnen Seiten zusammen. Komponenten in `src/components` übernehmen die Darstellung und melden Benutzeraktionen an die Seite zurück. Die Dienste in `src/services` verbinden das Frontend mit der API.

| Modul | Aufgabe | Code |
| --- | --- | --- |
| Wochenplan | Planungsdaten für das gewählte Schuljahr laden, Klassen verwalten und Änderungen speichern | [`homepage.vue`](../src/pages/homepage.vue) |
| Wochenansicht | Schultage und Räume anzeigen, Konflikte berechnen und Schultag-Aktionen auslösen | [`WeeklySchedule.vue`](../src/components/WeeklySchedule.vue) |
| Klassenbearbeitung | Klassenname, Labels und Konfliktregeln bearbeiten | [`ClassEditor.vue`](../src/components/ClassEditor.vue), [`ClassEditorDrawer.vue`](../src/components/ClassEditorDrawer.vue) |
| Labels | Vorhandene Labels zuweisen, neue Labels erstellen und Farben bearbeiten | [`ClassLabels.vue`](../src/components/ClassLabels.vue), [`LabelColorPicker.vue`](../src/components/LabelColorPicker.vue) |
| Lehrgangsverwaltung | Lehrgänge laden, suchen, erstellen und bearbeiten | [`lehrgangpage.vue`](../src/pages/lehrgangpage.vue) |
| Lehrplan | Module und Quartalsfelder anzeigen und bearbeiten | [`CoursePlan.vue`](../src/components/CoursePlan.vue), [`CourseFieldEditor.vue`](../src/components/CourseFieldEditor.vue) |
| Änderungsverlauf | Logeinträge laden, filtern und mit Vorher-Nachher-Details anzeigen | [`logpage.vue`](../src/pages/logpage.vue) |
| Anmeldung und Registrierung | Formulare, Rückmeldungen und Weiterleitungen | [`loginpage.vue`](../src/pages/loginpage.vue), [`registerpage.vue`](../src/pages/registerpage.vue) |
| Sitzung und Benutzermenü | Aktuellen Benutzer ermitteln, geschützte Routen prüfen und abmelden | [`auth.ts`](../src/services/auth.ts), [`index.ts`](../src/router/index.ts), [`UserMenu.vue`](../src/components/UserMenu.vue) |
| Durchsuchbare Auswahl | Lange Optionslisten durchsuchen und innerhalb einer begrenzten Höhe scrollen | [`SearchableSelect.vue`](../src/components/SearchableSelect.vue) |
| Bestätigungsdialog | Rückfragen für Konflikte, Löschaktionen und Abmeldung anzeigen | [`useConfirm.ts`](../src/composables/useConfirm.ts), [`ConfirmDialog.vue`](../src/components/ConfirmDialog.vue) |

## Zusammenspiel am Beispiel eines Schultags

1. `homepage.vue` lädt Klassen, Schultage, Raumkapazitäten und Konfliktregeln für die Wochenansicht.
2. `WeeklySchedule.vue` berechnet daraus, ob ein Feld einen bestehenden oder möglichen Konflikt zeigt.
3. Nach der gewählten Aktion sendet die Komponente das Ereignis `toggle-day` mit Klassen-ID und Wochentag an die Seite.
4. Die Seite führt die Änderung über die API aus und lädt die Daten neu.

Die gemeinsamen Typen für Planungsdaten stehen in [`lehrway.ts`](../src/types/lehrway.ts).