Try it at https://gellerlul.herokuapp.com/

Building, Running, Debugging

1. run build task (tsc ist durch die tsconfig.json automatisch im watch modus);
2. F5 um zu starten/debuggen

TODO:

* Grafik
  * Shells besser zeichnen
* Input  
  * Optische Darstellung des Vertikalen Angles

* UI
  * Keyboard shortcuts anzeigen

* Gameplay
  * Kugeln aus Kanone fliegen lassen
  * Mehrere Kanonen
  * Korrekte hit detection
  * Tilebasierter Schiff Aufbau
    * Dann könnte man z.B. eine Werft (aka eine Tabelle) anlegen. Die Standard Werft ist z.B. 4x3. Durch Upgrades kann man die maximale Größe erweitern.

* Login
* XP System
* Client Config über Webservice laden

Erledigt:
* Gameplay
  * Multiplayer
  * Mausinput
    * Linksclick zum Zielen
    * Rechtsklick zum Waypoint setzen
  * Tastaturinput
    * WASD zum Zielen
    * Pfeiltasten zum bewegen
    * x zum Ruder-Reset
    * Space zum Schießen
* Spawns auf beiden Spielfeldseiten
* Spielfeldgröße festlegen
* Feuerrate begrenzen

* UI
  * Vorschau des Einschlagpunkts der Projektile (Zielhilfe)
  * "Schatten" soll kleiner werden je höher das projektil fliegt
  * Pepy's Schiffe zeichnen
  * Zwei Hilfslinien (oder anderer Indikator für "requested" Angle und "actual" Angle)

* Other
  * Shared Code zwischen Server und Client
