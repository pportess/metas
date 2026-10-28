'use strict';

// ---------- dados ----------
const KEY = 'app-metas-v1';
const WORKOUTS = ['Superior A', 'Inferior A', 'Superior B', 'Inferior B', 'Outro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function seedGoals() {
  return [
    { id: uid(), name: 'Pacientes novos em novembro', current: 0, target: 10, unit: 'pacientes', step: 1, deadline: '2026-11-30' },
    { id: uid(), name: 'Renda de novembro', current: 0, target: 3000, unit: 'R$', step: 50, deadline: '2026-11-30' },
  ];
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.goals) && d.days && typeof d.days === 'object') return d;
  } catch (e) { /* dados corrompidos: começa do zero */ }
  return { goals: seedGoals(), days: {} };
}

let state = load();
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

// ---------- utilidades ----------
function uid() { return Math.random().toString(36).slice(2, 10); }
function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function today() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function ddmm(d) { return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function num(v) { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; }
function fmt(n) { return Number(n.toFixed(2)).toLocaleString('pt-BR'); }
function fmtHours(h) {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60), mm = total % 60;
  return mm ? (hh ? hh + 'h' + pad(mm) : mm + 'min') : hh + 'h';
}
function fmtGoal(v, unit) {
  return unit === 'R$' ? 'R$ ' + fmt(v) : fmt(v) + (unit ? ' ' + unit : '');
}

function getDay(key) { return state.days[key] || { study: 0, pomodoros: 0, gym: false, workout: '', note: '' }; }
function setDay(key, patch) {
  const d = Object.assign(getDay(key), patch);
  const empty = !d.study && !d.pomodoros && !d.gym && !d.note;
  if (empty) delete state.days[key]; else state.days[key] = d;
  save();
}
function hasRecord(key) { return !!state.days[key]; }

