# Ourark World Studio: Technologie, Chancen und offene Praxistests

**Detailed review in German · 6 October 2026 · implementation baseline `024b05719a5dd84f47c1bdb2ba2794db63ff904c`.**

This source-grounded review distinguishes implemented editor behavior, optional integration code and future contracts. It covers twelve application opportunities, four initial pilot protocols and separate device, WASM, GPU and hosted-network tests. Every benefit threshold is proposed, not an achieved customer result. For the English entry points, see [Added value and validation](VALUE_AND_VALIDATION.md), [Limits](LIMITS.md) and [Integrations](INTEGRATIONS.md).

Vollständige Einordnung der enthaltenen Technik, ihrer Integrationsgrenzen und der noch offenen Praxistests. Erstellt für Kevin Fröba.

### Die wichtigste Chance

Das Repo kann strukturierte Ortsdaten in eine bearbeitbare Karte, eine daraus abgeleitete 3D-Ansicht und ein begehbares Modell überführen. Daten und Raum bleiben dabei im Map Studio an dasselbe Dokument gebunden. Darauf lassen sich räumliche Informations- und Prüfoberflächen aufbauen. Der mögliche Nutzen ist eine schnellere Datenaufbereitung, ein besseres Verständnis räumlicher Zusammenhänge und weniger Entwicklungsaufwand für spezielle Anwendungen. Diese drei Nutzenhypothesen sind noch nicht durch reale Kundenaufträge belegt.

| Heute belastbar | Noch zu belegen |
| --- | --- |
| Lokaler Map-Workflow; prozedurale World-Szenen; lesbarer MIT-Core; Regressionstests; separate Runtime- und Integrationsmodule. | Zeitersparnis, bessere Entscheidungen, technische Leistung auf Zielgeräten, zuverlässiger Internetbetrieb und wirtschaftlicher Nutzen. |
| Mehrere konkret implementierte Teiltechnologien. | Eine gemeinsame Engine, die alle Teiltechnologien für beliebige Weltprojekte automatisch verbindet. |

### Aktueller Stand und Nachweise

Am 6. Oktober 2026 ist PR #1 gemergt. Öffentliches main: 024b05719a5dd84f47c1bdb2ba2794db63ff904c. Sein Git-Baum 44bfb871694b06c7ca79ab80ed0aaec7277c4446 entspricht exakt dem geprüften PR-Stand 389155dc2afd032b5f1b90c2b1f3533b55876d20.

Der main-Prüflauf 37457577440 ist erfolgreich: verify, browser und wasm. Die geprüften Abläufe umfassen 43 explizite Node-Suiten, 49 zusätzliche HTTP-/Worker-/Repository-Tests, 11 Browser-Smoke-Prüfungen und sechs Browser-Regressionsgruppen sowie Rust-Neubau und Binärvergleich. Browsernachweise wurden auf Linux/Chromium mit Software-WebGL erbracht. Das bestätigt die ausgeführten Funktionen, keine Geräteleistung und keinen Kundenmehrwert.

Diese erneute Analyse wertet Quellcode, Verträge, Tests und Dokumentation schichtweise aus. Sie führt keine neue Kundenstudie, keinen produktiven Lasttest und keine neue physische Gerätemessung vor. Zusätzliche lokale Netzwerkprüfungen ändern diese Grenze nicht.

### So liest sich der Bericht

„Integriert“ heißt: im angegebenen Einstieg tatsächlich verbunden. „Modul/Integration“ heißt: Code ist vorhanden, aber Daten, Konfiguration oder weitere Anbindung fehlen. „Entwurf“ heißt: die Funktion muss erst gebaut werden. Alle Pilotgrößen und Erfolgsschwellen in diesem Bericht sind Vorschläge vor der Messung, keine erzielten Resultate.

Quellen: S1, S2, S3, S4. Die vollständigen, revisionsgebundenen Links stehen am Ende.

## 01. Map Studio: ein Dokument, mehrere Ansichten

Dies ist der am weitesten zusammengeführte Produktpfad. Der Browser editiert ein validiertes Kartenmodell. Three.js leitet daraus die Darstellung ab; eine Begehung verwendet einen eingefrorenen Zustand dieses Modells. Eine Höhenänderung muss deshalb nicht separat in einer 2D-Datei, einer 3D-Datei und einer Laufwelt nachgeführt werden.

| Baustein | Tatsächliche Funktion und Wert |
| --- | --- |
| Kartenmodell | motionspec.map.v3 enthält Karte, Objekte, Gebäudepolygone, Bodenflächen, Informationen und Startposition. Ältere v1/v2-Dateien werden normalisiert. |
| Projektcontainer | ourark.map-project.v1 ergänzt worldId, optionale workspaceId/geoReference und lokale Revision. Die Georeferenz ist transportierte Metadaten, keine ausgeführte Koordinatentransformation. |
| Bearbeitung | Position, Maße, Höhe, Farbe, Sichtbarkeit, Sperren, Duplizieren, Löschen und JSON-Daten; 2D und 3D greifen auf dasselbe Modell zu. |
| Korrektur und Rücknahme | Bis zu 35 vergangene Schritte. Payload und Projektmetadaten werden gemeinsam rückgängig gemacht; die aktuelle Speicherrevision bleibt erhalten. |
| Arbeitsaufwand im Code | Unveränderliche validierte Punkte, geteilte Daten und Serialisierungscaches vermeiden unnötige Verarbeitung unveränderter Objekte. Betroffene Geometriegruppen werden gezielt erneuert. |
| Lokaler Speicher | IndexedDB pro Welt; transaktionaler Revisionsvergleich verhindert stilles Überschreiben durch einen veralteten Tab. Wiederhergestellt wird das zuletzt gespeicherte Projekt. |
| Dateiübergabe | JSON-Export und Reimport tragen die unterstützten Felder einschließlich eingebettetem Kartenbild. Datei-Export ist der portable Sicherungsweg. |

### Was daraus entstehen kann

Kleine Geländeübersichten, Anlagenkarten, Statusansichten, Planungsbesprechungen und Datenprüfwerkzeuge. Der direkte technische Vorteil ist die gemeinsame Darstellung derselben Daten. Der zusätzliche Nutzen für Menschen muss gegen ihren heutigen Lageplan-, Tabellen- oder Fachsoftwareprozess gemessen werden.

### Was zusätzlich nötig wäre

Ein Wartungs- oder Dashboardprodukt braucht ein Domänenschema, verständliche Filter und Statusanzeigen sowie gegebenenfalls Datenbankadapter, Rollen, Konfliktregeln und Synchronisation. point.data kann Informationen aufnehmen; es ersetzt diese fachlichen Abläufe nicht. Lokale Revisionskonflikte sind kein kollaboratives Bearbeitungsprotokoll. Ein Hintergrundbild bleibt eine Textur und erzeugt selbst keine Gebäude.

Quellen: S5–S8, S18. Konkrete Piloten: P0, P1, P3 und U3.

## 02. Datenübernahme und Geometrie

