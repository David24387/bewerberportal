const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../portal.js');
test('Only explicitly enabled page/form pairs can be imported',()=>{
 assert(C.allowedForm(C.FORMS,'DEMO-PAGE','DEMO-FORM-MECH-01'));
 assert.equal(C.allowedForm(C.FORMS,'OTHER-PAGE','DEMO-FORM-MECH-01'),null);
 assert.equal(C.allowedForm(C.FORMS,'DEMO-PAGE','NEW-UNAPPROVED'),null);
 assert.equal(C.allowedForm(C.FORMS,'DEMO-PAGE','DEMO-FORM-NEW-03'),null);
 assert.equal(C.allowedForm([{id:'x',pageId:'p',enabled:true,job:'',location:''}],'p','x'),null);
});
test('Due view includes today and overdue, excludes closed cases',()=>{
 const base={followUp:'2026-10-22',status:'Neu'};
 assert(C.due(base,'2026-10-22'));
 assert(C.due({...base,followUp:'2026-10-20'},'2026-10-22'));
 assert(!C.due({...base,followUp:'2026-10-23'},'2026-10-22'));
 assert(!C.due({...base,status:'Eingestellt'},'2026-10-22'));
 assert(!C.due({...base,status:'Abgesagt'},'2026-10-22'));
});
test('Combined filters preserve complete original question answers',()=>{
 const records=C.fixtures();
 const result=C.filterRecords(records,{location:'Stadtbergen',status:'Kontaktversuch',owner:'Recruiterin A',search:'Robin'});
 assert.equal(result.length,1);assert.equal(result[0].answers.length,5);
 assert.equal(result[0].answers[4].question,'Was machst du aktuell beruflich?');
 assert.equal(C.filterRecords(records,{search:'no-match'}).length,0);
 assert.equal(records.length,6);
});
test('Unknown future questions remain available and searchable',()=>{
 const record={...C.fixtures()[0],answers:[{question:'Neue Jobfrage?',answer:'Einzigartige Antwort'}]};
 const result=C.filterRecords([record],{search:'Einzigartige'});
 assert.equal(result[0].answers[0].question,'Neue Jobfrage?');
});
test('Updates preserve original application and add history only on changes',()=>{
 const r=C.fixtures()[0];
 const updated=C.applyUpdate(r,{status:'Im Gespräch',owner:'Recruiterin A',followUp:'2026-11-02'},'2026-10-22T12:00:00Z');
 assert.equal(r.status,'Neu');assert.equal(updated.answers,r.answers);
 assert.equal(updated.history.length,r.history.length+1);
 assert.equal(C.applyUpdate(updated,updated).history.length,updated.history.length);
 assert.throws(()=>C.applyUpdate(r,{status:'AUTO-REJECT',owner:'Recruiterin A',followUp:''}));
 assert.throws(()=>C.applyUpdate(r,{status:'Neu',owner:'Unknown',followUp:''}));
 assert.throws(()=>C.applyUpdate(r,{status:'Neu',owner:C.OWNERS[0],followUp:'2026-02-31'}));
});
test('Notes are retained independently of status and rendered escaped',()=>{
 const r=C.fixtures()[0],text='<img src=x onerror=alert(1)>';
 const updated=C.addNote(r,text,'2026-10-22T12:00:00Z');
 assert.equal(r.notes.length,0);assert.equal(updated.notes[0].text,text);
 assert(!C.esc(updated.notes[0].text).includes('<img'));
 assert.equal(C.addNote(r,'   '),r);
 assert.throws(()=>C.addNote(r,'x'.repeat(4001)));
});
test('All sample records are clearly fictional and retain input fields',()=>{
 for(const r of C.fixtures()){assert(r.id.startsWith('DEMO-LEAD-'));assert(r.firstName.includes('(Demo)'));assert(r.email.endsWith('@example.com'));assert(r.formId.startsWith('DEMO-'));assert.equal(r.answers.length,5)}
});
test('UI assets exist and prototype does not make remote requests',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../portal.js'),'utf8');
 assert(html.includes('id="formRegistry"'));assert(html.includes('id="detailDialog"'));
 assert(html.includes('Noch kein Login'));assert(!/fetch\s*\(/.test(js));
 for(const asset of ['styles.css','portal.js'])assert(fs.existsSync(path.join(__dirname,'..',asset)));
});