function streak() {
  let d = today();
  if (!hasRecord(iso(d))) d = addDays(d, -1); // hoje ainda pode ser registrado
  let n = 0;
  while (hasRecord(iso(d))) { n++; d = addDays(d, -1); }
  return n;
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

// ---------- navegação ----------
const view = document.getElementById('view');
const titles = { hoje: 'Hoje', metas: 'Metas', progresso: 'Progresso', ajustes: 'Ajustes' };
let tab = 'hoje';
let dayKey = iso(today());
let period = 'semana';
let periodOffset = 0;

document.querySelectorAll('.tabbar button').forEach(b => {
  b.addEventListener('click', () => {
    tab = b.dataset.tab;
    if (tab === 'hoje') dayKey = iso(today());
    document.querySelectorAll('.tabbar button').forEach(x => x.classList.toggle('active', x === b));
    render();
    window.scrollTo(0, 0);
  });
});

function render() {
  document.getElementById('title').textContent = titles[tab];
  ({ hoje: renderHoje, metas: renderMetas, progresso: renderProgresso, ajustes: renderAjustes })[tab]();
}

// ---------- Hoje ----------
function renderHoje() {
  const d = parseIso(dayKey);
  const isToday = dayKey === iso(today());
  const day = getDay(dayKey);
  const label = isToday ? 'Hoje, ' + ddmm(d) : WEEKDAYS[d.getDay()] + ', ' + ddmm(d);

  view.innerHTML = `
    <div class="datenav">
      <button class="iconbtn" id="prevDay" aria-label="Dia anterior">‹</button>
      <strong>${label}</strong>
      <button class="iconbtn" id="nextDay" aria-label="Próximo dia" ${isToday ? 'disabled' : ''}>›</button>
    </div>

    <div class="card">
      <h3>Estudo</h3>
      <div class="field">
        <span>Horas de estudo</span>
        <input type="number" id="study" inputmode="decimal" step="0.25" min="0" placeholder="0" value="${day.study || ''}">
      </div>
      <div class="field">
        <span>Pomodoros</span>
        <div class="stepper">
          <button class="iconbtn" id="pomMinus" aria-label="Menos um pomodoro">−</button>
          <output id="pom">${day.pomodoros}</output>
          <button class="iconbtn" id="pomPlus" aria-label="Mais um pomodoro">+</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Academia</h3>
      <div class="seg">
        <button id="gymNo" class="${day.gym ? '' : 'on'}">Não fui</button>
        <button id="gymYes" class="${day.gym ? 'on' : ''}">Fui</button>
      </div>
      ${day.gym ? `<div class="chips">${WORKOUTS.map(w =>
        `<button class="chip ${day.workout === w ? 'on' : ''}" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : ''}
    </div>

    <div class="card">
      <h3>Observação</h3>
      <textarea id="note" placeholder="Como foi o dia? (opcional)">${esc(day.note)}</textarea>
    </div>

    <div class="card streak" id="streak"></div>`;

  const updateStreak = () => {
    const s = streak();
    document.getElementById('streak').innerHTML =
      `<b>${s}</b><span class="muted">${s === 1 ? 'dia seguido registrado' : 'dias seguidos registrados'}</span>`;
  };
  updateStreak();

  const go = n => { dayKey = iso(addDays(d, n)); renderHoje(); };
  document.getElementById('prevDay').onclick = () => go(-1);
  document.getElementById('nextDay').onclick = () => go(1);

  document.getElementById('study').addEventListener('change', e => {
    setDay(dayKey, { study: Math.max(0, num(e.target.value)) });
    updateStreak();
    toast('Salvo');
  });
  const pom = n => {
    const v = Math.max(0, getDay(dayKey).pomodoros + n);
    setDay(dayKey, { pomodoros: v });
    document.getElementById('pom').textContent = v;
    updateStreak();
  };
  document.getElementById('pomMinus').onclick = () => pom(-1);
  document.getElementById('pomPlus').onclick = () => pom(1);

  document.getElementById('gymNo').onclick = () => { setDay(dayKey, { gym: false, workout: '' }); renderHoje(); };
  document.getElementById('gymYes').onclick = () => { setDay(dayKey, { gym: true }); renderHoje(); };
  view.querySelectorAll('.chip').forEach(c => c.onclick = () => {
    setDay(dayKey, { workout: c.dataset.w });
    renderHoje();
  });

  document.getElementById('note').addEventListener('change', e => {
    setDay(dayKey, { note: e.target.value.trim() });
    updateStreak();
    toast('Salvo');
  });
}

// ---------- Metas ----------
function renderMetas() {
  view.innerHTML = state.goals.map(g => {
    const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
    const deadline = g.deadline ? 'até ' + ddmm(parseIso(g.deadline)) : '';
    return `
      <div class="card" data-id="${g.id}">
        <div class="goal-top">
          <div>
            <div class="goal-name">${esc(g.name)}</div>
            <div class="muted small">${deadline}</div>
          </div>
          <button class="goal-edit" data-act="edit">Editar</button>
        </div>
        <div class="progress"><div style="width:${pct}%"></div></div>
        <div class="goal-bottom">
          <div class="goal-val"><b>${esc(fmtGoal(g.current, g.unit))}</b>
            <span class="muted">de ${fmt(g.target)} · ${Math.round(pct)}%</span></div>
          <div class="stepper">
            <button class="iconbtn" data-act="minus" aria-label="Diminuir">−</button>
            <button class="iconbtn" data-act="plus" aria-label="Aumentar">+</button>
          </div>
        </div>
      </div>`;
  }).join('') + `
    ${state.goals.length ? '' : '<p class="muted">Nenhuma meta ainda.</p>'}
    <button class="btn primary block" id="newGoal">+ Nova meta</button>`;

  view.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const id = b.closest('[data-id]').dataset.id;
    const g = state.goals.find(x => x.id === id);
    if (b.dataset.act === 'edit') return openGoal(g);
    const step = g.step || 1;
    g.current = Math.max(0, +(g.current + (b.dataset.act === 'plus' ? step : -step)).toFixed(2));
    save();
    renderMetas();
  });
  document.getElementById('newGoal').onclick = () => openGoal(null);
}

const dlg = document.getElementById('goalDialog');
const form = document.getElementById('goalForm');
let editingId = null;

function openGoal(g) {
  editingId = g ? g.id : null;
  document.getElementById('goalDialogTitle').textContent = g ? 'Editar meta' : 'Nova meta';
  document.getElementById('goalDelete').style.display = g ? '' : 'none';
  const f = form.elements;
  f.name.value = g ? g.name : '';
  f.current.value = g ? g.current : 0;
  f.target.value = g ? g.target : '';
  f.unit.value = g ? g.unit : '';
  f.step.value = g ? g.step : 1;
  f.deadline.value = g ? (g.deadline || '') : '';
  dlg.showModal();
}

// "submit" roda antes do diálogo fechar; Esc e Cancelar não salvam.
form.addEventListener('submit', e => {
  if (!e.submitter || e.submitter.value !== 'save') return;
  const f = form.elements;
  const data = {
    name: f.name.value.trim(),
    current: Math.max(0, num(f.current.value)),
    target: Math.max(0.01, num(f.target.value)),
    unit: f.unit.value.trim(),
    step: Math.max(0.01, num(f.step.value) || 1),
    deadline: f.deadline.value,
  };
  if (editingId) Object.assign(state.goals.find(x => x.id === editingId), data);
  else state.goals.push(Object.assign({ id: uid() }, data));
  save();
  renderMetas();
});

document.getElementById('goalDelete').onclick = () => {
  if (!confirm('Apagar esta meta?')) return;
  state.goals = state.goals.filter(x => x.id !== editingId);
  save();
  dlg.close('deleted');
  renderMetas();
};

// ---------- Progresso ----------
function periodRange(kind, offset) {
  const t = today();
  if (kind === 'semana') {
    const monday = addDays(t, -((t.getDay() + 6) % 7) + offset * 7);
    return { start: monday, end: addDays(monday, 6) };
  }
  const start = new Date(t.getFullYear(), t.getMonth() + offset, 1);
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 0) };
}

