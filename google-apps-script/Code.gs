/* Standalone Apps Script. Never bind this project to the shared spreadsheet.
 * No web-app deployment. Meta requests are GET-only for one fixed form.
 * Configure secrets through Project settings > Script properties.
 */
const PORTAL = Object.freeze({
  spreadsheetId: '1OHJJd7kq10MKyj3vmR7gBMwNsHRv2RD7dN889-Q1ZsA',
  formId: '1067596719431599',
  sheetName: 'Bewerbungen',
  headers: ['Meta-Lead-ID', 'Eingang bei Meta', 'Übernommen am', 'Formular-ID',
    'Stelle', 'Vorname', 'E-Mail', 'Telefon', 'Status', 'Zuständig',
    'Wiedervorlage', 'Interne Notizen', 'Benachrichtigt am', 'Alle Formularantworten'],
  statuses: ['Neu', 'Kontaktversuch', 'Im Gespräch', 'An Fachbereich übergeben', 'Eingestellt', 'Abgesagt'],
  owners: ['Nicht zugewiesen', 'Amra', 'Vlada']
});

function setupTable() {
  const book = SpreadsheetApp.openById(PORTAL.spreadsheetId);
  const sheet = book.getSheetByName(PORTAL.sheetName) || book.insertSheet(PORTAL.sheetName);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, PORTAL.headers.length).setValues([PORTAL.headers]);
  }
  assertHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, PORTAL.headers.length)
    .setBackground('#154194').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
  sheet.setRowHeight(1, 42);
  sheet.setColumnWidths(1, PORTAL.headers.length, 170);
  sheet.setColumnWidth(12, 300);
  sheet.setColumnWidth(14, 480);
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('D:D').setNumberFormat('@');
  sheet.getRange('H:H').setNumberFormat('@');
  sheet.getRange('K2:K').setNumberFormat('dd.MM.yyyy');
  sheet.getRange('I2:I').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(PORTAL.statuses, true).setAllowInvalid(false).build());
  sheet.getRange('J2:J').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(PORTAL.owners, true).setAllowInvalid(false).build());
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), PORTAL.headers.length).createFilter();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('IMPORT_FROM')) props.setProperty('IMPORT_FROM', new Date().toISOString());
  if (!props.getProperty('SYNC_ENABLED')) props.setProperty('SYNC_ENABLED', 'false');
  console.log('Tabelle eingerichtet. Meta-Abruf ist noch nicht aktiviert.');
}

function assertHeaders_(sheet) {
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, PORTAL.headers.length).getValues()[0]) !== JSON.stringify(PORTAL.headers)) {
    throw new Error('Tabellenüberschriften fehlen oder wurden verändert. Bitte setupTable prüfen.');
  }
}

// Prevent answers from becoming spreadsheet formulas. Treat IDs as text.
function cellText_(value) {
  const text = String(value == null ? '' : value);
  if (text.length > 45000) throw new Error('Ein Formularfeld ist zu lang für die Tabelle.');
  return /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
}

function leadRow_(lead, now) {
  if (!/^\d+$/.test(String(lead.id || '')) || String(lead.form_id) !== PORTAL.formId) {
    throw new Error('Lead-ID ungültig oder Formular nicht freigegeben.');
  }
  if (!Array.isArray(lead.field_data) || !Number.isFinite(Date.parse(lead.created_time))) {
    throw new Error('Meta hat unvollständige Bewerbungsdaten geliefert.');
  }
  const fields = {};
  lead.field_data.forEach(f => { fields[String(f.name)] = (f.values || []).map(String).join(' | '); });
  const answers = lead.field_data.map(f => String(f.name) + ': ' + (f.values || []).map(String).join(' | ')).join('\n');
  return [String(lead.id), lead.created_time, now, PORTAL.formId,
    'Lkw-Reifenmonteur/in · Bühl / Heilbronn', fields.first_name || fields.full_name || '',
    fields.email || '', fields.phone_number || '', 'Neu', 'Nicht zugewiesen', '', '', '', JSON.stringify(lead.field_data)].map(cellText_);
}

function config_() {
  const p = PropertiesService.getScriptProperties().getProperties();
  if (!p.META_ACCESS_TOKEN) throw new Error('Script-Eigenschaft META_ACCESS_TOKEN fehlt.');
  if (!/^v\d+\.0$/.test(p.META_API_VERSION || '')) throw new Error('META_API_VERSION fehlt, z. B. die unterstützte Version aus eurer Meta-App.');
  if (!Number.isFinite(Date.parse(p.IMPORT_FROM))) throw new Error('IMPORT_FROM fehlt oder ist kein gültiger ISO-Zeitpunkt.');
  return p;
}

