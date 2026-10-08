const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../黄老师工作台.html'),'utf8');
for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const source=html.slice(html.indexOf('let seatSt='),html.indexOf('function seatProject('));
function setup(cols,rows,special=0,byGroup=true){
  const students=Array.from({length:cols*rows-1},(_,i)=>({id:'s'+i,group:'g'+Math.floor(i/rows),special:i%rows===0&&i/rows<special}));
  const matrix=Array.from({length:cols},(_,c)=>Array.from({length:rows},(_,r)=>students[c*rows+r]?.id||null));
  const ctx={db:{students,seat:{groups:matrix.map((_,c)=>'g'+c),matrix,rows}},saved:0,rendered:0,msg:'',save(){ctx.saved++},render(){ctx.rendered++},toast(s){ctx.msg=s},esc:s=>s};
  vm.createContext(ctx);vm.runInContext(source,ctx);vm.runInContext(`seatSt={groups:${cols},rows:${rows},byGroup:${byGroup},front:true,_init:1}`,ctx);return ctx;
}
function zone(i,n){return Math.sign(i-(n-1)/2)||0;}
function locations(seat){const out={};seat.matrix.forEach((col,c)=>col.forEach((id,r)=>{if(id)out[id]={c,r};}));return out;}
let checks=0;
for(const [cols,rows,sp,group] of [[8,7,0,true],[8,7,3,true],[8,7,3,false],[7,7,0,true],[8,6,2,false],[2,2,0,true]]){
  const ctx=setup(cols,rows,sp,group);let first;
  for(let n=0;n<40;n++){
    const before=locations(ctx.db.seat);ctx.seatRearrange();assert.equal(ctx.db.seatHistory?.length,n+1,ctx.msg);
    const after=locations(ctx.db.seat);assert.equal(Object.keys(after).length,ctx.db.students.length);
    assert.equal(ctx.db.seat.matrix.flat().filter(Boolean).length,ctx.db.students.length);
    const colMap={};
    ctx.db.students.forEach(s=>{
      assert.equal(zone(after[s.id].c,cols),-zone(before[s.id].c,cols)||0);
      if(!s.special)assert.equal(zone(after[s.id].r,rows),-zone(before[s.id].r,rows)||0);
      else assert(after[s.id].r>=Math.max(0,rows-5));
      if(group){if(colMap[before[s.id].c]!==undefined)assert.equal(after[s.id].c,colMap[before[s.id].c]);colMap[before[s.id].c]=after[s.id].c;}
    });
    if(!n)first=JSON.stringify(ctx.db.seatHistory[0]);else assert.equal(JSON.stringify(ctx.db.seatHistory[0]),first);
    checks++;
  }
  assert.equal(ctx.rendered,40);assert.equal(ctx.saved,40);assert(ctx.seatHistoryHTML().includes('40次'));
}
const ctx=setup(8,7);
assert.equal(ctx.seatNextMonth(new Date(2026,0,31)),'2026-02-28');
assert.equal(ctx.seatNextMonth(new Date(2028,0,31)),'2028-02-29');
assert.equal(ctx.seatNextMonth(new Date(2026,11,31)),'2027-01-31');
assert.equal(ctx.seatNextMonth(new Date(2026,9,8)),'2026-11-08');
const old=JSON.stringify(ctx.db.seat);ctx.seatSet('byGroup',false);assert.equal(JSON.stringify(ctx.db.seat),old);assert.equal(ctx.db.seatOptions.byGroup,false);
ctx.db.students.push({id:'extra1'},{id:'extra2'});ctx.seatRearrange();assert.equal(JSON.stringify(ctx.db.seat),old);assert(!ctx.db.seatHistory);assert(ctx.msg.includes('无法满足'));
const impossible=setup(8,7);impossible.db.students.forEach(s=>s.special=true);const previous=JSON.stringify(impossible.db.seat);impossible.seatRearrange();assert.equal(JSON.stringify(impossible.db.seat),previous);assert(!impossible.db.seatHistory);assert(impossible.msg.includes('冲突'));
const empty=setup(8,7);empty.db.students=[];empty.seatRearrange();assert.equal(empty.msg,'请先添加学生');assert(!empty.db.seatHistory);
const outcomes=new Set();for(let i=0;i<12;i++){const c=setup(8,7);c.seatRearrange();outcomes.add(JSON.stringify(c.db.seat.matrix));}assert(outcomes.size>1);
const view=setup(8,7);view.db.students.forEach(s=>s.name='Student '+s.id);view.seatRearrange();
let sheet;view.openSheet=options=>{sheet=options;};const snapshot=JSON.stringify(view.db),saved=view.saved;
for(const side of ['before','after']){
  view.seatHistoryView(0,side);assert(sheet.title.includes(side==='before'?'换座前':'换座后'));
  const ids=view.db.seatHistory[0][side].matrix[0].filter(Boolean);let position=-1;
  for(const id of ids){const next=sheet.body.indexOf('Student '+id+'<');assert(next>position);position=next;}
  assert(!sheet.body.includes('onclick='));assert.equal(JSON.stringify(view.db),snapshot);assert.equal(view.saved,saved);
}
view.db.students=[];view.seatHistoryView(0,'before');assert(sheet.body.includes('Student s0<'));
view.seatHistoryView(0,'invalid');assert.equal(view.msg,'这次记录没有保存座位表');
const legacy=setup(8,7);legacy.db.students.forEach(s=>s.name='Legacy '+s.id);legacy.seatRearrange();delete legacy.db.seatHistory[0].students;legacy.openSheet=options=>{sheet=options;};legacy.seatHistoryView(0,'before');assert(sheet.body.includes('Legacy s0<'));
console.log(`PASS: ${checks} consecutive rearrangements, random outcomes, opposite zones, intact groups, special first 5 rows, roster integrity, history snapshots, month-end dates, and failure preservation.`);
console.log('PASS: before/after history viewers, read-only viewing, stored names after roster removal, and legacy history compatibility.');