| Pfad | Vorhanden | Reale Grenze |
| --- | --- | --- |
| CSV → Karte | Parser, Koordinatenskalierung, Datenbereinigung, stabile Punktstruktur und Konvertierungsbericht. | Die Spalten lat/lng werden hier als planare Nord-/Ostwerte gelesen. --scale bedeutet Meter pro Ausgangseinheit; keine automatische Umrechnung geografischer Gradwerte. |
| OSM → Karte | Overpass-JSON mit Geometrie; lokale geografische Projektion; Grundrisse, Höhen und Bodenklassen werden zu Kartenobjekten. | Kein allgemeiner .osm-XML-/GIS-Importer. Höhen kommen aus Tags, Geschossen oder Typannahmen. Umrisse können vereinfacht und Objekte ausgelassen werden. |
| Gebäude | Polygonumrisse werden extrudiert; einfache Punkte werden als Boxen/Zylinder dargestellt. | Kein BIM mit Räumen, Bauteilen, Anschlüssen oder automatisch modellierten Innenräumen. |
| Boden und Wege | Farbige ebene Flächen und Straßenbänder, Triangulation, Zeichenreihenfolge und Kollisionsgrenzen. | Kein Höhenmodell der gesamten Karte, kein Routinggraph und keine vermessenen Fahrbahnbreiten. |
| Importoberfläche | Kartenprojekt, Punkte-JSON und Bild lassen sich im Browser importieren. | CSV-/OSM-Konversion erfolgt aktuell über CLI/Module; kein entsprechender geführter UI-Importdialog. |

### Vier Befunde, die reale Pilotdaten verändern können

- CSV kann den gewünschten Maßstab verkleinern, damit die Ausdehnung passt. Link-/Medienfelder werden gefiltert, lange Daten gekürzt und doppelte IDs bereinigt. Ein erfolgreicher Import ist kein verlustfreier Tabellenabgleich.
- OSM-Höhen aus Geschosszahlen verwenden unter anderem 3,2 m je Geschoss; fehlende Werte können Typannahmen erhalten. Gemessene und angenommene Angaben müssen in einem Pilot sichtbar unterschieden werden.
- Innenringe werden nicht ausgeschnitten. Innenhöfe und Inseln innerhalb von Wasserflächen sind deshalb besonders zu prüfen. Straßenbreiten stammen aus Klassenannahmen, beispielsweise 8 m für Wohnstraßen und 2 m für path.
- Die Geometrie- und Kollisionspipeline arbeitet mit vereinfachten Formen. Bei numerischen Problemen kann eine konservative konvexe Hülle entstehen. Das Modell kann dadurch einen tatsächlich freien Bereich als blockiert darstellen.

### Chance und notwendiger Beweis

Vorhandene Bestandsdaten können schneller zu einem besprechbaren räumlichen Modell werden. Entscheidend ist die gesamte Vorbereitungszeit einschließlich Korrektur, Attribution, Höhenergänzung und der Bilanz ausgelassener Objekte. Eine schnelle Konversion mit viel Nacharbeit belegt keinen Effizienzgewinn. Für Geometriebehauptungen ist eine unabhängige Referenz erforderlich.

Quellen: S9, S10, S11; konkrete Protokolle P2 und U6.

## 03. Layer Studio und World Studio

| Anwendung | Vorhandener Funktionsumfang | Erweiterungsgrenze |
| --- | --- | --- |
| Layer Studio | DOM-/CSS-Layout: fünf Startlayer, bis zu neun mit Notizen; Position X/Y/Z, Größe, Name, Sichtbarkeit, Sperre, Deckkraft, Radius, Zoom, Grid; räumliche Ansicht über CSS-Perspektive, Spread, Orbit und Tilt. | Keine Meshes/Collider. Kein Undo/Redo, kein Löschen, keine dauerhafte Speicherung und kein UI-Reimport. Notizinhalt ist vorgegeben. Heute ein Layout-/Interaktionsprototyp. |
| World Studio | Fünf prozedurale Dioramen; reale Three.js-Objekte, Transformwerkzeuge, numerische Werte, Snap, Farbe, Sperre, Duplizieren/Löschen, Undo/Redo; Cube, Sphere, Ring, Panel, Text und Destination hinzufügen. | motionspec.world.v1 akzeptiert fünf bekannte Welt-IDs und höchstens 100 Objekte. Keine allgemeine Modellierungssoftware und kein universeller Asseteditor. |
| Inhalte im Raum | Überschrift und Text an Objekten; Preview mit Weiter/Zurück; erreichbare Stationen in der Begehung öffnen. | Keine beliebigen eingebetteten Apps, keine allgemeine CMS-Verbindung und kein frei modellierbarer Interaktionsworkflow. |
| Lokale World-Datei | Dioramen in localStorage speichern; World-JSON exportieren und importieren. | Format und Speicher sind von Map und Layer getrennt. Eine Datei enthält nicht automatisch sämtliche externen Assets. |

### Der Übergang Map → World ist eine Ansichtsanbindung

Map-Projektdateien werden nun korrekt validiert und ihr Karteninhalt als hochgeladene Stadt dargestellt. World Studio kann diese Ansicht lokal wiederherstellen und begehbar machen. Es übernimmt aber nur den Map-Payload: worldId, workspaceId, Georeferenz und lokale Revision bilden dort kein gemeinsames editierbares Projekt. Bearbeitet wird die Karte weiterhin in Map Studio. Die World-Oberfläche besitzt einen hochgeladenen Stadt-Slot; die Liste zeigt zunächst 300 Objekte, weitere sind in der Szene auswählbar.

### Zeitliche Darstellung ist vorhanden, Zeit-Authoring fehlt

Layer Studio spielt vorgefertigte CSS-Schleifen ab; die sichtbare Zeitleiste ist keine editierbare Timeline. World-Objekte kennen none, spin und float mit festgelegten Bewegungsparametern. Im Walk werden diese Animationen eingefroren, damit sichtbare Geometrie und Collider zusammenpassen. Das ist keine frei bearbeitbare 4D-Welt mit Zeitdaten, Keyframes, Ereignissen und Szenariovergleich.

Die Bezeichnung „3D text“ meint aktuell Text als Canvas-Textur auf einer Fläche im Raum, keine extrudierte Schrift. Dioramen verwenden ungefähr fünf Meter Laufmaßstab je World Unit; Karten und vorbereitete Scans verwenden Meter.

Quellen: S12–S14. Chancen: U4, U10; neue Zeitentwicklung: U12.

## 04. Vorbereitete Scans und Kameras

Der Scanpfad ist eine echte Runtime-Integration: Er lädt vorbereitete Bundles, prüft Dateigrößen und SHA-256, zeigt GLB über GLTFLoader und verwendet separat gelieferte Collider. Optionale Lightmaps und aufgezeichnete Kameraframes können mitgeliefert werden. Die Rekonstruktion selbst und ursprüngliche Scaninhalte sind nicht Teil des öffentlichen Releases.