function daysIn(r) {
  const out = [];
  for (let d = new Date(r.start); d <= r.end; d = addDays(d, 1)) out.push(new Date(d));
  return out;
}

function totals(r) {
  const t = { study: 0, pomodoros: 0, gym: 0, logged: 0 };
  daysIn(r).forEach(d => {
    const k = iso(d);
    if (!hasRecord(k)) return;
    const day = state.days[k];
    t.study += day.study || 0;
    t.pomodoros += day.pomodoros || 0;
    t.gym += day.gym ? 1 : 0;
    t.logged++;
  });
  return t;
}

function delta(cur, prev, fmtFn) {
  const diff = cur - prev;
  if (!diff) return `<div class="delta muted">igual ao anterior</div>`;
  return `<div class="delta ${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '▲ +' : '▼ −'}${fmtFn(Math.abs(diff))} vs anterior</div>`;
}

function chart(r) {
  const days = daysIn(r);
  const W = 320, H = 150, top = 10, bottom = 30, left = 4;
  const max = Math.max(2, ...days.map(d => getDay(iso(d)).study));
  const slot = (W - left * 2) / days.length;
  const bw = Math.max(3, slot * 0.62);
  const todayKey = iso(today());
  const bars = days.map((d, i) => {
    const k = iso(d), day = getDay(k);
    const h = (day.study / max) * (H - top - bottom);
    const x = left + i * slot + (slot - bw) / 2;
    const future = k > todayKey;
    const showLabel = days.length <= 7 || d.getDate() === 1 || d.getDate() % 5 === 0;
    const label = days.length <= 7 ? WEEKDAYS[d.getDay()] : d.getDate();
    return `
      <rect x="${x}" y="${H - bottom - Math.max(h, 2)}" width="${bw}" height="${Math.max(h, 2)}" rx="2"
        fill="${h ? 'var(--bar)' : 'var(--bar-dim)'}" opacity="${future ? 0.35 : 1}"><title>${ddmm(d)}: ${fmtHours(day.study)}</title></rect>
      ${day.gym ? `<circle cx="${x + bw / 2}" cy="${H - bottom + 7}" r="2.6" fill="var(--text)"/>` : ''}
      ${showLabel ? `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${label}</text>` : ''}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Horas de estudo por dia">
    <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--line)"/>
    <text x="${W - 2}" y="${top}" text-anchor="end">máx. ${fmtHours(max)}</text>
    ${bars}</svg>`;
}

function periodLabel(kind, r) {
  if (kind === 'semana') return ddmm(r.start) + ' – ' + ddmm(r.end);
  return MONTHS[r.start.getMonth()] + ' de ' + r.start.getFullYear();
}

function renderProgresso() {
  const r = periodRange(period, periodOffset);
  const prev = periodRange(period, periodOffset - 1);
  const t = totals(r), p = totals(prev);
  const gymGoal = period === 'semana' ? ' de 4' : '';

  view.innerHTML = `
    <div class="seg" style="margin-bottom:12px">
      <button data-p="semana" class="${period === 'semana' ? 'on' : ''}">Semana</button>
      <button data-p="mes" class="${period === 'mes' ? 'on' : ''}">Mês</button>
    </div>
    <div class="datenav">
      <button class="iconbtn" id="prevP" aria-label="Período anterior">‹</button>
      <strong>${periodLabel(period, r)}</strong>
      <button class="iconbtn" id="nextP" aria-label="Próximo período" ${periodOffset >= 0 ? 'disabled' : ''}>›</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="v">${fmtHours(t.study)}</div><div class="l">de estudo</div>${delta(t.study, p.study, fmtHours)}</div>
      <div class="stat"><div class="v">${t.pomodoros}</div><div class="l">pomodoros</div>${delta(t.pomodoros, p.pomodoros, String)}</div>
      <div class="stat"><div class="v">${t.gym}${gymGoal}</div><div class="l">treinos</div>${delta(t.gym, p.gym, String)}</div>
      <div class="stat"><div class="v">${t.logged}</div><div class="l">dias registrados</div>${delta(t.logged, p.logged, String)}</div>
    </div>
    <div class="card chart">
      <h3>Horas de estudo por dia</h3>
      ${chart(r)}
      <div class="legend"><span><i style="background:var(--bar)"></i>estudo</span><span>● academia</span></div>
    </div>`;

  view.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    period = b.dataset.p; periodOffset = 0; renderProgresso();
  });
  document.getElementById('prevP').onclick = () => { periodOffset--; renderProgresso(); };
  document.getElementById('nextP').onclick = () => { periodOffset++; renderProgresso(); };
}

