# Erstes Formular: Lkw-Reifenmonteur

Basis: die acht vom Nutzer bereitgestellten Screenshots. Die echte Meta-Seiten- und Formular-ID fehlen noch; alle IDs der Demo sind Platzhalter. Es werden keine echten Leads abgerufen.

## Fragen und Antwortmöglichkeiten

1. Welchen Führerschein hast du?
   - Klasse B (Auto)
   - Klasse C1 (LKW bis 7,5 t)
   - Klasse C/CE (LKW über 7,5 t)
   - Keinen Führerschein

2. Hast du eine Ausbildung als KFZ-Mechatroniker oder etwas Vergleichbares?
   - Ja
   - Nein

3. Hast du Erfahrung in der LKW-Reifenmontage?
   - Ja
   - Nein

4. Wieviel Berufserfahrung hast du bereits?
   - Berufseinsteiger
   - 1 - 4 Jahre
   - 4 - 10 Jahre
   - Über 10 Jahre

5. Über welchen Weg können wir dich am besten kontaktieren?
   - E-Mail
   - Telefon / Anruf

6. Wann können wir dich am besten telefonisch erreichen?
   - Morgens
   - Mittags
   - Nachmittags
   - Abends

7. Für welchen Standort interessierst du dich?
   - 77815/Bühl
   - 74076/Heilbronn

Kontaktfelder: E-Mail-Adresse, Telefonnummer und Vorname. Keine Frage zur aktuellen beruflichen Tätigkeit im bereitgestellten Lkw-Formular.

## Verzweigungen aus den Screenshots
- Keinen Führerschein → E2, Zielseite für andere Nutzer.
- Führerschein B, C1 oder C/CE → Ausbildung → Erfahrung Lkw-Reifenmontage → Berufserfahrung → Kontaktweg.
- E-Mail → laut Screenshot direkt E1.
- Telefon / Anruf → telefonische Erreichbarkeit → laut Screenshot E1.
- Die separat gezeigte Standortfrage enthält Bühl und Heilbronn → E1.

Auffälligkeit: Die gezeigten Verknüpfungen bei E-Mail und telefonischer Erreichbarkeit führen direkt zur Endseite. Damit scheint Frage 7 nicht auf dem gezeigten Hauptpfad zu liegen. Das muss im tatsächlichen Meta-Formular geprüft werden. Falls alle abgeschlossenen Bewerbungen einen Standort haben sollen, Kontaktweg E-Mail und die Antworten zur Erreichbarkeit auf Frage 7 weiterleiten; erst Frage 7 führt zur Abgabe/Endseite. Das Portal verändert das Meta-Formular nicht.

## Darstellung im Portal
Standort aus Frage 7 übernehmen und gegen die zwei zulässigen Antworten prüfen. Ohne passende Antwort: „Standort fehlt – prüfen“. Bei Kontaktweg E-Mail eine übersprungene Erreichbarkeitsfrage ausdrücklich als „Nicht abgefragt“ darstellen. Keine Antwort erfinden. Fragen pro Formular als Definition speichern; die Bewerbung behält die tatsächlichen Originalfragen und Antworten.

Demo-Speicher nutzt einen neuen Schlüssel, damit frühere Mechatroniker-Beispieldaten die Lkw-Vorschau nicht überschreiben. Alte lokale Daten werden nicht gelöscht.