| Baustein | Bedeutung für Anwendungen |
| --- | --- |
| Integritätsprüfung | Unveränderte veröffentlichte Bundles lassen sich erkennen. Eine passende Prüfsumme beweist weder räumliche Genauigkeit noch korrekte Nutzungsrechte. |
| First Person | Begehung mit vorbereitetem Kollisionsmodell. Standard-Map-/Diorama-Walk stellt im Wesentlichen diesen Modus bereit. |
| Third Person | Scanmodus mit Abstandskontrolle der Kamera. Kein allgemeiner konfigurierbarer Avatarbaukasten. |
| Fly | Freie Inspektion des Scans. Möbel können durchquert werden; eine optionale Hüllengeometrie kann die Fluggrenzen beeinflussen. |
| Source | Interpolierte Wiedergabe mitgelieferter camera.frames. Keine UI zum Erstellen, Schneiden oder Aufzeichnen dieser Fahrten. |
| Materialien | Darstellung kann semantisch gewählte Beispielmaterialien benutzen. Sichtbare Materialien sind nicht automatisch rekonstruierte Originaloberflächen. |

### Mögliche Anwendungen

Räumliche Einweisung, Besprechung eines vorbereiteten Raummodells, Prüfung der Orientierung und Präsentation dokumentierter Stationen. Ein entsprechender Pilot benötigt eine nachvollziehbare externe Bundle-Erstellung, freigegebene Bilder/Modelle, bekannte Maße und geprüfte Collider. Eine allgemeine GLB-Unterstützung im Scan-Lader ist kein beliebiger Modellimport oder glTF-Export im World-Editor.

### Was getestet werden muss

- Stimmen Maßstab, freie Wege, Hindernisse und Kamerapositionen mit der für den Zweck benötigten Referenz überein?
- Sind die verschiedenen Kameramodi verständlich, ohne Orientierung oder Bedienbarkeit zu verschlechtern?
- Laden die Bundles auf den echten Zielgeräten ohne Speicherprobleme, und bleibt die Begehung nach wiederholtem Ein-/Austritt stabil?
- Hilft die virtuelle Vorbereitung bei der tatsächlichen späteren Aufgabe, oder erfüllt ein Lageplan beziehungsweise eine einfache Bilderfolge sie ebenso gut?

Die Scanprüfung begrenzt den deklarierten Payload auf 64 MiB und Collider auf 5.000 mit höchstens 64 Eckpunkten je Collider. Das sind Validierungsgrenzen, keine Zusage, dass alle derart akzeptierten Bundles auf einem Mobilgerät flüssig laufen.

Quellen: S15, S16. Pilot U7; Geräte- und Erholungstests T1/T5.

## 05. Bewegung, Fahrzeuge, Rust und WASM

| Teil | Tatsächlich implementiert | Grenze |
| --- | --- | --- |
| Editor-Walking | Gefrorener Dokumentzustand, Spawn-Suche, Kollision/Sliding, Eingaben, Pause/Resume und Rückkehr zum Editor. | Kreis in X/Z gegen vertikale Prismen; kein allgemeines 3D-Rigid-Body-System. Flacher Kartenboden, keine allgemeine Mehrgeschoss-/Treppenphysik. |
| JS-Controller | Kart, Flugzeug und Fußgänger in der Kart-Anwendung; Auto, Flugzeug und Fußgänger in der Globe-Anwendung. | Anwendungsspezifische Regeln und vorbereitete Daten. Nicht automatisch in jeder selbst erstellten Map verbunden; keine reale Fahr-/Flugausbildung validiert. |
| Rust/WASM | Kompilierter f32-Simulationskern für Auto, Flugzeug, Fußgänger und Terrainabtastung; geteilte typisierte Speicheransichten. | Hauptsimulation im Browser bleibt JS. MapRoom nutzt WASM für Boden-Plausibilitätsprüfungen, nicht als autoritative Fahrzeugsimulation aller Teilnehmer. |
| Speicherformat | 64 Byte je Entity, 16 Byte je Input, höchstens 256 Entity-Slots und 1.000.000 Uint16-Terrainwerte. | Slots sind keine getestete Spielerzahl. MODE_KART nutzt im WASM den Auto-Pfad; Rust-Fußgänger haben keine Wandkollision. |
| Snapshots | Controllerzustand in Float64Array speichern, laden und lokal wiederholen. | Keine angeschlossene Netzwerk-Rollback-/Resimulationslösung. |

### Determinismus und Geschwindigkeit präzise einordnen

Editor-Walking verwendet einen 1/60-s-Schritt; Kart/Globe verwenden 1/120 s. Nach langen Scheduling-Lücken wird Aufholarbeit begrenzt. Diese Simulationsfrequenzen sind keine gerenderten FPS und keine Zusage vollständiger Echtzeitnachholung.

JS/WASM-Tests vergleichen ausgewählte synthetische Szenarien mit Toleranzen: beispielsweise Auto X/Z 0,25 m, Fußgänger 0,05 m und Flugzeug X/Z 0,6 m. Sie belegen keine Bitgleichheit über alle Sprachen, Browser und Geräte. Ein pauschaler Quellcodekommentar über überall identische Ergebnisse reicht dafür nicht.

### Chancen

Interaktive Geländeexperimente, begrenzte Bewegungssandboxes, wiederholbare Controller-Tests und ein möglicher gemeinsamer numerischer Kern für mehrere Hosts. Ob WASM im gewünschten Gesamtpfad schneller ist, muss einschließlich Eingaben, Datentransfers, Lesen des Zustands und Integrationsaufwand gemessen werden. Die vorhandenen Fahrzeugregeln sind eine Ausgangsbasis, kein belegtes Abbild realer Fahrzeugdynamik.

Quellen: S17–S21. Piloten U8, T2, T5.

## 06. Rendering, Ladezeit und Ressourcen

Map, World und Kart rendern mit Three.js/WebGL; Globe verwendet Cesium. Mehrere Optimierungsbausteine begrenzen Arbeit und Ressourcenverbrauch. Ihr Nutzen ist jeweils workload- und geräteabhängig; einige reduzieren bewusst Darstellungsqualität.

| Mechanismus | Technischer Wert | Was noch nicht belegt ist |
| --- | --- | --- |
| Gezielte Geometrieupdates | Auswahl und geänderte räumliche Gruppen werden behandelt, ohne jede unveränderte Geometrie neu aufzubauen. | Ein allgemeiner FPS-Gewinn oder flüssige Bedienung am maximalen Formatlimit. |
| FrameLoop / adaptive Qualität | Feste Simulationsschritte, Interpolation, begrenzter Rückstand; angepasste Auflösung und im Kart Schattenqualität. | Unveränderte Bildqualität. Weniger Pixel oder kleinere Schatten sind echte Kompromisse. |
| LOD / Chunk-Budget | Nahe Spieler detaillierter, entfernte gröber; entfernte statische Geometrie kann ausgeblendet beziehungsweise später freigegeben werden. | Ein harter Gesamt-VRAM-Deckel: gezählt werden Geometriepuffer, nicht alle Texturen, Renderziele oder Treiberressourcen. Sichtbare Geometrie kann das Budget überschreiten. |
| Height-Codec | Delta-Plane plus gzip rekonstruiert originale Uint16-Höhenwerte. | Verlustfreiheit sämtlicher Bilder/LOD oder gute Kompression jeder rauschenden Höhenkarte. |
| Preview-first | Erst kleinere Bildvorschau, später volles Bild und weitere Szenerie. | Neue geometrische Informationen oder sofortige volle Bildqualität. |
| Optionales WebGPU-Culling | Kart kann via gpu=1 eine WGSL-Compute-Stufe für Sichtbarkeit/Distanz nutzen; CPU ist Standard und Fallback. | Ein WebGPU-Renderer, KI-Modell oder erwiesener Geschwindigkeitsvorteil für nur 64 Remote-Entities. |
| Diagnostik | Frameverteilungen, Drawcalls, Qualitäts-/Culling-/Netzwerkprobes, Gerätemessungen. | Browser-Heap entspricht nicht gesamtem RAM oder GPU-Speicher; Telemetrie ersetzt keine kontrollierte Gerätestudie. |

