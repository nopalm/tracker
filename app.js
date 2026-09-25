const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

// GUNAKAN PROJECT URL INI (Bukan URL halaman dashboard browser)
const SUPABASE_URL = 'https://trqzrvrvvcdfzhhruodk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycXpydnJ2dmNkZnpoaHJ1b2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NDczNzAsImV4cCI6MjEwNTAyMzM3MH0.QlQLN275qdqFxS1bHa_sPGfDGmEz7CQZlhSVfK38Nes'; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let state = { goals: [], tasks: [], logs: [], chartRange: { weekChart: 'day', dashboardChart: 'day' } };

const UNITS = [
    { value: 'angka', label: 'Angka' },
    { value: 'rupiah', label: 'Rupiah' },
    { value: 'kg', label: 'Kg' },
    { value: 'gram', label: 'Gram' },
    { value: 'meter', label: 'Meter' },
    { value: 'km', label: 'Km' },
    { value: 'liter', label: 'Liter' },
    { value: 'menit', label: 'Menit' },
    { value: 'jam', label: 'Jam' },
    { value: 'kali', label: 'Kali' },
];
const unitLabel = v => UNITS.find(u => u.value === v)?.label || 'Angka';

// Alias kata satuan yang biasa dipakai orang saat mengetik cepat, dipetakan ke UNITS di atas.
const UNIT_ALIASES = {
    menit: 'menit', min: 'menit', mnt: 'menit',
    jam: 'jam', j: 'jam',
    km: 'km', kilometer: 'km',
    meter: 'meter', mtr: 'meter',
    kg: 'kg', kilogram: 'kg',
    gram: 'gram', gr: 'gram',
    liter: 'liter', ltr: 'liter',
    kali: 'kali', x: 'kali',
    rupiah: 'rupiah', rp: 'rupiah',
};

// Mengambil angka + satuan dari teks bebas, contoh: "Joging 45 menit" -> { activity: "Joging", amount: 45, unit: "menit" }
function parseLogText(text) {
    text = String(text || '').trim();
    let m = text.match(/^(.*?)[\s,:\-]*([\d]+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\s*$/);
    if (!m || !m[2]) return { activity: text, amount: null, unit: null };
    let name = m[1].trim() || text;
    let amount = Number(m[2].replace(',', '.'));
    let unitKey = m[3] ? (UNIT_ALIASES[m[3].toLowerCase()] || m[3].toLowerCase()) : null;
    if (unitKey && !UNITS.find(u => u.value === unitKey)) unitKey = 'angka';
    return { activity: name, amount, unit: unitKey || 'angka' };
}

const dayKey = d => new Date(d || Date.now()).toISOString().slice(0, 10), today = dayKey();
const fmt = n => new Intl.NumberFormat('id-ID').format(Number(n) || 0);
const pct = (a, b) => b ? Math.min(100, Math.round(a / b * 100)) : 0;
const escapeHTML = s => String(s).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function progress(goal) {
    let subgoals = goal.subgoals || [];
    let total = subgoals.length;
    let doneCount = subgoals.filter(s => s.done).length;
    return { total, doneCount, pct: pct(doneCount, total) };
}

function goalHTML(g, opts = {}) {
    let p = progress(g);
    let subgoalsHTML = (g.subgoals || []).map(s => `<div class="subgoal">
        <label class="subgoal-check">
            <input type="checkbox" data-subgoal-check="${s.id}" ${s.done ? 'checked' : ''} aria-label="Tandai sub-goal selesai">
            <span class="subgoal-name">${escapeHTML(s.name)}</span>
        </label>
        <span class="subgoal-value">${fmt(s.target)} ${escapeHTML(unitLabel(s.unit))}</span>
        ${opts.withDelete ? `<button class="delete-button" data-delete-subgoal="${s.id}" aria-label="Hapus sub-goal">×</button>` : ''}
    </div>`).join('');
    let addSubgoalBtn = opts.withDelete ? `<button class="text-button small" data-add-subgoal="${g.id}" type="button">+ Sub-goal</button>` : '';
    let deleteBtn = opts.withDelete ? `<button class="delete-button" data-delete-goal="${g.id}" aria-label="Hapus goal">×</button>` : '';
    return `<article class="goal-card"><div class="goal-card-head"><div><h3>${escapeHTML(g.name)}</h3><p>${p.doneCount} / ${p.total} sub-goal selesai</p></div><div class="goal-card-actions"><strong>${p.pct}%</strong>${deleteBtn}</div></div><div class="progress-track"><i style="width:${p.pct}%"></i></div><div class="subgoals">${subgoalsHTML}${addSubgoalBtn}</div></article>`;
}

function chartSeries(mode) {
    if (mode === 'month') {
        let months = [];
        for (let m = 5; m >= 0; m--) {
            let d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - m);
            let monthKey = d.toISOString().slice(0, 7);
            let count = state.tasks.filter(t => t.done && (t.task_date || '').slice(0, 7) === monthKey).length;
            months.push({ label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d), value: count });
        }
        return months;
    }
    if (mode === 'week') {
        let weeks = [];
        for (let w = 7; w >= 0; w--) {
            let dates = [];
            for (let d = 6; d >= 0; d--) {
                let day = new Date();
                day.setDate(day.getDate() - (w * 7 + d));
                dates.push(dayKey(day));
            }
            let weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
            let count = state.tasks.filter(t => t.done && dates.includes(t.task_date)).length;
            weeks.push({ label: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(weekStart), value: count });
        }
        return weeks;
    }
    let days = [];
    for (let i = 6; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let dKey = dayKey(d);
        let count = state.tasks.filter(t => t.done && t.task_date === dKey).length;
        days.push({ label: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d), value: count });
    }
    return days;
}

