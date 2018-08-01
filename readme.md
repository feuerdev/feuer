Building, Running, Debugging

1. run build task (tsc ist durch die tsconfig.json automatisch im watch modus);
2. F5 um zu starten/debuggen

TODO:

* Grafik
  * Shells besser zeichnen
* Input
  * Linksclick zum Zielen
    * Sollte sich mit dem Schiff bewegen
    * Kalkuliere den aimpoint anhand der beiden Winkel und der velocity
      * Dann ist es auch einfacher den Punkt aktuell zu halten
  * Optische Darstellung des Vertikalen Angles

* UI
  * Keyboard shortcuts anzeigen

* Gameplay
  * Korrekte hit detection
  * Tilebasierter Schiff Aufbau
    * Dann könnte man z.B. eine Werft (aka eine Tabelle) anlegen. Die Standard Werft ist z.B. 4x3. Durch Upgrades kann man die maximale Größe erweitern.

* Login
* XP System
* Client Config über Webservice laden

Erledigt:
* Rechtsklick zum Waypoint setzen
* teams implementieren
* spawns implementieren
* spielfeldgröße festlegen
* "Schatten" soll kleiner werden je höher das projektil fliegt
* feuerrate begrenzen
* Pepy's Schiffe zeichnen
* Zwei Hilfslinien (oder anderer Indikator für "requested" Angle und "actual" Angle)