### Was „zero copy“ hier bedeuten darf

Typisierte WASM-Ansichten vermeiden ein erneutes CPU-seitiges Umpacken derselben Records. GPU-Upload, Ergebnis-Readback, Netzwerkencoding und Snapshots bewegen oder kopieren trotzdem Daten. Die GPU-Auswahl kann im Kart asynchron mit einem älteren Ergebnis weiterarbeiten. Für einen Vorteil zählen deshalb ganze Frames, Ergebnisalter und Darstellungsfehler, nicht nur Shaderlaufzeit.

### Historische Messungen als Hinweise

Dokumentiert sind unter anderem 24,5 → 4,9 ms für einen bestimmten 5.000-Punkte-Edit-Handler und geringere Bild-Starttransfers auf zwei ursprünglichen Karten. Die ursprünglichen Datensätze/Logs sind nicht vollständig öffentlich. Diese Beobachtungen sind eng an ihre Versuche gebunden; sie belegen weder fünfmal mehr FPS noch aktuelle Kundeneinsparungen.

Quellen: S22–S25, S30. Messplan T1–T5.

## 07. Vernetzung, Räume und Hosting

Der implementierte Netzwerkpfad verteilt Bewegungszustände. Er ist in der optionalen Kart-Anwendung angebunden, derzeit weder in Map Studio noch im Globe. Dokumentänderungen, gemeinsames Editieren, Chat und Cloud-Projektspeicherung sind andere Funktionen und nicht Teil dieses Protokolls.

| Baustein | Vorhandener Zustand / Konsequenz |
| --- | --- |
| Transport | WebSocket, kompakte quantisierte Posen, interessenabhängige Snapshots/Deltas, entfernte Spielerinterpolation und Wiederverbindung. |
| Räume | Ein Durable Object pro Kartenname; aktuelle Allowlist kronach/rosenberg. Beliebige importierte Projekte erhalten nicht automatisch einen Raum. |
| Kapazitätsregeln | 64 konfigurierte Plätze pro Raum; beim Hosted-Adapter zusätzlich acht Verbindungen je IP und Karte. Neun Personen hinter demselben Büro-/Schul-NAT sind deshalb bereits ein eigener Testfall. |
| Takt / Darstellung | Poseversand und Raumtick alle 50 ms; ca. 100 ms Interpolationsverzögerung, höchstens 250 ms Extrapolation. Diese Werte sind keine gemessene Internetlatenz. |
| Präzision / Bereich | Positionen in 1/16 m; akzeptierte Room-X/Z ±2.000 m. Die größte erlaubte Editor-Map passt nicht vollständig in diesen Bereich. |
| Validierung | Rate, Format, Grenzen, Geschwindigkeit und vorhandenes Terrain werden auf Plausibilität geprüft. Fehlendes Terrain bedeutet keinen Bodencheck. |
| Korrektur | Client simuliert selbst; die Kart-Korrektur kündigt die eigene aktuelle Pose erneut als Teleport an. Kein vollständiger autoritativer Rollback und kein belegtes Anti-Cheat. |
| Idle | 30 Sekunden ohne Pose: Bereinigung per Alarm auch über simulierte Hibernation. Echter Cloudflare-Betrieb ist separat zu prüfen. |

### Anmeldung ist noch keine Teamverwaltung

Der Worker besitzt Basic Auth, einen LoginGuard und zusätzliche gleichberechtigte Tester-Konten. Es gibt keine Owner-/Editor-/Viewer-Rollen, Projekt-ACLs oder Mandantentrennung. Guard und Verbindungsgrenzen beziehen sich teilweise auf gemeinsam genutzte IP-Bereiche. CSP, Header und Herkunftsprüfungen sind vorhanden; sie ersetzen keine Prüfung einer konkreten Bereitstellung.

Das öffentliche Repo enthält keine fertige owner-spezifische Deployment-Konfiguration. Cloudflare-Bindings, R2-Inhalte, Zugangskonfiguration, Kostenbudgets, Wiederanlauf und Betriebsbeobachtung müssen bewusst aufgebaut und geprüft werden. Der lokale Node-Server ist ein Entwicklungsserver, keine Produktbereitstellung.

Quellen: S26–S29. Chancen U9; technische Freigabe T4.

## 08. Optionale Integrationen und Erweiterbarkeit

| Bereich | Chance | Heutiger Stand |
| --- | --- | --- |
| Kart / Globe | Bewegung auf vorbereiteten Gelände-/Geodaten; geographische Übersicht; Experimente mit gemeinsamer Erkundung. | Originale Höhenkarten, Luftbilder, Modelle und Landkreis-Daten fehlen. /kart/ und /globe/ sind Hinweis-Seiten; integration.html benötigt eigene Daten und Konfiguration. |
| Cesium / Provider | Globus, Terrain, Bilddaten, optionale 3D-Tiles und Ortssuche. | Providerbedingungen/-schlüssel, Lageannahmen und Datenpfade müssen geprüft werden. tiles=off stoppt nicht sämtliche Requests; keine plattformunabhängige Clean-Clone-Datenpipeline. |
| Bildverbesserung | Einen ausgewählten Kartenbildpfad über externen Dienst verbessern, zwischenspeichern und rückgängig machen. | Kein KI-Modell im Repo. Der dokumentierte Origin-Vertrag beschreibt Lanczos-Upscaling; ohne eigenen Renderboost-Dienst fehlen URL/Token. Größere Pixelzahl bedeutet keine rekonstruierte Geometrie. |
| Kart-Telemetrie | Leistungs- und Bewegungsverläufe untersuchen, räumliche Problemstellen suchen. | Standardmäßig aktiv, separat vom Multiplayer. net=0 schaltet sie nicht aus. Sitzungs-, Geräte-, Positions- und weitere Kontextdaten sind kein Nachweis vollständiger Anonymität. |
| Optionale Browsertools | Layer-Szene strukturiert lesen und zwischen 2D/3D wechseln. | Zwei Registrierungen nur bei verfügbarem document.modelContext: read_dashboard_scene und set_dashboard_dimension. Kein vollständiger MCP-Server, LLM, Workflowrecorder oder autonomer Welteditor. |
| Offener Quellcode | Eigene Domänenoberflächen, Integrationen und Entwicklungsbausteine auf nachvollziehbarem Code aufbauen. | MIT-Core mit Kevin Fröba; Three.js/Cesium und Eingabedaten haben eigene Grenzen/Notices. Kein veröffentlichtes stabiles SDK oder fertiges Plugin-Ökosystem. |

### Makepad und geplante Technik

Makepad ist laut Repo eine Inspiration für ein verständliches Entwicklerrepository. Keine Makepad-Runtime ist angebunden. Ebenso fehlen ein integriertes wgpu-core-System, wasm-bindgen, Subgroup-Matrix-Kernel, SharedArrayBuffer-Transport und WebTransport. Die vorhandene WebGPU-Stufe ist Culling, kein KI-World-Model.

