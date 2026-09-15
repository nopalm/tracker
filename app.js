const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

// GUNAKAN PROJECT URL INI (Bukan URL halaman dashboard browser)
const SUPABASE_URL = 'https://trqzrvrvvcdfzhhruodk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycXpydnJ2dmNkZnpoaHJ1b2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NDczNzAsImV4cCI6MjEwNTAyMzM3MH0.QlQLN275qdqFxS1bHa_sPGfDGmEz7CQZlhSVfK38Nes'; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let state = { goals: [], tasks: [], chartRange: { weekChart: 'week', dashboardChart: 'week' } };

const dayKey = d => new Date(d || Date.now()).toISOString().slice(0, 10), today = dayKey();
const fmt = n => new Intl.NumberFormat('id-ID').format(Number(n) || 0);
const pct = (a, b) => b ? Math.min(100, Math.round(a / b * 100)) : 0;
const escapeHTML = s => String(s).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function progress(goal) {
    let subgoals = goal.subgoals || [];
    let target = subgoals.reduce((a, s) => a + Number(s.target), 0),
        current = subgoals.reduce((a, s) => a + Number(s.current), 0);
    return { target, current, pct: pct(current, target) };
}

function goalHTML(g, opts = {}) {
    let p = progress(g);
    let subgoalsHTML = (g.subgoals || []).map(s => `<div class="subgoal"><span>${escapeHTML(s.name)}</span><span>${fmt(s.current)} / ${fmt(s.target)}</span></div>`).join('');
    let deleteBtn = opts.withDelete ? `<button class="delete-button" data-delete-goal="${g.id}" aria-label="Hapus goal">×</button>` : '';
    return `<article class="goal-card"><div class="goal-card-head"><div><h3>${escapeHTML(g.name)}</h3><p>${fmt(p.current)} / ${fmt(p.target)} target</p></div><div class="goal-card-actions"><strong>${p.pct}%</strong>${deleteBtn}</div></div><div class="progress-track"><i style="width:${p.pct}%"></i></div><div class="subgoals">${subgoalsHTML}</div></article>`;
}

function chartSeries(mode) {
    if (mode === 'month') {
        let weeks = [];
        for (let w = 3; w >= 0; w--) {
            let dates = [];
            for (let d = 6; d >= 0; d--) {
                let day = new Date();
                day.setDate(day.getDate() - (w * 7 + d));
                dates.push(dayKey(day));
            }
            let ts = state.tasks.filter(t => dates.includes(t.task_date));
            weeks.push({ label: `M${4 - w}`, value: pct(ts.filter(t => t.done).length, ts.length) });
        }
        return weeks;
    }
    let days = [];
    for (let i = 6; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let dKey = dayKey(d);
        let ts = state.tasks.filter(t => t.task_date === dKey);
        days.push({ label: new Intl.DateTimeFormat('id-ID', { weekday: 'narrow' }).format(d), value: pct(ts.filter(t => t.done).length, ts.length) });
    }
    return days;
}

function chartBarsHTML(mode) {
    return chartSeries(mode).map(p => `<div class="day-bar"><i style="height:${Math.max(p.value, 3)}%"></i><span>${escapeHTML(p.label)}</span></div>`).join('');
}

function chartToggleHTML(target, active) {
    return `<div class="chart-toggle" role="group" aria-label="Rentang grafik">
        <button type="button" class="toggle-btn ${active === 'week' ? 'active' : ''}" data-chart-target="${target}" data-chart-range="week">Per minggu</button>
        <button type="button" class="toggle-btn ${active === 'month' ? 'active' : ''}" data-chart-target="${target}" data-chart-range="month">Per bulan</button>
    </div>`;
}

function taskHTML(t) {
    let g = state.goals.find(g => g.id === t.goal_id);
    return `<article class="task-card ${t.done ? 'done' : ''}"><input data-task-check="${t.id}" type="checkbox" ${t.done ? 'checked' : ''} aria-label="Selesai"><div class="task-content"><h3>${escapeHTML(t.name)}</h3><p>${g ? escapeHTML(g.name) : 'Tanpa goal'}</p></div><button class="delete-button" data-delete-task="${t.id}" aria-label="Hapus tugas">×</button></article>`;
}

function render() {
    let tasks = state.tasks.filter(t => t.task_date === today),
        done = tasks.filter(t => t.done).length,
        totalTasks = state.tasks.length,
        doneAll = state.tasks.filter(t => t.done).length;

    $('#todayLabel').textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    $('#taskDate').textContent = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    $('#todayPercent').textContent = `${pct(done, tasks.length)}%`;
    $('#todaySummary').textContent = tasks.length ? `${done} dari ${tasks.length} tugas selesai` : 'Tambah tugas pertamamu';
    $('#todayBar').style.width = `${pct(done, tasks.length)}%`;
    $('#goalCount').textContent = state.goals.length;
    $('#doneCount').textContent = doneAll;
    $('#overallPercent').textContent = `${pct(doneAll, totalTasks)}%`;

    $('#taskList').innerHTML = tasks.length ? tasks.map(taskHTML).join('') : '<div class="empty">Belum ada tugas untuk hari ini.<br>Tekan + untuk mulai.</div>';
    $('#goalSummary').innerHTML = state.goals.map(g => goalHTML(g)).join('') || '<div class="empty">Belum ada goal.</div>';
    $('#goalList').innerHTML = state.goals.map(g => goalHTML(g, { withDelete: true })).join('') || '<div class="empty">Tambah goal pertamamu dengan tombol +.</div>';

    $('#dashboardChartToggle').innerHTML = chartToggleHTML('dashboardChart', state.chartRange.dashboardChart);
    $('#dashboardChart').innerHTML = chartBarsHTML(state.chartRange.dashboardChart);

    $('#insightsChartToggle').innerHTML = chartToggleHTML('weekChart', state.chartRange.weekChart);
    $('#weekChart').innerHTML = chartBarsHTML(state.chartRange.weekChart);
}

