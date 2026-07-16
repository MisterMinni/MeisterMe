## Ziel
Im Baustellen-Chat soll oben mittig ein kleines Datums-Label schweben (z. B. „Heute", „Gestern", „Mi., 15.07.2026"), das automatisch das Datum der aktuell obersten sichtbaren Nachricht anzeigt und sich beim Scrollen live aktualisiert – wie in WhatsApp.

## Umsetzung in `src/components/ProjectChat.tsx`

1. **Floating Chip einbauen**
   - Im scrollbaren Chat-Container oben mittig ein absolut positioniertes Pill-Element ergänzen (weiß/halbtransparent, Schatten, kleiner Text), das über den Nachrichten schwebt.
   - Anzeige nur, wenn Nachrichten vorhanden sind, und mit sanftem Fade-In/Out.

2. **Aktives Datum tracken**
   - Jede Nachricht (bzw. jede Tagesgruppe) bekommt ein `data-day`-Attribut mit dem formatierten Tag.
   - Ein `IntersectionObserver` auf dem Scroll-Container beobachtet alle Nachrichten-Elemente und ermittelt fortlaufend die oberste sichtbare Nachricht.
   - Der `day`-Wert dieser Nachricht wird in State (`currentDay`) gehalten und im Floating Chip gerendert.

3. **Verhalten**
   - Beim Öffnen/Neuladen wird der Startwert aus der ersten sichtbaren Nachricht abgeleitet.
   - Beim Scrollen aktualisiert sich der Chip ohne Ruckeln (throttled via Observer).
   - Bei leerem Chat wird der Chip nicht angezeigt.

## Nicht Teil des Plans
- Keine Änderungen an Datenmodell, Backend oder anderen Komponenten.
- Der Hintergrund (Häuser-Doodle) und die Bubble-Styles bleiben unverändert.