contracts/world-package-v2.d.ts und runtime-extensions.d.ts beschreiben zukünftige Komponenten: Assets, Hierarchie, Fahrzeuge, Charaktere und Datenressourcen. Ein vollständiger Weltpaket-Import/-Export ist noch nicht implementiert; die vorhandenen Import-/Exportpfade führen diese Entwürfe nicht aus. Der Schritt zur gemeinsamen Weltplattform ist zusätzliche Produkt- und Implementierungsarbeit.

Quellen: S12, S29, S31–S35.

## 09. Welche realen Anwendungen daraus entstehen können

Die Einordnung folgt dem vorhandenen Code, nicht einer nachgewiesenen Marktnachfrage. A = nach Daten-/Aufgabenvorbereitung direkt pilotierbar; B = zusätzliche Integration oder begrenzte Produktentwicklung; C = neue Fähigkeit zuerst implementieren. Diese Buchstaben sind keine Aufwandsschätzung in Tagen.

| Anwendung | Stufe / unmittelbare Chance | Was vor einem belastbaren Nutzenbeleg fehlt |
| --- | --- | --- |
| U1 Gelände-/Campusreview | A · gemeinsame Karte, 3D, Objektdaten und Walk. | Echte Nutzer prüfen freigegebene Varianten gegen ihren heutigen 2D-Prozess; Genauigkeit, Zeit, Hilfe und Orientierung messen. |
| U2 Besucher-/Mitarbeitereinweisung | A/B · Gelände virtuell kennenlernen. | Eingänge/Wege und mobile/alternative Bedienung prüfen; danach reale Zielsuche messen. |
| U3 Anlagen-/Inspektionsübersicht | B · assetId, Status und Prüftermin am räumlichen Objekt. | Filter, Statusanzeige, Schema und Datenaktualisierung; bei Teamnutzung Rollen und gemeinsame Speicherung. |
| U4 Ausstellung / Produktgeschichte | A · Text-/Panelstationen in World-Dioramen. | Autorenworkflow und Besucheraufgaben gegen gleichwertige normale Seitenansicht testen; kein allgemeiner Shop/CMS vorhanden. |
| U5 Veranstaltung / Messeaufbau | A/B · Anordnung einfacher Bereiche/Objekte besprechen. | Passende Objektkonventionen und Daten; keine Kapazitäts-, Fluchtweg- oder Sicherheitsfreigabe aus dem Walk ableiten. |
| U6 Quartiers-/Bestandsdaten | A für Konversion, B für produktive Fachansicht. | Höhen, Höfe, Breiten, Attribution und Auslassungen kontrollieren; gesamte Aufbereitung gegen bisherigen Prozess vergleichen. |
| U7 Raumscan-Einweisung | B · vorbereitete reale Räume darstellen und inspizieren. | Externe Bundle-Erstellung, Rechte, Maße/Collider, Zielgeräte und Nutzen einer späteren realen Aufgabe. |
| U8 Bewegungs-/Geländesandbox | B · Auto/Kart/Flugzeug/Fußgänger auf passenden Daten. | Ersatzdaten, gewünschte Physik und Bedienung; reale Dynamik ist nicht validiert. |
| U9 Gemeinsame Begehung | B · Poseverteilung als vorhandener Ausgangspunkt. | Eigene Räume, gleiche Datenrevisionen, Hosting; für Map-Projekte zusätzlicher NetClient-Anschluss. Keine gemeinsame Bearbeitung. |
| U10 O.A.-Dashboardansicht | B/C · Daten an räumlichen Objekten bzw. CSS-Layern zeigen. | Persistenz, Domänenmodell, Widgets/DB-Anbindung, Rechte und nachvollziehbare Aktualisierung. 3D muss konkrete Such-/Arbeitsaufgaben verbessern. |
| U11 Agentenassistenz | B/C · vorhandene Layer-Szene lesen und Ansicht umschalten. | Kompatibler Host, weitere begrenzte Befehle, Zustandsprüfung und Nutzertests. Kein vorhandener autonomer Bauagent. |
| U12 Zeitveränderliche Welt | C · Gebäudezustände/Status später über Zeit darstellen. | Zeitdatenvertrag, Timeline, Auswertung, Persistenz und Kollisionsregeln zuerst bauen; heute kein direkt testbares 4D-Produkt. |

Quellen: Technische Ableitungen aus S5–S35. Nutzen und Priorisierung sind Hypothesen, keine Marktvalidierung.

## 10. Die vier zuerst sinnvollen Pilotprotokolle

Empfohlene Reihenfolge: P0 als gemeinsame Einstiegshürde; danach P3, weil euer Release anderen das Weiterbauen ermöglichen soll. P1 und P2 prüfen anschließend den Wert in einer ausgewählten Domäne. Alle Zahlen sind vorgeschlagene Entscheidungsschwellen. Kleine Stichproben finden Probleme, beweisen aber keine statistische Überlegenheit am Markt.

### P0 · Kann eine fremde Person ihre Arbeit zuverlässig abschließen?

Drei neue Entwickler oder fachlich passende Anwender starten ausschließlich mit den veröffentlichten Anweisungen. Aufgabe: Starter importieren, Höhe und Daten ändern, Undo/Redo, gehen, zurückkehren, lokal speichern, neu laden, exportieren und im frischen Browserprofil öffnen. Zusätzlich zwei Tabs mit konkurrierenden Änderungen und ein ungültiges Importformat prüfen. Einrichtung, Bearbeitung und Hilfestellungen getrennt erfassen.

Vorgeschlagenes Gate: vollständiger Einstieg ohne Maintainerhilfe binnen 20 Minuten bei protokollierten Voraussetzungen; keine unbeabsichtigten Änderungen unterstützter Felder; Konflikt sichtbar, neuere Speicherung erhalten und ungespeicherte Arbeit per Export rettbar. Eine scheiternde Wiederaufnahme ist ein Produktbefund, auch wenn die Szene zunächst gut aussieht.

### P3 · Können Außenstehende einen eigenen Anwendungsfall bauen?

Drei externe JavaScript-Entwickler ergänzen assetId, inspectionStatus und inspectionDue in point.data und zeigen den Status in einer bestehenden Auswahl-/Bedienfläche. Akzeptanz umfasst Save/Reload, Undo/Redo und Export/Reimport. Dieselbe Aufgabe wird mit dem üblichen Ausgangspunkt des jeweiligen Entwicklers verglichen; Erfahrung mit Three.js und übernommener Fremdcode werden erfasst.

Vorschlag: alle schaffen den Starter; mindestens zwei liefern die kleine Erweiterung binnen zwei Stunden mit erhaltenem Verhalten und relevanten grünen Tests. Einrichtung, Implementierung, Fehlersuche und Dokumentation getrennt zählen. Erst ein Vergleich der Gesamtzeit und Nacharbeit rechtfertigt eine Aussage über Entwicklungseinsparung.

### P1 · Verbessert räumliche Darstellung eine echte Besprechung?