function chartBarsHTML(mode) {
    let series = chartSeries(mode);
    let max = Math.max(1, ...series.map(p => p.value));
    return series.map(p => `<div class="day-bar"><span class="day-bar-value">${fmt(p.value)}</span><i style="height:${p.value > 0 ? Math.max(Math.round(p.value / max * 100), 8) : 3}%"></i><span>${escapeHTML(p.label)}</span></div>`).join('');
}

function chartToggleHTML(target, active) {
    return `<div class="chart-toggle" role="group" aria-label="Rentang grafik">
        <button type="button" class="toggle-btn ${active === 'day' ? 'active' : ''}" data-chart-target="${target}" data-chart-range="day">Per hari</button>
        <button type="button" class="toggle-btn ${active === 'week' ? 'active' : ''}" data-chart-target="${target}" data-chart-range="week">Per minggu</button>
        <button type="button" class="toggle-btn ${active === 'month' ? 'active' : ''}" data-chart-target="${target}" data-chart-range="month">Per bulan</button>
    </div>`;
}

function taskHTML(t) {
    let g = state.goals.find(g => g.id === t.goal_id);
    let parsed = parseLogText(t.name);
    let valueLabel = (parsed.amount !== null && parsed.amount !== undefined) ? `${fmt(parsed.amount)} ${unitLabel(parsed.unit)}` : '';
    return `<article class="task-card ${t.done ? 'done' : ''}"><input data-task-check="${t.id}" type="checkbox" ${t.done ? 'checked' : ''} aria-label="Selesai"><div class="task-content"><h3>${escapeHTML(t.name)}</h3><p>${g ? escapeHTML(g.name) : (valueLabel ? escapeHTML(valueLabel) : 'Tanpa goal')}</p></div><div class="log-entry-actions"><button class="text-button small" data-edit-task="${t.id}" type="button">Edit</button><button class="delete-button" data-delete-task="${t.id}" aria-label="Hapus tugas">×</button></div></article>`;
}

function taskGroupHTML(dateKey, tasksForDate) {
    let label = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateKey + 'T00:00:00'));
    return `<div class="log-day-group"><p class="log-day-label">${escapeHTML(label)}</p>${tasksForDate.map(taskHTML).join('')}</div>`;
}

function taskTotalsHTML() {
    let totals = {};
    for (let t of state.tasks) {
        if (!t.done) continue;
        let parsed = parseLogText(t.name);
        if (parsed.amount === null || parsed.amount === undefined) continue;
        let key = `${parsed.activity.trim().toLowerCase()}|${parsed.unit}`;
        if (!totals[key]) totals[key] = { name: parsed.activity, unit: parsed.unit, sum: 0, count: 0 };
        totals[key].sum += Number(parsed.amount) || 0;
        totals[key].count += 1;
    }
    let list = Object.values(totals).sort((a, b) => b.sum - a.sum);
    if (!list.length) return '';
    return `<div class="section-heading"><div><p class="eyebrow">TOTAL</p><h2>Total tugas selesai</h2></div></div>
    <div class="log-totals-grid">${list.map(t => `<article><span>${escapeHTML(t.name)}</span><strong>${fmt(t.sum)} ${escapeHTML(unitLabel(t.unit))}</strong><small>${t.count}x selesai</small></article>`).join('')}</div>`;
}

