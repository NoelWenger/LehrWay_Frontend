# Technologieentscheid

Lehrway verwendet ein Vue-Frontend für die interaktive Planung und eine Express-API für Anmeldung, Speicherung und Protokollierung. Die Wochenansicht kann Konflikte aus den geladenen Planungsdaten berechnen, bevor jemand einen Schultag einträgt. Gespeicherte Änderungen stehen dem Team über die API zur Verfügung.

| Bereich | Technologie | Einsatz in Lehrway |
| --- | --- | --- |
| Oberfläche | Vue 3 | Reaktive Tabellen, Formulare, Dialoge und wiederverwendbare Komponenten |
| Typisierung | TypeScript | Typen für Klassen, Labels, Räume und Lehrpläne sowie für Eigenschaften und Ereignisse von Komponenten |
| Entwicklung und Build | Vite | Lokaler Entwicklungsserver und Build für die Auslieferung |
| Navigation | Vue Router | Routen für Login, Registrierung, Wochenplan, Lehrgänge und Logs sowie Sitzungsprüfung vor geschützten Seiten |
| Gestaltung | CSS | Gemeinsame Farben, Formulare und Tabellen in `main.css`, ergänzt durch komponentenspezifische Styles |
| API-Zugriff | Fetch API | JSON-Anfragen an das Backend und Übermittlung des Sitzungs-Cookies |

## Entscheidungen für das Frontend

### Komponenten für wiederkehrende Bedienabläufe

Die Wochenansicht, die Klassenbearbeitung und der Lehrplan haben eigene Komponenten. Der Bestätigungsdialog wird für Konflikte und Löschaktionen gemeinsam verwendet. Lange Auswahllisten nutzen eine durchsuchbare Komponente, etwa bei der Auswahl einer Klasse für eine Konfliktregel.

### Gemeinsamer API-Zugriff

[`lehrway-api.ts`](../src/services/lehrway-api.ts) bündelt den API-Zugriff der Planungsseiten. Dort werden die API-Adresse, die Übermittlung des Sitzungs-Cookies und die Auswertung von Fehlermeldungen behandelt. [`auth.ts`](../src/services/auth.ts) verwaltet den aktuellen Benutzer im Frontend und stellt Funktionen für die Sitzungsprüfung und Abmeldung bereit.

### Gemeinsame Gestaltung mit CSS

[`main.css`](../src/assets/main.css) enthält die Grundgestaltung. Spezifische Elemente wie die Filter der Logseite haben eigene Styles in der zugehörigen Vue-Datei. Dadurch können die Seiten gemeinsame Farben und Bedienelemente verwenden und ihr jeweiliges Layout gezielt anpassen.

## Konfiguration im Code

- Abhängigkeiten, Node.js-Version und npm-Skripte stehen in [`package.json`](../package.json).
- Seiten und Sitzungsprüfung sind in [`src/router/index.ts`](../src/router/index.ts) definiert.
- API-Routen und Docker-Compose-Konfiguration liegen im [Backend-Repository](https://github.com/NoelWenger/LehrWay_Backend).