function fetchPage_(p, since, after) {
  // Never follow Meta paging.next: it may contain an access token.
  const params = {fields: 'id,created_time,form_id,field_data', limit: '100',
    filtering: JSON.stringify([{field: 'time_created', operator: 'GREATER_THAN', value: since}])};
  if (after) params.after = after;
  const query = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  const url = 'https://graph.facebook.com/' + p.META_API_VERSION + '/' + PORTAL.formId + '/leads?' + query;
  const response = UrlFetchApp.fetch(url, {method: 'get', headers: {Authorization: 'Bearer ' + p.META_ACCESS_TOKEN},
    muteHttpExceptions: true, followRedirects: false});
  const status = response.getResponseCode();
  if (status !== 200) {
    // Do not log response bodies: they can contain credentials or personal data.
    throw new Error('Meta-Abruf fehlgeschlagen (HTTP ' + status + '). Token, Lead-Zugriff und API-Version prüfen.');
  }
  let data;
  try { data = JSON.parse(response.getContentText()); } catch (_) { throw new Error('Ungültige Meta-Antwort.'); }
  if (!Array.isArray(data.data)) throw new Error('Meta-Antwort enthält keine Lead-Liste.');
  return data;
}

function syncApplications() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('SYNC_ENABLED') !== 'true') return;
    const p = config_();
    const sheet = SpreadsheetApp.openById(PORTAL.spreadsheetId).getSheetByName(PORTAL.sheetName);
    assertHeaders_(sheet);
    splitAnswerColumns_(sheet);
    const started = Date.now();
    const base = Math.max(Date.parse(p.IMPORT_FROM), Date.parse(p.LAST_SUCCESS || p.IMPORT_FROM) - 24 * 3600000);
    const since = Math.floor(base / 1000) - 1;
    const existing = new Set(sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat() : []);
    let after = '', pages = 0;
    do {
      if (++pages > 20 || Date.now() - started > 180000) throw new Error('Abruf zu groß. Kontrollierter Nachimport erforderlich; Fortschritt nicht übersprungen.');
      const result = fetchPage_(p, since, after);
      const rows = [];
      result.data.forEach(lead => {
        if (String(lead.form_id) !== PORTAL.formId) throw new Error('Nicht freigegebenes Formular erhalten.');
        if (Date.parse(lead.created_time) < Date.parse(p.IMPORT_FROM) || existing.has(String(lead.id))) return;
        rows.push(leadRow_(lead, new Date().toISOString()));
        existing.add(String(lead.id));
      });
      if (rows.length) {
        const start = sheet.getLastRow() + 1;
        if (start + rows.length - 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), start + rows.length - 1 - sheet.getMaxRows());
        sheet.getRange(start, 1, rows.length, PORTAL.headers.length).setNumberFormat('@').setValues(rows);
        sheet.getRange(start, 11, rows.length, 1).setNumberFormat('dd.MM.yyyy');
        sheet.getRange(start, 14, rows.length, 1).setWrap(true);
        SpreadsheetApp.flush();
      }
      after = result.paging && result.paging.next ? result.paging.cursors && result.paging.cursors.after : '';
      if (result.paging && result.paging.next && !after) throw new Error('Meta-Paginierung ohne Cursor.');
    } while (after);
    splitAnswerColumns_(sheet);
    props.setProperty('LAST_SUCCESS', new Date(started).toISOString());
    notifyPending_(sheet, p);
  } finally { lock.releaseLock(); }
}

function notifyPending_(sheet, p) {
  if (!p.NOTIFY_EMAILS || sheet.getLastRow() < 2) return;
  const recipients = p.NOTIFY_EMAILS.split(',').map(x => x.trim()).filter(Boolean);
  if (!recipients.length || !recipients.every(x => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(x))) throw new Error('NOTIFY_EMAILS enthält ungültige Adressen.');
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, PORTAL.headers.length).getValues();
  const pending = rows.map((r, i) => ({r, row: i + 2})).filter(x => x.r[0] && !x.r[12]);
  if (!pending.length) return;
  if (MailApp.getRemainingDailyQuota() < recipients.length) throw new Error('Mailkontingent erreicht. Bewerbungen gespeichert; Benachrichtigung bleibt offen.');
  MailApp.sendEmail({to: recipients.join(','), subject: 'Neue Bewerbungen · Lkw-Reifenmonteur/in',
    body: pending.length + ' neue Bewerbung(en) sind zur Bearbeitung verfügbar.\n\n' +
      'https://docs.google.com/spreadsheets/d/' + PORTAL.spreadsheetId + '/edit\n\n' +
      'Bitte Zuständigkeit und Status in der gemeinsamen Tabelle pflegen.\nKeine Bewerberdaten im E-Mail-Text.', name: 'EUROMASTER Recruiting'});
  const stamp = new Date().toISOString();
  pending.forEach(x => sheet.getRange(x.row, 13).setValue(stamp));
  // A failure after sending but before marking can cause a repeated notification,
  // but never a second applicant row. Email delivery itself cannot be guaranteed.
}

function startAutomaticSync() {
  const p = config_();
  if (p.SYNC_ENABLED !== 'true') throw new Error('Erst nach Test und Freigabe SYNC_ENABLED auf true setzen.');
  syncApplications();
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'syncApplications')) {
    ScriptApp.newTrigger('syncApplications').timeBased().everyMinutes(5).create();
  }
  console.log('Automatischer Abruf eingerichtet. Ausführungen und Fehler regelmäßig prüfen.');
}