Fünf tatsächliche Gelände-/Campusreviewer erhalten äquivalente 120 × 80 m Szenen mit 8–12 Gebäuden. Aufgaben: benanntes Gebäude finden, Höhen vergleichen, Route im Modell erklären, Höhe/Daten ändern, exportieren und wieder öffnen. Eine Frage ist absichtlich nicht beantwortbar, etwa eine reale Eingangsdimension. Verglichen werden heutiger Prozess, Map Studio nur 2D und Map Studio mit 3D/Walk; Reihenfolge und Aufgabenvarianten ausgleichen.

Vorschlag: mindestens vier von fünf schaffen die Bearbeitungs-/Übergabesequenz ohne Hilfe binnen 20 Minuten, kein unterstütztes Feld geht verloren, alle erkennen die nicht beantwortbare Frage. Ein Zeitvorteil gilt erst ab mindestens 20 % besserer gepaarter medianer Aufgabenzeit ohne geringere Antwortgenauigkeit. Unwohlsein und Lernzeit separat erfassen.

### P2 · Spart Datenimport insgesamt Aufwand?

Drei Datenaufbereiter bearbeiten 50–100 geeignete CSV-Zeilen sowie einen kleinen freigegebenen Overpass-JSON-Ausschnitt. Fehlerfälle: ungültige Koordinaten, doppelte IDs, gefilterte Linkfelder, fehlende Höhen, Innenhof und zu große Ausdehnung. Jeden notwendigen Datensatz als erhalten, absichtlich verändert oder abgelehnt bilanzieren. Mit der bisherigen Aufbereitung einschließlich manueller Korrektur vergleichen.

Vorschlag: vollständige Bilanz ohne stillen Verlust erforderlicher Felder; erfolgreicher normalisierter Rundlauf. Ein Einsparungsbeleg verlangt mindestens 20 % niedrigere gepaarte mediane Gesamtzeit einschließlich Korrektur, ohne mehr fehlende Pflichtobjekte oder falsche Werte. Zwei gleiche Konversionen müssen denselben normalisierten Output liefern.

Quellen: S18 und S36; P1–P3 bauen auf den vorhandenen Repo-Protokollen auf. P0 bündelt deren Einstieg-/Recovery-Gates.

## 11. Weitere Praxistests: genaue offene Fragen

Diese Vorschläge erweitern die drei Kernpiloten. Vor Durchführung sind Domäne, Daten und Ziele festzulegen. „Noch offen“ unterscheidet fehlende Nutzerbelege von noch fehlender Integration. Technische Grundlage: S5–S35; keine durchgeführten Kundenversuche.

| Pilot / Voraussetzung | Aufgabe und Vergleich | Entscheidungsrelevante Messung |
| --- | --- | --- |
| U2 Orientierung · Daten/UX | Neue Mitarbeitende/Besucher bereiten sich mit Modell oder bestehendem Lageplan auf äquivalente betreute reale Rundgänge vor. | Richtig gefundene Ziele, falsche Abzweigungen, Hilfe, Vorbereitungszeit, Unwohlsein. Vorteil nur bei besserer Zielerreichung bzw. weniger Fehlern unter Einrechnung der Vorbereitung. |
| U3 Anlagenstatus · UI ergänzen | 50–100 Anlagen zunächst synthetisch, dann freigegebener Bestand. Gesuchte Anlage/Status in Tabelle/Plan und räumlicher Oberfläche finden. | Aufgabenzeit, falsche Anlage, übersehene Frist, Aktualität. Kritische Pflichtwerte vollständig erhalten; Nutzen nur ohne Genauigkeitsverlust. |
| U4 Ausstellung · direkt pilotierbar | Fünf Autoren erstellen sechs Stationen; acht Besucher bearbeiten Inhaltsfragen in Welt und normaler Seitenansicht. | Vier von fünf Autoren schaffen den Rundlauf in 30 Minuten; Besucher zunächst Ziel ≥90 % korrekte Antworten. Suchzeit, Verständnis und Orientierung vergleichen, nicht nur Gefallen. |
| U5 Aufbauplanung · Datenkonvention | Zwei äquivalente einfache Eventlayouts mit getrennt vorbereiteter Liste von Lage-/Zuordnungsproblemen besprechen. | Richtig erkannte Modellprobleme, falsche Alarme, Verständigungszeit, Korrekturen. Alle Beteiligten müssen die Grenzen zu realer Sicherheitsplanung benennen können. |
| U7 Scans · Pipeline fehlt | Drei eigene/lizenzierte Bundles; bekannte Wege und Hindernisse sowie referenzierte Maße; Kamera-/Walk-Aufgaben auf echten Zielgeräten. | Maßfehler gegen erforderliche Toleranz, falsche Blockierung/Durchlässigkeit, Aufgabenzeit und Wiedererkennen. Keine unerklärten Colliderfehler/Abstürze; Toleranzen zweckbezogen vorher festlegen. |
| U8 Fahrzeuge · Daten ergänzen | Gleiches definiertes Terrain und Inputs: bremsen, wenden, Steigung, Klippe, Landung, Reset. | Aufgabenerfolg, unerwartete Sprünge/Kollisionen, Bedienbarkeit. Ein Schulungsnutzen erfordert zusätzlich reale Referenz und Fachprüfung; eine Unterhaltungssandbox nicht als Trainingssimulator ausgeben. |
| U9 Gemeinsame Begehung · anbinden | Vier bis acht Personen auf derselben Datenrevision lösen räumliche Abstimmungsaufgaben; Vergleich mit ihrem bisherigen gemeinsamen Review. | Aufgabenzeit/-richtigkeit, Positionsalter, RTT-Verteilung, Reconnect, Betriebskosten je Teilnehmerstunde. Eine bessere Netzrate allein belegt keinen besseren Review. |
| U10 Dashboard · Persistenz/Adapter | Fünf passende Nutzer erledigen dieselben Status-/Suchaufgaben in normalem Dashboard und räumlicher Ansicht. | Falsche Zuordnungen, Aktualität, Klicks, Zeit, Wiederaufnahme. Zuerst dauerhafte Daten und gleichwertige Funktionen herstellen; bloße Tiefe ist kein Nutzenkriterium. |
| U11 Agenten · kompatibler Host | Verfügbare zwei Tools zunächst korrekt registrieren, Szene lesen, Dimension wechseln und Zustand auf Unverändertheit prüfen. | Erfolg/Fehler jeder Operation, Latenz, Zustandsdifferenzen und Verständlichkeit. Mehrere Bearbeitungsbefehle sind erst nach Implementierung testbar. |

## 12. Technische Feldtests vor größeren Versprechen

