/* Internal UI prototype. Synthetic records only; no Meta credentials or live intake. */
(function(root){
'use strict';
const STATUSES=['Neu','Kontaktversuch','Im Gespräch','An Fachbereich übergeben','Eingestellt','Abgesagt'];
const OWNERS=['Nicht zugewiesen','Amra','Vlada'];
const CLOSED=['Eingestellt','Abgesagt'];
const LKW_QUESTIONS=[
  {
    "id": "driving_license",
    "question": "Welchen Führerschein hast du?",
    "options": [
      "Klasse B (Auto)",
      "Klasse C1 (LKW bis 7,5 t)",
      "Klasse C/CE (LKW über 7,5 t)",
      "Keinen Führerschein"
    ]
  },
  {
    "id": "training",
    "question": "Hast du eine Ausbildung als KFZ-Mechatroniker oder etwas Vergleichbares?",
    "options": [
      "Ja",
      "Nein"
    ]
  },
  {
    "id": "truck_tire_experience",
    "question": "Hast du Erfahrung in der LKW-Reifenmontage?",
    "options": [
      "Ja",
      "Nein"
    ]
  },
  {
    "id": "experience",
    "question": "Wieviel Berufserfahrung hast du bereits?",
    "options": [
      "Berufseinsteiger",
      "1 - 4 Jahre",
      "4 - 10 Jahre",
      "Über 10 Jahre"
    ]
  },
  {
    "id": "contact_method",
    "question": "Über welchen Weg können wir dich am besten kontaktieren?",
    "options": [
      "E-Mail",
      "Telefon / Anruf"
    ]
  },
  {
    "id": "phone_availability",
    "question": "Wann können wir dich am besten telefonisch erreichen?",
    "options": [
      "Morgens",
      "Mittags",
      "Nachmittags",
      "Abends"
    ],
    "conditional": true
  },
  {
    "id": "location",
    "question": "Für welchen Standort interessierst du dich?",
    "options": [
      "77815/Bühl",
      "74076/Heilbronn"
    ]
  }
];
const QUESTIONS=LKW_QUESTIONS.map(q=>q.question);
const FORMS=[
 {id:'DEMO-FORM-LKW-01',pageId:'DEMO-PAGE',name:'Lkw-Reifenmonteur · Bühl / Heilbronn',job:'Lkw-Reifenmonteur/in',locationQuestionId:'location',locationOptions:['77815/Bühl','74076/Heilbronn'],questions:LKW_QUESTIONS,enabled:true},
 {id:'DEMO-FORM-NEW-03',pageId:'DEMO-PAGE',name:'Neues Formular · noch nicht freigegeben',job:'',location:'',enabled:false}
];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusClass=s=>'status-'+s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function offsetDate(days){const d=new Date();d.setDate(d.getDate()+days);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function due(record,day=today()){return !!record.followUp&&record.followUp<=day&&!CLOSED.includes(record.status)}
function allowedForm(forms,pageId,formId){return forms.find(f=>f.enabled&&f.id===formId&&f.pageId===pageId&&f.job&&(f.location||(f.locationQuestionId&&f.locationOptions?.length)))||null}
function filterRecords(records,filters={},day=today()){
 const query=String(filters.search||'').toLocaleLowerCase('de').trim();
 return records.filter(r=>(!filters.status||r.status===filters.status)&&(!filters.location||r.location===filters.location)&&(!filters.owner||r.owner===filters.owner)&&(!filters.due||due(r,day))&&(!query||[r.firstName,r.email,r.phone,r.job,r.location,...r.answers.map(a=>a.answer)].join(' ').toLocaleLowerCase('de').includes(query))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
function applyUpdate(record,update,at=new Date().toISOString()){
 if(!STATUSES.includes(update.status))throw Error('Ungültiger Status');
 if(!OWNERS.includes(update.owner))throw Error('Ungültige Zuständigkeit');
 if(update.followUp&&(!/^\d{4}-\d{2}-\d{2}$/.test(update.followUp)||new Date(update.followUp+'T00:00:00Z').toISOString().slice(0,10)!==update.followUp))throw Error('Ungültiges Datum');
 const changed=record.status!==update.status||record.owner!==update.owner||record.followUp!==update.followUp;
 return {...record,status:update.status,owner:update.owner,followUp:update.followUp,history:changed?[{at,text:'Bearbeitung aktualisiert: '+update.status+' · '+update.owner+(update.followUp?' · Wiedervorlage '+update.followUp:'')},...record.history]:record.history};
}
function addNote(record,text,at=new Date().toISOString()){
 const clean=String(text).trim();if(!clean)return record;
 if(clean.length>4000)throw Error('Notiz ist zu lang (maximal 4.000 Zeichen).');
 return {...record,notes:[{at,text:clean},...record.notes],history:[{at,text:'Interne Demo-Notiz hinzugefügt'},...record.history]};
}
function applicationLocation(form,answers){
 if(form.location)return form.location;
 const answer=answers.find(a=>a.fieldId===form.locationQuestionId)?.answer;
 return form.locationOptions?.includes(answer)?answer:'Standort fehlt – prüfen';
}
function fixtures(){
 const specs=[
 ['Alex','77815/Bühl','Neu','Nicht zugewiesen',0,'1 - 4 Jahre','Klasse B (Auto)','Ja','Ja','Telefon / Anruf','Nachmittags'],
 ['Robin','74076/Heilbronn','Kontaktversuch','Amra',0,'Über 10 Jahre','Klasse C/CE (LKW über 7,5 t)','Ja','Ja','Telefon / Anruf','Abends'],
 ['Kim','77815/Bühl','Im Gespräch','Vlada',1,'4 - 10 Jahre','Klasse C1 (LKW bis 7,5 t)','Nein','Ja','E-Mail',null],
 ['Charlie','74076/Heilbronn','An Fachbereich übergeben','Amra',2,'Berufseinsteiger','Klasse B (Auto)','Ja','Nein','E-Mail',null],
 ['Sam','77815/Bühl','Neu','Nicht zugewiesen',-1,'1 - 4 Jahre','Klasse B (Auto)','Nein','Ja','Telefon / Anruf','Morgens'],
 ['Jules','74076/Heilbronn','Eingestellt','Vlada',-2,'4 - 10 Jahre','Klasse C/CE (LKW über 7,5 t)','Ja','Ja','Telefon / Anruf','Mittags']
 ];
 return specs.map((s,i)=>{
 const at=new Date(Date.now()-i*19*60*60*1000).toISOString();
 const values=[s[6],s[7],s[8],s[5],s[9],s[10],s[1]];
 const answers=LKW_QUESTIONS.map((q,j)=>({fieldId:q.id,question:q.question,answer:values[j]??'',skipped:q.id==='phone_availability'&&s[9]==='E-Mail'}));
 return {id:'DEMO-LEAD-'+(i+1),firstName:s[0]+' (Demo)',email:s[0].toLowerCase()+'.demo@example.com',phone:'Nicht hinterlegt (Demo)',job:FORMS[0].job,location:applicationLocation(FORMS[0],answers),status:s[2],owner:s[3],followUp:i===0?'':offsetDate(s[4]),createdAt:at,formId:FORMS[0].id,answers,notes:[],history:[{at,text:'Fiktive Bewerbung für die Vorschau erstellt'}]};
 });
}
const core={STATUSES,OWNERS,FORMS,QUESTIONS,LKW_QUESTIONS,applicationLocation,esc,due,allowedForm,filterRecords,applyUpdate,addNote,fixtures};
if(typeof module!=='undefined'&&module.exports){module.exports=core;return}
root.PortalCore=core;
const $=id=>document.getElementById(id),KEY='euromaster-recruiting-demo-lkw-v2';
let records=fixtures(),forms=FORMS.map(f=>({...f})),view='all',selectedId=null;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&saved.schemaVersion===1&&Array.isArray(saved.records)&&saved.records.length===6&&saved.records.every(r=>typeof r.id==='string'&&r.id.startsWith('DEMO-LEAD-')&&STATUSES.includes(r.status)&&Array.isArray(r.answers)&&Array.isArray(r.notes)&&Array.isArray(r.history))){records=saved.records.map(r=>({...r,owner:({'Recruiterin A':'Amra','Recruiterin B':'Vlada'})[r.owner]||r.owner}));forms=FORMS.map(f=>({...f,enabled:typeof saved.forms?.find(s=>s.id===f.id)?.enabled==='boolean'?saved.forms.find(s=>s.id===f.id).enabled:f.enabled}))}}catch{}
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').hidden=true,4000)}
function save(){try{localStorage.setItem(KEY,JSON.stringify({schemaVersion:1,records,forms}));return true}catch{notify('Speichern im Browser nicht möglich. Änderungen gelten nur bis zum Neuladen.');return false}}
function date(v){return v?new Date(v.length===10?v+'T12:00:00':v).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'—'}
function stamp(v){return new Date(v).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})}
function options(values,selected=''){return values.map(v=>'<option value="'+esc(v)+'" '+(v===selected?'selected':'')+'>'+esc(v)+'</option>').join('')}
function badge(s){return '<span class="status-badge '+statusClass(s)+'">'+esc(s)+'</span>'}
$('statusFilter').innerHTML='<option value="">Alle Status</option>'+options(STATUSES);
$('locationFilter').innerHTML='<option value="">Alle Standorte</option>'+options([...new Set(records.map(r=>r.location))]);
$('ownerFilter').innerHTML='<option value="">Alle Recruiterinnen</option>'+options(OWNERS);
function render(){
 const filters={search:$('search').value,status:$('statusFilter').value,location:$('locationFilter').value,owner:$('ownerFilter').value,due:view==='due'};
 const visible=filterRecords(records,filters);
 $('statTotal').textContent=records.length;$('statNew').textContent=records.filter(r=>r.status==='Neu').length;
 $('statActive').textContent=records.filter(r=>!['Neu',...CLOSED].includes(r.status)).length;
 $('statDue').textContent=records.filter(r=>due(r)).length;$('navCount').textContent=records.length;$('dueCount').textContent=records.filter(r=>due(r)).length;
 $('resultCount').textContent=visible.length;$('emptyState').hidden=!!visible.length;
 $('applicationRows').innerHTML=visible.map(r=>'<tr><td><div class="candidate"><span class="avatar" aria-hidden="true">'+esc(r.firstName.slice(0,2).toUpperCase())+'</span><div><button data-open="'+esc(r.id)+'">'+esc(r.firstName)+'</button><small>'+date(r.createdAt)+' · Meta-Formular</small></div></div></td><td class="job"><strong>'+esc(r.job)+'</strong><small>'+esc(r.location)+'</small></td><td>'+esc(r.answers.find(a=>a.fieldId==='experience')?.answer||'Nicht angegeben')+'</td><td>'+badge(r.status)+'</td><td>'+esc(r.owner)+'</td><td class="'+(due(r)?'due':'')+'">'+date(r.followUp)+'</td><td><button class="open-row" data-open="'+esc(r.id)+'" aria-label="Bewerbung von '+esc(r.firstName)+' öffnen">›</button></td></tr>').join('');
 $('setupView').hidden=view!=='setup';$('applicationsView').hidden=view==='setup';
 $('pageTitle').textContent=view==='setup'?'Formulare & Meta':view==='due'?'Wiedervorlagen':'Bewerbungen';
 $('listTitle').textContent=view==='due'?'Fällige Wiedervorlagen':'Alle Bewerbungen';
 $('pageSubtitle').textContent=view==='setup'?'Nur ausdrücklich freigegebene Formulare übernehmen.':'Vom ersten Interesse zum persönlichen Gespräch.';
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 $('formRegistry').innerHTML='<div class="form-registry">'+forms.map(f=>'<div class="form-row '+(!f.enabled?'form-off':'')+'"><div><strong>'+esc(f.name)+'</strong><small>'+esc(f.id)+'<br>'+esc(f.job||'Stelle offen')+' · '+esc(f.location||f.locationOptions?.join(' / ')||'Standort offen')+'<br>'+(f.enabled?'In dieser Demo freigegeben':'Ausgeschlossen · keine Übernahme')+'</small></div><button class="button secondary" data-form="'+esc(f.id)+'">'+(f.enabled?'Demo pausieren':f.job&&(f.location||f.locationOptions?.length)?'Demo freigeben':'Nicht eingerichtet')+'</button></div>').join('')+'</div><p class="demo-meta">Die IDs sind fiktiv. Hier werden keine echten Formulare entdeckt, freigeschaltet oder abgerufen. Ein neues Formular benötigt im Produktivsystem eine explizite Freigabe mit Seiten-ID, Formular-ID, Stelle und Standort.</p>';
}
function openDetail(id){
 const r=records.find(x=>x.id===id);if(!r)return;selectedId=id;
 $('detailName').textContent=r.firstName;$('detailJob').textContent=r.job+' · '+r.location;
 $('detailBody').innerHTML='<section class="detail-section"><h3>Kontakt</h3><div class="contact-grid"><div><span class="detail-label">E-Mail</span><a href="mailto:'+esc(r.email)+'">'+esc(r.email)+'</a></div><div><span class="detail-label">Telefon</span><span>'+esc(r.phone)+'</span></div></div></section>'+
 '<section class="detail-section"><h3>Antworten aus dem Meta-Formular</h3><dl>'+r.answers.map(a=>'<div class="qa"><dt>'+esc(a.question)+'</dt><dd>'+esc(a.skipped?'Nicht abgefragt (Kontakt per E-Mail)':a.answer||'Nicht angegeben')+'</dd></div>').join('')+'</dl></section>'+
 '<section class="detail-section"><h3>Bearbeitung</h3><form id="editApplication"><div class="edit-grid"><label>Status<select id="editStatus">'+options(STATUSES,r.status)+'</select></label><label>Zuständig<select id="editOwner">'+options(OWNERS,r.owner)+'</select></label><label>Wiedervorlage<input id="editDue" type="date" value="'+esc(r.followUp)+'"></label></div><button class="button primary save-button">Bearbeitung speichern</button></form></section>'+
 '<section class="detail-section"><h3>Interne Notizen</h3><form id="noteForm"><textarea id="noteText" class="note-input" placeholder="Demo-Notiz hinzufügen …" aria-label="Interne Demo-Notiz" maxlength="4000" required></textarea><button class="button secondary save-button">Notiz hinzufügen</button></form>'+r.notes.map(n=>'<div class="note-item"><small>'+stamp(n.at)+' · Demo-Bearbeitung</small>'+esc(n.text)+'</div>').join('')+'</section>'+
 '<section class="detail-section"><h3>Bearbeitungsverlauf</h3><ul class="history">'+r.history.map(h=>'<li><time>'+stamp(h.at)+'</time>'+esc(h.text)+'</li>').join('')+'</ul></section><div class="demo-meta">Formular: '+esc(r.formId)+'<br>Lead-ID: '+esc(r.id)+'<br>Eingang: '+stamp(r.createdAt)+'<br>Ausschließlich fiktive Daten · keine Nachrichten werden versendet.</div>';
 $('editApplication').addEventListener('submit',e=>{e.preventDefault();try{const updated=applyUpdate(r,{status:$('editStatus').value,owner:$('editOwner').value,followUp:$('editDue').value});records=records.map(x=>x.id===id?updated:x);const ok=save();render();openDetail(id);if(ok)notify('Bearbeitung lokal gespeichert.')}catch(error){notify(error.message)}});
 $('noteForm').addEventListener('submit',e=>{e.preventDefault();try{const updated=addNote(records.find(x=>x.id===id),$('noteText').value);records=records.map(x=>x.id===id?updated:x);const ok=save();render();openDetail(id);if(ok)notify('Demo-Notiz lokal gespeichert.')}catch(error){notify(error.message)}});
 if(!$('detailDialog').open)$('detailDialog').showModal();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render()}));