function renderTaskHistory() {
    let groups = {};
    for (let t of state.tasks) (groups[t.task_date] ||= []).push(t);
    for (let k in groups) groups[k].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    let dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    $('#taskTotals').innerHTML = taskTotalsHTML();
    $('#taskHistory').innerHTML = dateKeys.length ? dateKeys.map(k => taskGroupHTML(k, groups[k])).join('') : '<div class="empty">Belum ada tugas.</div>';
}

function logEntryHTML(l) {
    let valueLabel = (l.amount !== null && l.amount !== undefined && l.amount !== '') ? `${fmt(l.amount)} ${unitLabel(l.unit)}` : '';
    return `<div class="log-entry">
        <div class="log-entry-main">
            <strong>${escapeHTML(l.activity || l.text)}</strong>
            ${valueLabel ? `<span class="log-entry-value">${escapeHTML(valueLabel)}</span>` : ''}
        </div>
        <div class="log-entry-actions">
            <button class="text-button small" data-edit-log="${l.id}" type="button">Edit</button>
            <button class="delete-button" data-delete-log="${l.id}" aria-label="Hapus catatan">×</button>
        </div>
    </div>`;
}

function logGroupHTML(dateKey, entries) {
    let label = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateKey + 'T00:00:00'));
    return `<div class="log-day-group"><p class="log-day-label">${escapeHTML(label)}</p>${entries.map(logEntryHTML).join('')}</div>`;
}

function logTotalsHTML() {
    let totals = {};
    for (let l of state.logs) {
        if (l.amount === null || l.amount === undefined || l.amount === '') continue;
        let key = `${(l.activity || l.text || '').trim().toLowerCase()}|${l.unit || 'angka'}`;
        if (!totals[key]) totals[key] = { name: l.activity || l.text, unit: l.unit, sum: 0, count: 0 };
        totals[key].sum += Number(l.amount) || 0;
        totals[key].count += 1;
    }
    let list = Object.values(totals).sort((a, b) => b.sum - a.sum);
    if (!list.length) return '';
    return `<div class="section-heading"><div><p class="eyebrow">TOTAL</p><h2>Total per aktivitas</h2></div></div>
    <div class="log-totals-grid">${list.map(t => `<article><span>${escapeHTML(t.name)}</span><strong>${fmt(t.sum)} ${escapeHTML(unitLabel(t.unit))}</strong><small>${t.count}x dicatat</small></article>`).join('')}</div>`;
}

function renderHistory() {
    let groups = {};
    for (let l of state.logs) (groups[l.entry_date] ||= []).push(l);
    for (let k in groups) groups[k].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    let dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    $('#logTotals').innerHTML = logTotalsHTML();
    $('#logHistory').innerHTML = dateKeys.length ? dateKeys.map(k => logGroupHTML(k, groups[k])).join('') : '<div class="empty">Belum ada catatan.<br>Tambahkan catatan pertamamu di atas, contoh: "Joging 45 menit".</div>';
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

    renderTaskHistory();

    $('#dashboardChartToggle').innerHTML = chartToggleHTML('dashboardChart', state.chartRange.dashboardChart);
    $('#dashboardChart').innerHTML = chartBarsHTML(state.chartRange.dashboardChart);

    $('#insightsChartToggle').innerHTML = chartToggleHTML('weekChart', state.chartRange.weekChart);
    $('#weekChart').innerHTML = chartBarsHTML(state.chartRange.weekChart);

    renderHistory();
}

async function loadData() {
    const { data: goalsData, error: goalError } = await supabaseClient.from('goals').select('*, subgoals(*)');
    const { data: tasksData, error: taskError } = await supabaseClient.from('daily_tasks').select('*');
    const { data: logsData, error: logError } = await supabaseClient.from('log_entries').select('*').order('entry_date', { ascending: false });

    if (goalError) console.error("Goal Error:", goalError);
    if (taskError) console.error("Task Error:", taskError);
    if (logError) console.error("Log Error:", logError);

    if (!goalError && goalsData) state.goals = goalsData;
    if (!taskError && tasksData) state.tasks = tasksData;
    if (!logError && logsData) state.logs = logsData;
    render();
}