| Test | Aufbau | Vorab festzulegende Abnahme |
| --- | --- | --- |
| T1 Geräte und Bedienung | Entwicklungs-Mac mit aktuellem Edge, Ziel-Laptop mit integrierter Grafik; physisches iPhone/Safari und Android/Chrome, falls mobil im Scope; Firefox sowie Tastatur/Assistenztechnik separat. Kleine Pilotszene und getrennte 100/1.000/5.000-Punkte-Lasten. | Kleinszene zunächst p95 Frameintervall ≤33,3 ms, kein unerwarteter Stillstand >250 ms, kein Context-Loss/Crash. Renderauflösung, Schatten und Hilfe mitberichten. Kein 60-FPS-Versprechen daraus ableiten. |
| T2 JS gegen WASM | 1/32/256 Entities, gleiche Inputs und flache/steile/rauschende Höhenfelder. Rechnen, Eingabeübertragung und Zustandlesen messen. | Deklarierte Paritätstoleranzen bestehen; Vorschlag ≥20 % geringere gesamte Simulationspfadzeit vor Beschleunigungsbehauptung. Slots nicht in Spielerzahl umdeuten. |
| T3 CPU gegen WebGPU | 8/32/64 identische Pose-Traces, gleiche Kamera/Qualität, echter bestätigter GPU-Backendpfad. Upload, Readback und Ergebnisalter einschließen. | Wiederholbarer Vorteil im gesamten Frame ohne sichtbare Fehlklassifikation; sonst CPU-Standard beibehalten. Fallback gezielt testen. |
| T4 Internetbetrieb | Erst 4–8 reale Nutzer, danach 8/16/32/64 Clients; echte und synthetische Teilnehmer getrennt zählen. Gemeinsames NAT, Mobilfunk, Latenz/Jitter, Abbruch, Idle und Neustart. | Join-Erfolg, p95 RTT/Positionsalter, Tickverzögerung, Disconnects, Wiederverbindung, Bereinigung und Kostenbudget vorab vereinbaren. 8/IP-Regel bewusst behandeln, nicht unbemerkt umdeuten. |
| T5 Langlauf und Recovery | 30 Minuten Nutzung, 20 Walk-/Import-/Exportzyklen, Tabwechsel, gezielte Speicherverweigerung und Context-Loss. | Arbeitsstand bleibt gemäß dokumentiertem Speicherverhalten erhalten; fehlgeschlagener Save nie als Erfolg. Speichertrend nach Ruhe prüfen; Heap nicht Gesamt-RAM nennen. |
| T6 Assets/Provider/Enhance | Kalter Cache, begrenzte Bandbreite, fehlende/kaputte Manifeste, Providerfehler; Bilder vor/nach Verbesserung blind beurteilen. | Kein beschädigter Arbeitsstand; belegte Lesbarkeitsänderung, Ladezeit, Byte-/Kostenbilanz; genaue Höhengitter-Rekonstruktion. Höhere Auflösung nicht als neue Information bewerten. |

### Einheitliche Methode

Commit und Eingabedateien samt Hash festhalten. Geräte, OS, Browser, GPU, Viewport, DPR, Energiezustand und Hardware-/Softwarebeschleunigung protokollieren. Baseline und Aufgabe vorab definieren; Toolreihenfolge und Varianten ausgleichen. Einrichtung, Konversion, Nacharbeit und eigentliche Aufgabe separat messen. Fehlversuche und Timeouts gehören in die Auswertung.

Für Framevergleiche: 30 Sekunden Warm-up, drei gleiche 60-Sekunden-Durchläufe im Vordergrund; bei JS/WASM-/GPU-Vergleichen fünf gepaarte Läufe. p50/p95/p99 statt nur Durchschnitt erfassen. Geräteversuche von Nutzerstudien trennen. Schwellen nach einem Fehlschlag nicht rückwirkend ändern; neue Regel bedeutet neue Protokollversion.

Quellen: S18, S22–S30, S36. Sämtliche Schwellen dieser Seite sind vorgeschlagene Gates.

## 13. Grenzen, die Produktentscheidungen beeinflussen

| Bereich | Aktuelle Grenze / Interpretation |
| --- | --- |
| Map-Größe | Maximal 5.000 Punkte; Kartenseiten jeweils 10–5.000 m; X/Z der Punkte ±2.500 m. Keine Aussage über flüssige Maximallast. |
| Objektgeometrie | Breite/Tiefe bis 300 m; Höhe 0,2–300 m; Umrisse 3–64 Ecken, insgesamt höchstens 100.000 Gebäude-Ecken. |
| Boden | 20.000 Flächen/Linien, 400.000 Punkte insgesamt; einzelne Fläche bis 2.000, Linie bis 5.000 Punkte. Grenzen gelten gemeinsam. |
| Metadaten | point.data bis 6.000, geoReference bis 4.000 JavaScript-String-Codeeinheiten; keine exakten Bytezahlen. |
| Bild / Projekt | Bildimport bis 4 MiB und 8.192 px je Seite; Projektbudget 16 MiB exakte UTF-8-Serialisierung. Große Bilder können vor der Punktzahl das Budget erreichen. |
| History / Revision | 35 vergangene History-Schritte; maximale lokale Revision 2³¹−1, danach Save abgewiesen. Keine Langzeitversionsverwaltung. |
| World / Layer | World: fünf bekannte Templates und 100 Objekte. Layer: bis neun Layer, temporäre Sitzung ohne UI-Reimport. |
| Scan / WASM / Netz | Scan: deklarierte 64 MiB und 5.000 Collider; WASM: 256 Slots; Room: 64 Plätze und acht Verbindungen/IP/Karte. Verschiedene Ebenen, keine gemeinsame Kapazitätszusage. |

### Empfohlene Entwicklungsreihenfolge

- Zuerst Einstieg, Dateitreue und Wiederaufnahme mit Außenstehenden prüfen. Parallel die zusätzliche Domäne auswählen, für die ein realer Datenverantwortlicher und ein heutiger Vergleichsprozess verfügbar sind.
- Dann Entwickler-Erweiterung, Geländeaufgabe und Datenaufbereitung durchführen. Die nächste Produktänderung aus beobachteter Hilfe, Datenverlust, Fehlinterpretation oder Nacharbeit ableiten.
- Für räumliche Anlagen-/Dashboardansichten als Nächstes Domänenschema, Filter, Zustandsdarstellung und explizite Datenaktualisierung bauen. Persistenz- und Rechtekonzept vor Teamversprechen entscheiden.
- Scans, Fahrzeuge, Globe und Mehrspieler jeweils als eigene Integration akzeptieren. Datenherkunft, Weltrevision, Maßstab, Geräte und Kosten für jede Integration separat festlegen.
- Erst aus wiederholten Integrationen stabile Paketgrenzen/SDK ableiten. Vollständige Weltarchive, Avatar-/Fahrzeugauthoring, gemeinsame Bearbeitung und 4D-Timeline sind getrennte Entwicklungsvorhaben.

Die stärkste derzeit belegbare Aussage lautet: „Ourark World Studio stellt einen offenen, prüfbaren Ausgangspunkt bereit, um strukturierte Kartendaten zu bearbeiten, räumlich darzustellen und zu begehen.“ Aussagen wie „spart 20 %“, „läuft überall mit 60 FPS“, „64 reale Teilnehmer produktionsreif“ oder „rekonstruiert aus Bildern eine genaue Welt“ benötigen zusätzliche, jeweils passende Belege.

Quellen: S4–S8, S15, S20, S26, S30, S36.

## 14. Quellen und Nachvollziehbarkeit

Alle Quellcode-Links sind auf den aktuellen öffentlichen Merge-Commit fixiert. Der analysierte Arbeitsstand 389155d hat denselben Git-Baum. Dadurch sind Quellenbehauptungen unabhängig von späteren Änderungen an main nachvollziehbar. Die Einordnung der Chancen ist eine Ableitung aus diesen Quellen; sie enthält keine externe Markt-/Wettbewerbsstudie.

