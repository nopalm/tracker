const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const STORE='ruang-tumbuh-data';
let state=JSON.parse(localStorage.getItem(STORE)||'null')||{goals:[{id:1,name:'100 juta pertama',subgoals:[{id:11,name:'10 jt pertama',target:10000000,current:0},{id:12,name:'20 jt pertama',target:20000000,current:0}]},{id:2,name:'Sehat & kuat',subgoals:[{id:21,name:'Konsisten workout',target:30,current:0}]}],tasks:[]};
const dayKey=d=>new Date(d||Date.now()).toISOString().slice(0,10),today=dayKey();
const save=()=>localStorage.setItem(STORE,JSON.stringify(state));
const fmt=n=>new Intl.NumberFormat('id-ID').format(Number(n)||0);
const pct=(a,b)=>b?Math.min(100,Math.round(a/b*100)):0;
const escapeHTML=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function progress(goal){let target=goal.subgoals.reduce((a,s)=>a+Number(s.target),0),current=goal.subgoals.reduce((a,s)=>a+Number(s.current),0);return{target,current,pct:pct(current,target)}}
function goalHTML(g){let p=progress(g);return `<article class="goal-card"><div class="goal-card-head"><div><h3>${escapeHTML(g.name)}</h3><p>${fmt(p.current)} / ${fmt(p.target)} target</p></div><strong>${p.pct}%</strong></div><div class="progress-track"><i style="width:${p.pct}%"></i></div><div class="subgoals">${g.subgoals.map(s=>`<div class="subgoal"><span>${escapeHTML(s.name)}</span><span>${fmt(s.current)} / ${fmt(s.target)}</span></div>`).join('')}</div></article>`}
function taskHTML(t){let g=state.goals.find(g=>g.id===Number(t.goalId));return `<article class="task-card ${t.done?'done':''}"><input data-task-check="${t.id}" type="checkbox" ${t.done?'checked':''} aria-label="Selesai"><div class="task-content"><h3>${escapeHTML(t.name)}</h3><p>${g?escapeHTML(g.name):'Tanpa goal'}</p></div><button class="delete-button" data-delete-task="${t.id}" aria-label="Hapus tugas">×</button></article>`}
function render(){
 let tasks=state.tasks.filter(t=>t.date===today),done=tasks.filter(t=>t.done).length,totalTasks=state.tasks.length,doneAll=state.tasks.filter(t=>t.done).length;
 $('#todayLabel').textContent=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
 $('#taskDate').textContent=new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date());
 $('#todayPercent').textContent=`${pct(done,tasks.length)}%`;$('#todaySummary').textContent=tasks.length?`${done} dari ${tasks.length} tugas selesai`:'Tambah tugas pertamamu';$('#todayBar').style.width=`${pct(done,tasks.length)}%`;
 $('#goalCount').textContent=state.goals.length;$('#doneCount').textContent=doneAll;$('#overallPercent').textContent=`${pct(doneAll,totalTasks)}%`;
 $('#taskList').innerHTML=tasks.length?tasks.map(taskHTML).join(''):'<div class="empty">Belum ada tugas untuk hari ini.<br>Tekan + untuk mulai.</div>';
 let cards=state.goals.map(goalHTML).join('');$('#goalSummary').innerHTML=cards||'<div class="empty">Belum ada goal.</div>';$('#goalList').innerHTML=cards||'<div class="empty">Tambah goal pertamamu dengan tombol +.</div>';
 let chart=[];for(let i=6;i>=0;i--){let d=new Date();d.setDate(d.getDate()-i);let ts=state.tasks.filter(t=>t.date===dayKey(d)),v=pct(ts.filter(t=>t.done).length,ts.length);chart.push(`<div class="day-bar"><i style="height:${Math.max(v,3)}%"></i><span>${new Intl.DateTimeFormat('id-ID',{weekday:'narrow'}).format(d)}</span></div>`)}$('#weekChart').innerHTML=chart.join('');
}
function showForm(type){let options=state.goals.map(g=>`<option value="${g.id}">${escapeHTML(g.name)}</option>`).join('');
 $('#dialogTitle').textContent=type==='task'?'Tambah tugas harian':'Tambah goal';
 $('#formFields').innerHTML=type==='task'?`<div class="field"><label>Nama tugas</label><input name="name" required placeholder="Contoh: Workout 30 menit"></div><div class="field"><label>Terhubung ke goal</label><select name="goalId"><option value="">Tanpa goal</option>${options}</select></div>`:`<div class="field"><label>Nama goal</label><input name="name" required placeholder="Contoh: Dana darurat"></div><div class="field"><label>Sub-goal pertama</label><input name="subgoal" required placeholder="Contoh: Tabung 10 juta"></div><div class="field"><label>Target angka</label><input name="target" required min="1" type="number" placeholder="10000000"></div>`;
 $('#entryForm').dataset.type=type;$('#entryDialog').showModal();
}
$('#entryForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;let f=new FormData(e.currentTarget),type=e.currentTarget.dataset.type;if(type==='task')state.tasks.push({id:Date.now(),name:f.get('name'),goalId:f.get('goalId'),date:today,done:false});else{let id=Date.now();state.goals.push({id,name:f.get('name'),subgoals:[{id:id+1,name:f.get('subgoal'),target:Number(f.get('target')),current:0}]})}save();render()});
$('#addTaskButton').onclick=()=>showForm('task');$('#addGoalButton').onclick=()=>showForm('goal');
document.addEventListener('click',e=>{let nav=e.target.closest('[data-nav]')?.dataset.nav;if(nav){$$('.view').forEach(v=>v.classList.toggle('active',v.id===nav));$$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===nav));window.scrollTo(0,0)}let id=e.target.dataset.taskCheck;if(id){let t=state.tasks.find(t=>t.id===Number(id));t.done=e.target.checked;save();render()}let del=e.target.dataset.deleteTask;if(del){state.tasks=state.tasks.filter(t=>t.id!==Number(del));save();render()}});
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installButton').hidden=false});$('#installButton').onclick=async()=>{installPrompt?.prompt();await installPrompt?.userChoice;$('#installButton').hidden=true};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');render();
