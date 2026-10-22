# SKYBLOCK RUN

Ein eigenständiges 3D-Browserspiel mit schwebenden Inseln, Baupassagen, Windkatapulten und einer geheimen Welt. Einzelspieler, ohne Roblox-Konto oder Roblox-Anbindung.

**[Direkt spielen](https://skyblock-run.gsalami.chatgpt.site)**

## Spielen

WASD oder Pfeiltasten bewegen die Figur. Leertaste springt; ein zweiter Druck löst den Doppelsprung aus. Shift sprintet. Maus ziehen oder Q/E dreht die Kamera, das Mausrad ändert den Abstand. R setzt zum letzten Checkpoint zurück. C wechselt das Outfit. B oder 2 aktiviert Bauen, 1 Erkunden. Links klicken setzt einen Block, rechts klicken entfernt einen eigenen Block. Jede Welt startet mit einem eigenen Vorrat von 12 Blöcken. Holzpakete liefern je 8 weitere: vier Pakete in der Hauptwelt, je zwei in den anderen Welten. Am Touchgerät: Joystick links, Sprung rechts, Wischen zum Umsehen.

Sammle die zwölf violetten Kristalle. Hinter dem Himmelstor liegt das Baumeistertor auf einer eigenen Zielinsel. Jede Welt hat vor ihrem Ziel eine echte Baulücke: 32 Meter in Hauptwelt, Wolkenlauf und Sternengrotte, 42 Meter in den Sturmspitzen. Auch Sprint, Doppelsprung und die Gleitflügel reichen ohne eigene Blöcke nicht aus.

Die seitliche Brücke zur Wolkenwarte ist 36 Meter lang. Die Bauhilfe setzt einzelne Blöcke nur in deiner Nähe. Laufe mit deiner Brücke mit und baue sie weiter. Die vollständigen vorgeschlagenen Brücken brauchen 16 Blöcke (normales Ziel), 21 Blöcke (Sturmziel) oder 18 Blöcke (Wolkenwarte). Freies Bauen und eigene Lösungen mit Sprüngen bleiben möglich.

Im Baumodus bringt «Bauten zurückholen» dich sicher zum permanenten Checkpoint und gibt alle verbauten Blöcke der aktuellen Welt zurück. Vorräte und Bauten anderer Welten bleiben erhalten. Alle Hintergrundinseln haben weiterhin feste Oberflächen; Inseln im Baukorridor wurden zur Seite versetzt.

Eine sichere Landung auf der Wolkenwarte setzt einen Checkpoint und schaltet den Wolkenlauf frei: vier neue Inseln, acht goldene Kristalle, eigene Checkpoints und eine Baulücke vor dem Zielportal. Das Bonuslevel lässt sich direkt oder später starten. Die Rückkehr stellt den Stand der Hauptwelt wieder her. Ein neuer Lauf startet das aktuell gespielte Level neu.

Nach dem Abschluss des Wolkenlaufs wird **Sturmspitzen** freigeschaltet: vier türkisfarbene Inseln und acht Sturmkristalle und eine Baulücke vor dem Ziel. Die leuchtenden Windkatapulte schleudern dich in Richtung der nächsten Insel. Halte die Leertaste beziehungsweise den Touch-Sprungknopf, um im Fall mit Gleitflügeln langsamer zu sinken; Richtungstasten beziehungsweise Joystick steuern. Jede neue Zielinsel setzt einen sicheren Checkpoint. Vorhandene Wolkenlauf-Bestzeiten schalten Level 3 auch ohne erneuten Abschluss frei. Die Rückkehr zum Wolkenlauf erhält dessen Laufstand.

Ein Sturz rechts vom Himmelstor, beim Wasserfall und unterhalb der rechten Inselkante, führt durch einen versteckten Eingang in die **Sternengrotte**. Hier zählen keine Fehlversuche für den Eingang. Sechs Sternsplitter und drei Runen öffnen das Ziel am Sternenwerk; zur letzten Zielinsel ist zusätzlich eine eigene Brücke nötig. Betritt eine Rune, damit eine feste Kristallbrücke zur nächsten Insel erscheint. Neustart setzt Runen und Brücken zurück; normale Checkpoint-Rückkehr im selben Lauf erhält sie. Nach der ersten Entdeckung bleibt der Zugang lokal gespeichert und erscheint im Startmenü. Die Rückkehr stellt den vorherigen Hauptwelt-Checkpoint und Fortschritt wieder her. Gewöhnliche Stürze ausserhalb dieses Eingangs bleiben gewöhnliche Fehlversuche.

Freischaltung und getrennte Bestzeiten bleiben lokal in diesem Browser gespeichert. Die längeren Baukurse führen neue Bestzeiten; frühere Zeiten dienen weiterhin als Nachweis bereits freigeschalteter Welten. Bauten, gesammelte Gegenstände und laufende Checkpoints gelten für den aktuellen Besuch. Ohne verfügbaren Browserspeicher gilt die Freischaltung nur bis zum Neuladen.

## Lokal starten

Die Laufzeitbibliothek und Schriftart sind mitgeliefert. Zum Spielen braucht es keine API-Schlüssel und keine Paketinstallation.

```sh
git clone https://github.com/Kuble-Lab/skyblock-run.git
cd skyblock-run
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

Danach `http://127.0.0.1:8765` in einem Browser mit WebGL öffnen. JavaScript-Module benötigen einen Webserver; `index.html` nicht direkt per Doppelklick öffnen. Alternativ kann jeder statische Webserver den Ordner `dist/` bereitstellen.

## Tests

Mit Node.js 22 oder neuer:

```sh
npm test
```

Die Tests benötigen keine zusätzlichen npm-Pakete. GitHub Actions führt sie bei Pull Requests und Änderungen an `main` aus.

## Prüfung

`node --test tests/*.test.mjs` — 33 Tests für Physik, sichere Inseln, Brückenbau und Überquerung, Landungsfreischaltung, lokalen Speicher, alle Bonus-Hops, Sammeln, Gewinn, Levelwechsel, Neustart und Minimap sowie Windimpuls, Gleitflug, Freischaltung von Level 3 und sichere Sturm-Transfers mit und ohne Gleitflügel, präzise Fall-Erkennung, Runenbrücken und sichere Rückkehr aus der Geheimwelt. Zusätzlich geprüft: 150 Sprungvarianten ohne Bauten über die fünf Baulücken, vollständiger schrittweiser Brückenbau mit Paketmaterial, Bau-Reichweite, Rückholen und getrennte Vorräte pro Welt. Die Integrationstests verwenden das echte Spiel und die echte Physik mit gestubbtem DOM/WebGL-Renderer. Browserprüfung mit lokal vorbereiteten Szenarien: Brücke bauen, auf der Wolkenwarte landen, Freischaltungsdialog, Bonusstart, Freischaltung der Sturmspitzen, Windstart mit sicherer Landung, Gleitflügel, geheimer Fall-Eingang, Sternengrotte, Runenbrücken, Reichweitenbegrenzung beim Bauen, Rückholen der Blöcke und schmale Bildschirmansicht. Kein vollständiger manueller Durchlauf und kein Test auf einem physischen Telefon.

## Abhängigkeiten

Three.js 0.170.0 (MIT) und Outfit (SIL Open Font License) sind lokal unter `dist/vendor/` enthalten, inklusive Lizenzdateien. Es werden zur Laufzeit keine externen Bibliotheken geladen.
