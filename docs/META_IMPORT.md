# Verbindliche Formularfreigabe für die spätere Meta-Anbindung

## Ziel
Nur vom Verantwortlichen ausdrücklich benannte Formulare übernehmen. Zugriff auf eine Meta-Seite allein ist keine Importfreigabe aller ihrer Formulare.

## Formularregister
Pro Formular serverseitig speichern:
- Meta-Seiten-ID und Meta-Formular-ID (gemeinsam eindeutig)
- Anzeigename, Jobtitel und Standort
- Aktiviert / pausiert
- Freigegeben durch und Zeitpunkt der Freigabe
- Zeitpunkt der letzten erfolgreichen Übernahme und letzter technischer Fehler

Unbekannte IDs werden standardmäßig abgewiesen, auch beim manuellen Nachladen älterer Leads. Reaktivierung verlangt eine ausdrückliche Aktion. Pausieren beendet den weiteren Import; es löscht keine bisherigen Bewerbungen.

## Aufnahmeprozess
1. Webhook-Verifikation und Signatur serverseitig prüfen.
2. Gemeldete Seiten-/Formular-ID gegen aktive Freigabe prüfen.
3. Nur für aktive, vollständig zugeordnete Formulare die Lead-Daten abrufen.
4. Tatsächliche Formularzugehörigkeit der Antwort erneut prüfen.
5. Meta-Lead-ID als eindeutigen Schlüssel verwenden. Wiederholte Zustellungen erzeugen keine zweite Bewerbung.
6. Originalfragen, Originalantworten, Eingangszeit und Formularzuordnung speichern. Status, Zuständigkeit und Notizen beim erneuten Abruf niemals überschreiben.
7. Fehlende Leads regelmäßig ausschließlich für freigegebene Formulare nachladen. Abruffehler und fehlende Berechtigungen sichtbar melden.

## Flexible Fragen
Je Bewerbung eine Liste aus stabiler Meta-Feldkennung, Originalfrage und Antwort(en) speichern. Gemeinsam genutzte Felder können je Formular explizit für die Tabellenübersicht zugeordnet werden. Unbekannte Fragen bleiben im Detail sichtbar; sie dürfen nicht stillschweigend verschwinden. Formulierungstexte sind keine verlässlichen technischen Schlüssel.

## Interne Nutzung
Alle Datenzugriffe serverseitig authentifizieren und autorisieren. Nutzeridentität für Änderungshistorie aus der geprüften Sitzung übernehmen. Kein gemeinsames Browserpasswort und kein frei erreichbarer Datenexport. Meta-Tokens, App-Geheimnisse und Datenbankzugänge bleiben ausschließlich auf dem Server. Die Demo enthält diese Anbindung noch nicht.