async function loadData() {
    const { data: goalsData, error: goalError } = await supabaseClient.from('goals').select('*, subgoals(*)');
    const { data: tasksData, error: taskError } = await supabaseClient.from('daily_tasks').select('*');
    
    if (goalError) console.error("Goal Error:", goalError);
    if (taskError) console.error("Task Error:", taskError);
    
    if (!goalError && goalsData) state.goals = goalsData;
    if (!taskError && tasksData) state.tasks = tasksData;
    render();
}

function showForm(type) {
    let options = state.goals.map(g => `<option value="${g.id}">${escapeHTML(g.name)}</option>`).join('');
    $('#dialogTitle').textContent = type === 'task' ? 'Tambah tugas harian' : 'Tambah goal';
    $('#formFields').innerHTML = type === 'task' ? 
        `<div class="field"><label>Nama tugas</label><input name="name" required placeholder="Contoh: Workout 30 menit"></div><div class="field"><label>Terhubung ke goal</label><select name="goalId"><option value="">Tanpa goal</option>${options}</select></div>` : 
        `<div class="field"><label>Nama goal</label><input name="name" required placeholder="Contoh: Dana darurat"></div><div class="field"><label>Sub-goal pertama</label><input name="subgoal" required placeholder="Contoh: Tabung 10 juta"></div><div class="field"><label>Target angka</label><input name="target" required min="1" type="number" placeholder="10000000"></div>`;
    $('#entryForm').dataset.type = type;
    $('#entryDialog').showModal();
}

$('#entryForm').addEventListener('submit', async e => {
    if (e.submitter?.value === 'cancel') return;
    let f = new FormData(e.currentTarget), type = e.currentTarget.dataset.type;

    if (type === 'task') {
        let newTask = {
            name: f.get('name'),
            goal_id: f.get('goalId') || null,
            task_date: today,
            done: false
        };
        const { data, error } = await supabaseClient.from('daily_tasks').insert([newTask]).select();
        if (!error && data) {
            state.tasks.push(data[0]);
            render();
        } else {
            console.error("Insert Task Error:", error);
        }
    } else {
        let newGoal = { name: f.get('name') };
        const { data: goalData, error: goalError } = await supabaseClient.from('goals').insert([newGoal]).select();
        
        if (!goalError && goalData) {
            let createdGoal = goalData[0];
            let newSubgoal = {
                goal_id: createdGoal.id,
                name: f.get('subgoal'),
                target: Number(f.get('target')),
                current: 0
            };
            const { data: subData, error: subError } = await supabaseClient.from('subgoals').insert([newSubgoal]).select();
            
            if (!subError && subData) {
                createdGoal.subgoals = subData;
                state.goals.push(createdGoal);
                render();
            } else {
                console.error("Insert Subgoal Error:", subError);
            }
        } else {
            console.error("Insert Goal Error:", goalError);
        }
    }
});

$('#addTaskButton').onclick = () => showForm('task');
$('#addGoalButton').onclick = () => showForm('goal');

document.addEventListener('click', async e => {
    let nav = e.target.closest('[data-nav]')?.dataset.nav;
    if (nav) {
        $$('.view').forEach(v => v.classList.toggle('active', v.id === nav));
        $$('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === nav));
        window.scrollTo(0, 0);
    }
    
    let id = e.target.dataset.taskCheck;
    if (id) {
        let t = state.tasks.find(t => t.id == id);
        if (t) {
            t.done = e.target.checked;
            await supabaseClient.from('daily_tasks').update({ done: t.done }).eq('id', id);
            render();
        }
    }
    
    let del = e.target.dataset.deleteTask;
    if (del) {
        state.tasks = state.tasks.filter(t => t.id != del);
        await supabaseClient.from('daily_tasks').delete().eq('id', del);
        render();
    }

    let rangeBtn = e.target.closest('[data-chart-range]');
    if (rangeBtn) {
        state.chartRange[rangeBtn.dataset.chartTarget] = rangeBtn.dataset.chartRange;
        render();
    }

    let delGoal = e.target.dataset.deleteGoal;
    if (delGoal) {
        if (confirm('Hapus goal ini beserta seluruh sub-goalnya?')) {
            await supabaseClient.from('subgoals').delete().eq('goal_id', delGoal);
            await supabaseClient.from('goals').delete().eq('id', delGoal);
            state.goals = state.goals.filter(g => g.id != delGoal);
            render();
        }
    }
});

loadData();