// ---------- Ajustes ----------
function weekSummary() {
  const r = periodRange('semana', 0);
  const lines = ['Registro da semana ' + periodLabel('semana', r) + ':'];
  daysIn(r).forEach(d => {
    const k = iso(d);
    if (k > iso(today())) return;
    const day = state.days[k];
    let line = WEEKDAYS[d.getDay()] + ' ' + ddmm(d) + ': ';
    if (!day) line += 'sem registro';
    else {
      const parts = [fmtHours(day.study || 0) + ' de estudo', (day.pomodoros || 0) + ' pomodoros'];
      parts.push(day.gym ? 'academia' + (day.workout ? ' (' + day.workout + ')' : '') : 'sem academia');
      line += parts.join(', ');
      if (day.note) line += '. Obs.: ' + day.note;
    }
    lines.push(line);
  });
  const t = totals(r);
  lines.push('Totais: ' + fmtHours(t.study) + ' de estudo, ' + t.pomodoros + ' pomodoros, ' + t.gym + ' treinos, ' + t.logged + ' dias registrados.');
  lines.push('Metas: ' + state.goals.map(g => g.name + ': ' + fmt(g.current) + ' de ' + fmtGoal(g.target, g.unit)).join('; ') + '.');
  return lines.join('\n');
}

function renderAjustes() {
  view.innerHTML = `
    <div class="card">
      <h3>Revisão semanal</h3>
      <p class="small muted" style="margin-top:0">Copia o resumo desta semana para você colar na conversa de revisão de domingo.</p>
      <button class="btn primary block" id="copySummary">Copiar resumo da semana</button>
    </div>
    <div class="card">
      <h3>Backup</h3>
      <p class="small muted" style="margin-top:0">Os dados ficam só neste iPhone. Exporte um backup de vez em quando (por exemplo, para o iCloud Drive).</p>
      <button class="btn block" id="export">Exportar backup</button>
      <button class="btn block" id="import">Importar backup</button>
    </div>
    <div class="card">
      <h3>Zona de perigo</h3>
      <button class="btn danger block" id="wipe">Apagar todos os dados</button>
    </div>
    <p class="small muted" style="text-align:center">App de metas · V1</p>`;

  document.getElementById('copySummary').onclick = async () => {
    const text = weekSummary();
    try { await navigator.clipboard.writeText(text); toast('Resumo copiado'); }
    catch (e) { prompt('Copie o texto abaixo:', text); }
  };

  document.getElementById('export').onclick = async () => {
    const name = 'metas-backup-' + iso(today()) + '.json';
    const file = new File([JSON.stringify(state, null, 2)], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); } catch (e) { /* cancelado */ }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const input = document.getElementById('importFile');
  document.getElementById('import').onclick = () => input.click();
  input.onchange = async () => {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.goals) || typeof d.days !== 'object') throw new Error();
      if (!confirm('Substituir os dados atuais pelo backup?')) return;
      state = d; save(); toast('Backup importado');
    } catch (e) { alert('Arquivo de backup inválido.'); }
  };

  document.getElementById('wipe').onclick = () => {
    if (!confirm('Apagar todas as metas e registros? Não dá para desfazer.')) return;
    state = { goals: seedGoals(), days: {} }; save(); toast('Dados apagados');
  };
}

// ---------- início ----------
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js');
}
