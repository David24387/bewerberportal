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
    fields.email || '', fields.phone_number || '', 'Neu', 'Nicht zugewiesen', '', '', '', answers].map(cellText_);
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

if (typeof module !== 'undefined') module.exports = {PORTAL, cellText_, leadRow_};