['search','statusFilter','locationFilter','ownerFilter'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
$('clearFilters').addEventListener('click',()=>{['search','statusFilter','locationFilter','ownerFilter'].forEach(id=>$(id).value='');render()});
$('applicationRows').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)openDetail(b.dataset.open)});
$('closeDetail').addEventListener('click',()=>$('detailDialog').close());
$('detailDialog').addEventListener('click',e=>{if(e.target===$('detailDialog'))$('detailDialog').close()});
$('formRegistry').addEventListener('click',e=>{const b=e.target.closest('[data-form]');if(!b)return;const f=forms.find(f=>f.id===b.dataset.form);if(!f.job||!(f.location||f.locationQuestionId&&f.locationOptions?.length)){notify('Neue Formulare erst nach Zuordnung und ausdrücklicher Freigabe aktivieren.');return}f.enabled=!f.enabled;save();render();notify('Nur Demo-Einstellung geändert. Vorhandene Bewerbungen bleiben erhalten.')});
$('resetDemo').addEventListener('click',()=>{if(!confirm('Lokale Demo-Änderungen und Notizen zurücksetzen?'))return;records=fixtures();forms=FORMS.map(f=>({...f}));save();$('detailDialog').close();render();notify('Fiktive Ausgangsdaten wiederhergestellt.')});
render();
})(typeof globalThis!=='undefined'?globalThis:this);