function unitOptionsHTML(selected) {
    return UNITS.map(u => `<option value="${u.value}" ${u.value === selected ? 'selected' : ''}>${u.label}</option>`).join('');
}

function showForm(type, goalId) {
    let options = state.goals.map(g => `<option value="${g.id}">${escapeHTML(g.name)}</option>`).join('');
    let titles = { task: 'Tambah tugas harian', goal: 'Tambah goal', subgoal: 'Tambah sub-goal' };
    $('#dialogTitle').textContent = titles[type];
    if (type === 'task') {
        $('#formFields').innerHTML = `<div class="field"><label>Nama aktivitas</label><input name="activity" required placeholder="Contoh: Push Up"></div><div class="field"><label>Jumlah</label><input name="amount" required min="0" step="any" type="number" placeholder="10"></div><div class="field"><label>Satuan</label><select name="unit" required>${unitOptionsHTML('kali')}</select></div><div class="field"><label>Terhubung ke goal</label><select name="goalId"><option value="">Tanpa goal</option>${options}</select></div>`;
    } else if (type === 'goal') {
        $('#formFields').innerHTML = `<div class="field"><label>Nama goal</label><input name="name" required placeholder="Contoh: Dana darurat"></div><div class="field"><label>Sub-goal pertama</label><input name="subgoal" required placeholder="Contoh: Tabung 10 juta"></div><div class="field"><label>Target angka</label><input name="target" required min="0" step="any" type="number" placeholder="10000000"></div><div class="field"><label>Satuan</label><select name="unit">${unitOptionsHTML('angka')}</select></div>`;
    } else if (type === 'subgoal') {
        $('#formFields').innerHTML = `<div class="field"><label>Nama sub-goal</label><input name="name" required placeholder="Contoh: Tabung 3 juta"></div><div class="field"><label>Target angka</label><input name="target" required min="0" step="any" type="number" placeholder="3000000"></div><div class="field"><label>Satuan</label><select name="unit">${unitOptionsHTML('angka')}</select></div>`;
    }
    $('#entryForm').dataset.type = type;
    $('#entryForm').dataset.goalId = goalId || '';
    $('#entryDialog').showModal();
}

