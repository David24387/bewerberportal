# EUROMASTER Bewerberportal

Interner UI-Prototyp für die Bearbeitung von Social-Recruiting-Bewerbungen aus Meta-Instant-Formularen. Ausschließlich künstliche Beispieldaten, keine echte Meta-Anbindung.

## Aktueller Stand

- Bewerbungsübersicht mit Suche und Filtern für Status, Standort und Recruiterin
- Detailansicht mit den sieben Fragen des Lkw-Reifenmonteur-Formulars plus Vorname, E-Mail und Telefon
- Status, Zuständigkeit, Wiedervorlage, Notizen und lokaler Bearbeitungsverlauf
- Ansicht für fällige Wiedervorlagen; abgeschlossene Fälle werden ausgeschlossen
- Formularverzeichnis als Demo einer expliziten Freigabeliste
- Smartphone-Layout und zugängliches Detaildialogfenster
- Keine automatische Bewertung oder Entscheidung über Bewerbende

Die Demo zeigt sechs fiktive Bewerbungen. Alle E-Mail-Adressen verwenden example.com, es gibt keine echten Telefonnummern. Bearbeitungen werden ausschließlich im lokalen Browser gespeichert, nicht zentral und nicht für andere Recruiterinnen sichtbar. Kein Login ist implementiert. Die Oberfläche kennzeichnet diese Einschränkungen ausdrücklich.

## Vorschau

Repository herunterladen und im Projektverzeichnis einen statischen lokalen Webserver starten, beispielsweise:

```sh
python -m http.server 8080
```

Anschließend http://localhost:8080 öffnen. Zum Wiederherstellen der Beispieldaten den Knopf „Demo zurücksetzen“ verwenden.

## Tests

Keine Installation von Paketen erforderlich:

```sh
node --check portal.js
node --test tests/portal.test.cjs
```

GitHub Actions führt diese Prüfungen bei Änderungen aus.

## Formularfreigabe

Es sollen immer neue Formulare hinzukommen können, ohne die Anwendung für jeden Job umzuschreiben. Jedes Formular benötigt ausdrücklich freigegebene Seiten-ID + Formular-ID und eine Zuordnung zu Stelle und Standort. Neue und unbekannte Formulare bleiben ausgeschlossen. Die aktuelle Beispieldatenliste enthält ein zugeordnetes Mehrstandort-Formular für Lkw-Reifenmonteure in Bühl und Heilbronn sowie ein nicht freigegebenes neues Formular. Der Standort wird aus der Antwort auf Frage 7 ermittelt; fehlende oder unbekannte Antworten werden als Prüffall markiert.

Die Originalfragen und Antworten bleiben als Liste je Bewerbung erhalten. Eine feste Spaltenanzahl beschränkt die möglichen Fragen nicht. Der spätere Server muss die Freigabeliste verbindlich prüfen. Die Browserfunktion ist nur Demonstration und keine Sicherheitsgrenze.

## Vor echten Bewerbungen erforderlich

1. Geschütztes Hosting und persönliche Konten / Firmen-SSO auswählen und einrichten.
2. Gemeinsame Datenbank mit serverseitigen Lese-/Schreibrechten und nachvollziehbarem Bearbeitungsverlauf einrichten.
3. Freigegebene Meta-Seiten und Formular-IDs hinterlegen; Zugangsdaten ausschließlich auf dem Server speichern.
4. Serverseitige Meta-Anbindung mit Signaturprüfung, Dublettenvermeidung, Wiederholungsabruf und Statusüberwachung integrieren.
5. Mit Test-Leads und zwei Benutzerkonten den vollständigen Ablauf prüfen.

Nicht auf GitHub Pages für echte Bewerbungen verwenden. Ein privates Repository ersetzt keinen Zugriffsschutz der laufenden Anwendung. Keine Bewerberdaten oder Meta-Tokens committen.

Eine produktive Datenbank oder ein Hostinganbieter wurden noch nicht ausgewählt. Das Repository wird nicht automatisch öffentlich veröffentlicht.

Siehe [Meta-Importkonzept](docs/META_IMPORT.md).
