# Funktionsübersicht

Lehrway verbindet die Wochenplanung, die Lehrgangsverwaltung und den Änderungsverlauf. Diese Übersicht beschreibt die Bedienfunktionen und die Helfer im Frontend, die Daten laden, Eingaben prüfen und Benutzeraktionen an das Backend weitergeben.

- [Wochenplan und Klassen](#wochenplan-und-klassen)
- [Konfliktprüfung und Schultage](#konfliktprüfung-und-schultage)
- [Klassenbearbeitung und Labels](#klassenbearbeitung-und-labels)
- [Lehrgänge und Quartalsplanung](#lehrgänge-und-quartalsplanung)
- [Änderungsverlauf](#änderungsverlauf)
- [Anmeldung und Registrierung](#anmeldung-und-registrierung)
- [Gemeinsame Komponenten und Dienste](#gemeinsame-komponenten-und-dienste)

## Wochenplan und Klassen

Der Wochenplan zeigt die Klassen eines Schuljahrs mit ihren Schultagen, Labels und Raumkapazitäten. Über die Klassenliste lässt sich eine Klasse suchen und in der Seitenleiste bearbeiten.

### Funktionen in `homepage.vue`

| Funktion | Aufgabe |
| --- | --- |
| `loadData()` | Lädt die Planungsdaten für das ausgewählte Schuljahr und bereitet sie für die Wochenansicht auf. |
| `refreshData()` | Lädt die Wochenansicht auf Knopfdruck erneut, sofern keine andere Aktion läuft. |
| `changeSchoolYear(direction)` | Ändert das ausgewählte Schuljahr und lädt die Planung für dieses Jahr. |
| `loadLabels()` | Verwendet eine bereits laufende Label-Anfrage weiter oder startet eine neue. |
| `fetchLabels()` | Ruft die Klassenzuordnungen der Labels ab, prüft die Antwort und aktualisiert die Anzeige. |
| `selectClass(id)` | Wählt eine Klasse aus und öffnet ihre Bearbeitung. |
| `closeClassEditor()` | Schließt die Klassenbearbeitung, wenn die Oberfläche gerade keine Aktion ausführt. |
| `createClass()` | Prüft Klassenname und Lehrgangsauswahl und sendet die neue Klasse an die API. |
| `cancelCreateClass()` | Schließt das Formular und setzt die Eingaben für die neue Klasse zurück. |
| `renameClass(value)` | Prüft den neuen Namen und speichert ihn für die ausgewählte Klasse. |
| `deleteClass()` | Fragt nach Bestätigung und löscht die ausgewählte Klasse über die API. |
| `toggleSchoolDay(classId, day)` | Fügt die Zuordnung eines Schultags hinzu oder entfernt sie. |
| `changeCapacity(day, amount)` | Erhöht oder verringert die Raumkapazität des Tages. Der berechnete Wert bleibt mindestens null. |
| `addRule(otherId)` | Speichert eine Konfliktregel zwischen der ausgewählten und einer zweiten Klasse. |
| `removeRule(ruleId)` | Entfernt eine Konfliktregel anhand ihrer ID. |
| `onLabelSaved(assignment)` | Übernimmt eine gespeicherte Label-Zuordnung in die Wochenansicht. |
| `onLabelColorChanged(change)` | Aktualisiert die Farbe bei allen geladenen Zuordnungen desselben Labels. |
| `onLabelRemoved(removal)` | Entfernt die betroffene Zuordnung aus der Anzeige. |
| `saveChange(operation, setError)` | Sperrt parallele Bedienaktionen während des Speicherns, führt die Änderung aus und lädt die Daten neu. Fehler werden an die zuständige Anzeige weitergegeben. |
| `getError(error)` | Liefert einen Anzeigetext aus einem Fehler. |
| `normalizeColor(value)` | Prüft den Hex-Farbwert und liefert bei ungültigen Daten eine Standardfarbe. |

`filteredClasses` wendet die Klassensuche an. `selectedClass` und `selectedLabels` liefern die Daten für die geöffnete Bearbeitung. `busy` fasst die Lade- und Speicherzustände zusammen.

[Quellcode der Wochenplanseite](../src/pages/homepage.vue)

### Beispiel: Schuljahr wechseln und Daten aktualisieren

Ein Klick auf einen Jahrespfeil sendet `change-year` mit `-1` oder `1` an die Wochenplanseite. Dort ändert `changeSchoolYear()` das Startjahr. `loadData()` lädt anschliessend die passende Planung.

Über **Aktualisieren** lässt sich dieselbe Planung erneut abrufen. Der angezeigte Zeitpunkt wird erst aktualisiert, wenn der Wochenplan und die Labels vollständig geladen wurden.

## Konfliktprüfung und Schultage

### Funktionen in `WeeklySchedule.vue`

| Funktion | Aufgabe |
| --- | --- |
| `hasSchool(klasse, day)` | Prüft, ob die Klasse am gewählten Tag Unterricht hat. |
| `getLabels(classId)` | Liefert die Labels einer Klasse für die Tabellenanzeige. |
| `getUsedRooms(day)` | Zählt die Klassen, die an diesem Tag Unterricht haben. |
| `getRoomCapacity(day)` | Ermittelt die Anzahl verfügbarer Räume. |
| `getMissingRooms(day)` | Berechnet die Zahl der fehlenden Räume. |
| `getConflictingClasses(klasse, day)` | Ermittelt anhand der Regeln, welche anderen eingeplanten Klassen mit der ausgewählten Klasse kollidieren. |
| `getCellConflicts(klasse, day)` | Erstellt die Meldungen zu Klassenkonflikten und Raumknappheit. Für ein leeres Feld berechnet die Funktion den Zustand nach einer möglichen Aktivierung. |
| `handleSchoolDayClick(klasse, day)` | Öffnet bei einem Konflikt den Bestätigungsdialog. Nach Bestätigung sendet die Funktion `toggle-day` an die Seite, sofern der Belegungszustand noch derselbe ist. |
| `handleDirectSchoolDayClick(classId, day)` | Sendet `toggle-day` direkt, wenn keine Lade- oder Speicheraktion läuft. |
| `getRoomConflictText(day)` | Formuliert den Hinweis zur Zahl fehlender Räume. |
| `getRoomUsageText(day)` | Erläutert den Raumverbrauch und die verfügbare Kapazität für den Tag. |
| `badgeStyle(value)` | Bestimmt Hintergrundfarbe und passende Textfarbe eines Labels. |

`schoolDayCells` bereitet Belegungszustand und Konfliktmeldungen für jedes Tabellenfeld vor. `lastLoadedTime` und `lastLoadedDate` bereiten den Ladezeitpunkt für Anzeige und HTML-Zeitangabe auf.

[Quellcode der Wochenansicht](../src/components/WeeklySchedule.vue)

### Beispiel: Eine Klasse zusätzlich am Dienstag einplanen

Sind bereits vier von vier Räumen belegt, besteht in der Raumzeile noch keine Unterdeckung. Für das **leere Dienstagsfeld einer weiteren Klasse** rechnet Lehrway jedoch mit fünf belegten Räumen. Das Feld wird gelb. Falls gleichzeitig eine Klassenregel betroffen ist, steht auch diese im Dialog.

| Feld | Aktion |
| --- | --- |
| Grau mit `–` | Schultag direkt aktivieren |
| Grün mit **Schule** | Schultag direkt entfernen |
| Gelbe Hälfte mit `–` | Mögliche Konflikte ansehen und Aktivierung bestätigen |
| Rote Hälfte mit **Schule** | Bestehende Konflikte ansehen und Entfernen bestätigen |
| Hellgraue Hälfte mit `+` oder `−` | Schultag ohne Dialog direkt aktivieren oder entfernen |

Die Berechnung in `getCellConflicts()` unterscheidet zwischen einer Vorschau und einem bereits belegten Tag:

```ts
const active = hasSchool(klasse, day)
const used = getUsedRooms(day) + (active ? 0 : 1)
const missing = Math.max(0, used - getRoomCapacity(day))
```

Bei einem belegten Feld ist die Klasse bereits in `getUsedRooms(day)` enthalten. Bei einem leeren Feld wird sie für die Vorschau einmal hinzugezählt.

## Klassenbearbeitung und Labels

### Klassenbearbeitung

| Datei | Funktion | Aufgabe |
| --- | --- | --- |
| `ClassEditor.vue` | `otherClassName(rule)` | Ermittelt den Namen der jeweils anderen Klasse einer Konfliktregel. |
| `ClassEditor.vue` | `addRule()` | Meldet die ausgewählte zweite Klasse an die Wochenplanseite und setzt das Auswahlfeld zurück. |
| `ClassEditorDrawer.vue` | `syncDialog()` | Öffnet oder schließt die Seitenleiste entsprechend dem Zustand der Seite. Beim Öffnen wird der Schließen-Button fokussiert. |
| `ClassEditorDrawer.vue` | `restoreFocus()` | Gibt den Fokus nach dem Schließen an das zuvor aktive Element zurück. |
| `ClassEditorDrawer.vue` | `requestClose()` | Meldet die Schließaktion an die Seite, sofern kein Speichervorgang oder Bestätigungsdialog sie blockiert. |
| `ClassEditorDrawer.vue` | `handleNativeClose()` | Gleicht ein Schließen durch den Browser mit dem Zustand der Komponente ab. |
| `ClassEditorDrawer.vue` | `isOutside(event)` | Prüft, ob sich der Zeiger ausserhalb des Dialogbereichs befindet. |
| `ClassEditorDrawer.vue` | `handlePointerDown()`, `handlePointerUp()`, `resetBackdropPress()` | Verarbeiten einen Klick auf den Hintergrund. Die Seitenleiste schliesst, wenn der Klick ausserhalb beginnt und endet. |

`classRules` liefert die Regeln der ausgewählten Klasse. `availableClasses` schliesst diese Klasse selbst sowie bereits zugeordnete Klassen aus. Die Eingabe für den Klassennamen und die Auswahl der Regelklasse werden beim Klassenwechsel synchronisiert.

[Klasseneditor](../src/components/ClassEditor.vue) · [Seitenleiste](../src/components/ClassEditorDrawer.vue)

### Funktionen in `ClassLabels.vue`

| Funktion | Aufgabe |
| --- | --- |
| `loadExistingLabels()` | Lädt die verfügbaren Labels für die Auswahl. |
| `changeMode(value)` | Wechselt zwischen der Auswahl eines vorhandenen Labels und dem Erstellen eines neuen Labels. |
| `addExistingLabel()` | Übernimmt das ausgewählte Label in den Ablauf zum Speichern der Zuordnung. |
| `addNewLabel()` | Prüft die Eingabe für ein neues Label und stößt das Speichern an. |
| `saveAssignment(name, color)` | Sendet die Label-Zuordnung an die API und meldet das Ergebnis an die übergeordnete Komponente. |
| `updateCatalog(assignment)` | Übernimmt ein gespeichertes Label in die lokal verfügbare Auswahl. |
| `toggleColorEditor(labelId)` | Öffnet oder schließt die Farbwahl eines Labels. |
| `changeEditingColor(color)` | Speichert die gemeinsame Farbe des Labels und meldet die Änderung an die Wochenansicht. |
| `removeLabel(labelId)` | Entfernt die Zuordnung eines Labels zur ausgewählten Klasse. |
| `normalizeLabel(row)` | Bereitet die zurückgegebene Label-Zuordnung für die Anzeige auf. |
| `normalizeColor(value)`, `getTextColor(color)`, `badgeStyle(color)` | Prüfen Farbwerte und berechnen den Stil der Labelanzeige mit einer passenden Textfarbe. |
| `setSaving(value)` | Aktualisiert den Speicherzustand und gibt ihn an die Elternkomponente weiter. |
| `getError(value)` | Wandelt einen Fehler in eine Meldung für das Formular um. |

Die berechneten Werte `availableLabels`, `selectedExistingLabel`, `existingNameLabel`, `newLabelPreviewColor` und `editingColorLabel` steuern Auswahl, Namensabgleich, Farbvorschau und Farbwahl.

### Beispiel: Ein gemeinsames Label verwenden

1. Im Klasseneditor wird ein vorhandenes Label gesucht oder ein neues Label angelegt.
2. `saveAssignment()` speichert die Zuordnung der Klasse zum Label.
3. Die Wochenplanseite übernimmt die Zuordnung und zeigt das Label beim Klassennamen.
4. Eine spätere Farbänderung betrifft alle Zuordnungen desselben Labels. Beim Entfernen aus einer Klasse wird deren Zuordnung gelöst.

Die Farbwahl bietet vordefinierte Farben und ein Feld für eine eigene Farbe. `selectCustomColor()` in `LabelColorPicker.vue` gibt den ausgewählten Farbwert an die Label-Komponente weiter.

[Labelverwaltung](../src/components/ClassLabels.vue) · [Farbwahl](../src/components/LabelColorPicker.vue)

## Lehrgänge und Quartalsplanung

### Funktionen in `lehrgangpage.vue`

| Funktion | Aufgabe |
| --- | --- |
| `loadCourses()` | Lädt die Lehrgänge und deren Module und bereitet daraus die Lehrplandaten auf. |
| `selectCourse(id)` | Wählt einen Lehrgang aus und übernimmt seine Daten in das Bearbeitungsformular. |
| `createCourse()` | Prüft die Eingaben und erstellt einen Lehrgang. |
| `cancelCreateCourse()` | Schließt das Erstellungsformular und setzt dessen Zustand zurück. |
| `renameCourse()` | Speichert die Angaben des ausgewählten Lehrgangs aus dem Bearbeitungsformular. |
| `deleteCourse()` | Löscht den Lehrgang nach Bestätigung. |
| `addModule(name)` | Fügt dem ausgewählten Lehrgang ein Modul hinzu. |
| `renameModule(update)` | Speichert einen neuen Modulnamen. |
| `removeModule(module)` | Entfernt ein Modul nach Bestätigung. |
| `addField(field)` | Legt einen belegten Quartalsbereich für ein Modul an. |
| `saveField(update)` | Speichert Änderungen am Quartalsbereich und an den Lektionen eines Feldes. |
| `removeField(fieldId)` | Entfernt ein Quartalsfeld nach Bestätigung. |
| `moveField(move)` | Speichert die neue Position eines verschobenen Quartalsfeldes. |
| `savePlanChange(operation)` | Führt die Änderung aus, verwaltet den Speicherzustand und lädt den Plan anschliessend neu. |
| `toDBQuarter(quarter)` | Rechnet ein fortlaufendes Quartal in Lehrjahr, Semester und Quartal für die API um. |
| `getError(error)` | Liefert eine Fehlermeldung für die Oberfläche. |

`filteredCourses` filtert die Lehrgangsliste nach dem Suchtext. `selectedCourse` liefert den ausgewählten Lehrgang für den Bearbeitungsbereich.

[Quellcode der Lehrgangsseite](../src/pages/lehrgangpage.vue)

### Funktionen in `CoursePlan.vue`

| Funktion | Aufgabe |
| --- | --- |
| `getFieldAtStart()`, `getFieldAtQuarter()` | Suchen ein Feld am Startquartal oder innerhalb eines belegten Quartalsbereichs. |
| `shouldRenderQuarter()` | Bestimmt, ob eine Quartalszelle separat dargestellt werden muss. |
| `rangeAvailable()` | Prüft, ob ein Bereich innerhalb des Plans liegt und sich mit einem anderen Feld desselben Moduls überschneidet. |
| `fieldRangeText()` | Formatiert den belegten Bereich für die Anzeige. |
| `openModuleForm()`, `cancelModuleForm()`, `addModule()` | Öffnen, verwerfen oder bestätigen das Formular für ein neues Modul. |
| `openModuleEditor()`, `saveModuleName()` | Öffnen die Bearbeitung eines Modulnamens und geben die Änderung weiter. |
| `selectQuarter()` | Verarbeitet die Auswahl der Quartale für einen neuen Bereich. |
| `editField()`, `cancelEditing()` | Öffnen und schließen die Bearbeitung eines belegten Feldes. |
| `isSelectionStart()` | Erkennt das zuerst ausgewählte Quartal. |
| `startDrag()`, `clearDrag()` | Beginnen eine Verschiebung und setzen ihren Zustand zurück. |
| `findDraggedField()` | Ermittelt das Feld, das gerade gezogen wird. |
| `quarterAtPointer()` | Ordnet die Zeigerposition einem Quartal zu. |
| `canDropAt()` | Prüft, ob der Zielbereich für das gezogene Feld frei ist. |
| `dragOver()`, `dropClass()` | Bereiten die Rückmeldung über ein gültiges oder ungültiges Ziel vor. |
| `dropField()` | Prüft das Ziel beim Ablegen und meldet eine gültige Verschiebung an die Lehrgangsseite. |

`quarterCount`, `schoolYears` und `quarters` leiten die Darstellung aus der Semesterzahl ab.

[Quellcode des Lehrplans](../src/components/CoursePlan.vue)

### Funktionen in `CourseFieldEditor.vue`

| Funktion | Aufgabe |
| --- | --- |
| `rangeAvailable(start, end)` | Prüft Grenzen und Überschneidungen unter Berücksichtigung des aktuell bearbeiteten Feldes. |
| `save()` | Prüft die Eingaben und gibt gültige Änderungen zur Speicherung weiter. |

`quarters`, `startOptions`, `endOptions` und `rangeText` bereiten die Quartalsauswahl und deren Anzeige vor. Abbrechen und Entfernen werden über die entsprechenden Aktionen an den Lehrplan weitergegeben.

[Quellcode der Quartalsbearbeitung](../src/components/CourseFieldEditor.vue)

### Beispiel: Ein Modul über mehrere Quartale planen

Bei einem Lehrgang mit sechs Semestern zeigt der Lehrplan zwölf Quartale. Für ein Modul kann ein zusammenhängender Bereich ausgewählt werden. Liegt darin bereits ein Feld desselben Moduls, wird der Bereich als ungültig behandelt.

Ein vorhandenes Feld lässt sich öffnen, um Lektionen und Quartalsgrenzen zu ändern. Beim Ziehen des Feldes prüft der Lehrplan, ob die gesamte belegte Länge am neuen Ziel Platz hat. Erst ein gültiges Ablegen löst `moveField()` auf der Lehrgangsseite aus.

## Änderungsverlauf

Die Logseite zeigt den Benutzer, die Beschreibung und den Zeitpunkt einer Änderung. Sind für einen Eintrag Vorher- und Nachher-Daten vorhanden, können sie aufgeklappt werden.

### Funktionen in `logpage.vue`

| Funktion | Aufgabe |
| --- | --- |
| `emptyFilters()` | Liefert die leeren Ausgangswerte für die Filter. |
| `normalized(filters)` | Bereitet die Filterwerte vor und entfernt Rand-Leerzeichen aus dem Suchtext. |
| `details(rows)` | Formatiert gespeicherte Vorher- und Nachher-Daten für die Anzeige. |
| `date(value)` | Formatiert den Zeitpunkt eines Eintrags für die Oberfläche. |
| `dayBoundary(value, followingDay)` | Wandelt ein ausgewähltes Datum in eine Zeitgrenze um. Der Folgetag dient als obere Grenze, damit der ausgewählte Endtag enthalten ist. |
| `queryFor(filters, next)` | Prüft den Zeitraum und erstellt die Anfrageparameter für Filter und Nachladen. |
| `loadUsers()` | Lädt die Benutzernamen für die Filterauswahl. |
| `load(filters, more)` | Lädt Logeinträge und ersetzt die Liste oder hängt die nächste Seite an. |
| `applyFilters()` | Übernimmt die Eingaben im Filterformular und lädt passende Einträge. |
| `resetFilters()` | Setzt die Filter zurück und lädt die Liste erneut. |
| `refresh()` | Aktualisiert die Logeinträge mit den angewendeten Filtern und lädt die Benutzerauswahl neu. |

`filtersChanged` erkennt, ob die aktuellen Eingaben vom zuletzt geladenen Filterstand abweichen.

[Quellcode der Logseite](../src/pages/logpage.vue)

### Beispiel: Änderungen an einer Klasse finden

1. Einen Klassennamen ins Suchfeld eingeben und bei Bedarf Benutzer, Änderungsart oder Zeitraum wählen.
2. **Filter anwenden** drücken. Die API sucht im gespeicherten Änderungsverlauf und liefert passende Einträge.
3. **Weitere Änderungen laden** lädt die nächste Seite mit den bereits angewendeten Filtern. Eingaben, die im Formular noch geändert werden, gelten erst nach erneutem Anwenden.

## Anmeldung und Registrierung

| Datei | Funktion | Aufgabe |
| --- | --- | --- |
| `loginpage.vue` | `handleLogin()` | Sendet E-Mail und Passwort an die Login-Route, übernimmt bei Erfolg den Benutzer und öffnet den Wochenplan. Fehler erscheinen im Formular. |
| `registerpage.vue` | `handleRegister()` | Prüft die Passwortbestätigung und sendet Anzeigename, E-Mail und Passwort an die Registrierungsroute. Bei Erfolg öffnet sich die Loginseite mit einer Bestätigung. |
| `auth.ts` | `loadCurrentUser()` | Ruft den Benutzer der aktuellen Sitzung ab und aktualisiert `currentUser`. |
| `auth.ts` | `login()` | Kapselt eine Anmeldung über den API-Dienst und übernimmt den zurückgegebenen Benutzer. |
| `auth.ts` | `logout()` | Ruft die Abmelderoute auf und leert den lokalen Benutzerzustand nach erfolgreicher Abmeldung. |
| `router/index.ts` | `router.beforeEach()` | Prüft vor dem Öffnen geschützter Seiten die Sitzung und leitet ohne gültige Sitzung zur Loginseite. |

Der bei der Registrierung gewählte Anzeigename dient der Darstellung des Benutzers. Für die Anmeldung werden E-Mail und Passwort verwendet. Während einer laufenden Formularanfrage sind die Eingabefelder und der Absende-Button gesperrt.

[Login](../src/pages/loginpage.vue) · [Registrierung](../src/pages/registerpage.vue) · [Sitzungsdienst](../src/services/auth.ts) · [Router](../src/router/index.ts)

## Gemeinsame Komponenten und Dienste

### Bestätigungsdialog

| Funktion | Aufgabe |
| --- | --- |
| `confirmAction(options)` in `useConfirm.ts` | Öffnet den gemeinsamen Dialog mit Titel, Nachricht, optionalem Kontext und Frage. Die aufrufende Funktion wartet auf die Entscheidung. |
| `resolveConfirmation(confirmed)` in `useConfirm.ts` | Schließt die Bestätigung und liefert das Ergebnis an den Aufrufer zurück. |
| `restorePage()` in `ConfirmDialog.vue` | Stellt nach dem Schließen die vorherige Scroll-Einstellung und den Fokus wieder her. |
| `handleNativeClose()` in `ConfirmDialog.vue` | Behandelt ein Schließen des Dialogs durch den Browser als Abbruch. |

Beim Öffnen erhält **Abbrechen** den Fokus. Der Dialog wird beispielsweise für Schultagkonflikte, Löschaktionen und Abmeldung verwendet.

[Dialogzustand](../src/composables/useConfirm.ts) · [Dialogkomponente](../src/components/ConfirmDialog.vue)

### Durchsuchbare Auswahl

| Funktion | Aufgabe |
| --- | --- |
| `toggle()` | Öffnet oder schließt die Auswahl und fokussiert beim Öffnen das Suchfeld. |
| `choose(value)` | Übernimmt die gewählte Option und schließt die Liste. |
| `close(restoreFocus)` | Schließt die Liste und gibt den Fokus bei Bedarf an das Auswahlfeld zurück. |
| `handleFocusOut(event)` | Schließt die Liste, wenn der Fokus den gesamten Auswahlbereich verlässt. |

`selectedLabel` ermittelt die Beschriftung der gewählten Option. `filteredOptions` filtert die Liste nach dem Suchtext. Die Ergebnisliste hat eine begrenzte Höhe und kann gescrollt werden. Escape schließt die Auswahl.

[Quellcode der durchsuchbaren Auswahl](../src/components/SearchableSelect.vue)

### Benutzermenü und Abmeldung

| Funktion | Aufgabe |
| --- | --- |
| `cancelClose()` | Bricht ein geplantes Schließen des Menüs ab. |
| `closeMenu()` | Schließt das Benutzermenü. |
| `scheduleClose(event)` | Plant das Schließen nach dem Verlassen des Menüs mit der Maus. |
| `handleOutsideClick(event)` | Schließt das Menü beim Klick ausserhalb. |
| `handleFocusOut(event)` | Schließt das Menü, wenn der Fokus den Menübereich verlässt. |
| `handleEscape()` | Schließt das Menü per Escape und setzt den Fokus zurück. |
| `logout()` | Fragt nach Bestätigung, beendet die Sitzung und leitet zur Loginseite weiter. Fehler erscheinen im Menü. |

Das Menü zeigt den Anzeigenamen, dessen Anfangsbuchstaben als Avatar und einen Link zu den Logs. Die gemeinsame Fusszeile zeigt den Projektnamen, die Klasse und das Team.

[Benutzermenü](../src/components/UserMenu.vue) · [Fusszeile](../src/components/Footer.vue)

### API-Anfragen

| Funktion | Aufgabe |
| --- | --- |
| `request(path, options)` | Baut die Anfrage zur konfigurierten API auf, sendet das Sitzungs-Cookie mit, liest JSON und gibt API-Fehler an den Aufrufer weiter. |
| `json(method, data)` | Erstellt die Anfrageoptionen mit HTTP-Methode und bei Bedarf einem JSON-Body. |

[API-Dienst](../src/services/lehrway-api.ts)