**S1 · README: Produktumfang, Start und Makepad-Bezug**
[README.md](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/README.md)

**S2 · PR #1: Korrekturen und vorherige Testbelege**
[https://github.com/MasterPlayspots/ourark-world-studio/pull/1](https://github.com/MasterPlayspots/ourark-world-studio/pull/1)

**S3 · Aktueller main-CI-Lauf, alle drei Jobs erfolgreich**
[https://github.com/MasterPlayspots/ourark-world-studio/actions/runs/37457577440](https://github.com/MasterPlayspots/ourark-world-studio/actions/runs/37457577440)

**S4 · Auditbericht: Befunde und verbleibende Grenzen**
[docs/AUDIT_2026-10-06.md](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/docs/AUDIT_2026-10-06.md)

**S5 · Map-Modell: Limits, Geometrie, Normalisierung, History**
[dist/map-studio/model.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/map-studio/model.js)

**S6 · Map-Projekt: Container, Identität und Bytebudget**
[dist/map-studio/project.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/map-studio/project.js)

**S7 · Map-Speicherung: lokale Transaktionen und Revision**
[dist/map-studio/storage.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/map-studio/storage.js)

**S8 · Map-Editor: tatsächliche UI-Pfade**
[dist/map-studio/editor.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/map-studio/editor.js)

**S9 · CSV-Konvertierung**
[dist/worldport/core.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/worldport/core.mjs)

**S10 · OSM-Konvertierung und Höhenschätzungen**
[dist/worldport/osm.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/worldport/osm.mjs)

**S11 · OSM-Boden: Innenringe und Breitenannahmen**
[dist/worldport/osm-ground.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/worldport/osm-ground.mjs)

**S12 · Layer-Editor und zwei optionale Browsertools**
[dist/app.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/app.js)

**S13 · World-Modell und Map-Import**
[dist/world-studio/model.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/world-studio/model.js)

**S14 · World-Renderer: Texturen und Animationen**
[dist/world-studio/renderer.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/world-studio/renderer.js)

**S15 · Scan-Loader: Bundleprüfung und Grenzen**
[dist/runtime/scan/loader.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/scan/loader.js)

**S16 · Scan-Adapter: Kameras und Kollisionsraum**
[dist/runtime/scan/adapter.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/scan/adapter.js)

**S17 · Begehung und Runtime-Lebenszyklus**
[dist/runtime/walk-host.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/walk-host.js)

**S18 · Bestehende Nutzenhypothesen und Pilotprotokolle**
[docs/VALUE_AND_VALIDATION.md](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/docs/VALUE_AND_VALIDATION.md)

**S19 · Spezialisierter Kollisionscontroller**
[dist/runtime/physics/adapter.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/physics/adapter.js)

**S20 · Rust-Simulation und numerische Grenzen**
[sim/src/lib.rs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/sim/src/lib.rs)

**S21 · JS/WASM-Paritätstests**
[tests/sim-wasm.test.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/tests/sim-wasm.test.mjs)

**S22 · WebGPU/CPU-Culling und Transfers**
[dist/runtime/gpu/cull.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/gpu/cull.js)

**S23 · Chunk-LOD und Geometriebudget**
[dist/runtime/lod/chunk-lod.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/lod/chunk-lod.js)

**S24 · Höhendaten-Codec**
[dist/runtime/assets/codec.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/assets/codec.js)

**S25 · Adaptive Renderqualität**
[dist/runtime/quality.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/quality.js)

**S26 · Room: Limits, Interesse, Posen und Tick**
[edge/room.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/edge/room.mjs)

**S27 · MapRoom: Terrain, IP-Grenzen und Idle**
[edge/map-room.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/edge/map-room.mjs)

**S28 · Realtime-Route und Karten-Allowlist**
[edge/realtime.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/edge/realtime.mjs)

**S29 · Worker-APIs, Anmeldung und Enhancement**
[edge/app.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/edge/app.mjs)

**S30 · Historische Messungen und Evidenzgrenzen**
[docs/FINDINGS.md](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/docs/FINDINGS.md)

**S31 · Optionale Integrationen und Ausschlüsse**
[docs/INTEGRATIONS.md](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/docs/INTEGRATIONS.md)

**S32 · MIT-/Drittanbieter-/Datenabgrenzung**
[LICENSE_SCOPE.md](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/LICENSE_SCOPE.md)

**S33 · Zukünftiger Weltpaketvertrag – nicht implementiert**
[contracts/world-package-v2.d.ts](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/contracts/world-package-v2.d.ts)

**S34 · Tatsächliche Kart-Anbindung von Netzwerk und GPU**
[dist/kart/main.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/kart/main.js)

**S35 · Telemetrieerfassung und getrennte Aktivierung**
[dist/kart/insights.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/kart/insights.js)

**S36 · Versuchsvorlage für nachvollziehbare Ergebnisse**
[docs/validation/RESULT_TEMPLATE.md](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/docs/validation/RESULT_TEMPLATE.md)

**S37 · World-Editor: Import, Upload und Speicher**
[dist/world-studio/editor.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/world-studio/editor.js)

**S38 · Gemeinsame Frame-Schleife**
[dist/runtime/frame-loop.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/frame-loop.js)

**S39 · Physikalisch getrennte Controller-Snapshots**
[dist/runtime/sim/snapshot.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/sim/snapshot.js)

**S40 · WASM-Speicheransichten**
[dist/runtime/sim/wasm.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/sim/wasm.js)

**S41 · Vernetzungsclient und Interpolation**
[dist/runtime/net/client.js](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/dist/runtime/net/client.js)

**S42 · Lizenztext des MIT-Core**
[LICENSE](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/LICENSE)

**S43 · Verifikation und Nachweisgrenzen**
[docs/RELEASE_STATUS.md](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/docs/RELEASE_STATUS.md)

**S44 · UI- und Importregressionen im Browser**
[tests/browser/audit-regressions.browser.mjs](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/tests/browser/audit-regressions.browser.mjs)

**S45 · Runtime-Entwürfe für Fahrzeuge und Charaktere**
[contracts/runtime-extensions.d.ts](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/contracts/runtime-extensions.d.ts)

**S46 · Öffentliche Release-Ausschlüsse**
[PUBLIC_SOURCE.json](https://github.com/MasterPlayspots/ourark-world-studio/blob/024b05719a5dd84f47c1bdb2ba2794db63ff904c/PUBLIC_SOURCE.json)

### Zusätzliche Präzisierungen aus dieser Durchsicht

Für weitere Dokumentationsarbeit besonders relevant: Map→World übernimmt nicht den vollständigen Projektcontainer; CSV lat/lng ist hier planar; OSM-Innenringe und geschätzte Breiten müssen offengelegt werden; zwei Layer-Browsertools sind keine vollständige Agentenplattform; der Enhancement-Vertrag enthält kein eigenes KI-Modell; historische worldscan-/scripts/geo-Verweise dürfen nicht als mitgelieferte Pipeline gelesen werden. Diese Präzisierungen sind im vorliegenden Bericht aufgenommen. Der Repository-Code wurde für diese Analyse nicht verändert.