$('#entryForm').addEventListener('submit', async e => {
    if (e.submitter?.value === 'cancel') return;
    let f = new FormData(e.currentTarget), type = e.currentTarget.dataset.type;

    if (type === 'task') {
        let activity = (f.get('activity') || '').trim();
        let amount = f.get('amount');
        let unit = f.get('unit') || 'kali';
        let newTask = {
            name: `${activity} ${amount} ${unitLabel(unit)}`,
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
    } else if (type === 'taskEdit') {
        let id = e.currentTarget.dataset.id;
        let activity = (f.get('activity') || '').trim();
        let amount = f.get('amount');
        let unit = f.get('unit') || 'kali';
        let updated = { name: `${activity} ${amount} ${unitLabel(unit)}`, task_date: f.get('date'), goal_id: f.get('goalId') || null };
        const { error } = await supabaseClient.from('daily_tasks').update(updated).eq('id', id);
        if (!error) {
            let t = state.tasks.find(t => t.id == id);
            if (t) Object.assign(t, updated);
            render();
        } else {
            console.error("Update Task Error:", error);
        }
    } else if (type === 'logEdit') {
        let id = e.currentTarget.dataset.id;
        let text = (f.get('text') || '').trim();
        let date = f.get('date');
        let parsed = parseLogText(text);
        let updated = { text, entry_date: date, activity: parsed.activity, amount: parsed.amount, unit: parsed.unit };
        const { error } = await supabaseClient.from('log_entries').update(updated).eq('id', id);
        if (!error) {
            let entry = state.logs.find(l => l.id == id);
            if (entry) Object.assign(entry, updated);
            render();
        } else {
            console.error("Update Log Error:", error);
        }
    } else if (type === 'subgoal') {
        let goalId = e.currentTarget.dataset.goalId;
        let newSubgoal = {
            goal_id: goalId,
            name: f.get('name'),
            target: Number(f.get('target')),
            unit: f.get('unit') || 'angka',
            done: false
        };
        const { data, error } = await supabaseClient.from('subgoals').insert([newSubgoal]).select();
        if (!error && data) {
            let g = state.goals.find(g => g.id == goalId);
            if (g) { g.subgoals = g.subgoals || []; g.subgoals.push(data[0]); }
            render();
        } else {
            console.error("Insert Subgoal Error:", error);
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
                unit: f.get('unit') || 'angka',
                done: false
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
$('#logDate').value = today;

function showLogEditForm(entry) {
    $('#dialogTitle').textContent = 'Edit catatan';
    $('#formFields').innerHTML = `<div class="field"><label>Catatan</label><input name="text" required value="${escapeHTML(entry.text || '')}" placeholder="Contoh: Joging 45 menit"></div><div class="field"><label>Tanggal</label><input name="date" type="date" required value="${entry.entry_date}"></div>`;
    $('#entryForm').dataset.type = 'logEdit';
    $('#entryForm').dataset.id = entry.id;
    $('#entryDialog').showModal();
}

function showTaskEditForm(t) {
    let parsed = parseLogText(t.name);
    let options = state.goals.map(g => `<option value="${g.id}" ${g.id === t.goal_id ? 'selected' : ''}>${escapeHTML(g.name)}</option>`).join('');
    $('#dialogTitle').textContent = 'Edit tugas';
    $('#formFields').innerHTML = `<div class="field"><label>Nama aktivitas</label><input name="activity" required value="${escapeHTML(parsed.activity || t.name)}" placeholder="Contoh: Push Up"></div><div class="field"><label>Jumlah</label><input name="amount" required min="0" step="any" type="number" value="${parsed.amount ?? ''}"></div><div class="field"><label>Satuan</label><select name="unit" required>${unitOptionsHTML(parsed.unit || 'kali')}</select></div><div class="field"><label>Tanggal</label><input name="date" type="date" required value="${t.task_date}"></div><div class="field"><label>Terhubung ke goal</label><select name="goalId"><option value="">Tanpa goal</option>${options}</select></div>`;
    $('#entryForm').dataset.type = 'taskEdit';
    $('#entryForm').dataset.id = t.id;
    $('#entryDialog').showModal();
}

$('#logForm').addEventListener('submit', async e => {
    e.preventDefault();
    let f = new FormData(e.currentTarget);
    let text = (f.get('text') || '').trim();
    let date = f.get('date') || today;
    if (!text) return;
    let parsed = parseLogText(text);
    let newLog = { text, entry_date: date, activity: parsed.activity, amount: parsed.amount, unit: parsed.unit };
    const { data, error } = await supabaseClient.from('log_entries').insert([newLog]).select();
    if (!error && data) {
        state.logs.push(data[0]);
        e.currentTarget.reset();
        $('#logDate').value = today;
        render();
    } else {
        console.error("Insert Log Error:", error);
    }
});

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

    let editTaskId = e.target.dataset.editTask;
    if (editTaskId) {
        let t = state.tasks.find(t => t.id == editTaskId);
        if (t) showTaskEditForm(t);
    }

    let sgId = e.target.dataset.subgoalCheck;
    if (sgId) {
        for (let g of state.goals) {
            let sg = (g.subgoals || []).find(s => s.id == sgId);
            if (sg) {
                sg.done = e.target.checked;
                await supabaseClient.from('subgoals').update({ done: sg.done }).eq('id', sgId);
                break;
            }
        }
        render();
    }
    
    let del = e.target.dataset.deleteTask;
    if (del) {
        state.tasks = state.tasks.filter(t => t.id != del);
        await supabaseClient.from('daily_tasks').delete().eq('id', del);
        render();
    }

    let delSubgoal = e.target.dataset.deleteSubgoal;
    if (delSubgoal) {
        await supabaseClient.from('subgoals').delete().eq('id', delSubgoal);
        for (let g of state.goals) g.subgoals = (g.subgoals || []).filter(s => s.id != delSubgoal);
        render();
    }

    let addSubgoal = e.target.dataset.addSubgoal;
    if (addSubgoal) showForm('subgoal', addSubgoal);

    let editLogId = e.target.dataset.editLog;
    if (editLogId) {
        let entry = state.logs.find(l => l.id == editLogId);
        if (entry) showLogEditForm(entry);
    }

    let delLog = e.target.dataset.deleteLog;
    if (delLog) {
        state.logs = state.logs.filter(l => l.id != delLog);
        await supabaseClient.from('log_entries').delete().eq('id', delLog);
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