function pauseAutomaticSync() {
  PropertiesService.getScriptProperties().setProperty('SYNC_ENABLED', 'false');
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'syncApplications').forEach(t => ScriptApp.deleteTrigger(t));
}


// Run once after updating. Does not call Meta or send email.
function upgradeAnswerColumns() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Ein Abruf läuft gerade. Bitte erneut versuchen.');
  try {
    const sheet = SpreadsheetApp.openById(PORTAL.spreadsheetId).getSheetByName(PORTAL.sheetName);
    assertHeaders_(sheet);
    splitAnswerColumns_(sheet);
    console.log('Formularantworten auf eigene Spalten verteilt. Bearbeitungsdaten bleiben erhalten.');
  } finally { lock.releaseLock(); }
}

function parseAnswers_(raw) {
  const text = String(raw || '');
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data.map(f => ({
      name: String(f.name), value: (f.values || []).map(String).join(' | ')
    }));
  } catch (_) {}
  // Migration of the original readable snapshot. Split on the first colon only.
  const answers = [];
  text.split('\n').forEach(line => {
    const colon = line.indexOf(': ');
    if (colon > 0) answers.push({name: line.slice(0, colon), value: line.slice(colon + 2)});
    else if (answers.length) answers[answers.length - 1].value += '\n' + line;
  });
  return answers;
}

function questionHeading_(name) {
  // Keep the exact Meta field key as identity; only headings are made readable.
  const clean = name.replace(/_/g, ' ').trim();
  return clean ? clean[0].toLocaleUpperCase('de') + clean.slice(1) : 'Unbenannte Frage';
}

function splitAnswerColumns_(sheet) {
  if (sheet.getLastRow() < 2) return;
  const rows = sheet.getRange(2, 14, sheet.getLastRow() - 1, 1).getValues();
  const parsed = rows.map(r => parseAnswers_(r[0]));
  const skip = new Set(['first_name', 'full_name', 'email', 'phone_number']);
  const fields = [...new Set(parsed.flat().map(f => f.name).filter(n => !skip.has(n)))];
  if (!fields.length) return;
  let last = sheet.getLastColumn();
  const notes = sheet.getRange(1, 1, 1, last).getNotes()[0];
  const headers = sheet.getRange(1, 1, 1, last).getDisplayValues()[0];
  let changed = false;
  fields.forEach(name => {
    const identity = 'META_FIELD:' + name;
    let column = notes.indexOf(identity) + 1;
    if (!column) {
      // Refuse to claim a manually created column with the same heading.
      let heading = questionHeading_(name);
      if (headers.includes(heading)) heading += ' [Meta ' + name + ']';
      column = ++last;
      if (column > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), column - sheet.getMaxColumns());
      sheet.getRange(1, column).setValue(cellText_(heading)).setNote(identity)
        .setBackground('#008c43').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
      sheet.setColumnWidth(column, 230);
      notes[column - 1] = identity;
      headers[column - 1] = heading;
      changed = true;
    }
    const range = sheet.getRange(2, column, rows.length, 1);
    const current = range.getValues();
    let dirty = false;
    parsed.forEach((answers, i) => {
      const match = answers.find(f => f.name === name);
      if (match && current[i][0] === '') {
        current[i][0] = cellText_(match.value);
        dirty = true;
      }
    });
    if (dirty) range.setNumberFormat('@').setValues(current).setWrap(true);
  });
  // Preserve the full snapshot, but show the individual answers in the working view.
  sheet.hideColumns(14);
  const filter = sheet.getFilter();
  if (changed && filter) {
    // Preserve existing filters and sort order. Expand the filter manually if needed.
    console.log('Neue Antwortspalten hinzugefügt. Bestehende Filter wurden nicht verändert.');
  }
  SpreadsheetApp.flush();
}

if (typeof module !== 'undefined') module.exports = {PORTAL, cellText_, leadRow_, parseAnswers_, questionHeading_};

function testMetaConnection() {
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty('META_ACCESS_TOKEN');
  const version = p.getProperty('META_API_VERSION');
  if (!token || !/^v\d+\.0$/.test(version || '')) throw new Error('Token oder API-Version fehlt.');
  const response = UrlFetchApp.fetch('https://graph.facebook.com/' + version + '/' + PORTAL.formId + '/leads?fields=id,form_id&limit=1',
    {method: 'get', headers: {Authorization: 'Bearer ' + token}, muteHttpExceptions: true, followRedirects: false});
  const data = JSON.parse(response.getContentText());
  if (response.getResponseCode() !== 200 || data.error) throw new Error('Meta-Zugriff fehlgeschlagen. HTTP ' + response.getResponseCode() +
    ', Fehlercode ' + (data.error?.code || 'unbekannt') + ', Untercode ' + (data.error?.error_subcode || 'keiner'));
  if (!Array.isArray(data.data)) throw new Error('Unerwartete Meta-Antwort.');
  console.log('Verbindung erfolgreich. ' + (data.data.length ? 'Ein Lead ist abrufbar.' : 'Aktuell keine abrufbaren Leads vorhanden.'));
}
