'use strict';

// ---------- dados ----------
const KEY = 'app-metas-v1';
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function seedGoals() {
  return [
    { id: uid(), name: 'Pacientes novos em novembro', current: 0, target: 10, unit: 'pacientes', step: 1, deadline: '2026-11-30' },
    { id: uid(), name: 'Renda de novembro', current: 0, target: 3000, unit: 'R$', step: 50, deadline: '2026-11-30' },
  ];
}

const SEED_TOPICS = ['Envelhecimento bucal precoce', 'Resina e cerâmica', 'Prótese e reabilitação', 'DTM'];

// Ponto de partida: treino Superior/Inferior 4x (ver "Academia e dieta" no cérebro).
// Depois de criados, os treinos são do usuário e podem ser editados ou apagados.
// [exercício, séries, repetições, intervalo em segundos]
const SEED_WORKOUTS = {
  'Superior A': [
    ['Supino inclinado na máquina', 3, '6–10', 150],
    ['Supino reto na máquina (chest press)', 3, '8–12', 120],
    ['Puxada frontal, pegada aberta', 3, '8–12', 120],
    ['Remada sentada', 3, '8–12', 120],
    ['Elevação lateral', 3, '12–20', 60],
    ['Tríceps na polia', 3, '10–15', 60],
    ['Rosca na máquina ou polia', 3, '10–15', 60],
  ],
  'Inferior A': [
    ['Leg press 45°', 3, '8–12', 150],
    ['Cadeira extensora', 3, '10–15', 90],
    ['Mesa flexora', 3, '10–15', 90],
    ['Panturrilha', 3, '10–15', 60],
    ['Elevação lateral', 3, '12–20', 60],
    ['Rosca na polia', 2, '10–15', 60],
  ],
  'Superior B': [
    ['Supino reto na máquina (pesado)', 3, '6–10', 150],
    ['Puxada frontal, pegada fechada ou neutra', 3, '8–12', 120],
    ['Desenvolvimento de ombro na máquina', 3, '8–12', 120],
    ['Crucifixo na máquina (peck deck)', 3, '10–15', 90],
    ['Crucifixo inverso no peck deck', 3, '12–20', 60],
    ['Tríceps na polia acima da cabeça', 3, '10–15', 60],
    ['Rosca na máquina ou polia', 3, '10–15', 60],
  ],
  'Inferior B': [
    ['Hack squat na máquina', 3, '6–10', 150],
    ['Cadeira flexora', 3, '10–15', 90],
    ['Cadeira extensora', 2, '12–15', 90],
    ['Panturrilha', 3, '10–15', 60],
    ['Elevação lateral', 3, '12–20', 60],
    ['Tríceps na polia', 2, '10–15', 60],
  ],
};

function seedWorkouts() {
  return Object.keys(SEED_WORKOUTS).map(name => ({
    id: uid(), name,
    exercises: SEED_WORKOUTS[name].map(([n, sets, reps, rest]) => ({ name: n, sets, reps, kg: null, rest })),
  }));
}

function withDefaults(d) {
  d.topics = d.topics || SEED_TOPICS.slice();
  d.sessions = d.sessions || [];
  // Treinos feitos viraram uma lista (antes eram um por dia, indexados pela data).
  if (!Array.isArray(d.gymLogs)) {
    const old = d.gymLogs || {};
    d.gymLogs = Object.keys(old).map(k => Object.assign({ id: uid(), date: k }, old[k]));
  }
  d.timer = d.timer || null;
  d.workouts = d.workouts || seedWorkouts();
  // Dias da semana de cada treino (0 = domingo). Os do plano atual vêm marcados.
  const defaultDays = { 'Superior A': [1], 'Inferior A': [2], 'Superior B': [5], 'Inferior B': [6] };
  d.workouts.forEach(w => { if (!w.days) w.days = defaultDays[w.name] || []; });
  d.fit = Object.assign({ steps: {}, stepsGoal: 8000, kcalGoal: 500, activities: [] }, d.fit);
  d.activeWorkout = d.activeWorkout || null;
  d.gymGoal = d.gymGoal || 4;
  // Módulo de estudo: os antigos "temas" viram projetos.
  d.study = Object.assign({ dailyGoalMin: 120, weeklyGoalMin: 600, focusMin: 25, breakMin: 5,
    projects: null, tasks: [], cards: [], reviews: [], pendingSession: null }, d.study);
  if (!d.study.projects) {
    d.study.projects = d.topics.map(name => ({ id: uid(), name, area: '', targetHours: null, steps: [], createdAt: iso(today()) }));
  }
  [...d.sessions, d.timer].forEach(s => {
    if (!s || s.projectId || !s.topic) return;
    const p = d.study.projects.find(x => x.name === s.topic);
    if (p) s.projectId = p.id;
  });
  d.club = Object.assign({ current: null, suggestions: [], read: [], myVotes: [], interests: '' }, d.club);
  // Galeria: aqui ficam só as pastas e as legendas; os arquivos ficam no IndexedDB (ver mediaDb).
  d.gallery = Object.assign({ folders: [], pinHash: '' }, d.gallery);
  d.profile = Object.assign({ name: '', username: '', photo: '', birth: '', sex: '', job: '', height: null, goal: '', weights: [] }, d.profile);
  return d;
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.goals) && d.days && typeof d.days === 'object') return withDefaults(d);
  } catch (e) { /* dados corrompidos: começa do zero */ }
  return withDefaults({ goals: seedGoals(), days: {} });
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
  if (!total && h > 0) return '<1min';
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
  scheduleSync();
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
const titles = { hoje: 'Hoje', estudo: 'Estudo', academia: 'Treino', metas: 'Metas', progresso: 'Progresso',
  ajustes: 'Ajustes', perfil: 'Perfil', amigos: 'Social', clube: 'Clube do livro', galeria: 'Galeria', mais: 'Mais' };
let tab = 'hoje';
let dayKey = iso(today());
let period = 'semana';
let periodOffset = 0;

function goTab(name) {
  // tocar de novo na aba volta ao início dela
  if (name === 'academia' && tab === 'academia' && !draft) acad = 'home';
  if (name === 'estudo' && tab === 'estudo') stdView = 'home';
  if (name === 'galeria' && tab === 'galeria') galView = 'home';
  const viewer = document.getElementById('viewer');
  viewer.hidden = true; viewer.innerHTML = '';
  tab = name;
  dayKey = iso(today());
  document.querySelectorAll('.tabbar button').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  render();
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => goTab(b.dataset.tab)));
document.getElementById('settingsBtn').addEventListener('click', () => goTab('mais'));

// Ícones de traço simples (desenhados aqui, sem biblioteca externa).
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2-4.6.3 1.6 1 2.6 2 2.6 0-3 0-5.5 1-8z"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6A5 5 0 0 1 21.5 19.5"/>',
  cap: '<path d="M2 9.5 12 5l10 4.5-10 4.5z"/><path d="M6 11.5V16c3.5 2.7 8.5 2.7 12 0v-4.5"/><path d="M22 9.5V15"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
};
function icon(name) { return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`; }

const TAB_ICONS = { hoje: 'home', estudo: 'cap', academia: 'dumbbell', amigos: 'users', clube: 'book', galeria: 'image' };
document.querySelectorAll('.tabbar button').forEach(b => { b.innerHTML = icon(TAB_ICONS[b.dataset.tab]); });
document.getElementById('settingsBtn').innerHTML = icon('settings');

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function avatar(cls) {
  const p = state.profile, name = (p.name || '').trim();
  return `<div class="avatar ${cls || ''}">${p.photo ? `<img src="${p.photo}" alt="">`
    : name ? esc(name[0].toUpperCase()) : '☺'}</div>`;
}

function render() {
  // Cada módulo pode ter a sua cara: o CSS troca as cores pelo atributo data-mod.
  document.body.dataset.mod = tab;
  const name = (state.profile.name || '').trim();
  document.getElementById('title').innerHTML = tab === 'hoje'
    ? `<div class="hello">
        ${avatar()}
        <div><div class="hello-sub">${greeting()}</div><div class="hello-name">${name ? esc(name) : 'Bem-vindo'}</div></div>
        <button class="iconbtn sm" id="editProfile" aria-label="Editar perfil">${icon('gear')}</button>
      </div>`
    : `<h1>${titles[tab]}</h1>`;
  const ep = document.getElementById('editProfile');
  if (ep) ep.onclick = () => goTab('perfil');
  ({ hoje: renderHoje, estudo: renderEstudo, academia: renderAcademia, metas: renderMetas,
    progresso: renderProgresso, ajustes: renderAjustes, perfil: renderPerfil, amigos: renderAmigos,
    clube: renderClube, galeria: renderGaleria, mais: renderMais })[tab]();
}

// Menu "Mais" (botão do canto de cima): o que não cabe na barra de baixo.
function renderMais() {
  const items = [
    ['metas', 'target', 'Metas', 'Pacientes, renda e outras metas com progresso'],
    ['progresso', 'chart', 'Progresso', 'Estudo e academia por semana e por mês'],
    ['perfil', 'user', 'Perfil', 'Nome, @, foto, nascimento, sexo, profissão'],
    ['ajustes', 'settings', 'Ajustes', 'Resumo da semana, backup, apagar dados'],
  ];
  view.innerHTML = `<div class="card menu">${items.map(([t, ic, l, d]) => `
    <button class="menu-row" data-menu="${t}"><span class="ico-circle">${icon(ic)}</span>
      <span class="menu-txt"><b>${l}</b><span class="small muted">${d}</span></span><span class="muted">›</span></button>`).join('')}</div>`;
  view.querySelectorAll('[data-menu]').forEach(b => b.onclick = () => goTab(b.dataset.menu));
}

function dateNav(d) {
  const isToday = iso(d) === iso(today());
  const label = isToday ? 'Hoje, ' + ddmm(d) : WEEKDAYS[d.getDay()] + ', ' + ddmm(d);
  return `
    <div class="datenav">
      <button class="iconbtn" id="prevDay" aria-label="Dia anterior">‹</button>
      <strong>${label}</strong>
      <button class="iconbtn" id="nextDay" aria-label="Próximo dia" ${isToday ? 'disabled' : ''}>›</button>
    </div>`;
}
function bindDateNav(d, rerender) {
  document.getElementById('prevDay').onclick = () => { dayKey = iso(addDays(d, -1)); rerender(); };
  document.getElementById('nextDay').onclick = () => { dayKey = iso(addDays(d, 1)); rerender(); };
}

// ---------- Hoje ----------
function ring(pct) {
  const r = 34, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<svg class="ring" viewBox="0 0 84 84" aria-hidden="true">
    <circle cx="42" cy="42" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="8"/>
    <circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/>
    <text x="42" y="47" text-anchor="middle">${Math.round(p * 100)}%</text>
  </svg>`;
}

// Topo da aba Hoje: destaque da semana e resumo do dia de hoje.
function hojeSummary() {
  const t = getDay(iso(today()));
  const n = weekCount(0), goal = state.gymGoal, left = Math.max(0, goal - n);
  const s = streak();
  const goalsPct = state.goals.length
    ? Math.round(state.goals.reduce((a, g) => a + Math.min(1, g.current / g.target), 0) / state.goals.length * 100) : 0;
  return `
    <div class="hero">
      <div>
        <div class="hero-title">Treinos da semana</div>
        <div class="hero-sub">${n} de ${goal} · ${left ? 'faltam ' + left : 'meta batida!'}</div>
      </div>
      ${ring(n / goal)}
    </div>

    <div class="section-head"><h2>Resumo de hoje</h2><button class="see" data-goto="progresso">Ver progresso</button></div>
    <div class="stats">
      <div class="stat"><div class="stat-top"><span class="l">Horas de estudo</span><span class="ico-circle">${icon('book')}</span></div>
        <div class="v">${fmtHours(t.study)}</div></div>
      <div class="stat"><div class="stat-top"><span class="l">Pomodoros</span><span class="ico-circle">${icon('timer')}</span></div>
        <div class="v">${t.pomodoros}</div></div>
      <div class="stat"><div class="stat-top"><span class="l">Dias seguidos</span><span class="ico-circle">${icon('flame')}</span></div>
        <div class="v">${s}<small>${s === 1 ? 'dia' : 'dias'}</small></div></div>
      <div class="stat tap" data-goto="metas"><div class="stat-top"><span class="l">Metas</span><span class="ico-circle">${icon('target')}</span></div>
        <div class="v">${goalsPct}<small>%</small></div></div>
    </div>`;
}

function renderHoje() {
  const d = parseIso(dayKey);
  const day = getDay(dayKey);
  const active = state.activeWorkout && findWorkout(state.activeWorkout.workoutId);
  const sug = active || suggestedWorkout();

  view.innerHTML = `
    <div id="summary">${hojeSummary()}</div>

    ${sug ? `
    <div class="section-head"><h2>${active ? 'Treino em andamento' : 'Próximo treino'}</h2><button class="see" data-goto="academia">Ver treinos</button></div>
    <div class="card pastel lavender">
      <div class="feature-title">${esc(sug.name)}</div>
      <div class="feature-sub">${sug.exercises.length} exercícios · ~${estimateMin(sug)} min</div>
      <button class="btn pill" id="hojeStart">${icon('play')} ${active ? 'Continuar treino' : 'Iniciar treino'}</button>
    </div>` : ''}

    <div class="section-head"><h2>Registro do dia</h2></div>
    ${dateNav(d)}

    <div class="card">
      <h3>Estudo</h3>
      <div class="field">
        <span>Horas de estudo</span>
        <input type="number" id="study" inputmode="decimal" step="0.25" min="0" placeholder="0" value="${day.study ? +day.study.toFixed(2) : ''}">
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
      <h3>Treino</h3>
      <div class="seg">
        <button id="gymNo" class="${day.gym ? '' : 'on'}">Não fui</button>
        <button id="gymYes" class="${day.gym ? 'on' : ''}">Fui</button>
      </div>
      ${day.gym ? `<div class="chips">${state.workouts.map(w => w.name).concat('Outro').map(w =>
        `<button class="chip ${day.workout === w ? 'on' : ''}" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : ''}
    </div>

    <div class="card">
      <h3>Observação</h3>
      <textarea id="note" placeholder="Como foi o dia? (opcional)">${esc(day.note)}</textarea>
    </div>`;

  // Atualiza só o topo, para não tirar o foco do campo que está sendo preenchido.
  const updateStreak = () => {
    document.getElementById('summary').innerHTML = hojeSummary();
    bindGoto();
  };
  const bindGoto = () => view.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => {
    if (b.dataset.goto === 'academia') acad = 'treinos';
    goTab(b.dataset.goto);
  });
  bindGoto();
  const hs = document.getElementById('hojeStart');
  if (hs) hs.onclick = () => {
    if (!active) startWorkout(sug);
    tab = 'hoje'; goTab('academia');
  };

  bindDateNav(d, renderHoje);

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

// ---------- Estudo ----------
let stdView = 'home';   // home | dashboard | projetos | projeto | sessao | revisao | conquistas
let stdProject = null;  // projeto aberto
let stdSession = null;  // sessão aberta
let reportOffset = 0;   // semana mostrada no relatório
let reviewFilter = '';  // projeto filtrado na revisão ('' = todos)
let reviewShown = false;
let draftTitle = '', draftProject = '';
let recog = null;       // ditado em andamento

const MASTERED_DAYS = 21; // cartão com intervalo de 3 semanas ou mais conta como "dominado"

function S() { return state.study; }
function round4(n) { return Math.max(0, +n.toFixed(4)); }
function findProject(id) { return S().projects.find(p => p.id === id); }
function projName(id) { const p = findProject(id); return p ? p.name : 'Sem projeto'; }
function studyMin(r) { return daysIn(r).reduce((a, d) => a + getDay(iso(d)).study * 60, 0); }
function projectMinutes(id, r) {
  return state.sessions.filter(s => s.projectId === id && (!r || (s.date >= iso(r.start) && s.date <= iso(r.end))))
    .reduce((a, s) => a + s.minutes, 0);
}
// Progresso do projeto: pelas etapas, se tiver; senão pela meta de horas; senão não dá para medir.
function projectPct(p) {
  if (p.steps.length) return p.steps.filter(s => s.done).length / p.steps.length;
  if (p.targetHours) return Math.min(1, projectMinutes(p.id) / 60 / p.targetHours);
  return null;
}
function pctText(v) { return v == null ? '–' : Math.round(v * 100) + '%'; }
function dueCards(projectId) {
  const t = iso(today());
  return S().cards.filter(c => c.due <= t && (!projectId || c.projectId === projectId));
}
function mastery(projectId) {
  const cs = S().cards.filter(c => c.projectId === projectId);
  return cs.length ? cs.filter(c => c.interval >= MASTERED_DAYS).length / cs.length : null;
}

function addSession(projectId, title, minutes, pomodoro, key) {
  const s = { id: uid(), date: key, projectId: projectId || null, topic: projName(projectId), title: title || '',
    minutes, pomodoro, summary: '' };
  state.sessions.push(s);
  const d = getDay(key);
  setDay(key, { study: round4(d.study + minutes / 60), pomodoros: d.pomodoros + (pomodoro ? 1 : 0) });
  return s;
}

function removeSession(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  state.sessions = state.sessions.filter(x => x !== s);
  if (S().pendingSession === id) S().pendingSession = null;
  const d = getDay(s.date);
  setDay(s.date, { study: round4(d.study - s.minutes / 60), pomodoros: Math.max(0, d.pomodoros - (s.pomodoro ? 1 : 0)) });
}

// ----- pomodoro -----
function timerLeft(t) { return t.pausedLeft != null ? t.pausedLeft : Math.max(0, t.endAt - Date.now()); }
function clock(ms) { const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }

function startFocus(projectId, title) {
  unlockAudio();
  state.timer = { mode: 'foco', projectId: projectId || null, title: title || '', min: S().focusMin,
    endAt: Date.now() + S().focusMin * 60000 };
  save();
}

// O timer guarda a hora de término, então continua certo mesmo com o app fechado.
function checkTimer() {
  const t = state.timer;
  if (!t || t.pausedLeft != null || Date.now() < t.endAt) return false;
  if (t.mode === 'foco') {
    const pid = t.projectId || (S().projects.find(p => p.name === t.topic) || {}).id;
    const s = addSession(pid, t.title, t.min || 25, true, iso(new Date(t.endAt)));
    S().pendingSession = s.id;
    state.timer = { mode: 'pausa', projectId: pid, title: t.title, endAt: t.endAt + S().breakMin * 60000 };
    beep();
    toast('Pomodoro concluído! Pausa de ' + S().breakMin + ' min');
  } else {
    state.timer = null;
    beep();
    toast('Pausa encerrada');
  }
  save();
  return true;
}

function projectOptions(sel) {
  return `<option value="">Sem projeto</option>` + S().projects.map(p =>
    `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
}

function pomodoroCard() {
  const t = state.timer;
  if (!t) {
    return `
      <div class="card pomo">
        <div class="pomo-top"><h3 style="margin:0">Pomodoro</h3><span class="small muted">${S().focusMin} min de foco · ${S().breakMin} de pausa</span></div>
        <input class="field-input" id="pTitle" placeholder="Título da aula ou do que vai estudar" value="${esc(draftTitle)}">
        <select class="field-input" id="pProject" style="margin-top:8px">${projectOptions(draftProject)}</select>
        <button class="btn primary block" id="pStart">${icon('play')} Iniciar foco</button>
        <details class="manual">
          <summary class="small muted">Estudei sem pomodoro</summary>
          <div class="inline">
            <input id="manualMin" class="short" type="number" inputmode="numeric" min="1" placeholder="min">
            <span class="small muted" style="flex:1">min, com o título e o projeto acima</span>
            <button class="btn" id="addManual">Registrar</button>
          </div>
        </details>
      </div>`;
  }
  const paused = t.pausedLeft != null;
  const label = t.mode === 'foco' ? (paused ? 'Foco pausado' : 'Foco') : 'Pausa';
  const btns = t.mode === 'foco'
    ? (paused ? `<button class="btn primary" data-t="resume">Continuar</button>` : `<button class="btn" data-t="pause">Pausar</button>`)
      + `<button class="btn danger" data-t="cancel">Cancelar</button>`
    : `<button class="btn" data-t="skip">Pular pausa</button>`;
  return `
    <div class="card pomo running ${t.mode}">
      <div class="timer">
        <div class="mode">${label}</div>
        <div class="clock" id="clock">${clock(timerLeft(t))}</div>
        <div class="topic">${esc(t.title || 'Sem título')} · ${esc(projName(t.projectId))}</div>
      </div>
      <div class="btnrow">${btns}</div>
    </div>`;
}

function bindPomodoro(rerender) {
  const st = document.getElementById('pStart');
  if (st) {
    const ti = document.getElementById('pTitle'), pr = document.getElementById('pProject');
    ti.oninput = () => { draftTitle = ti.value; };
    pr.onchange = () => { draftProject = pr.value; };
    st.onclick = () => { startFocus(pr.value, ti.value.trim()); draftTitle = ''; rerender(); };
    document.getElementById('addManual').onclick = () => {
      const min = Math.round(num(document.getElementById('manualMin').value));
      if (min <= 0) return toast('Digite os minutos');
      const s = addSession(pr.value, ti.value.trim(), min, false, iso(today()));
      S().pendingSession = s.id;
      save();
      draftTitle = '';
      toast('Sessão registrada');
      rerender();
    };
  }
  view.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const a = b.dataset.t, cur = state.timer;
    if (a === 'pause') cur.pausedLeft = timerLeft(cur);
    else if (a === 'resume') { cur.endAt = Date.now() + cur.pausedLeft; delete cur.pausedLeft; }
    else if (a === 'cancel') { if (!confirm('Cancelar este pomodoro? O tempo não será registrado.')) return; state.timer = null; }
    else if (a === 'skip') state.timer = null;
    save();
    rerender();
  });
}

// ----- pequenos gráficos -----
function spark(values, color) {
  const W = 140, H = 44, max = Math.max(1, ...values);
  const x = i => i * W / (values.length - 1), y = v => H - 3 - v / max * (H - 8);
  const line = values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${line} L${W} ${H} L0 ${H}Z" fill="${color}" opacity=".15"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function bar(pct, cls) {
  return `<div class="progress ${cls || ''}"><div style="width:${Math.round(Math.max(0, Math.min(1, pct || 0)) * 100)}%"></div></div>`;
}

// ----- conquistas -----
function studyStreak() {
  let d = today();
  if (!(getDay(iso(d)).study > 0)) d = addDays(d, -1);
  let n = 0;
  while (getDay(iso(d)).study > 0) { n++; d = addDays(d, -1); }
  return n;
}
function bestStudyStreak() {
  const keys = Object.keys(state.days).filter(k => state.days[k].study > 0).sort();
  let best = 0, cur = 0, prev = null;
  keys.forEach(k => {
    cur = prev && iso(addDays(parseIso(prev), 1)) === k ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = k;
  });
  return best;
}
function totalStudyMin() { return Object.values(state.days).reduce((a, d) => a + (d.study || 0) * 60, 0); }
function xpInfo() {
  const xp = Math.round(totalStudyMin() + S().reviews.length * 5 + S().tasks.filter(t => t.done).length * 20);
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const from = 50 * Math.pow(level - 1, 2), to = 50 * Math.pow(level, 2);
  return { xp, level, pct: (xp - from) / (to - from), toNext: to - xp };
}
function badges() {
  const h = totalStudyMin() / 60, best = bestStudyStreak();
  const pomos = Object.values(state.days).reduce((a, d) => a + (d.pomodoros || 0), 0);
  const revs = S().reviews.length;
  let weekGoal = false;
  for (let o = 0; o > -52 && !weekGoal; o--) weekGoal = studyMin(periodRange('semana', o)) >= S().weeklyGoalMin;
  return [
    ['Primeira sessão', 'Registrar um estudo', state.sessions.length >= 1],
    ['10 horas', '10 h de estudo no total', h >= 10],
    ['50 horas', '50 h de estudo no total', h >= 50],
    ['100 horas', '100 h de estudo no total', h >= 100],
    ['3 dias seguidos', 'Estudar 3 dias sem falhar', best >= 3],
    ['Uma semana inteira', 'Estudar 7 dias seguidos', best >= 7],
    ['30 dias seguidos', 'Estudar 30 dias sem falhar', best >= 30],
    ['25 pomodoros', 'Completar 25 pomodoros', pomos >= 25],
    ['100 pomodoros', 'Completar 100 pomodoros', pomos >= 100],
    ['Primeira revisão', 'Revisar um cartão', revs >= 1],
    ['100 revisões', 'Revisar 100 cartões', revs >= 100],
    ['Meta semanal', 'Bater a meta de horas da semana', weekGoal],
    ['Projeto concluído', 'Chegar a 100% em um projeto', S().projects.some(p => projectPct(p) === 1)],
  ];
}

// ----- relatório semanal -----
function weekReport(offset) {
  const r = periodRange('semana', offset), a = iso(r.start), b = iso(r.end);
  const planned = S().weeklyGoalMin, done = studyMin(r);
  const tasksDue = S().tasks.filter(t => t.due && t.due >= a && t.due <= b);
  const tasksDone = tasksDue.filter(t => t.done).length;
  const revs = S().reviews.filter(x => x.date >= a && x.date <= b);
  const retention = revs.length ? revs.filter(x => x.grade >= 2).length / revs.length : null;
  const overdue = S().cards.filter(c => c.due < iso(today())).length;
  const advanced = S().projects.map(p => ({ p, min: projectMinutes(p.id, r) })).filter(x => x.min > 0);
  const since = iso(addDays(today(), -14));
  const stalled = S().projects.filter(p => projectPct(p) !== 1 && !state.sessions.some(s => s.projectId === p.id && s.date >= since));
  return { r, planned, done, tasksDue: tasksDue.length, tasksDone, revs: revs.length, retention, overdue, advanced, stalled };
}

function reportCard() {
  const w = weekReport(reportOffset);
  const pct = w.planned ? w.done / w.planned : 0;
  const verdict = pct >= 1 ? 'Meta da semana cumprida.' : reportOffset === 0
    ? `Faltam ${fmtHours((w.planned - w.done) / 60)} para a meta da semana.`
    : `A semana fechou em ${Math.round(pct * 100)}% do planejado.`;
  const withCards = S().projects.filter(p => mastery(p.id) != null);
  return `
    <div class="card report">
      <div class="pomo-top"><h3 style="margin:0">Relatório semanal</h3>
        <span class="report-nav">
          <button class="iconbtn sm" id="repPrev" aria-label="Semana anterior">‹</button>
          <span class="small">${ddmm(w.r.start)} – ${ddmm(w.r.end)}</span>
          <button class="iconbtn sm" id="repNext" aria-label="Próxima semana" ${reportOffset >= 0 ? 'disabled' : ''}>›</button>
        </span></div>
      <p class="small muted" style="margin:6px 0 12px">${verdict}</p>

      <div class="rep-row"><span>Horas planejadas × realizadas</span><b>${fmtHours(w.done / 60)} / ${fmtHours(w.planned / 60)}</b></div>
      ${bar(pct)}
      <div class="rep-row"><span>Tarefas concluídas × previstas</span><b>${w.tasksDone} / ${w.tasksDue}</b></div>
      ${bar(w.tasksDue ? w.tasksDone / w.tasksDue : 0)}
      <div class="rep-grid">
        <div><div class="v ${w.overdue ? 'bad' : ''}">${w.overdue}</div><div class="l">revisões vencidas</div></div>
        <div><div class="v">${w.revs}</div><div class="l">revisões feitas</div></div>
        <div><div class="v">${w.retention == null ? '–' : Math.round(w.retention * 100) + '%'}</div><div class="l">retenção (lembrei)</div></div>
      </div>
      <div class="rep-row"><span>Projetos que avançaram</span><b>${w.advanced.length}</b></div>
      <div class="small muted">${w.advanced.length ? w.advanced.map(x => esc(x.p.name) + ' (' + fmtHours(x.min / 60) + ')').join(' · ') : 'Nenhum nesta semana.'}</div>
      <div class="rep-row"><span>Projetos parados há 14 dias</span><b class="${w.stalled.length ? 'bad' : ''}">${w.stalled.length}</b></div>
      <div class="small muted">${w.stalled.length ? w.stalled.map(p => esc(p.name)).join(' · ') : 'Nenhum parado.'}</div>
      <div class="rep-row"><span>Domínio dos conteúdos</span><span class="small muted">cartões dominados</span></div>
      ${withCards.length ? withCards.map(p => `
        <div class="topic-row"><div class="top"><span>${esc(p.name)}</span><span class="muted">${pctText(mastery(p.id))}</span></div>${bar(mastery(p.id))}</div>`).join('')
        : '<div class="small muted">Gere perguntas nos projetos para medir o domínio.</div>'}
    </div>`;
}

// ----- tela inicial do estudo -----
function renderEstudo() {
  if (recog && stdView !== 'sessao') { recog.stop(); }
  ({ home: renderStudyHome, dashboard: renderDashboard, projetos: renderProjetos, projeto: renderProjeto,
    sessao: renderSessaoEstudo, revisao: renderRevisao, conquistas: renderConquistas })[stdView]();
}
function stdGo(v) { stdView = v; renderEstudo(); window.scrollTo(0, 0); }
function stdBack(label, to) { return `<button class="back" data-sgo="${to}">‹ ${label}</button>`; }
function bindStdGo() { view.querySelectorAll('[data-sgo]').forEach(b => b.onclick = () => stdGo(b.dataset.sgo)); }

function renderStudyHome() {
  const t = today(), todayMin = getDay(iso(t)).study * 60;
  const last7 = [];
  for (let i = 6; i >= 0; i--) last7.push(getDay(iso(addDays(t, -i))).study);
  const active = S().projects.filter(p => projectPct(p) !== 1);
  const lastDate = p => state.sessions.filter(s => s.projectId === p.id).reduce((a, s) => s.date > a ? s.date : a, '');
  const top3 = active.slice().sort((a, b) => lastDate(b).localeCompare(lastDate(a))).slice(0, 3);
  const due = dueCards().length;
  const xp = xpInfo(), streakN = studyStreak();
  const pend = S().pendingSession && state.sessions.find(s => s.id === S().pendingSession);

  view.innerHTML = `
    ${pomodoroCard()}
    ${pend ? `
    <div class="card pastel lavender">
      <div class="small" style="opacity:.7">Sessão concluída</div>
      <div class="goal-name">${esc(pend.title || 'Sem título')} · ${esc(projName(pend.projectId))}</div>
      <div class="small" style="opacity:.7;margin:2px 0 10px">Conte o que estudou (pode ditar) para gerar perguntas de revisão.</div>
      <div class="btnrow" style="margin-top:0">
        <button class="btn pill" id="pendOpen">Registrar o que estudei</button>
        <button class="btn" id="pendSkip">Agora não</button>
      </div>
    </div>` : ''}

    <div class="widgets">
      <button class="widget lavender" data-sgo="dashboard">
        <div class="w-head"><b>Dashboard</b><span class="ico-circle">${icon('chart')}</span></div>
        ${spark(last7, 'var(--accent)')}
        <div class="w-foot"><b>${fmtHours(todayMin / 60)}</b> de ${fmtHours(S().dailyGoalMin / 60)} hoje</div>
      </button>
      <button class="widget lime" data-sgo="projetos">
        <div class="w-head"><b>Projetos</b><span class="ico-circle">${icon('book')}</span></div>
        <div class="w-bars">${top3.length ? top3.map(p => `<div><span>${esc(p.name)}</span>${bar(projectPct(p), 'thin')}</div>`).join('')
          : '<span class="small">Crie seu primeiro projeto</span>'}</div>
        <div class="w-foot"><b>${active.length}</b> em andamento</div>
      </button>
      <button class="widget peach" data-sgo="revisao">
        <div class="w-head"><b>Revisão</b><span class="ico-circle">${icon('timer')}</span></div>
        <div class="w-big">${due}</div>
        <div class="w-foot">${due === 1 ? 'pergunta para hoje' : 'perguntas para hoje'}</div>
      </button>
      <button class="widget sky" data-sgo="conquistas">
        <div class="w-head"><b>Conquistas</b><span class="ico-circle">${icon('flame')}</span></div>
        <div class="w-big">Nv ${xp.level}</div>
        ${bar(xp.pct, 'thin')}
        <div class="w-foot">${streakN} ${streakN === 1 ? 'dia seguido' : 'dias seguidos'}</div>
      </button>
    </div>

    ${reportCard()}`;

  bindPomodoro(renderStudyHome);
  bindStdGo();
  if (pend) {
    document.getElementById('pendOpen').onclick = () => { stdSession = pend.id; S().pendingSession = null; save(); stdGo('sessao'); };
    document.getElementById('pendSkip').onclick = () => { S().pendingSession = null; save(); renderStudyHome(); };
  }
  document.getElementById('repPrev').onclick = () => { reportOffset--; renderStudyHome(); };
  document.getElementById('repNext').onclick = () => { reportOffset++; renderStudyHome(); };
}

// ----- dashboard -----
function nextTask() {
  return S().tasks.filter(t => !t.done).sort((a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1)[0] || null;
}

function renderDashboard() {
  const t = today(), todayMin = getDay(iso(t)).study * 60, weekMin = studyMin(periodRange('semana', 0));
  const nt = nextTask();
  const tasks = S().tasks.slice().sort((a, b) =>
    (a.done - b.done) || ((a.due || '9999') < (b.due || '9999') ? -1 : 1));
  const tk = iso(t);
  const dueLabel = d => {
    if (!d) return 'sem prazo';
    const diff = Math.round((parseIso(d) - t) / 86400000);
    return diff < 0 ? `atrasada ${-diff} dia${diff === -1 ? '' : 's'}` : diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : ddmm(parseIso(d));
  };

  view.innerHTML = stdBack('Estudo', 'home') + `
    <div class="hero">
      <div style="flex:1">
        <div class="hero-title">Próxima sessão</div>
        <div class="hero-sub">${nt ? esc(nt.title) + ' · ' + esc(projName(nt.projectId)) : 'Sem tarefas: começa um foco livre'}</div>
        <button class="btn primary" id="startNext" style="margin-top:12px">${icon('play')} Iniciar agora</button>
      </div>
    </div>

    <div class="section-head"><h2>Metas de estudo</h2></div>
    <div class="stats">
      <div class="stat"><div class="stat-top"><span class="l">Hoje</span><span class="small muted">${pctText(todayMin / S().dailyGoalMin)}</span></div>
        <div class="v">${fmtHours(todayMin / 60)}<small>/ ${fmtHours(S().dailyGoalMin / 60)}</small></div>${bar(todayMin / S().dailyGoalMin)}</div>
      <div class="stat"><div class="stat-top"><span class="l">Semana</span><span class="small muted">${pctText(weekMin / S().weeklyGoalMin)}</span></div>
        <div class="v">${fmtHours(weekMin / 60)}<small>/ ${fmtHours(S().weeklyGoalMin / 60)}</small></div>${bar(weekMin / S().weeklyGoalMin)}</div>
    </div>
    <details class="card settings-card">
      <summary><b>Personalizar metas e pomodoro</b></summary>
      ${[['dailyGoalMin', 'Meta diária', 15, 15, 720, v => fmtHours(v / 60)],
         ['weeklyGoalMin', 'Meta semanal', 30, 30, 4200, v => fmtHours(v / 60)],
         ['focusMin', 'Tempo de foco', 5, 5, 120, v => v + ' min'],
         ['breakMin', 'Tempo de pausa', 1, 1, 30, v => v + ' min']].map(([k, label, step, min, max, f]) => `
        <div class="field">
          <span>${label}</span>
          <div class="stepper">
            <button class="iconbtn sm" data-adj="${k}" data-d="${-step}" data-min="${min}" data-max="${max}">−</button>
            <output style="min-width:56px">${f(S()[k])}</output>
            <button class="iconbtn sm" data-adj="${k}" data-d="${step}" data-min="${min}" data-max="${max}">+</button>
          </div>
        </div>`).join('')}
    </details>

    <div class="section-head"><h2>Próximas tarefas e prazos</h2></div>
    <div class="card">
      ${tasks.length ? `<ul class="list tasks">${tasks.map(x => `
        <li class="${x.done ? 'done' : ''}">
          <button class="check ${x.done ? 'on' : ''}" data-done="${x.id}" aria-label="Concluir">${x.done ? '✓' : ''}</button>
          <div style="flex:1;min-width:0"><div class="task-t">${esc(x.title)}</div>
            <div class="small muted">${esc(projName(x.projectId))} · <span class="${!x.done && x.due && x.due < tk ? 'bad' : ''}">${dueLabel(x.due)}</span></div></div>
          <button class="x" data-deltask="${x.id}" aria-label="Apagar tarefa">×</button>
        </li>`).join('')}</ul>` : '<p class="small muted" style="margin:0 0 6px">Nenhuma tarefa ainda.</p>'}
      <div class="task-form">
        <input class="field-input" id="tTitle" placeholder="Nova tarefa (ex.: ler cap. 3 do livro)">
        <div class="row2" style="margin-top:8px">
          <select class="field-input" id="tProject">${projectOptions('')}</select>
          <input class="field-input" type="date" id="tDue">
        </div>
        <button class="btn block" id="tAdd">+ Adicionar tarefa</button>
      </div>
    </div>

    <div class="section-head"><h2>Progresso dos projetos</h2><button class="see" data-sgo="projetos">Ver projetos</button></div>
    <div class="card">
      ${S().projects.length ? S().projects.map(p => `
        <div class="topic-row"><div class="top"><span>${esc(p.name)}</span><span class="muted">${pctText(projectPct(p))}</span></div>${bar(projectPct(p))}</div>`).join('')
        : '<p class="small muted" style="margin:0">Nenhum projeto ainda.</p>'}
    </div>`;

  bindStdGo();
  document.getElementById('startNext').onclick = () => {
    startFocus(nt ? nt.projectId : '', nt ? nt.title : '');
    stdGo('home');
  };
  view.querySelectorAll('[data-adj]').forEach(b => b.onclick = () => {
    const k = b.dataset.adj;
    S()[k] = Math.min(+b.dataset.max, Math.max(+b.dataset.min, S()[k] + +b.dataset.d));
    save();
    renderDashboard();
    view.querySelector('.settings-card').open = true;
  });
  view.querySelectorAll('[data-done]').forEach(b => b.onclick = () => {
    const x = S().tasks.find(t => t.id === b.dataset.done);
    x.done = !x.done;
    x.doneAt = x.done ? iso(today()) : null;
    save();
    renderDashboard();
  });
  view.querySelectorAll('[data-deltask]').forEach(b => b.onclick = () => {
    S().tasks = S().tasks.filter(t => t.id !== b.dataset.deltask);
    save();
    renderDashboard();
  });
  document.getElementById('tAdd').onclick = () => {
    const title = document.getElementById('tTitle').value.trim();
    if (!title) return toast('Escreva a tarefa');
    S().tasks.push({ id: uid(), title, projectId: document.getElementById('tProject').value || null,
      due: document.getElementById('tDue').value, done: false, doneAt: null });
    save();
    renderDashboard();
  };
}

// ----- projetos -----
function renderProjetos() {
  const ps = S().projects;
  view.innerHTML = stdBack('Estudo', 'home') + ps.map(p => {
    const pct = projectPct(p), cards = S().cards.filter(c => c.projectId === p.id).length;
    return `
      <button class="card proj" data-open="${p.id}">
        <div class="goal-top"><div>
          <div class="goal-name">${esc(p.name)}</div>
          <div class="small muted">${esc(p.area || 'Sem matéria')} · ${fmtHours(projectMinutes(p.id) / 60)} estudadas · ${cards} perguntas</div>
        </div><b class="proj-pct">${pctText(pct)}</b></div>
        ${bar(pct)}
      </button>`;
  }).join('') + `
    ${ps.length ? '' : '<p class="muted">Nenhum projeto ainda.</p>'}
    <div class="card">
      <h3>Novo projeto</h3>
      <input class="field-input" id="npName" placeholder="Ex.: Ler o livro de restaurações">
      <input class="field-input" id="npArea" placeholder="Matéria (ex.: Dentística)" style="margin-top:8px">
      <button class="btn primary block" id="npAdd">Criar projeto</button>
    </div>`;
  bindStdGo();
  view.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { stdProject = b.dataset.open; stdGo('projeto'); });
  document.getElementById('npAdd').onclick = () => {
    const name = document.getElementById('npName').value.trim();
    if (!name) return toast('Dê um nome ao projeto');
    const p = { id: uid(), name, area: document.getElementById('npArea').value.trim(), targetHours: null, steps: [], createdAt: iso(today()) };
    S().projects.push(p);
    save();
    stdProject = p.id;
    stdGo('projeto');
  };
}

// Pedido pronto para colar numa conversa com o Claude; a resposta volta colada no app.
function questionPrompt(p, sessions) {
  const who = state.profile.job ? 'Sou ' + state.profile.job : 'Sou profissional de saúde';
  const text = sessions.map(s => `Aula: ${s.title || '(sem título)'} — ${ddmm(parseIso(s.date))}\nO que eu disse:\n${s.summary.trim()}`).join('\n\n');
  return `${who} e estou estudando "${p ? p.name : 'um tema'}"${p && p.area ? ' (' + p.area + ')' : ''}. Abaixo está o que eu disse sobre o que estudei.

${text}

Crie 8 perguntas de recordação ativa para revisão espaçada:
- 5 sobre o que eu disse (se eu tiver dito algo errado, a resposta deve corrigir)
- 3 sobre pontos importantes do tema que eu não mencionei (pesquise se precisar)
Respostas curtas e objetivas, de até 3 frases. Responda SOMENTE neste formato, sem nada antes ou depois:

P: pergunta
R: resposta

P: pergunta
R: resposta`;
}

function parseQA(text) {
  const out = [];
  let cur = null, field = null;
  text.replace(/\*\*/g, '').split(/\r?\n/).forEach(line => {
    const q = line.match(/^\s*(?:\d+[.)]\s*)?(?:P|Pergunta)\s*[:\-–]\s*(.*)$/i);
    const a = line.match(/^\s*(?:R|Resposta)\s*[:\-–]\s*(.*)$/i);
    if (q) { cur = { q: q[1].trim(), a: '' }; out.push(cur); field = 'q'; }
    else if (a && cur) { cur.a = a[1].trim(); field = 'a'; }
    else if (cur && line.trim()) cur[field] += ' ' + line.trim();
  });
  return out.filter(x => x.q && x.a);
}

function newCard(projectId, sessionId, q, a) {
  return { id: uid(), projectId, sessionId: sessionId || null, q, a, due: iso(today()), interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

// Bloco de perguntas usado no projeto e na sessão.
function questionsBlock(p, sessions, sessionId) {
  const withText = sessions.filter(s => s.summary && s.summary.trim());
  return `
    <div class="card">
      <h3>Gerar perguntas com o Claude</h3>
      ${withText.length ? `
        <ol class="steps small">
          <li>Toque em <b>Copiar pedido</b> e cole numa conversa com o Claude.</li>
          <li>Copie a resposta dele e cole no campo abaixo.</li>
          <li>Toque em <b>Importar perguntas</b>.</li>
        </ol>
        <button class="btn block" id="qCopy">Copiar pedido</button>
        <textarea id="qPaste" placeholder="Cole aqui a resposta do Claude (P: ... R: ...)" style="margin-top:10px"></textarea>
        <button class="btn primary block" id="qImport">Importar perguntas</button>`
      : '<p class="small muted" style="margin:0">Primeiro conte o que estudou numa sessão. É a partir disso que as perguntas são criadas.</p>'}
      <details class="manual"><summary class="small muted">Escrever uma pergunta eu mesmo</summary>
        <input class="field-input" id="qQ" placeholder="Pergunta" style="margin-top:8px">
        <textarea id="qA" placeholder="Resposta" style="margin-top:8px;min-height:56px"></textarea>
        <button class="btn block" id="qAdd">Adicionar</button>
      </details>
    </div>`;
}
function bindQuestions(p, sessions, sessionId, rerender) {
  const withText = sessions.filter(s => s.summary && s.summary.trim());
  const copy = document.getElementById('qCopy');
  if (copy) copy.onclick = async () => {
    const text = questionPrompt(p, withText.slice(-5));
    try { await navigator.clipboard.writeText(text); toast('Pedido copiado. Cole no Claude'); }
    catch (e) { prompt('Copie o texto abaixo:', text); }
  };
  const imp = document.getElementById('qImport');
  if (imp) imp.onclick = () => {
    const qa = parseQA(document.getElementById('qPaste').value);
    if (!qa.length) return alert('Não encontrei perguntas. O texto precisa ter linhas começando com "P:" e "R:".');
    qa.forEach(x => S().cards.push(newCard(p ? p.id : null, sessionId, x.q, x.a)));
    save();
    toast(qa.length + ' perguntas importadas');
    rerender();
  };
  document.getElementById('qAdd').onclick = () => {
    const q = document.getElementById('qQ').value.trim(), a = document.getElementById('qA').value.trim();
    if (!q || !a) return toast('Preencha pergunta e resposta');
    S().cards.push(newCard(p ? p.id : null, sessionId, q, a));
    save();
    rerender();
  };
}

function cardList(cards) {
  if (!cards.length) return '<p class="small muted" style="margin:0">Nenhuma pergunta ainda.</p>';
  const t = iso(today());
  return `<ul class="list">${cards.map(c => `
    <li><div style="flex:1;min-width:0"><div class="small">${esc(c.q)}</div>
      <div class="small muted">${c.due <= t ? 'revisar hoje' : 'próxima: ' + ddmm(parseIso(c.due))}${c.interval >= MASTERED_DAYS ? ' · dominada' : ''}</div></div>
      <button class="x" data-delcard="${c.id}" aria-label="Apagar pergunta">×</button></li>`).join('')}</ul>`;
}
function bindCardDelete(rerender) {
  view.querySelectorAll('[data-delcard]').forEach(b => b.onclick = () => {
    if (!confirm('Apagar esta pergunta?')) return;
    S().cards = S().cards.filter(c => c.id !== b.dataset.delcard);
    save();
    rerender();
  });
}

function renderProjeto() {
  const p = findProject(stdProject);
  if (!p) return stdGo('projetos');
  const pct = projectPct(p);
  const sessions = state.sessions.filter(s => s.projectId === p.id).sort((a, b) => a.date < b.date ? 1 : -1);
  const cards = S().cards.filter(c => c.projectId === p.id);
  const due = dueCards(p.id).length;
  const tasks = S().tasks.filter(t => t.projectId === p.id && !t.done);

  view.innerHTML = stdBack('Projetos', 'projetos') + `
    <div class="hero">
      <div style="min-width:0">
        <div class="hero-title">${esc(p.name)}</div>
        <div class="hero-sub">${esc(p.area || 'Sem matéria')} · ${fmtHours(projectMinutes(p.id) / 60)} estudadas · ${sessions.length} sessões</div>
        <div class="hero-sub">Domínio: ${pctText(mastery(p.id))} das perguntas</div>
      </div>
      ${pct == null ? '' : ring(pct)}
    </div>
    ${pct == null ? '<p class="small muted">Para ver a porcentagem, adicione etapas ou uma meta de horas abaixo.</p>' : ''}

    <div class="btnrow" style="margin-bottom:12px">
      <button class="btn primary" id="projStart">${icon('play')} Estudar agora</button>
      <button class="btn" id="projReview" ${due ? '' : 'disabled'}>Revisar (${due})</button>
    </div>

    <div class="card">
      <h3>Etapas</h3>
      ${p.steps.length ? `<ul class="list tasks">${p.steps.map(s => `
        <li class="${s.done ? 'done' : ''}">
          <button class="check ${s.done ? 'on' : ''}" data-step="${s.id}" aria-label="Concluir etapa">${s.done ? '✓' : ''}</button>
          <div style="flex:1" class="task-t">${esc(s.text)}</div>
          <button class="x" data-delstep="${s.id}" aria-label="Apagar etapa">×</button></li>`).join('')}</ul>`
        : '<p class="small muted" style="margin:0 0 6px">Divida o projeto em etapas (capítulos, aulas, técnicas). A porcentagem sai daqui.</p>'}
      <div class="inline"><input id="stepText" placeholder="Nova etapa (ex.: Capítulo 1)"><button class="btn" id="stepAdd">Adicionar</button></div>
    </div>

    <div class="card">
      <h3>Perguntas (${cards.length})</h3>
      ${cardList(cards)}
    </div>
    ${questionsBlock(p, sessions.slice().reverse(), null)}

    <div class="card">
      <h3>Sessões</h3>
      ${sessions.length ? `<ul class="list">${sessions.map(s => `
        <li class="tap" data-sess="${s.id}"><div style="min-width:0"><div class="small">${esc(s.title || 'Sem título')}</div>
          <div class="small muted">${ddmm(parseIso(s.date))} · ${fmtHours(s.minutes / 60)}${s.summary ? ' · com resumo' : ''}</div></div>
          <span class="muted">›</span></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">Nenhuma sessão ainda.</p>'}
    </div>

    ${tasks.length ? `<div class="card"><h3>Tarefas pendentes</h3><ul class="list">${tasks.map(t =>
      `<li><span class="small">${esc(t.title)}</span><span class="small muted">${t.due ? ddmm(parseIso(t.due)) : ''}</span></li>`).join('')}</ul></div>` : ''}

    <details class="card settings-card">
      <summary><b>Editar projeto</b></summary>
      <div class="pf" style="margin-top:12px">
        <label>Nome<input class="field-input" id="epName" value="${esc(p.name)}"></label>
        <label>Matéria<input class="field-input" id="epArea" value="${esc(p.area)}"></label>
        <label>Meta de horas (usada se não houver etapas)<input class="field-input" type="number" inputmode="numeric" id="epHours" value="${p.targetHours ?? ''}" placeholder="—"></label>
      </div>
      <div class="btnrow">
        <button class="btn danger" id="epDel">Apagar projeto</button>
        <button class="btn primary" id="epSave">Salvar</button>
      </div>
    </details>`;

  bindStdGo();
  const rr = () => renderProjeto();
  document.getElementById('projStart').onclick = () => { draftProject = p.id; startFocus(p.id, ''); stdGo('home'); };
  document.getElementById('projReview').onclick = () => { reviewFilter = p.id; reviewShown = false; stdGo('revisao'); };
  view.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    const s = p.steps.find(x => x.id === b.dataset.step); s.done = !s.done; save(); rr();
  });
  view.querySelectorAll('[data-delstep]').forEach(b => b.onclick = () => {
    p.steps = p.steps.filter(x => x.id !== b.dataset.delstep); save(); rr();
  });
  document.getElementById('stepAdd').onclick = () => {
    const text = document.getElementById('stepText').value.trim();
    if (!text) return;
    p.steps.push({ id: uid(), text, done: false }); save(); rr();
  };
  view.querySelectorAll('[data-sess]').forEach(li => li.onclick = () => { stdSession = li.dataset.sess; stdGo('sessao'); });
  bindCardDelete(rr);
  bindQuestions(p, sessions.slice().reverse(), null, rr);
  document.getElementById('epSave').onclick = () => {
    const name = document.getElementById('epName').value.trim();
    if (!name) return toast('O projeto precisa de um nome');
    p.name = name;
    p.area = document.getElementById('epArea').value.trim();
    const h = document.getElementById('epHours').value;
    p.targetHours = h === '' ? null : Math.max(1, num(h));
    state.sessions.forEach(s => { if (s.projectId === p.id) s.topic = p.name; });
    save(); toast('Projeto salvo'); rr();
  };
  document.getElementById('epDel').onclick = () => {
    if (!confirm('Apagar o projeto "' + p.name + '" e as perguntas dele? As horas estudadas continuam no registro.')) return;
    S().projects = S().projects.filter(x => x.id !== p.id);
    S().cards = S().cards.filter(c => c.projectId !== p.id);
    S().tasks.forEach(t => { if (t.projectId === p.id) t.projectId = null; });
    state.sessions.forEach(s => { if (s.projectId === p.id) s.projectId = null; });
    save();
    stdGo('projetos');
  };
}

// ----- sessão: o que estudei, ditado e perguntas -----
function dictate(btn, textarea) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Use o microfone do teclado do iPhone para ditar'); textarea.focus(); return; }
  if (recog) { recog.stop(); return; }
  recog = new SR();
  recog.lang = 'pt-BR';
  recog.continuous = true;
  recog.interimResults = false;
  recog.onresult = e => {
    let txt = '';
    for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) txt += e.results[i][0].transcript;
    if (txt.trim()) textarea.value = (textarea.value.trim() ? textarea.value.trim() + ' ' : '') + txt.trim();
  };
  recog.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') toast('Ditado indisponível aqui. Use o microfone do teclado.'); };
  recog.onend = () => { recog = null; btn.classList.remove('rec'); btn.textContent = '🎙 Ditar'; textarea.dispatchEvent(new Event('change')); };
  recog.start();
  btn.classList.add('rec');
  btn.textContent = '■ Parar ditado';
}

function renderSessaoEstudo() {
  const s = state.sessions.find(x => x.id === stdSession);
  if (!s) return stdGo('home');
  const p = findProject(s.projectId);
  const cards = S().cards.filter(c => c.sessionId === s.id);
  view.innerHTML = (p ? stdBack(p.name, 'projeto') : stdBack('Estudo', 'home')) + `
    <div class="card pf">
      <h3>Sessão de ${ddmm(parseIso(s.date))} · ${fmtHours(s.minutes / 60)}</h3>
      <label>Título da aula<input class="field-input" id="sTitle" value="${esc(s.title)}" placeholder="Sem título"></label>
      <label>Projeto<select class="field-input" id="sProject">${projectOptions(s.projectId)}</select></label>
    </div>
    <div class="card">
      <div class="pomo-top"><h3 style="margin:0">O que eu estudei</h3>
        <button class="btn" id="dictBtn">🎙 Ditar</button></div>
      <p class="small muted" style="margin:6px 0 10px">Fale com suas palavras o que aprendeu, como se explicasse para alguém. Explicar já é recordação ativa.</p>
      <textarea id="sSummary" style="min-height:160px" placeholder="Toque em Ditar e fale, ou use o microfone do teclado">${esc(s.summary)}</textarea>
    </div>
    ${questionsBlock(p, [s], s.id)}
    <div class="card"><h3>Perguntas desta sessão (${cards.length})</h3>${cardList(cards)}</div>
    <button class="btn danger block" id="sDel">Apagar sessão</button>`;

  bindStdGo();
  const rr = () => renderSessaoEstudo();
  document.getElementById('sTitle').onchange = e => { s.title = e.target.value.trim(); save(); toast('Salvo'); };
  document.getElementById('sProject').onchange = e => {
    s.projectId = e.target.value || null; s.topic = projName(s.projectId);
    S().cards.forEach(c => { if (c.sessionId === s.id) c.projectId = s.projectId; });
    save(); rr();
  };
  const ta = document.getElementById('sSummary');
  ta.onchange = () => { s.summary = ta.value; save(); toast('Resumo salvo'); if (!recog) rr(); };
  document.getElementById('dictBtn').onclick = e => dictate(e.currentTarget, ta);
  bindCardDelete(rr);
  bindQuestions(p, [s], s.id, rr);
  document.getElementById('sDel').onclick = () => {
    if (!confirm('Apagar esta sessão? O tempo sai do registro do dia.')) return;
    removeSession(s.id);
    stdGo(p ? 'projeto' : 'home');
  };
}

// ----- revisão espaçada -----
// Versão simplificada do SM-2: 0 errei, 1 difícil, 2 bom, 3 fácil.
function schedule(c, g) {
  let iv;
  if (g === 0) { iv = 1; c.reps = 0; c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); }
  else if (g === 1) { iv = Math.max(1, Math.round(c.interval * 1.2)); c.ease = Math.max(1.3, c.ease - 0.15); c.reps++; }
  else if (g === 2) { iv = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.interval * c.ease); c.reps++; }
  else { iv = c.reps === 0 ? 4 : Math.round(Math.max(c.interval, 1) * c.ease * 1.3); c.ease += 0.15; c.reps++; }
  return iv;
}
function previewInterval(c, g) { return schedule(Object.assign({}, c), g); }
function ivText(d) { return d < 30 ? d + 'd' : Math.round(d / 30) + 'm'; }

function renderRevisao() {
  const queue = dueCards(reviewFilter);
  const c = queue[0];
  const projs = S().projects.filter(p => S().cards.some(x => x.projectId === p.id));
  view.innerHTML = stdBack('Estudo', 'home') + `
    <div class="chips" style="margin:0 0 12px">
      <button class="chip ${reviewFilter ? '' : 'on'}" data-rf="">Todos (${dueCards().length})</button>
      ${projs.map(p => `<button class="chip ${reviewFilter === p.id ? 'on' : ''}" data-rf="${p.id}">${esc(p.name)} (${dueCards(p.id).length})</button>`).join('')}
    </div>
    ${c ? `
    <div class="card review">
      <div class="small muted">${esc(projName(c.projectId))} · faltam ${queue.length}</div>
      <div class="review-q">${esc(c.q)}</div>
      ${reviewShown ? `
        <div class="review-a">${esc(c.a)}</div>
        <div class="grades">
          ${[['Errei', 0], ['Difícil', 1], ['Bom', 2], ['Fácil', 3]].map(([l, g]) =>
            `<button class="btn grade g${g}" data-g="${g}">${l}<span>${ivText(previewInterval(c, g))}</span></button>`).join('')}
        </div>`
      : `
        <textarea id="recall" placeholder="Tente responder antes de ver (recordação ativa). Pode ditar pelo teclado."></textarea>
        <button class="btn primary block" id="showA">Mostrar resposta</button>`}
    </div>` : `
    <div class="card" style="text-align:center">
      <div class="feature-title">Tudo revisado ✓</div>
      <p class="small muted">${S().cards.length ? 'Nenhuma pergunta vencida' + (reviewFilter ? ' neste projeto' : '') + '. Volte amanhã.'
        : 'Ainda não há perguntas. Elas são criadas dentro dos projetos, a partir do que você estudou.'}</p>
    </div>`}
    <div class="card">
      <h3>Como funciona</h3>
      <p class="small muted" style="margin:0">Cada pergunta volta num intervalo que cresce conforme você lembra: errou, ela volta amanhã;
        acertou fácil, ela some por mais tempo. Uma pergunta com intervalo de ${MASTERED_DAYS} dias ou mais conta como dominada.</p>
    </div>`;

  bindStdGo();
  view.querySelectorAll('[data-rf]').forEach(b => b.onclick = () => { reviewFilter = b.dataset.rf; reviewShown = false; renderRevisao(); });
  const show = document.getElementById('showA');
  if (show) show.onclick = () => { reviewShown = true; renderRevisao(); };
  view.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
    const g = +b.dataset.g;
    c.interval = schedule(c, g);
    c.due = iso(addDays(today(), c.interval));
    S().reviews.push({ date: iso(today()), cardId: c.id, grade: g });
    save();
    reviewShown = false;
    renderRevisao();
  });
}

// ----- conquistas -----
function renderConquistas() {
  const xp = xpInfo(), cur = studyStreak(), best = bestStudyStreak();
  const pomos = Object.values(state.days).reduce((a, d) => a + (d.pomodoros || 0), 0);
  const bs = badges();
  // mapa de constância: últimas 12 semanas
  const start = addDays(periodRange('semana', -11).start, 0);
  let cells = '';
  for (let w = 0; w < 12; w++) for (let d = 0; d < 7; d++) {
    const day = addDays(start, w * 7 + d), k = iso(day), m = getDay(k).study * 60;
    const lvl = k > iso(today()) ? 'f' : m === 0 ? 0 : m < 30 ? 1 : m < 90 ? 2 : m < 180 ? 3 : 4;
    cells += `<span class="hm l${lvl}" style="grid-column:${w + 1};grid-row:${d + 1}" title="${ddmm(day)}: ${fmtHours(m / 60)}"></span>`;
  }
  view.innerHTML = stdBack('Estudo', 'home') + `
    <div class="hero">
      <div style="flex:1">
        <div class="hero-title">Nível ${xp.level}</div>
        <div class="hero-sub">${xp.xp} XP · faltam ${xp.toNext} para o nível ${xp.level + 1}</div>
        <div class="progress on-ink" style="margin-top:12px"><div style="width:${Math.round(xp.pct * 100)}%"></div></div>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><div class="l">Sequência atual</div><div class="v">${cur}<small>${cur === 1 ? 'dia' : 'dias'}</small></div></div>
      <div class="stat"><div class="l">Melhor sequência</div><div class="v">${best}<small>${best === 1 ? 'dia' : 'dias'}</small></div></div>
      <div class="stat"><div class="l">Tempo total</div><div class="v">${fmtHours(totalStudyMin() / 60)}</div></div>
      <div class="stat"><div class="l">Pomodoros</div><div class="v">${pomos}</div></div>
      <div class="stat"><div class="l">Revisões feitas</div><div class="v">${S().reviews.length}</div></div>
      <div class="stat"><div class="l">Tarefas concluídas</div><div class="v">${S().tasks.filter(t => t.done).length}</div></div>
    </div>
    <div class="card">
      <h3>Constância (12 semanas)</h3>
      <div class="heatmap">${cells}</div>
      <div class="legend"><span>menos</span><i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i><span>mais</span></div>
    </div>
    <div class="section-head"><h2>Conquistas</h2><span class="small muted">${bs.filter(b => b[2]).length} de ${bs.length}</span></div>
    <div class="badges">${bs.map(([t, d, ok]) => `
      <div class="badge-card ${ok ? 'ok' : ''}"><div class="b-ico">${ok ? '★' : '☆'}</div><b>${t}</b><span>${d}</span></div>`).join('')}
    </div>
    <div class="card"><h3>Como ganhar XP</h3>
      <p class="small muted" style="margin:0">1 XP por minuto estudado, 5 por revisão feita e 20 por tarefa concluída.</p></div>`;
  bindStdGo();
}

// ---------- Academia ----------
const SET_SECONDS = 40; // tempo médio de execução de uma série, para a estimativa
let acad = 'home';      // home | treinos | editar | historico
let draft = null;       // cópia do treino sendo editado
let presOffset = 0;     // mês mostrado no calendário de presença
let selEx = null;       // exercício escolhido no gráfico de evolução

// Treinos feitos, do mais antigo para o mais recente.
function gymList() {
  return state.gymLogs.slice().sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : (a.startAt || 0) - (b.startAt || 0));
}
function filled(sets) { return (sets || []).filter(s => s && (s.kg != null || s.reps != null)); }
function findWorkout(id) { return state.workouts.find(w => w.id === id); }
function setsText(sets) {
  return filled(sets).map(s => (s.kg != null ? fmt(s.kg) : '–') + 'kg×' + (s.reps ?? '–')).join(' · ');
}
function maxKg(sets) { const k = filled(sets).map(s => s.kg).filter(v => v != null); return k.length ? Math.max(...k) : null; }

function estimateMin(w) {
  const sec = w.exercises.reduce((a, e) => a + e.sets * (SET_SECONDS + e.rest), 0);
  return Math.round(sec / 60);
}
function hms(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
  return (h ? h + ':' : '') + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
}
function restLabel(sec) { return Math.floor(sec / 60) + ':' + pad(sec % 60); }

// Próximo treino: o que vem depois do último feito, na ordem da lista.
function suggestedWorkout() {
  const ws = state.workouts;
  if (!ws.length) return null;
  const last = gymList().reverse().find(lg => lg.workoutId && findWorkout(lg.workoutId));
  if (!last) return ws[0];
  return ws[(ws.indexOf(findWorkout(last.workoutId)) + 1) % ws.length];
}

function lastFor(name) {
  for (const lg of gymList().reverse()) {
    const sets = lg.sets && lg.sets[name];
    if (filled(sets).length) return { key: lg.date, sets };
  }
  return null;
}

// "8–12" → 12, para o aviso de subir carga
function topReps(reps) { const m = String(reps || '').match(/(\d+)\s*$/); return m ? +m[1] : null; }

// Bipe no fim do intervalo. O iPhone só libera som depois de um toque, por isso unlockAudio no "play".
let audioCtx = null;
function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* sem som */ }
}
function beep() {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if (!audioCtx) return;
  [0, 0.35, 0.7].forEach(t => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), at = audioCtx.currentTime + t;
    o.frequency.value = 880;
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.3, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
    o.start(at); o.stop(at + 0.3);
  });
}

function renderAcademia() {
  if (F().track) return renderTrack();
  if (state.activeWorkout) return renderSessao();
  ({ home: renderAcadHome, treinos: renderTreinos, editar: renderEditor, historico: renderHistorico, rota: renderRota })[acad]();
}

function backBar() { return `<button class="back" data-go="home">‹ Treino</button>`; }
function bindGo() {
  view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { acad = b.dataset.go; renderAcademia(); window.scrollTo(0, 0); });
}

function weekCount(offset) {
  return daysIn(periodRange('semana', offset)).filter(d => getDay(iso(d)).gym).length;
}

function startWorkout(w) {
  unlockAudio();
  state.activeWorkout = { workoutId: w.id, startAt: Date.now(), sets: {}, rest: null,
    restSec: w.exercises.map(e => e.rest) };
  save();
  renderAcademia();
  window.scrollTo(0, 0);
}

// --- tela inicial ---
const WEEKDAY_FULL = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const CATS = [['todos', 'Todos'], ['musculacao', 'Musculação'], ['corrida', 'Corrida'], ['ciclismo', 'Ciclismo']];
let acadDay = null;      // dia escolhido na faixa de dias
let acadCat = 'todos';

function F() { return state.fit; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function workoutsOn(weekday) { return state.workouts.filter(w => (w.days || []).includes(weekday)); }

// Calorias estimadas: MET × peso (kg) × horas. Os METs seguem tabelas de referência de atividade física;
// é uma estimativa, não uma medida.
function runMet(a) { return a.km && a.minutes ? Math.max(6, Math.min(16, a.km / (a.minutes / 60))) : 9; }
function bikeMet(a) {
  if (!(a.km && a.minutes)) return 7.5;
  const v = a.km / (a.minutes / 60);
  return v < 16 ? 4 : v < 19 ? 6.8 : v < 22 ? 8 : v < 25.5 ? 10 : 12;
}
function kcalDay(k) {
  const kg = currentWeight() || 75;
  const gymMin = state.gymLogs.filter(l => l.date === k).reduce((s, l) => s + (l.duration || 0) / 60, 0);
  const parts = { musculacao: 5 * kg * gymMin / 60, corrida: 0, ciclismo: 0, passos: (F().steps[k] || 0) * 0.04 * kg / 70 };
  F().activities.filter(a => a.date === k).forEach(a => {
    parts[a.type] += (a.type === 'corrida' ? runMet(a) : bikeMet(a)) * kg * a.minutes / 60;
  });
  return parts;
}

function dayStrip(sel) {
  const s = parseIso(sel), t = iso(today());
  let out = '';
  for (let i = -21; i <= 21; i++) {
    const d = addDays(s, i), k = iso(d);
    const active = getDay(k).gym || F().activities.some(a => a.date === k);
    out += `<button class="dchip ${k === sel ? 'on' : ''} ${k === t ? 'today' : ''}" data-day="${k}">
      <span>${'DSTQQSS'[d.getDay()]}</span><b>${d.getDate()}</b>${active ? '<i></i>' : ''}</button>`;
  }
  return out;
}

function donut(parts, goal) {
  const burned = Object.values(parts).reduce((a, b) => a + b, 0);
  const r = 46, c = 2 * Math.PI * r, p = Math.min(1, burned / Math.max(1, goal));
  return `<svg class="donut" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--bar-dim)" stroke-width="14"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--accent)" stroke-width="14" stroke-linecap="round"
      stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/>
    <text x="60" y="58" text-anchor="middle" class="d-big">${Math.round(burned)}</text>
    <text x="60" y="76" text-anchor="middle" class="d-small">kcal</text>
  </svg>`;
}

function renderAcadHome() {
  if (!acadDay) acadDay = iso(today());
  const t = today(), tk = iso(t), sel = parseIso(acadDay), k = acadDay;
  const isToday = k === tk;
  const logs = state.gymLogs.filter(l => l.date === k);
  const planned = workoutsOn(sel.getDay());
  const active = state.activeWorkout && findWorkout(state.activeWorkout.workoutId);
  const sug = suggestedWorkout();

  // card do treino do dia
  let ch;
  if (active && isToday) {
    ch = { title: 'Treino em andamento', name: active.name, sub: 'Toque para continuar', btn: 'Continuar', start: null };
  } else if (logs.length) {
    ch = { title: isToday ? 'Treino de hoje' : cap(WEEKDAY_FULL[sel.getDay()]),
      name: logs.map(l => l.workout).join(' + '), sub: 'Feito ✓ · ' + logs.map(l => fmtHours((l.duration || 0) / 3600)).join(' + ') };
  } else if (planned.length) {
    const w = planned[0];
    ch = { title: (isToday ? 'Treino de hoje · ' : '') + cap(WEEKDAY_FULL[sel.getDay()]), name: planned.map(x => x.name).join(' / '),
      sub: w.exercises.length + ' exercícios · ~' + estimateMin(w) + ' min' + (k < tk ? ' · não registrado' : ''),
      btn: isToday ? 'Iniciar' : null, start: w };
  } else {
    ch = { title: (isToday ? 'Hoje · ' : '') + cap(WEEKDAY_FULL[sel.getDay()]), name: 'Dia de descanso',
      sub: isToday && sug ? 'Quer treinar mesmo assim? Próximo da sequência: ' + sug.name : 'Nenhum treino marcado para este dia.',
      btn: isToday && sug ? 'Treinar' : null, start: sug };
  }

  // atividades do dia, conforme a categoria
  const acts = F().activities.filter(a => a.date === k && (acadCat === 'todos' || a.type === acadCat));
  const gymRows = acadCat === 'todos' || acadCat === 'musculacao' ? logs : [];
  const parts = kcalDay(k), kg = currentWeight();
  const burned = Object.values(parts).reduce((a, b) => a + b, 0);
  const steps = F().steps[k] || 0;
  const wk = weekCount(0);

  // presença: calendário do mês e barras das últimas 12 semanas
  const first = new Date(t.getFullYear(), t.getMonth() + presOffset, 1);
  const monthDays = daysIn({ start: first, end: new Date(first.getFullYear(), first.getMonth() + 1, 0) });
  let cal = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(x => `<span class="cal-h">${x}</span>`).join('') + '<span></span>'.repeat((first.getDay() + 6) % 7);
  monthDays.forEach(d => {
    const dk = iso(d);
    cal += `<span class="cal-d ${getDay(dk).gym ? 'on' : ''} ${dk === tk ? 'today' : ''} ${dk > tk ? 'future' : ''}">${d.getDate()}</span>`;
  });
  const weeks = [];
  for (let o = -11; o <= 0; o++) weeks.push({ n: weekCount(o), start: periodRange('semana', o).start });
  const W = 320, H = 120, bottom = 20, top = 10, maxN = Math.max(F().weekGoal || state.gymGoal, 7);
  const slot = W / weeks.length, bw = slot * 0.56, y = n => H - bottom - (n / maxN) * (H - top - bottom);
  const bars = weeks.map((w, i) => {
    const x = i * slot + (slot - bw) / 2;
    return `<rect x="${x}" y="${y(w.n)}" width="${bw}" height="${Math.max(H - bottom - y(w.n), 3)}" rx="${bw / 2}"
        fill="${w.n >= state.gymGoal ? 'var(--accent)' : 'var(--bar-dim)'}"><title>Semana de ${ddmm(w.start)}: ${w.n}</title></rect>
      ${i % 3 === 2 || i === weeks.length - 1 ? `<text x="${x + bw / 2}" y="${H - 5}" text-anchor="middle">${ddmm(w.start)}</text>` : ''}`;
  }).join('');

  view.innerHTML = `
    <div class="fit-month">
      <b>${cap(MONTHS[sel.getMonth()])} ${sel.getFullYear()}</b>
      <span><button class="iconbtn sm" id="wkPrev" aria-label="Semana anterior">‹</button>
        <button class="iconbtn sm" id="wkNext" aria-label="Próxima semana">›</button></span>
    </div>
    <div class="daystrip" id="daystrip">${dayStrip(k)}</div>

    <div class="challenge ${ch.btn ? 'tap' : ''}" id="challenge">
      <div class="ch-title">${ch.title}</div>
      <div class="ch-name">${esc(ch.name)}</div>
      <div class="ch-sub">${esc(ch.sub)}</div>
      ${ch.btn ? `<span class="ch-btn">${icon('play')} ${ch.btn}</span>` : ''}
      <span class="ch-ico">${icon('dumbbell')}</span>
    </div>

    <div class="cats">${CATS.map(([v, l]) => `<button class="${acadCat === v ? 'on' : ''}" data-cat="${v}">${l}</button>`).join('')}</div>

    ${gymRows.length || acts.length || acadCat === 'corrida' || acadCat === 'ciclismo' ? `
    <div class="card">
      ${gymRows.length || acts.length ? `<ul class="list">
        ${gymRows.map(l => `<li><span><b>${esc(l.workout)}</b> <span class="small muted">musculação · ${fmtHours((l.duration || 0) / 3600)}</span></span>
          <span class="small muted">${Math.round(5 * (kg || 75) * (l.duration || 0) / 3600)} kcal</span></li>`).join('')}
        ${acts.map(a => `<li class="act-row" data-openact="${a.id}">
          ${a.gps ? `<svg class="route-thumb" viewBox="0 0 56 56" data-route="${a.id}"></svg>`
            : `<span class="route-thumb none">${a.type === 'corrida' ? 'Corr.' : 'Bike'}</span>`}
          <span style="flex:1;min-width:0"><b>${a.type === 'corrida' ? 'Corrida' : 'Pedalada'}</b>
            <span class="small muted" style="display:block">${a.km ? fmt(a.km) + ' km · ' : ''}${a.sec ? hms(a.sec * 1000) : a.minutes + ' min'}${a.km ? ' · ' + speedText(a.km / ((a.sec || a.minutes * 60) / 3600), a.type === 'corrida') : ''}</span></span>
          <span class="small muted">${actKcal(a)} kcal ›</span></li>`).join('')}
      </ul>` : ''}
      ${acadCat === 'corrida' || acadCat === 'ciclismo' ? `
        <button class="btn primary block gps-start" id="gpsStart">${icon('play')} Iniciar ${acadCat === 'corrida' ? 'corrida' : 'pedalada'} com GPS</button>
        <details class="manual"><summary class="small muted">Registrar sem GPS (esteira, bicicleta ergométrica)</summary>
          <div class="act-form">
            <input id="actMin" type="number" inputmode="numeric" placeholder="min">
            <input id="actKm" type="number" inputmode="decimal" step="any" placeholder="km">
            <button class="btn" id="actAdd">+ Registrar</button>
          </div>
        </details>` : ''}
    </div>` : ''}

    <div class="widgets">
      <button class="widget w-steps" id="wSteps">
        <div class="w-head"><b>Passos</b><span class="ico-circle">${icon('flame')}</span></div>
        <div class="w-big">${steps.toLocaleString('pt-BR')}</div>
        ${bar(steps / F().stepsGoal, 'thin')}
        <div class="w-foot">de ${F().stepsGoal.toLocaleString('pt-BR')} · toque para anotar</div>
      </button>
      <button class="widget w-goals" id="wGoals">
        <div class="w-head"><b>Meus objetivos</b></div>
        <div class="w-foot" style="margin:0">Treinos na semana</div>
        <div class="w-pill"><span style="width:${Math.min(100, wk / state.gymGoal * 100)}%"></span><b>${wk}/${state.gymGoal}</b></div>
        <div class="w-foot">${wk >= state.gymGoal ? 'Meta batida!' : 'Faltam ' + (state.gymGoal - wk)}</div>
      </button>
    </div>

    <div class="card kcal">
      <div class="kcal-legend">
        <div><i class="dot meta"></i><b>${F().kcalGoal}</b> kcal<span>meta</span></div>
        <div><i class="dot burn"></i><b>${Math.round(burned)}</b> kcal<span>queimadas</span></div>
        <div><i class="dot left"></i><b>${Math.max(0, Math.round(F().kcalGoal - burned))}</b> kcal<span>faltam</span></div>
      </div>
      ${donut(parts, F().kcalGoal)}
      <div class="small muted kcal-note">${['musculacao', 'corrida', 'ciclismo', 'passos'].filter(p => parts[p] >= 1)
        .map(p => ({ musculacao: 'Musculação', corrida: 'Corrida', ciclismo: 'Ciclismo', passos: 'Passos' })[p] + ' ' + Math.round(parts[p])).join(' · ') || 'Nenhuma atividade neste dia.'}
        <br>Estimativa com ${kg ? 'seu peso de ' + fmt(kg) + ' kg' : '75 kg (informe seu peso em Meus objetivos)'}.</div>
    </div>

    <div class="card chart">
      <h3>Presença · treinos por semana</h3>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Treinos por semana">
        <line x1="0" x2="${W}" y1="${y(state.gymGoal)}" y2="${y(state.gymGoal)}" stroke="var(--accent)" stroke-dasharray="4 4" opacity=".6"/>
        ${bars}
      </svg>
      <div class="datenav" style="margin:14px 0 8px">
        <button class="iconbtn sm" id="prevM" aria-label="Mês anterior">‹</button>
        <strong>${cap(MONTHS[first.getMonth()])}</strong>
        <button class="iconbtn sm" id="nextM" aria-label="Próximo mês" ${presOffset >= 0 ? 'disabled' : ''}>›</button>
      </div>
      <div class="cal">${cal}</div>
    </div>

    <div class="tiles">
      <button class="tile" data-go="treinos"><span class="tile-ico">${icon('dumbbell')}</span><b>Treinos</b>
        <span class="small muted">${state.workouts.length} montados</span></button>
      <button class="tile" data-go="historico"><span class="tile-ico">${icon('chart')}</span><b>Histórico</b>
        <span class="small muted">${state.gymLogs.length} feitos</span></button>
    </div>

    <details class="card settings-card" id="goalsBox">
      <summary><b>Ajustar objetivos</b></summary>
      ${[['gymGoal', 'Treinos por semana', 1, 1, 7, state.gymGoal, v => v],
         ['stepsGoal', 'Passos por dia', 500, 1000, 30000, F().stepsGoal, v => v.toLocaleString('pt-BR')],
         ['kcalGoal', 'Calorias de atividade por dia', 50, 100, 3000, F().kcalGoal, v => v + ' kcal']].map(([key, l, st, mn, mx, v, f]) => `
        <div class="field"><span>${l}</span><div class="stepper">
          <button class="iconbtn sm" data-goal="${key}" data-d="${-st}" data-min="${mn}" data-max="${mx}">−</button>
          <output style="min-width:64px">${f(v)}</output>
          <button class="iconbtn sm" data-goal="${key}" data-d="${st}" data-min="${mn}" data-max="${mx}">+</button></div></div>`).join('')}
      <div class="field"><span>Seu peso (kg)</span>
        <input type="number" inputmode="decimal" step="any" id="fitKg" placeholder="—" value="${kg ?? ''}"></div>
      <p class="small muted" style="margin-bottom:0">O peso entra no cálculo das calorias. Cada mudança fica registrada com a data.</p>
    </details>`;

  // a faixa de dias abre centrada no dia escolhido; dá para arrastar para os lados
  const strip = document.getElementById('daystrip'), on = strip.querySelector('.dchip.on');
  strip.scrollLeft = on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2;

  bindGo();
  strip.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { acadDay = b.dataset.day; renderAcadHome(); });
  document.getElementById('wkPrev').onclick = () => { acadDay = iso(addDays(sel, -7)); renderAcadHome(); };
  document.getElementById('wkNext').onclick = () => { acadDay = iso(addDays(sel, 7)); renderAcadHome(); };
  view.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { acadCat = b.dataset.cat; renderAcadHome(); });
  if (ch.btn) document.getElementById('challenge').onclick = () => {
    if (active) return renderAcademia();
    if (ch.start) startWorkout(ch.start);
  };
  const addAct = document.getElementById('actAdd');
  if (addAct) addAct.onclick = () => {
    const minutes = Math.round(num(document.getElementById('actMin').value));
    if (minutes <= 0) return toast('Digite os minutos');
    const km = num(document.getElementById('actKm').value) || null;
    F().activities.push({ id: uid(), date: k, type: acadCat, minutes, km });
    setDay(k, { gym: true, workout: getDay(k).workout || cap(acadCat) });
    toast('Registrado');
    renderAcadHome();
  };
  view.querySelectorAll('[data-openact]').forEach(li => li.onclick = () => {
    routeView = li.dataset.openact; acad = 'rota'; renderAcademia(); window.scrollTo(0, 0);
  });
  hydrateRoutes(view);
  const gps = document.getElementById('gpsStart');
  if (gps) gps.onclick = () => gpsIntro(acadCat);
  document.getElementById('wSteps').onclick = () => {
    const v = prompt('Quantos passos em ' + ddmm(sel) + '? (veja no app Saúde)', steps || '');
    if (v === null) return;
    const n = Math.max(0, Math.round(num(v)));
    if (n) F().steps[k] = n; else delete F().steps[k];
    save();
    renderAcadHome();
  };
  document.getElementById('wGoals').onclick = () => {
    const box = document.getElementById('goalsBox');
    box.open = true;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  view.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => {
    const key = b.dataset.goal, obj = key === 'gymGoal' ? state : F();
    obj[key] = Math.min(+b.dataset.max, Math.max(+b.dataset.min, obj[key] + +b.dataset.d));
    save();
    renderAcadHome();
    document.getElementById('goalsBox').open = true;
  });
  document.getElementById('fitKg').onchange = e => {
    if (e.target.value === '') return;
    const w = state.profile.weights, last = w[w.length - 1], v = Math.max(20, Math.min(300, num(e.target.value)));
    if (last && last.date === tk) last.kg = v; else w.push({ date: tk, kg: v });
    save();
    toast('Peso salvo');
    renderAcadHome();
    document.getElementById('goalsBox').open = true;
  };
  document.getElementById('prevM').onclick = () => { presOffset--; renderAcadHome(); };
  document.getElementById('nextM').onclick = () => { presOffset++; renderAcadHome(); };
}

// --- corrida e ciclismo com GPS ---
// No iPhone, um app instalado pelo Safari só recebe GPS com o app aberto e a tela ligada.
// Por isso a tela é mantida acesa durante a atividade. Os percursos ficam no IndexedDB (route_<id>).
const MAP_CENTER = [-25.43, -49.27]; // usado só até chegar o primeiro sinal de GPS
let gpsWatch = null, wakeLock = null, trackMap = null, trackLine = null, trackDot = null, routeMap = null;
let routeView = null;

function haversine(a, b) {
  const R = 6371000, r = x => x * Math.PI / 180;
  const dLat = r(b[0] - a[0]), dLng = r(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function trackElapsed(t) { return (t.pausedAt || Date.now()) - t.startAt - t.pausedMs; }
function paceText(kmh) {
  if (!kmh || kmh < 0.5) return '–';
  const m = 60 / kmh, s = Math.round((m % 1) * 60);
  return Math.floor(m) + "'" + pad(s === 60 ? 0 : s) + '"';
}
function speedText(kmh, run) { return run ? paceText(kmh) + ' /km' : (kmh ? fmt(+kmh.toFixed(1)) + ' km/h' : '–'); }
function gpsLabel(acc) { return acc == null ? 'procurando GPS…' : acc <= 15 ? 'GPS ótimo' : acc <= 35 ? 'GPS bom' : 'GPS fraco (' + acc + ' m)'; }
function actKcal(a) { return Math.round((a.type === 'corrida' ? runMet(a) : bikeMet(a)) * (currentWeight() || 75) * a.minutes / 60); }

async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { /* sem trava de tela: segue normal */ }
}
function releaseAwake() { if (wakeLock) wakeLock.release(); wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (!document.hidden && F().track) { keepAwake(); watchGps(); } });

// Aviso antes de começar: sem o app aberto e a tela ligada, o iPhone corta o GPS.
function gpsIntro(type) {
  const run = type === 'corrida';
  view.innerHTML = `
    <div class="card gps-intro">
      <div class="ico-circle big">${icon('play')}</div>
      <div class="feature-title">Antes de ${run ? 'correr' : 'pedalar'}</div>
      <p><b>Deixe o app aberto e a tela ligada durante toda a atividade.</b>
        Se você bloquear o celular ou trocar de app, o iPhone pausa o GPS e parte do percurso não é registrada.</p>
      <ul class="gps-tips">
        <li>O app vai manter a tela acesa sozinho enquanto a atividade estiver rodando.</li>
        <li>Na primeira vez, o iPhone pede permissão de localização: toque em <b>Permitir</b>.</li>
        <li>Espere alguns segundos ao ar livre até aparecer "GPS bom" ou "GPS ótimo".</li>
        <li>Para escutar música, deixe ela tocando por trás: só não feche o app.</li>
      </ul>
      <button class="btn primary block gps-start" id="gpsGo">${icon('play')} Entendi, começar</button>
      <button class="btn block" id="gpsBack">Voltar</button>
    </div>`;
  window.scrollTo(0, 0);
  document.getElementById('gpsGo').onclick = () => startTrack(type);
  document.getElementById('gpsBack').onclick = () => renderAcademia();
}

function startTrack(type) {
  if (!navigator.geolocation) return toast('Este aparelho não oferece GPS ao app');
  F().track = { type, startAt: Date.now(), pausedMs: 0, pausedAt: null, points: [], m: 0, acc: null, gap: false };
  save();
  unlockAudio();
  renderAcademia();
  window.scrollTo(0, 0);
}
function watchGps() {
  if (gpsWatch != null || !F().track) return;
  gpsWatch = navigator.geolocation.watchPosition(onGps, err => {
    const el = document.getElementById('gpsStatus');
    if (el) el.textContent = err.code === 1 ? 'localização bloqueada: permita nos Ajustes' : 'procurando GPS…';
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
}
function stopGps() { if (gpsWatch != null) navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; }

function onGps(pos) {
  const t = F().track;
  if (!t) return;
  const c = pos.coords;
  t.acc = Math.round(c.accuracy);
  const st = document.getElementById('gpsStatus');
  if (st) st.textContent = gpsLabel(t.acc);
  if (t.pausedAt || c.accuracy > 35) return;
  const p = [+c.latitude.toFixed(6), +c.longitude.toFixed(6), pos.timestamp || Date.now()];
  const last = t.points[t.points.length - 1];
  if (last && !t.gap) {
    const d = haversine(last, p), dt = (p[2] - last[2]) / 1000;
    if (d < 4) return;                                          // parado: não soma ruído do GPS
    if (dt > 0 && d / dt > (t.type === 'corrida' ? 9 : 25)) return; // salto impossível
    t.m += d;
  }
  t.gap = false;
  t.points.push(p);
  if (t.points.length % 5 === 0) save();
  updateTrackUI();
}

// Velocidade dos últimos ~30 segundos.
function currentKmh(t) {
  const pts = t.points;
  if (pts.length < 2) return 0;
  const end = pts[pts.length - 1];
  let i = pts.length - 2, d = 0;
  while (i >= 0 && end[2] - pts[i][2] <= 30000) { d += haversine(pts[i], pts[i + 1]); i--; }
  const dt = (end[2] - pts[i + 1][2]) / 1000;
  return dt > 0 ? d / dt * 3.6 : 0;
}

function updateTrackUI() {
  const t = F().track;
  if (!t || !document.getElementById('tTime')) return;
  const run = t.type === 'corrida', ms = trackElapsed(t), km = t.m / 1000, h = ms / 3600000;
  document.getElementById('tTime').textContent = hms(ms);
  document.getElementById('tKm').textContent = km.toFixed(2).replace('.', ',');
  document.getElementById('tNow').textContent = speedText(currentKmh(t), run);
  document.getElementById('tAvg').textContent = speedText(h > 0 ? km / h : 0, run);
  document.getElementById('tKcal').textContent = actKcal({ type: t.type, km, minutes: ms / 60000 });
  if (trackLine && t.points.length) {
    const ll = t.points.map(p => [p[0], p[1]]), lastP = ll[ll.length - 1];
    trackLine.setLatLngs(ll);
    trackDot.setLatLng(lastP);
    // No primeiro sinal, aproxima no corredor; depois só acompanha.
    if (trackMap.getZoom() < 15) trackMap.setView(lastP, 17); else trackMap.panTo(lastP, { animate: true });
  }
}

function renderTrack() {
  const t = F().track, run = t.type === 'corrida';
  view.innerHTML = `
    <div class="track">
      <div class="track-map" id="trackMap">${window.L ? '' : '<div class="map-off">Mapa indisponível sem internet. O GPS continua registrando.</div>'}</div>
      <div class="focus-sheet track-sheet">
        <div class="grab"></div>
        <div class="track-type">${run ? 'Corrida' : 'Ciclismo'} · <span id="gpsStatus">${gpsLabel(t.acc)}</span>${t.pausedAt ? ' · pausado' : ''}</div>
        <div class="focus-row">
          <div><div class="lbl">Distância</div><div class="val"><span id="tKm">0,00</span> km</div></div>
          <div class="big" id="tTime">00:00</div>
          <div><div class="lbl">${run ? 'Ritmo' : 'Velocidade'}</div><div class="val" id="tNow">–</div></div>
        </div>
        <div class="track-sub"><span>Média <b id="tAvg">–</b></span><span><b id="tKcal">0</b> kcal</span></div>
        <div class="btnrow">
          <button class="btn" id="tPause">${t.pausedAt ? '▶ Continuar' : 'Pausar'}</button>
          <button class="btn primary" id="tFinish">Finalizar</button>
        </div>
        <button class="see" id="tDiscard" style="display:block;margin:14px auto 0">Descartar</button>
        <p class="small muted" style="text-align:center;margin-bottom:0">Deixe o app aberto: com a tela apagada o iPhone pausa o GPS.</p>
      </div>
    </div>`;

  if (trackMap) { trackMap.remove(); trackMap = null; }
  if (window.L) {
    const lastP = t.points.length ? t.points[t.points.length - 1].slice(0, 2) : MAP_CENTER;
    trackMap = L.map('trackMap', { zoomControl: false }).setView(lastP, t.points.length ? 17 : 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(trackMap);
    trackLine = L.polyline(t.points.map(p => [p[0], p[1]]), { color: '#ff6a13', weight: 6, lineJoin: 'round' }).addTo(trackMap);
    trackDot = L.circleMarker(lastP, { radius: 8, color: '#fff', weight: 3, fillColor: '#ff6a13', fillOpacity: 1 }).addTo(trackMap);
  }
  watchGps();
  keepAwake();
  updateTrackUI();

  document.getElementById('tPause').onclick = () => {
    if (t.pausedAt) { t.pausedMs += Date.now() - t.pausedAt; t.pausedAt = null; t.gap = true; }
    else t.pausedAt = Date.now();
    save();
    renderTrack();
  };
  document.getElementById('tFinish').onclick = () => { if (confirm('Finalizar a atividade?')) finishTrack(); };
  document.getElementById('tDiscard').onclick = () => {
    if (!confirm('Descartar esta atividade? Nada será salvo.')) return;
    closeTrack();
    renderAcademia();
  };
}

function closeTrack() {
  F().track = null;
  save();
  stopGps();
  releaseAwake();
  if (trackMap) { trackMap.remove(); trackMap = null; }
}

async function finishTrack() {
  const t = F().track, ms = trackElapsed(t);
  const id = uid(), date = iso(new Date(t.startAt));
  const km = +(t.m / 1000).toFixed(2);
  if (t.points.length > 1) await mediaPut('route_' + id, JSON.stringify(t.points));
  F().activities.push({ id, date, type: t.type, minutes: Math.max(1, Math.round(ms / 60000)), sec: Math.round(ms / 1000),
    km: km || null, gps: t.points.length > 1, startAt: t.startAt });
  closeTrack();
  setDay(date, { gym: true, workout: getDay(date).workout || cap(t.type) });
  toast((t.type === 'corrida' ? 'Corrida' : 'Pedalada') + ' salva: ' + fmt(km) + ' km');
  acadDay = date;
  acadCat = t.type;
  routeView = id;
  acad = 'rota';
  renderAcademia();
}

// Miniatura do percurso (SVG) para a lista de atividades.
function routeSvg(pts, size) {
  if (pts.length < 2) return '';
  const lats = pts.map(p => p[0]), lngs = pts.map(p => p[1]);
  const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLn = Math.min(...lngs), maxLn = Math.max(...lngs);
  const k = Math.cos(((minLa + maxLa) / 2) * Math.PI / 180);
  const w = (maxLn - minLn) * k || 1e-6, h = (maxLa - minLa) || 1e-6, s = (size - 8) / Math.max(w, h);
  const ox = (size - w * s) / 2, oy = (size - h * s) / 2;
  const d = pts.map((p, i) => (i ? 'L' : 'M') + (ox + (p[1] - minLn) * k * s).toFixed(1) + ' ' + (oy + (maxLa - p[0]) * s).toFixed(1)).join(' ');
  return `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function hydrateRoutes(root) {
  root.querySelectorAll('[data-route]').forEach(async el => {
    const raw = await mediaGet('route_' + el.dataset.route);
    if (raw) el.innerHTML = routeSvg(JSON.parse(raw), 56);
  });
}

// Parciais por quilômetro e velocidade ao longo do percurso.
function splitsOf(pts) {
  const out = [];
  let acc = 0, mark = pts[0][2];
  for (let i = 1; i < pts.length; i++) {
    acc += haversine(pts[i - 1], pts[i]);
    if (acc >= 1000 * (out.length + 1)) { out.push((pts[i][2] - mark) / 1000); mark = pts[i][2]; }
  }
  const rest = acc - out.length * 1000;
  return { full: out, rest: rest > 50 ? { m: rest, s: (pts[pts.length - 1][2] - mark) / 1000 } : null };
}
function speedSeries(pts) {
  const out = [], step = Math.max(1, Math.floor(pts.length / 40));
  for (let i = step; i < pts.length; i += step) {
    let d = 0;
    for (let j = i - step + 1; j <= i; j++) d += haversine(pts[j - 1], pts[j]);
    const dt = (pts[i][2] - pts[i - step][2]) / 1000;
    if (dt > 0) out.push(d / dt * 3.6);
  }
  return out;
}

async function renderRota() {
  const a = F().activities.find(x => x.id === routeView);
  if (!a) { acad = 'home'; return renderAcademia(); }
  const run = a.type === 'corrida';
  const raw = a.gps ? await mediaGet('route_' + a.id) : null;
  const pts = raw ? JSON.parse(raw) : [];
  const sec = a.sec || a.minutes * 60, kmh = a.km ? a.km / (sec / 3600) : 0;
  const sp = pts.length > 2 ? splitsOf(pts) : null;
  const series = pts.length > 2 ? speedSeries(pts) : [];
  const d = parseIso(a.date);

  view.innerHTML = backBar() + `
    <div class="route-head">
      <div class="small muted">${cap(WEEKDAY_FULL[d.getDay()])}, ${ddmm(d)}${a.startAt ? ' · ' + new Date(a.startAt).toTimeString().slice(0, 5) : ''}</div>
      <div class="feature-title">${run ? 'Corrida' : 'Pedalada'}</div>
    </div>
    ${pts.length > 1 ? `<div class="route-map" id="routeMap"></div>` : ''}
    <div class="stats">
      <div class="stat"><div class="l">Distância</div><div class="v">${a.km ? fmt(a.km) : '–'}<small>km</small></div></div>
      <div class="stat"><div class="l">Tempo</div><div class="v">${hms(sec * 1000)}</div></div>
      <div class="stat"><div class="l">${run ? 'Ritmo médio' : 'Velocidade média'}</div><div class="v" style="font-size:22px">${speedText(kmh, run)}</div></div>
      <div class="stat"><div class="l">Calorias</div><div class="v">${actKcal(a)}<small>kcal</small></div></div>
    </div>
    ${series.length > 3 ? `
    <div class="card chart"><h3>Velocidade ao longo do percurso</h3>
      ${spark(series, 'var(--accent)')}
      <div class="small muted">Máxima ${fmt(+Math.max(...series).toFixed(1))} km/h</div></div>` : ''}
    ${sp && (sp.full.length || sp.rest) ? `
    <div class="card"><h3>Parciais</h3>
      <ul class="list">${sp.full.map((s, i) => `<li><span>Km ${i + 1}</span><b>${run ? paceText(3600 / s) + ' /km' : fmt(+(3600 / s).toFixed(1)) + ' km/h'}</b></li>`).join('')}
        ${sp.rest ? `<li><span class="muted">+${Math.round(sp.rest.m)} m</span><span class="muted">${hms(sp.rest.s * 1000)}</span></li>` : ''}</ul></div>` : ''}
    ${a.gps ? '' : '<p class="small muted">Registrada sem GPS.</p>'}
    <button class="btn danger block" id="delRoute">Apagar atividade</button>`;

  bindGo();
  if (routeMap) { routeMap.remove(); routeMap = null; }
  if (pts.length > 1 && window.L) {
    const ll = pts.map(p => [p[0], p[1]]);
    routeMap = L.map('routeMap', { zoomControl: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(routeMap);
    const line = L.polyline(ll, { color: '#ff6a13', weight: 5 }).addTo(routeMap);
    L.circleMarker(ll[0], { radius: 6, color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }).addTo(routeMap);
    L.circleMarker(ll[ll.length - 1], { radius: 6, color: '#fff', weight: 2, fillColor: '#111', fillOpacity: 1 }).addTo(routeMap);
    routeMap.fitBounds(line.getBounds(), { padding: [24, 24] });
  }
  document.getElementById('delRoute').onclick = async () => {
    if (!confirm('Apagar esta atividade e o percurso?')) return;
    await mediaDel('route_' + a.id);
    F().activities = F().activities.filter(x => x.id !== a.id);
    save();
    acad = 'home';
    renderAcademia();
  };
}

// --- lista de treinos ---
function renderTreinos() {
  view.innerHTML = backBar() + state.workouts.map(w => `
    <div class="card">
      <div class="goal-top">
        <div><div class="goal-name">${esc(w.name)}</div>
          <div class="small muted">${w.exercises.length} exercícios · ~${estimateMin(w)} min</div></div>
        <button class="goal-edit" data-edit="${w.id}">Editar</button>
      </div>
      <button class="btn primary block" data-start="${w.id}">▶ Iniciar treino</button>
    </div>`).join('') + `
    ${state.workouts.length ? '' : '<p class="muted">Nenhum treino ainda. Monte o primeiro.</p>'}
    <button class="btn block" id="newWorkout">+ Montar novo treino</button>`;
  bindGo();
  view.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startWorkout(findWorkout(b.dataset.start)));
  view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    draft = JSON.parse(JSON.stringify(findWorkout(b.dataset.edit)));
    acad = 'editar'; renderAcademia(); window.scrollTo(0, 0);
  });
  document.getElementById('newWorkout').onclick = () => {
    draft = { id: null, name: '', days: [], exercises: [{ name: '', sets: 3, reps: '', kg: null, rest: 90 }] };
    acad = 'editar'; renderAcademia(); window.scrollTo(0, 0);
  };
}

// --- montar / editar treino ---
function renderEditor() {
  const exs = draft.exercises;
  view.innerHTML = `
    <button class="back" id="editBack">‹ Treinos</button>
    <div class="card">
      <h3>${draft.id ? 'Editar treino' : 'Novo treino'}</h3>
      <input class="field-input" id="wName" placeholder="Nome do treino (ex.: Superior A)" value="${esc(draft.name)}">
      <div class="small muted" style="margin:12px 0 6px">Dias da semana deste treino</div>
      <div class="wdays">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="${(draft.days || []).includes(d) ? 'on' : ''}"
        data-wd="${d}" aria-label="${WEEKDAY_FULL[d]}">${'DSTQQSS'[d]}</button>`).join('')}</div>
      <div class="small muted" style="margin-top:8px">${exs.length} exercícios · ~${estimateMin(draft)} min estimados</div>
    </div>
    ${exs.map((e, i) => `
      <div class="card" data-i="${i}">
        <div class="ex-tools">
          <span class="small muted">Exercício ${i + 1}</span>
          <span>
            <button class="x" data-mv="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
            <button class="x" data-mv="1" ${i === exs.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>
            <button class="x" data-rm aria-label="Remover">×</button>
          </span>
        </div>
        <input class="field-input" data-f="name" placeholder="Nome do exercício" value="${esc(e.name)}">
        <div class="ex-grid">
          <label>Séries<input type="number" inputmode="numeric" min="1" data-f="sets" value="${e.sets}"></label>
          <label>Repetições<input data-f="reps" placeholder="ex.: 8–12" value="${esc(e.reps)}"></label>
          <label>Carga (kg)<input type="number" inputmode="decimal" step="any" min="0" data-f="kg" placeholder="–" value="${e.kg ?? ''}"></label>
          <label class="full">Intervalo<span class="stepper">
            <button class="iconbtn sm" data-rest="-15" aria-label="Menos 15 s">−</button>
            <output>${restLabel(e.rest)}</output>
            <button class="iconbtn sm" data-rest="15" aria-label="Mais 15 s">+</button></span></label>
        </div>
      </div>`).join('')}
    <button class="btn block" id="addEx">+ Adicionar exercício</button>
    <div class="btnrow">
      ${draft.id ? '<button class="btn danger" id="delWorkout">Apagar treino</button>' : ''}
      <button class="btn primary" id="saveWorkout">Salvar treino</button>
    </div>`;

  // Lê os campos para o rascunho antes de qualquer ação que redesenha a tela.
  const pull = () => {
    draft.name = document.getElementById('wName').value.trim();
    view.querySelectorAll('[data-i]').forEach(card => {
      const e = exs[+card.dataset.i];
      e.name = card.querySelector('[data-f=name]').value.trim();
      e.sets = Math.max(1, Math.round(num(card.querySelector('[data-f=sets]').value)) || 1);
      e.reps = card.querySelector('[data-f=reps]').value.trim();
      const kg = card.querySelector('[data-f=kg]').value;
      e.kg = kg === '' ? null : Math.max(0, num(kg));
    });
  };
  const idx = el => +el.closest('[data-i]').dataset.i;

  document.getElementById('editBack').onclick = () => { draft = null; acad = 'treinos'; renderAcademia(); };
  view.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => {
    pull();
    const d = +b.dataset.wd, days = draft.days || (draft.days = []);
    draft.days = days.includes(d) ? days.filter(x => x !== d) : days.concat(d);
    renderEditor();
  });
  view.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => {
    pull();
    const i = idx(b), j = i + +b.dataset.mv;
    [exs[i], exs[j]] = [exs[j], exs[i]];
    renderEditor();
  });
  view.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { pull(); exs.splice(idx(b), 1); renderEditor(); });
  view.querySelectorAll('[data-rest]').forEach(b => b.onclick = () => {
    pull();
    const e = exs[idx(b)];
    e.rest = Math.min(600, Math.max(15, e.rest + +b.dataset.rest));
    renderEditor();
  });
  document.getElementById('addEx').onclick = () => {
    pull();
    exs.push({ name: '', sets: 3, reps: '', kg: null, rest: exs.length ? exs[exs.length - 1].rest : 90 });
    renderEditor();
  };
  document.getElementById('saveWorkout').onclick = () => {
    pull();
    draft.exercises = exs.filter(e => e.name);
    if (!draft.name) return toast('Dê um nome ao treino');
    if (!draft.exercises.length) return toast('Adicione pelo menos um exercício');
    if (draft.id) Object.assign(findWorkout(draft.id), draft);
    else state.workouts.push(Object.assign(draft, { id: uid() }));
    save();
    draft = null; acad = 'treinos';
    toast('Treino salvo');
    renderAcademia();
  };
  const del = document.getElementById('delWorkout');
  if (del) del.onclick = () => {
    if (!confirm('Apagar o treino "' + draft.name + '"? Os treinos já feitos continuam no histórico.')) return;
    state.workouts = state.workouts.filter(w => w.id !== draft.id);
    save();
    draft = null; acad = 'treinos';
    renderAcademia();
  };
}

// --- treino em andamento ---
// Carga sugerida da série: a do treino montado ou, se não tiver, a da última vez.
function plannedKg(e, last, j) {
  if (e.kg != null) return e.kg;
  const p = last && last.sets[j];
  return p && p.kg != null ? p.kg : null;
}

function finishWorkout() {
  const a = state.activeWorkout, w = findWorkout(a.workoutId);
  const date = iso(new Date(a.startAt));
  const dur = Math.round((Date.now() - a.startAt) / 1000);
  state.gymLogs.push({ id: uid(), date, startAt: a.startAt, workoutId: w.id, workout: w.name, sets: a.sets, duration: dur });
  // A carga do treino montado passa a ser a maior usada hoje.
  w.exercises.forEach(e => { const m = maxKg(a.sets[e.name]); if (m != null) e.kg = m; });
  state.activeWorkout = null;
  setDay(date, { gym: true, workout: w.name });
  toast('Treino salvo: ' + fmtHours(dur / 3600));
  acad = 'home';
  acadDay = date;
  renderAcademia();
  window.scrollTo(0, 0);
}

// --- modo foco: um exercício por vez, com tempo no exercício, cronômetro grande e série atual ---
function nextSetIdx(a, e) {
  const cur = a.sets[e.name] || [];
  for (let j = 0; j < e.sets; j++) if (!cur[j] || cur[j].reps == null) return j;
  return -1;
}

function openFocus(i) {
  const a = state.activeWorkout;
  a.focus = i;
  a.exStart = a.exStart || {};
  if (!a.exStart[i]) a.exStart[i] = Date.now();
  if (!(a.rest && a.rest.ex === i)) a.setStart = Date.now();
  save();
  renderSessao();
  window.scrollTo(0, 0);
}

function renderFoco() {
  const a = state.activeWorkout, w = findWorkout(a.workoutId), i = a.focus, e = w.exercises[i];
  if (!e) { a.focus = null; save(); return renderSessao(); }
  const n = w.exercises.length, j = nextSetIdx(a, e), done = j < 0;
  const last = lastFor(e.name), cur = a.sets[e.name] || [];
  const prev = j > 0 && cur[j - 1] ? cur[j - 1].kg : null;
  const kgHint = done ? '' : (prev ?? plannedKg(e, last, j) ?? '');
  const repHint = !done && last && last.sets[j] ? (last.sets[j].reps ?? '') : '';
  const resting = a.rest && a.rest.ex === i;
  const exMs = ((a.exEnd && a.exEnd[i]) || Date.now()) - a.exStart[i];
  const rs = a.restSec[i] ?? e.rest;

  view.innerHTML = `
    <div class="focus">
      <div class="focus-hero">
        <div class="focus-top">
          <button class="iconbtn" id="fList" aria-label="Ver lista">‹</button>
          <span class="focus-count">${i + 1} / ${n}</span>
          <span class="focus-total" id="elapsed">${hms(Date.now() - a.startAt)}</span>
        </div>
        <span class="focus-icon">${icon('dumbbell')}</span>
        <div class="focus-name">${esc(e.name)}</div>
        <div class="focus-meta">${e.sets} séries${e.reps ? ' · ' + esc(e.reps) + ' reps' : ''} · intervalo ${restLabel(rs)}</div>
        ${last ? `<div class="focus-last">Última vez: ${setsText(last.sets)}</div>` : ''}
      </div>

      <div class="focus-sheet">
        <div class="grab"></div>
        <div class="focus-row">
          <div><div class="lbl">No exercício</div><div class="val" id="exElapsed">${clock(exMs)}</div></div>
          <div class="big ${resting ? 'rest' : ''}" id="${resting ? 'restClock' : 'setClock'}">${clock(resting ? a.rest.endAt - Date.now() : Date.now() - (a.setStart || Date.now()))}</div>
          <div><div class="lbl">Série</div><div class="val">${done ? e.sets : j + 1}/${e.sets}</div></div>
        </div>
        <div class="focus-state">${resting ? 'Descanso' : done ? 'Exercício concluído ✓' : 'Série ' + (j + 1) + ' em andamento'}</div>

        ${resting ? `
          <div class="btnrow">
            <button class="btn" id="fRestMinus">−15 s</button>
            <button class="btn" id="fRestPlus">+15 s</button>
            <button class="btn" id="fRestSkip">Pular</button>
          </div>` : ''}
        ${!done ? `
          <div class="focus-inputs">
            <label>Carga (kg)<input id="fKg" type="number" inputmode="decimal" step="any" placeholder="${kgHint}"></label>
            <label>Repetições<input id="fReps" type="number" inputmode="numeric" placeholder="${repHint}"></label>
          </div>
          <button class="btn primary block focus-done" id="fDone">Concluir série ${j + 1}</button>` : ''}

        ${filled(cur).length ? `<div class="focus-sets">${cur.map((s, k) => s && s.reps != null
          ? `<span>${k + 1}ª · ${s.kg != null ? fmt(s.kg) + 'kg' : '–'} × ${s.reps}</span>` : '').join('')}</div>` : ''}

        <div class="btnrow">
          <button class="btn" id="fPrev" ${i === 0 ? 'disabled' : ''}>‹ Anterior</button>
          ${i < n - 1 ? `<button class="btn ${done ? 'primary' : ''}" id="fNext">Próximo ›</button>`
            : `<button class="btn primary" id="fFinish">Finalizar treino</button>`}
        </div>
      </div>
    </div>`;

  document.getElementById('fList').onclick = () => { a.focus = null; save(); renderSessao(); };
  const go = k => openFocus(k);
  document.getElementById('fPrev').onclick = () => go(i - 1);
  const nx = document.getElementById('fNext');
  if (nx) nx.onclick = () => go(i + 1);
  const fin = document.getElementById('fFinish');
  if (fin) fin.onclick = () => { if (confirm('Finalizar o treino?')) finishWorkout(); };
  if (resting) {
    document.getElementById('fRestMinus').onclick = () => { a.rest.endAt = Math.max(Date.now() + 1000, a.rest.endAt - 15000); save(); tickGym(); };
    document.getElementById('fRestPlus').onclick = () => { a.rest.endAt += 15000; save(); tickGym(); };
    document.getElementById('fRestSkip').onclick = () => { a.rest = null; a.setStart = Date.now(); save(); renderFoco(); };
  }
  const doneBtn = document.getElementById('fDone');
  if (doneBtn) doneBtn.onclick = () => {
    unlockAudio();
    const kgIn = document.getElementById('fKg'), repIn = document.getElementById('fReps');
    const reps = repIn.value !== '' ? num(repIn.value) : (repIn.placeholder !== '' ? num(repIn.placeholder) : null);
    if (reps == null) return toast('Digite as repetições');
    const kg = kgIn.value !== '' ? num(kgIn.value) : (kgIn.placeholder !== '' ? num(kgIn.placeholder) : null);
    const arr = a.sets[e.name] || (a.sets[e.name] = []);
    arr[j] = { kg, reps };
    const now = Date.now();
    a.setStart = now;
    if (j === e.sets - 1) { a.exEnd = a.exEnd || {}; a.exEnd[i] = now; }
    // Depois da série, o descanso começa sozinho (menos no fim da última série do último exercício).
    if (!(j === e.sets - 1 && i === n - 1)) a.rest = { endAt: now + rs * 1000, ex: i };
    save();
    renderFoco();
  };
}

function renderSessao() {
  const a = state.activeWorkout;
  const w = findWorkout(a.workoutId);
  if (!w) { state.activeWorkout = null; save(); return renderAcademia(); }
  if (a.focus != null) return renderFoco();

  view.innerHTML = `
    <div class="card session-head">
      <div class="small muted">TREINO EM ANDAMENTO</div>
      <div class="goal-name">${esc(w.name)}</div>
      <div class="clock" id="elapsed">${hms(Date.now() - a.startAt)}</div>
      <div class="small muted">Estimativa: ~${estimateMin(w)} min</div>
      <div class="btnrow">
        <button class="btn danger" id="cancelWorkout">Cancelar</button>
        <button class="btn primary" id="finishWorkout">Finalizar treino</button>
      </div>
    </div>
    ${w.exercises.map((e, i) => {
      const last = lastFor(e.name);
      const cur = a.sets[e.name] || [];
      const top = topReps(e.reps);
      const up = top && last && last.sets.length >= e.sets && last.sets.slice(0, e.sets).every(s => s && s.reps >= top);
      const lastTxt = last ? 'Última vez (' + ddmm(parseIso(last.key)) + '): ' + setsText(last.sets) : 'Sem registro anterior';
      let rows = '<span></span><span class="head">kg</span><span class="head">reps</span>';
      for (let j = 0; j < e.sets; j++) {
        const c = cur[j] || {}, p = (last && last.sets[j]) || {}, pk = plannedKg(e, last, j);
        rows += `<span>${j + 1}ª</span>
          <input type="number" inputmode="decimal" step="any" data-ex="${i}" data-s="${j}" data-f="kg" value="${c.kg ?? ''}" placeholder="${pk ?? ''}">
          <input type="number" inputmode="numeric" data-ex="${i}" data-s="${j}" data-f="reps" value="${c.reps ?? ''}" placeholder="${p.reps ?? ''}">`;
      }
      const rs = a.restSec[i] ?? e.rest;
      return `
        <div class="card">
          <div class="ex-head"><div class="ex-name">${i + 1}. ${esc(e.name)}${up ? '<span class="badge">↑ subir carga</span>' : ''}</div>
            <button class="btn primary sm" data-focus="${i}">${icon('play')} ${nextSetIdx(a, e) < 0 ? 'Feito' : 'Iniciar'}</button></div>
          <div class="ex-meta">${e.sets} séries${e.reps ? ' · ' + esc(e.reps) : ''}${e.kg != null ? ' · ' + fmt(e.kg) + ' kg' : ''} · ${lastTxt}</div>
          <div class="sets">${rows}</div>
          <div class="rest-row">
            <span class="small muted">Intervalo</span>
            <span class="stepper">
              <button class="iconbtn sm" data-restadj="-15" data-i="${i}" aria-label="Menos 15 s">−</button>
              <output>${restLabel(rs)}</output>
              <button class="iconbtn sm" data-restadj="15" data-i="${i}" aria-label="Mais 15 s">+</button>
            </span>
            <button class="btn primary" data-restgo="${i}">▶ ${restLabel(rs)}</button>
          </div>
          ${a.rest && (a.rest.ex ?? 0) === i ? `
          <div class="restbar">
            <div><div class="small">Intervalo</div><div class="restclock" id="restClock">${clock(a.rest.endAt - Date.now())}</div></div>
            <div class="btnrow" style="margin:0">
              <button class="btn" id="restPlus">+15 s</button>
              <button class="btn" id="restStop">Parar</button>
            </div>
          </div>` : ''}
        </div>`;
    }).join('')}`;

  view.querySelectorAll('.sets input').forEach(inp => inp.addEventListener('change', () => {
    const ex = +inp.dataset.ex, j = +inp.dataset.s, name = w.exercises[ex].name;
    const arr = a.sets[name] || (a.sets[name] = []);
    const s = arr[j] || (arr[j] = { kg: null, reps: null });
    s[inp.dataset.f] = inp.value === '' ? null : num(inp.value);
    // Mudou o peso: as próximas séries ainda vazias passam a sugerir esse peso.
    if (inp.dataset.f === 'kg' && s.kg != null) {
      for (let k = j + 1; k < w.exercises[ex].sets; k++) {
        const nx = view.querySelector(`.sets input[data-ex="${ex}"][data-s="${k}"][data-f=kg]`);
        if (nx && nx.value === '') nx.placeholder = s.kg;
      }
    }
    // Digitou as reps sem mexer no peso: usa a carga sugerida e mostra no campo.
    if (inp.dataset.f === 'reps' && s.kg == null) {
      const kgInp = view.querySelector(`.sets input[data-ex="${ex}"][data-s="${j}"][data-f=kg]`);
      if (kgInp.placeholder !== '') { s.kg = num(kgInp.placeholder); kgInp.value = kgInp.placeholder; }
    }
    save();
  }));
  view.querySelectorAll('[data-restadj]').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    a.restSec[i] = Math.min(600, Math.max(15, (a.restSec[i] ?? w.exercises[i].rest) + +b.dataset.restadj));
    save();
    renderSessao();
  });
  view.querySelectorAll('[data-restgo]').forEach(b => b.onclick = () => {
    unlockAudio();
    const i = +b.dataset.restgo;
    // O cronômetro aparece dentro do cartão do exercício tocado; a tela não sai do lugar.
    a.rest = { endAt: Date.now() + (a.restSec[i] ?? w.exercises[i].rest) * 1000, ex: i };
    save();
    renderSessao();
    const bar = document.querySelector('.restbar');
    if (bar) bar.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  if (a.rest) {
    document.getElementById('restPlus').onclick = () => { a.rest.endAt += 15000; save(); tickGym(); };
    document.getElementById('restStop').onclick = () => { a.rest = null; save(); renderSessao(); };
  }
  document.getElementById('cancelWorkout').onclick = () => {
    if (!confirm('Cancelar o treino? Nada será salvo.')) return;
    state.activeWorkout = null; save(); renderAcademia();
  };
  document.getElementById('finishWorkout').onclick = finishWorkout;
  view.querySelectorAll('[data-focus]').forEach(b => b.onclick = () => openFocus(+b.dataset.focus));
}

// Roda a cada segundo: cronômetro do treino e do intervalo.
function tickGym() {
  const a = state.activeWorkout;
  if (!a) return;
  const el = document.getElementById('elapsed');
  if (el) el.textContent = hms(Date.now() - a.startAt);
  const exEl = document.getElementById('exElapsed');
  if (exEl && a.focus != null && a.exStart && a.exStart[a.focus]) {
    exEl.textContent = clock(((a.exEnd && a.exEnd[a.focus]) || Date.now()) - a.exStart[a.focus]);
  }
  const setEl = document.getElementById('setClock');
  if (setEl && a.setStart) setEl.textContent = clock(Date.now() - a.setStart);
  if (!a.rest) return;
  const left = a.rest.endAt - Date.now();
  if (left <= 0) {
    a.rest = null;
    a.setStart = Date.now();
    save();
    beep();
    toast('Intervalo acabou! Próxima série');
    if (tab === 'academia') renderSessao();
    return;
  }
  const r = document.getElementById('restClock');
  if (r) r.textContent = clock(left);
}

// --- histórico e evolução de carga ---
function loadChart(points) {
  const W = 320, H = 150, top = 16, bottom = 22, left = 30, right = 22;
  if (!points.length) return '';
  const vals = points.map(p => p.kg);
  const dLo = Math.min(...vals), dHi = Math.max(...vals);
  let lo = dLo, hi = dHi;
  if (lo === hi) { lo -= 5; hi += 5; }
  const pad_ = (hi - lo) * 0.15; lo = Math.max(0, lo - pad_); hi += pad_;
  const x = i => points.length === 1 ? (left + W - right) / 2 : left + i * (W - left - right) / (points.length - 1);
  const y = v => top + (1 - (v - lo) / (hi - lo)) * (H - top - bottom);
  const path = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.kg).toFixed(1)).join(' ');
  const every = Math.ceil(points.length / 5);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução da carga">
    <line x1="${left}" x2="${W - right}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--line)"/>
    <text x="${left - 4}" y="${y(dHi) + 4}" text-anchor="end">${fmt(dHi)}</text>
    ${dLo !== dHi ? `<text x="${left - 4}" y="${y(dLo) + 4}" text-anchor="end">${fmt(dLo)}</text>` : ''}
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p, i) => `
      <circle cx="${x(i)}" cy="${y(p.kg)}" r="3.5" fill="var(--accent)"><title>${ddmm(parseIso(p.date))}: ${fmt(p.kg)} kg</title></circle>
      ${i % every === 0 || i === points.length - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${ddmm(parseIso(p.date))}</text>` : ''}`).join('')}
  </svg>`;
}

function deleteLog(id) {
  const lg = state.gymLogs.find(l => l.id === id);
  state.gymLogs = state.gymLogs.filter(l => l.id !== id);
  // Sem outro treino nesse dia, o dia deixa de contar como presença.
  if (lg && !state.gymLogs.some(l => l.date === lg.date)) setDay(lg.date, { gym: false, workout: '' });
  else save();
}

function renderHistorico() {
  const logs = gymList();
  // exercícios com carga registrada, do mais recente para o mais antigo
  const names = [];
  logs.slice().reverse().forEach(lg => Object.keys(lg.sets || {}).forEach(n => {
    if (maxKg(lg.sets[n]) != null && !names.includes(n)) names.push(n);
  }));
  if (!names.includes(selEx)) selEx = names[0] || null;
  const points = selEx ? logs.filter(lg => lg.sets && maxKg(lg.sets[selEx]) != null)
    .map(lg => ({ date: lg.date, kg: maxKg(lg.sets[selEx]), sets: lg.sets[selEx] })) : [];
  const diff = points.length > 1 ? points[points.length - 1].kg - points[0].kg : 0;

  view.innerHTML = backBar() + `
    <div class="card chart">
      <h3>Evolução de carga</h3>
      ${names.length ? `
        <select class="field-input" id="exSel">${names.map(n =>
          `<option ${n === selEx ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <div style="margin-top:10px">${loadChart(points)}</div>
        <div class="small muted">Maior carga de cada treino.
          ${points.length > 1 ? `De ${fmt(points[0].kg)} kg (${ddmm(parseIso(points[0].date))}) para ${fmt(points[points.length - 1].kg)} kg:
            <b class="${diff > 0 ? 'delta up' : diff < 0 ? 'delta down' : ''}">${diff > 0 ? '+' : ''}${fmt(diff)} kg</b>` : ''}</div>
        <ul class="list" style="margin-top:8px">${points.slice().reverse().map(p =>
          `<li><span class="small">${WEEKDAYS[parseIso(p.date).getDay()]} ${ddmm(parseIso(p.date))}</span><span class="small muted">${setsText(p.sets)}</span></li>`).join('')}</ul>`
      : '<p class="small muted" style="margin:0">Faça um treino anotando as cargas para ver sua evolução aqui.</p>'}
    </div>

    <div class="card">
      <h3>Treinos realizados</h3>
      ${logs.length ? logs.slice().reverse().map(lg => {
        const nSets = Object.values(lg.sets || {}).reduce((a, s) => a + filled(s).length, 0);
        return `
        <details class="log">
          <summary>
            <span><b>${WEEKDAYS[parseIso(lg.date).getDay()]} ${ddmm(parseIso(lg.date))}</b> · ${esc(lg.workout)}
              <span class="small muted">${lg.duration ? ' · ' + fmtHours(lg.duration / 3600) : ''} · ${nSets} séries</span></span>
            <button class="x" data-dellog="${lg.id}" aria-label="Apagar treino">×</button>
          </summary>
          <ul class="list">${Object.keys(lg.sets || {}).filter(n => filled(lg.sets[n]).length).map(n =>
            `<li><span class="small">${esc(n)}</span><span class="small muted">${setsText(lg.sets[n])}</span></li>`).join('')
            || '<li class="small muted">Sem séries anotadas</li>'}</ul>
        </details>`;
      }).join('') : '<p class="small muted" style="margin:0">Nenhum treino realizado ainda.</p>'}
    </div>`;

  bindGo();
  const sel = document.getElementById('exSel');
  if (sel) sel.onchange = () => { selEx = sel.value; renderHistorico(); };
  view.querySelectorAll('[data-dellog]').forEach(b => b.onclick = ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const lg = state.gymLogs.find(l => l.id === b.dataset.dellog);
    if (!confirm('Apagar o treino de ' + ddmm(parseIso(lg.date)) + ' (' + lg.workout + ')? Não dá para desfazer.')) return;
    deleteLog(lg.id);
    toast('Treino apagado');
    renderHistorico();
  });
}

// ---------- Amigos ----------
// Modo demonstração: os amigos são fictícios e gerados aqui. Quando o servidor existir,
// só friendsData() muda (passa a buscar os placares de verdade); a tela continua igual.
const PTS_HOUR = 10, PTS_WORKOUT = 25;   // 10 h de estudo valem o mesmo que 4 treinos
const FRIEND_COLORS = ['#f97316', '#10b981', '#0ea5e9', '#e11d48', '#eab308'];
const WEEKS_SHOWN = 8;
let amgMetric = 'geral';    // ranking: geral | estudo | academia
let amgChart = 'estudo';    // gráfico: estudo | academia | geral
let amgRange = 'semanas';   // semana (dia a dia) | semanas (últimas 8)
let demoFriends = null;

function points(study, gym) { return Math.round(study * PTS_HOUR + gym * PTS_WORKOUT); }
function seeded(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

// Semanas (de segunda a domingo) com o estudo e o treino de cada dia; dias futuros ficam null.
function demoFriend(name, username, seed, studyPerWeek, gymPerWeek) {
  const rnd = seeded(seed), todayIdx = (today().getDay() + 6) % 7;
  const weeks = [];
  for (let o = 1 - WEEKS_SHOWN; o <= 0; o++) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      if (o === 0 && i > todayIdx) { days.push(null); continue; }
      days.push({ study: +(studyPerWeek / 7 * (0.2 + rnd() * 1.6)).toFixed(2), gym: rnd() < gymPerWeek / 7 ? 1 : 0 });
    }
    weeks.push({ start: periodRange('semana', o).start, days });
  }
  return { name, username, photo: '', demo: true, weeks };
}

function myWeeks() {
  const todayKey = iso(today()), weeks = [];
  for (let o = 1 - WEEKS_SHOWN; o <= 0; o++) {
    const r = periodRange('semana', o);
    weeks.push({ start: r.start, days: daysIn(r).map(d => {
      const k = iso(d);
      if (k > todayKey) return null;
      const x = getDay(k);
      return { study: x.study || 0, gym: x.gym ? 1 : 0 };
    }) });
  }
  return weeks;
}

// ---------- Servidor (Supabase) ----------
// Esta é a chave pública ("publishable"): foi feita para ficar no app. Quem protege os dados
// são as regras do banco (cada um só mexe no que é seu; o placar só aparece para amigos aceitos).
const SUPABASE_URL = 'https://fnijcbbgrkqzjrraynfg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-1BfMSiKeuei0bPV2zAvdA_ERQesYO-';
const social = { user: null, profile: null, friends: [], incoming: [], outgoing: [], scores: {},
  loaded: false, loading: false, error: '' };
let sb = null;
let authMode = 'entrar';
let syncTimer = null;

function sbClient() {
  if (!sb && window.supabase) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'portes-auth' } });
    sb.auth.onAuthStateChange((ev, session) => {
      const before = social.user && social.user.id;
      social.user = session ? session.user : null;
      if ((social.user && social.user.id) === before) return;
      Object.assign(social, { profile: null, friends: [], incoming: [], outgoing: [], scores: {}, loaded: false });
      if (social.user) setTimeout(() => { pushProfile(); pushScores(); }, 0);
      if (tab === 'amigos') renderAmigos();
    });
  }
  return sb;
}

// O placar sobe sozinho alguns segundos depois de qualquer registro.
function scheduleSync() {
  if (!social.user) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushScores, 4000);
}
async function pushScores() {
  if (!social.user) return;
  const rows = [], t = today(), now = new Date().toISOString();
  for (let i = 0; i < 7 * WEEKS_SHOWN; i++) {
    const k = iso(addDays(t, -i)), d = getDay(k);
    const workouts = state.gymLogs.filter(l => l.date === k).length || (d.gym ? 1 : 0);
    rows.push({ user_id: social.user.id, day: k, study_minutes: Math.min(1440, Math.round(d.study * 60)),
      workouts: Math.min(5, workouts), updated_at: now });
  }
  const { error } = await sb.from('daily_scores').upsert(rows);
  if (error) console.warn('placar não sincronizado:', error.message);
}

// Nome e foto vão para o servidor; a foto só é reenviada quando muda.
async function pushProfile() {
  if (!social.user) return;
  const p = state.profile, patch = { name: p.name || '' };
  const sig = p.photo ? p.photo.length + ':' + p.photo.slice(-24) : '';
  if (sig !== (p.avatarSig || '')) {
    const path = social.user.id + '/avatar.jpg';
    if (p.photo) {
      const blob = await (await fetch(p.photo)).blob();
      const up = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (!up.error) patch.avatar_url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
    } else {
      await sb.storage.from('avatars').remove([path]);
      patch.avatar_url = '';
    }
    if (patch.avatar_url !== undefined) { p.avatarSig = sig; save(); }
  }
  const { error } = await sb.from('profiles').update(patch).eq('id', social.user.id);
  if (error) console.warn('perfil não sincronizado:', error.message);
}

async function loadSocial() {
  if (!social.user || social.loading) return;
  social.loading = true;
  social.error = '';
  try {
    const uid = social.user.id;
    const fr = await sb.from('friendships').select('id, requester, addressee, status');
    if (fr.error) throw fr.error;
    const other = f => f.requester === uid ? f.addressee : f.requester;
    const pr = await sb.from('profiles').select('id, username, name, avatar_url')
      .in('id', [...new Set(fr.data.map(other).concat(uid))]);
    if (pr.error) throw pr.error;
    const byId = Object.fromEntries(pr.data.map(x => [x.id, x]));
    const withFid = (f, id) => byId[id] && Object.assign({ fid: f.id }, byId[id]);
    social.profile = byId[uid] || null;
    social.friends = fr.data.filter(f => f.status === 'accepted').map(f => withFid(f, other(f))).filter(Boolean);
    social.incoming = fr.data.filter(f => f.status === 'pending' && f.addressee === uid).map(f => withFid(f, f.requester)).filter(Boolean);
    social.outgoing = fr.data.filter(f => f.status === 'pending' && f.requester === uid).map(f => withFid(f, f.addressee)).filter(Boolean);
    social.scores = {};
    if (social.friends.length) {
      const since = iso(periodRange('semana', 1 - WEEKS_SHOWN).start);
      const sc = await sb.from('daily_scores').select('user_id, day, study_minutes, workouts')
        .in('user_id', social.friends.map(f => f.id)).gte('day', since);
      if (sc.error) throw sc.error;
      sc.data.forEach(r => { (social.scores[r.user_id] = social.scores[r.user_id] || {})[r.day] = r; });
    }
    // O @ da conta é o que vale.
    if (social.profile && social.profile.username !== state.profile.username) {
      state.profile.username = social.profile.username;
      save();
    }
    social.loaded = true;
  } catch (e) {
    social.error = 'Sem conexão com o servidor agora. Tente de novo em instantes.';
  }
  social.loading = false;
  if (tab === 'amigos') renderAmigos();
}

function friendWeeks(id) {
  const todayKey = iso(today()), map = social.scores[id] || {}, weeks = [];
  for (let o = 1 - WEEKS_SHOWN; o <= 0; o++) {
    const r = periodRange('semana', o);
    weeks.push({ start: r.start, days: daysIn(r).map(d => {
      const k = iso(d);
      if (k > todayKey) return null;
      const x = map[k];
      return { study: x ? x.study_minutes / 60 : 0, gym: x ? x.workouts : 0 };
    }) });
  }
  return weeks;
}

function friendsData() {
  const p = state.profile;
  const me = { name: p.name || 'Você', username: p.username || '', photo: p.photo, me: true, weeks: myWeeks() };
  let others;
  if (social.user) {
    others = social.friends.map(f => ({ name: f.name || '@' + f.username, username: f.username,
      photo: f.avatar_url, weeks: friendWeeks(f.id) }));
  } else {
    if (!demoFriends) demoFriends = [
      demoFriend('Lucas (exemplo)', 'lucas', 7, 9, 3.5),
      demoFriend('Marina (exemplo)', 'marina', 21, 13, 2.5),
      demoFriend('Rafael (exemplo)', 'rafa', 42, 6, 4.5),
    ];
    others = demoFriends;
  }
  return [me].concat(others).map((f, i) =>
    Object.assign(f, { color: i === 0 ? 'var(--accent)' : FRIEND_COLORS[(i - 1) % FRIEND_COLORS.length] }));
}

// ----- entrar / criar conta -----
function renderAuth() {
  const p = state.profile;
  const seg = `<div class="seg" style="margin-bottom:12px">
    <button data-am="entrar" class="${authMode === 'entrar' ? 'on' : ''}">Entrar</button>
    <button data-am="criar" class="${authMode === 'criar' ? 'on' : ''}">Criar conta</button></div>`;
  view.innerHTML = `
    <div class="hero"><div>
      <div class="hero-title">Compita com seus amigos</div>
      <div class="hero-sub">Ranking da semana e gráficos de estudo e academia, comparando você com quem você adicionar pelo @.</div>
    </div></div>
    ${seg}
    <div class="card pf">
      ${authMode === 'criar' ? `
        <label>Nome<input class="field-input" id="aName" value="${esc(p.name)}" placeholder="Como seus amigos te veem"></label>
        <label>Nome de usuário<span class="at-field"><span>@</span><input class="field-input" id="aUser"
          value="${esc(p.username)}" placeholder="ex.: pedro" autocapitalize="none" autocomplete="username"></span></label>
        <label>E-mail<input class="field-input" id="aEmail" type="email" autocapitalize="none" autocomplete="email"></label>
        <label>Senha<input class="field-input" id="aPass" type="password" autocomplete="new-password" placeholder="Pelo menos 8 caracteres"></label>
        <label class="consent"><input type="checkbox" id="aOk">
          <span>Concordo que meu nome, @, foto de perfil e placar diário (minutos de estudo e treinos) fiquem no servidor do app
          e sejam vistos pelos amigos que eu aceitar. O resto continua só no meu celular, e posso apagar a conta quando quiser.</span></label>
        <button class="btn primary block" id="aGo">Criar conta</button>`
      : `
        <label>E-mail<input class="field-input" id="aEmail" type="email" autocapitalize="none" autocomplete="email"></label>
        <label>Senha<input class="field-input" id="aPass" type="password" autocomplete="current-password"></label>
        <button class="btn primary block" id="aGo">Entrar</button>`}
    </div>
    <div class="card">
      <h3>O que vai para o servidor</h3>
      <p class="small muted" style="margin:0">Só nome, @, foto de perfil e o placar de cada dia (minutos de estudo e número de treinos).
        Cargas, peso, metas, anotações, projetos e a Galeria nunca saem do celular.</p>
    </div>`;

  view.querySelectorAll('[data-am]').forEach(b => b.onclick = () => { authMode = b.dataset.am; renderAuth(); });
  const go = document.getElementById('aGo');
  go.onclick = async () => {
    const email = document.getElementById('aEmail').value.trim(), password = document.getElementById('aPass').value;
    if (!email || !password) return toast('Preencha e-mail e senha');
    go.disabled = true;
    try {
      if (authMode === 'entrar') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return toast(/invalid/i.test(error.message) ? 'E-mail ou senha incorretos' : 'Não consegui entrar: ' + error.message);
        toast('Bem-vindo de volta!');
      } else {
        const name = document.getElementById('aName').value.trim();
        const username = document.getElementById('aUser').value.trim().toLowerCase().replace(/^@/, '');
        if (!/^[a-z0-9_.]{3,20}$/.test(username)) return toast('O @ precisa ter de 3 a 20 letras minúsculas, números, ponto ou _');
        if (password.length < 8) return toast('A senha precisa ter pelo menos 8 caracteres');
        if (!document.getElementById('aOk').checked) return toast('Para criar a conta, marque a concordância');
        const free = await sb.rpc('username_available', { u: username });
        if (free.error) return toast('Sem conexão com o servidor agora');
        if (!free.data) return toast('@' + username + ' já está em uso. Escolha outro.');
        state.profile.username = username;
        if (name) state.profile.name = name;
        save();
        const { error } = await sb.auth.signUp({ email, password, options: { data: { username, name } } });
        if (error) return toast(/registered|exists/i.test(error.message) ? 'Esse e-mail já tem conta. Use Entrar.' : 'Não consegui criar a conta: ' + error.message);
        toast('Conta criada!');
      }
    } finally { go.disabled = false; }
  };
}

async function deleteAccount() {
  if (!confirm('Apagar sua conta? Seu perfil, amizades e placar saem do servidor. Seus registros continuam neste celular.')) return;
  await sb.storage.from('avatars').remove([social.user.id + '/avatar.jpg']);
  const { error } = await sb.rpc('delete_me');
  if (error) return toast('Não consegui apagar agora. Tente de novo.');
  state.profile.avatarSig = '';
  save();
  await sb.auth.signOut({ scope: 'local' });
  toast('Conta apagada');
}

function weekSum(days) {
  return days.reduce((a, d) => d ? { study: a.study + d.study, gym: a.gym + d.gym } : a, { study: 0, gym: 0 });
}
function metricOf(sum, metric) {
  return metric === 'estudo' ? sum.study : metric === 'academia' ? sum.gym : points(sum.study, sum.gym);
}
function metricText(v, metric) {
  return metric === 'estudo' ? fmtHours(v) : metric === 'academia' ? v + (v === 1 ? ' treino' : ' treinos') : v + ' pts';
}

function friendAvatar(f, cls) {
  return `<div class="avatar ${cls || ''}" style="${f.photo ? '' : `background:${f.color};color:#fff`}">
    ${f.photo ? `<img src="${f.photo}" alt="">` : esc((f.name || '?')[0].toUpperCase())}</div>`;
}

// Gráfico de linhas, uma cor por pessoa. values: números ou null (ainda não aconteceu).
// step: o eixo vai até um múltiplo de 2×step, para as linhas de grade caírem em números redondos.
function multiLine(series, labels, fmtY, step) {
  const W = 320, H = 170, top = 12, bottom = 22, left = 36, right = 20;
  const all = series.flatMap(s => s.values.filter(v => v != null));
  const max = Math.max(step, ...all);
  const hi = Math.ceil(max / (2 * step)) * 2 * step;
  const x = i => left + i * (W - left - right) / (labels.length - 1);
  const y = v => top + (1 - v / hi) * (H - top - bottom);
  const grid = [0, 0.5, 1].map(f => `
    <line x1="${left}" x2="${W - right}" y1="${y(hi * f)}" y2="${y(hi * f)}" stroke="var(--line)"/>
    <text x="${left - 6}" y="${y(hi * f) + 3}" text-anchor="end">${fmtY(hi * f)}</text>`).join('');
  const lines = series.slice().sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0)).map(s => {
    let d = '', lastI = -1;
    s.values.forEach((v, i) => { if (v == null) return; d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); lastI = i; });
    if (lastI < 0) return '';
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.me ? 3.2 : 2.2}" stroke-linejoin="round" stroke-linecap="round" opacity="${s.me ? 1 : 0.9}"/>
      <circle cx="${x(lastI)}" cy="${y(s.values[lastI])}" r="${s.me ? 4.5 : 3.5}" fill="${s.color}"><title>${esc(s.name)}: ${fmtY(s.values[lastI])}</title></circle>`;
  }).join('');
  const xl = labels.map((l, i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${l}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Comparação entre amigos">${grid}${lines}${xl}</svg>`;
}

function renderAmigos() {
  if (!sbClient()) {
    view.innerHTML = `<div class="card"><p class="small muted" style="margin:0">Não consegui carregar a parte social.
      Verifique a internet e abra o app de novo.</p></div>`;
    return;
  }
  if (!social.user) return renderAuth();
  if (!social.loaded && !social.loading && !social.error) loadSocial();
  const people = friendsData();
  const p = state.profile;

  // ranking da semana atual
  const ranked = people.map(f => ({ f, v: metricOf(weekSum(f.weeks[WEEKS_SHOWN - 1].days), amgMetric) }))
    .sort((a, b) => b.v - a.v);
  const medal = i => ['🥇', '🥈', '🥉'][i] || (i + 1) + 'º';

  // séries do gráfico
  let labels, series;
  const fmtY = amgChart === 'estudo' ? (v => fmtHours(v)) : (v => fmt(Math.round(v)));
  if (amgRange === 'semanas') {
    labels = people[0].weeks.map((w, i) => i % 2 === 1 || i === WEEKS_SHOWN - 1 ? ddmm(w.start) : '');
    series = people.map(f => ({ name: f.name, color: f.color, me: f.me,
      values: f.weeks.map(w => metricOf(weekSum(w.days), amgChart)) }));
  } else {
    labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    series = people.map(f => {
      let acc = { study: 0, gym: 0 };
      return { name: f.name, color: f.color, me: f.me, values: f.weeks[WEEKS_SHOWN - 1].days.map(d => {
        if (!d) return null;
        acc = { study: acc.study + d.study, gym: acc.gym + d.gym };
        return metricOf(acc, amgChart);
      }) };
    });
  }

  const seg = (name, cur, opts) => `<div class="seg">${opts.map(([v, l]) =>
    `<button data-${name}="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;

  const reqRow = (f, btns) => `
    <div class="rank-row">${friendAvatar(Object.assign({ color: 'var(--muted)', photo: f.avatar_url }, f), 'sm')}
      <div class="rank-name"><div>${esc(f.name || '@' + f.username)}</div><div class="small muted">@${esc(f.username)}</div></div>
      ${btns}</div>`;

  view.innerHTML = `
    ${social.error ? `<div class="card pastel peach small">${social.error}
      <button class="see" id="retrySocial" style="margin-left:6px">Tentar de novo</button></div>` : ''}
    ${social.loading && !social.loaded ? '<p class="small muted">Carregando amigos…</p>' : ''}

    ${social.incoming.length ? `
    <div class="section-head"><h2>Pedidos de amizade</h2></div>
    <div class="card rank">${social.incoming.map(f => reqRow(f, `
      <button class="btn primary" data-accept="${f.fid}">Aceitar</button>
      <button class="x" data-remove="${f.fid}" aria-label="Recusar">×</button>`)).join('')}</div>` : ''}

    <div class="card me-card">
      ${avatar()}
      <div style="flex:1;min-width:0">
        <div class="goal-name">${esc(p.name || 'Você')}</div>
        <div class="small muted">${p.username ? '@' + esc(p.username) : 'Crie seu @ no Perfil'}</div>
      </div>
      <button class="iconbtn sm" id="amgProfile" aria-label="Editar perfil">${icon('gear')}</button>
    </div>
    <div class="inline add-friend">
      <input id="friendUser" placeholder="@ do amigo" autocapitalize="none" autocomplete="off">
      <button class="btn primary" id="addFriend">Adicionar</button>
    </div>
    ${social.outgoing.length ? `<div class="small muted" style="margin:4px 2px 8px">Aguardando resposta: ${social.outgoing.map(f =>
      `@${esc(f.username)} <button class="see" data-remove="${f.fid}">cancelar</button>`).join(' · ')}</div>` : ''}
    ${social.loaded && !social.friends.length ? `
    <div class="card pastel lavender small">Você ainda não tem amigos conectados. Peça o @ deles e adicione acima.
      O ranking e os gráficos aparecem assim que eles aceitarem.</div>` : ''}

    <div class="section-head"><h2>Ranking da semana</h2><span class="small muted">zera na segunda</span></div>
    ${seg('rk', amgMetric, [['geral', 'Geral'], ['estudo', 'Estudo'], ['academia', 'Treino']])}
    <div class="card rank" style="margin-top:10px">
      ${ranked.map(({ f, v }, i) => `
        <div class="rank-row ${f.me ? 'me' : ''}">
          <span class="rank-pos">${medal(i)}</span>
          ${friendAvatar(f, 'sm')}
          <div class="rank-name"><div>${esc(f.me ? (p.name || 'Você') + ' (você)' : f.name)}</div>
            <div class="small muted">${f.username ? '@' + esc(f.username) : ''}</div></div>
          <b class="rank-val">${metricText(v, amgMetric)}</b>
        </div>`).join('')}
    </div>

    <div class="section-head"><h2>Evolução</h2></div>
    ${seg('ch', amgChart, [['estudo', 'Estudo'], ['academia', 'Treino'], ['geral', 'Pontos']])}
    <div class="card chart" style="margin-top:10px">
      ${seg('rg', amgRange, [['semana', 'Esta semana'], ['semanas', '8 semanas']])}
      <div style="margin-top:12px">${multiLine(series, labels, fmtY, amgChart === 'geral' ? 10 : 1)}</div>
      <div class="small muted" style="margin-top:4px">${amgRange === 'semana'
        ? 'Acumulado dia a dia nesta semana.'
        : amgChart === 'estudo' ? 'Horas de estudo por semana.' : amgChart === 'academia' ? 'Treinos por semana.' : 'Pontos por semana.'}</div>
      <div class="legend people">${people.map(f =>
        `<span><i style="background:${f.color}"></i>${esc(f.me ? 'Você' : f.name.replace(' (exemplo)', ''))}</span>`).join('')}</div>
    </div>

    <div class="card">
      <h3>Como funciona a pontuação</h3>
      <p class="small muted" style="margin:0">1 hora de estudo = ${PTS_HOUR} pontos · 1 treino = ${PTS_WORKOUT} pontos.
        Assim, 10 horas de estudo valem o mesmo que 4 treinos. Os números vêm do que cada um registra no app.</p>
    </div>
    <div class="card">
      <h3>O que seus amigos veem</h3>
      <p class="small muted" style="margin:0">Seu nome, @, foto de perfil, horas de estudo, número de treinos e pontos.
        Cargas, peso, metas, observações e o resto continuam só no seu celular.</p>
    </div>
    ${social.friends.length ? `
    <div class="card">
      <h3>Amigos (${social.friends.length})</h3>
      <ul class="list">${social.friends.map(f => `<li><span class="small">${esc(f.name || '')} <span class="muted">@${esc(f.username)}</span></span>
        <button class="see" data-unfriend="${f.fid}">Desfazer</button></li>`).join('')}</ul>
    </div>` : ''}
    <div class="card">
      <h3>Conta</h3>
      <p class="small muted" style="margin-top:0">${esc(social.user.email || '')}</p>
      <div class="btnrow">
        <button class="btn" id="logout">Sair</button>
        <button class="btn danger" id="delAccount">Apagar conta</button>
      </div>
    </div>`;

  view.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { amgMetric = b.dataset.rk; renderAmigos(); });
  view.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { amgChart = b.dataset.ch; renderAmigos(); });
  view.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => { amgRange = b.dataset.rg; renderAmigos(); });
  document.getElementById('amgProfile').onclick = () => goTab('perfil');
  const refresh = () => { social.loaded = false; loadSocial(); };
  const retry = document.getElementById('retrySocial');
  if (retry) retry.onclick = () => { social.error = ''; refresh(); };

  document.getElementById('addFriend').onclick = async () => {
    const u = document.getElementById('friendUser').value.trim().toLowerCase().replace(/^@/, '');
    if (!u) return toast('Digite o @ do amigo');
    if (social.profile && u === social.profile.username) return toast('Esse @ é o seu');
    const found = await sb.from('profiles').select('id, username').eq('username', u).maybeSingle();
    if (found.error) return toast('Sem conexão com o servidor agora');
    if (!found.data) return toast('Não encontrei @' + u);
    const ins = await sb.from('friendships').insert({ requester: social.user.id, addressee: found.data.id });
    if (ins.error) return toast(ins.error.code === '23505' ? 'Vocês já estão conectados ou há um pedido pendente' : 'Não consegui enviar o pedido');
    toast('Pedido enviado para @' + u);
    refresh();
  };
  view.querySelectorAll('[data-accept]').forEach(b => b.onclick = async () => {
    const { error } = await sb.from('friendships').update({ status: 'accepted' }).eq('id', b.dataset.accept);
    toast(error ? 'Não consegui aceitar agora' : 'Amizade aceita!');
    refresh();
  });
  view.querySelectorAll('[data-remove]').forEach(b => b.onclick = async () => {
    await sb.from('friendships').delete().eq('id', b.dataset.remove);
    refresh();
  });
  view.querySelectorAll('[data-unfriend]').forEach(b => b.onclick = async () => {
    if (!confirm('Desfazer essa amizade? Vocês deixam de ver o placar um do outro.')) return;
    await sb.from('friendships').delete().eq('id', b.dataset.unfriend);
    refresh();
  });
  document.getElementById('logout').onclick = async () => {
    if (!confirm('Sair da conta? Seus registros continuam neste celular.')) return;
    await sb.auth.signOut({ scope: 'local' });
  };
  document.getElementById('delAccount').onclick = deleteAccount;
}

// ---------- Clube do livro ----------
// Modo demonstração: as sugestões e o progresso dos amigos de exemplo são gerados aqui e não são salvos.
// Quando o servidor existir, eles passam a vir dos amigos de verdade.
const DEMO_SUGGESTIONS = [
  { id: 'demo-1', title: 'Sapiens', author: 'Yuval Noah Harari', why: 'Pré-história e como chegamos até aqui.', by: 'Marina (exemplo)', votes: 2, demo: true },
  { id: 'demo-2', title: 'Hábitos Atômicos', author: 'James Clear', why: 'Ajuda a manter a constância nos estudos e no treino.', by: 'Lucas (exemplo)', votes: 1, demo: true },
  { id: 'demo-3', title: 'O Homem Mais Rico da Babilônia', author: 'George S. Clason', why: 'Finanças pessoais de um jeito leve.', by: 'Rafael (exemplo)', votes: 1, demo: true },
];
let clubFinishing = false;

function C() { return state.club; }
function bookPct(b) { return b && b.pages ? Math.min(1, (b.page || 0) / b.pages) : 0; }
function hashStr(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100000; return h; }

function bookCover(b, cls) {
  return b.cover ? `<img class="cover ${cls || ''}" src="${b.cover}" alt="">`
    : `<div class="cover ph ${cls || ''}" style="background:${['#dcd0ff', '#e6f5c4', '#ffe4d4', '#d7ebff'][hashStr(b.title) % 4]}">
        <span>${esc(b.title)}</span></div>`;
}

function allSuggestions() {
  const mine = C().suggestions.map(s => Object.assign({ votes: 0 }, s));
  const demo = DEMO_SUGGESTIONS.filter(d => !C().read.some(r => r.title === d.title) && !(C().current && C().current.title === d.title));
  return mine.concat(demo).map(s => Object.assign({}, s, { total: (s.votes || 0) + (C().myVotes.includes(s.id) ? 1 : 0) }))
    .sort((a, b) => b.total - a.total);
}

function startBook(s) {
  const pages = Math.round(num(prompt('Quantas páginas tem "' + s.title + '"?', '') || ''));
  if (!pages) return toast('Informe o número de páginas para acompanhar o progresso');
  C().current = { id: uid(), title: s.title, author: s.author || '', pages, page: 0, cover: s.cover || '',
    startedAt: iso(today()), goalDate: '', notes: '', log: [] };
  C().suggestions = C().suggestions.filter(x => x.id !== s.id);
  C().myVotes = C().myVotes.filter(id => id !== s.id);
  save();
  renderClube();
}

// Pedido pronto para o Claude recomendar livros; a resposta volta colada no app.
function bookPrompt() {
  const read = C().read.map(r => `- ${r.title} (${r.author || 'autor?'}): nota ${r.rating || '?'}/5`).join('\n') || '- (ainda nenhum)';
  return `Temos um clube do livro entre amigos. ${state.profile.job ? 'Eu sou ' + state.profile.job + '. ' : ''}Interesses do grupo: ${C().interests || 'variados'}.
Livros que já lemos e as notas que demos:
${read}

Recomende 5 livros para a próxima leitura, que existam em português e caibam nesses interesses. Varie entre trabalho e lazer.
Responda SOMENTE neste formato, um por linha, sem nada antes ou depois:
Título — Autor — Por que combina com a gente (uma frase)`;
}
function parseBooks(text) {
  return text.replace(/\*\*/g, '').split(/\r?\n/).map(l => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim())
    .map(l => l.split(/\s+[—–-]\s+/)).filter(p => p.length >= 2 && p[0])
    .map(p => ({ title: p[0].trim(), author: p[1].trim(), why: p.slice(2).join(' — ').trim() }));
}

function renderClube() {
  const cur = C().current;
  // O clube ainda não está no servidor: com conta, mostra só você; sem conta, os amigos de exemplo.
  const people = social.user ? friendsData().slice(0, 1) : friendsData();
  const sugs = allSuggestions();
  let goalTxt = '';
  if (cur && cur.goalDate) {
    const daysLeft = Math.round((parseIso(cur.goalDate) - today()) / 86400000) + 1;
    const left = cur.pages - cur.page;
    goalTxt = left <= 0 ? 'Livro concluído!' : daysLeft > 0
      ? `Para terminar até ${ddmm(parseIso(cur.goalDate))}: ${Math.ceil(left / daysLeft)} páginas por dia`
      : 'O prazo passou. Defina uma nova data.';
  }

  view.innerHTML = `
    <div class="card pastel peach small">
      <b>Modo demonstração.</b> As sugestões de Lucas, Marina e Rafael são exemplos.
      O clube com seus amigos de verdade (votação e progresso de cada um) é a próxima etapa do servidor.
    </div>

    <div class="section-head"><h2>Leitura atual</h2></div>
    ${cur ? `
    <div class="card">
      <div class="book-head">
        <button class="cover-btn" id="coverBtn" aria-label="Trocar capa">${bookCover(cur)}</button>
        <div style="flex:1;min-width:0">
          <div class="feature-title" style="font-size:20px">${esc(cur.title)}</div>
          <div class="small muted">${esc(cur.author || 'Autor não informado')}</div>
          <div class="book-pct"><b>${Math.round(bookPct(cur) * 100)}%</b> <span class="small muted">pág. ${cur.page} de ${cur.pages}</span></div>
          ${bar(bookPct(cur))}
        </div>
      </div>
      <div class="inline">
        <input id="bPage" class="short" type="number" inputmode="numeric" min="0" placeholder="pág.">
        <span class="small muted" style="flex:1">página em que parei</span>
        <button class="btn primary" id="bUpdate">Atualizar</button>
      </div>
      <div class="field" style="margin-top:6px">
        <span class="small">Terminar até</span>
        <input type="date" id="bGoal" class="field-input" style="width:auto" value="${esc(cur.goalDate)}">
      </div>
      ${goalTxt ? `<div class="small muted">${goalTxt}</div>` : ''}
      ${clubFinishing ? `
        <div class="finish">
          <div class="small">Que nota você dá?</div>
          <div class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="star" data-star="${n}">★</button>`).join('')}</div>
        </div>` : `
        <div class="btnrow">
          <button class="btn" id="bDrop">Trocar livro</button>
          <button class="btn primary" id="bFinish">Terminei</button>
        </div>`}
    </div>

    <div class="card">
      <h3>Progresso do grupo</h3>
      ${people.map(f => {
        const pct = f.me ? bookPct(cur) : Math.min(1, (hashStr(cur.title + f.name) % 90) / 100 + 0.05);
        return `<div class="member">${friendAvatar(f, 'sm')}<div style="flex:1;min-width:0">
          <div class="top"><span>${esc(f.me ? 'Você' : f.name.replace(' (exemplo)', ''))}</span><span class="muted small">${Math.round(pct * 100)}%</span></div>
          <div class="progress thin"><div style="width:${Math.round(pct * 100)}%;background:${f.color}"></div></div></div></div>`;
      }).join('')}
    </div>

    <div class="card">
      <h3>Minhas anotações</h3>
      <textarea id="bNotes" placeholder="Trechos, ideias, o que discutir no encontro">${esc(cur.notes)}</textarea>
    </div>` : `
    <div class="card">
      <p class="small muted" style="margin:0">Nenhuma leitura em andamento. Escolha um livro na votação abaixo
        e toque em <b>Ler agora</b>.</p>
    </div>`}

    <div class="section-head"><h2>Próximo livro</h2><span class="small muted">vote nos que quer ler</span></div>
    <div class="card">
      ${sugs.length ? `<ul class="list sugs">${sugs.map(s => `
        <li>
          <div style="flex:1;min-width:0">
            <div class="task-t"><b>${esc(s.title)}</b></div>
            <div class="small muted">${esc(s.author || '')}${s.by ? ' · sugerido por ' + esc(s.by) : ''}</div>
            ${s.why ? `<div class="small" style="margin-top:2px">${esc(s.why)}</div>` : ''}
            <button class="see" data-read="${s.id}" style="margin-top:6px">Ler agora</button>
            ${s.demo ? '' : `<button class="see" data-delsug="${s.id}" style="margin:6px 0 0 12px">Remover</button>`}
          </div>
          <button class="vote ${C().myVotes.includes(s.id) ? 'on' : ''}" data-vote="${s.id}" aria-label="Votar">♥<span>${s.total}</span></button>
        </li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">Nenhuma sugestão ainda.</p>'}
      <div class="task-form">
        <input class="field-input" id="sTitleB" placeholder="Título do livro">
        <input class="field-input" id="sAuthorB" placeholder="Autor" style="margin-top:8px">
        <input class="field-input" id="sWhyB" placeholder="Por que ler? (opcional)" style="margin-top:8px">
        <button class="btn block" id="sAddB">+ Sugerir livro</button>
      </div>
    </div>

    <details class="card settings-card">
      <summary><b>Pedir recomendações ao Claude</b></summary>
      <div class="pf" style="margin-top:10px">
        <label>Interesses do grupo<input class="field-input" id="cInterests" value="${esc(C().interests)}"
          placeholder="Ex.: odontologia, história medieval, finanças, futebol"></label>
      </div>
      <ol class="steps small">
        <li>Toque em <b>Copiar pedido</b> e cole numa conversa com o Claude.</li>
        <li>Copie a resposta e cole abaixo. Os livros entram na votação.</li>
      </ol>
      <button class="btn block" id="cCopy">Copiar pedido</button>
      <textarea id="cPaste" placeholder="Título — Autor — Por quê" style="margin-top:10px"></textarea>
      <button class="btn primary block" id="cImport">Adicionar à votação</button>
    </details>

    <div class="section-head"><h2>Já lidos</h2><span class="small muted">${C().read.length}</span></div>
    <div class="card">
      ${C().read.length ? `<ul class="list">${C().read.slice().reverse().map(r => `
        <li><div style="flex:1;min-width:0"><div class="task-t">${esc(r.title)}</div>
          <div class="small muted">${esc(r.author || '')} · terminado em ${ddmm(parseIso(r.finishedAt))}/${r.finishedAt.slice(2, 4)}</div></div>
          <span class="rating">${'★'.repeat(r.rating || 0)}<span class="muted">${'★'.repeat(5 - (r.rating || 0))}</span></span></li>`).join('')}</ul>`
        : '<p class="small muted" style="margin:0">Os livros que vocês terminarem aparecem aqui, com a nota de cada um.</p>'}
    </div>`;

  if (cur) {
    document.getElementById('bUpdate').onclick = () => {
      const v = document.getElementById('bPage').value;
      if (v === '') return toast('Digite a página');
      cur.page = Math.max(0, Math.min(cur.pages, Math.round(num(v))));
      const last = cur.log[cur.log.length - 1];
      if (last && last.date === iso(today())) last.page = cur.page; else cur.log.push({ date: iso(today()), page: cur.page });
      save();
      toast('Leitura atualizada');
      renderClube();
    };
    document.getElementById('bGoal').onchange = e => { cur.goalDate = e.target.value; save(); renderClube(); };
    document.getElementById('bNotes').onchange = e => { cur.notes = e.target.value; save(); toast('Salvo'); };
    const fin = document.getElementById('bFinish');
    if (fin) fin.onclick = () => { clubFinishing = true; renderClube(); };
    view.querySelectorAll('[data-star]').forEach(b => b.onclick = () => {
      C().read.push({ id: cur.id, title: cur.title, author: cur.author, pages: cur.pages, rating: +b.dataset.star,
        notes: cur.notes, startedAt: cur.startedAt, finishedAt: iso(today()) });
      C().current = null;
      clubFinishing = false;
      save();
      toast('Livro concluído! Escolha o próximo na votação');
      renderClube();
    });
    const drop = document.getElementById('bDrop');
    if (drop) drop.onclick = () => {
      if (!confirm('Parar "' + cur.title + '"? Ele volta para a votação.')) return;
      C().suggestions.push({ id: uid(), title: cur.title, author: cur.author, why: '', by: 'você', cover: cur.cover });
      C().current = null;
      save();
      renderClube();
    };
    const coverInput = document.getElementById('coverFile');
    document.getElementById('coverBtn').onclick = () => coverInput.click();
    coverInput.onchange = async () => {
      const f = coverInput.files[0];
      coverInput.value = '';
      if (!f) return;
      try { cur.cover = await shrinkPhoto(f); save(); renderClube(); } catch (e) { alert('Não consegui abrir essa imagem.'); }
    };
  }

  view.querySelectorAll('[data-vote]').forEach(b => b.onclick = () => {
    const id = b.dataset.vote, v = C().myVotes;
    C().myVotes = v.includes(id) ? v.filter(x => x !== id) : v.concat(id);
    save();
    renderClube();
  });
  view.querySelectorAll('[data-read]').forEach(b => b.onclick = () => {
    if (cur && !confirm('Você ainda está lendo "' + cur.title + '". Trocar mesmo assim? Ele volta para a votação.')) return;
    if (cur) C().suggestions.push({ id: uid(), title: cur.title, author: cur.author, why: '', by: 'você', cover: cur.cover });
    startBook(sugs.find(s => s.id === b.dataset.read));
  });
  view.querySelectorAll('[data-delsug]').forEach(b => b.onclick = () => {
    C().suggestions = C().suggestions.filter(s => s.id !== b.dataset.delsug);
    save();
    renderClube();
  });
  document.getElementById('sAddB').onclick = () => {
    const title = document.getElementById('sTitleB').value.trim();
    if (!title) return toast('Escreva o título');
    C().suggestions.push({ id: uid(), title, author: document.getElementById('sAuthorB').value.trim(),
      why: document.getElementById('sWhyB').value.trim(), by: 'você' });
    save();
    renderClube();
  };
  document.getElementById('cInterests').onchange = e => { C().interests = e.target.value.trim(); save(); };
  document.getElementById('cCopy').onclick = async () => {
    C().interests = document.getElementById('cInterests').value.trim();
    save();
    const text = bookPrompt();
    try { await navigator.clipboard.writeText(text); toast('Pedido copiado. Cole no Claude'); }
    catch (e) { prompt('Copie o texto abaixo:', text); }
  };
  document.getElementById('cImport').onclick = () => {
    const books = parseBooks(document.getElementById('cPaste').value);
    if (!books.length) return alert('Não encontrei livros. Cada linha precisa ter "Título — Autor — Por quê".');
    books.forEach(b => C().suggestions.push(Object.assign({ id: uid(), by: 'Claude' }, b)));
    save();
    toast(books.length + ' livros adicionados à votação');
    renderClube();
  };
}

// ---------- Galeria ----------
// Fotos e vídeos ficam no IndexedDB do aparelho (o localStorage é pequeno demais).
// Nada daqui vai para backup, nuvem ou parte social.
let galView = 'home';   // home | pasta
let galFolder = null;
let galFilter = '';
let galUnlocked = false;
let viewerIdx = -1;
const mediaUrls = {};

function mediaDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('portes-media', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('media');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function mediaTx(mode, fn) {
  const db = await mediaDb();
  return new Promise((res, rej) => {
    const tx = db.transaction('media', mode), out = fn(tx.objectStore('media'));
    tx.oncomplete = () => res(out && out.result);
    tx.onerror = () => rej(tx.error);
  });
}
const mediaPut = (id, blob) => mediaTx('readwrite', s => s.put(blob, id));
const mediaGet = id => mediaTx('readonly', s => s.get(id));
const mediaDel = id => mediaTx('readwrite', s => s.delete(id));
async function mediaUrl(id) {
  if (!mediaUrls[id]) {
    const b = await mediaGet(id);
    if (!b) return '';
    mediaUrls[id] = URL.createObjectURL(b);
  }
  return mediaUrls[id];
}
// Coloca as imagens/vídeos nos elementos marcados com data-mid depois de desenhar a tela.
function hydrateMedia(root) {
  root.querySelectorAll('[data-mid]').forEach(async el => { el.src = await mediaUrl(el.dataset.mid); });
}

function shrinkImage(file, max, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => b ? resolve(b) : reject(new Error('imagem')), 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('portes:' + text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const KINDS = { paciente: 'Caso clínico', projeto: 'Projeto', outro: 'Outro' };
function findFolder(id) { return state.gallery.folders.find(f => f.id === id); }
function folderThumb(f) {
  const first = f.items.find(i => i.type === 'image');
  return first ? `<img data-mid="${first.id}_t" alt="">` : `<span class="ph-ico">${icon('folder')}</span>`;
}

function renderGaleria() {
  const g = state.gallery;
  if (g.pinHash && !galUnlocked) return renderGalLock();
  if (galView === 'pasta' && findFolder(galFolder)) return renderPasta();
  galView = 'home';
  const folders = g.folders.filter(f => !galFilter || f.kind === galFilter);

  view.innerHTML = `
    <div class="chips" style="margin:0 0 12px">
      ${[['', 'Todas'], ['paciente', 'Casos clínicos'], ['projeto', 'Projetos'], ['outro', 'Outros']].map(([k, l]) =>
        `<button class="chip ${galFilter === k ? 'on' : ''}" data-gf="${k}">${l}</button>`).join('')}
    </div>
    <div class="folders">
      ${folders.map(f => `
        <button class="folder" data-folder="${f.id}">
          <div class="folder-thumb">${folderThumb(f)}</div>
          <b>${esc(f.name)}</b>
          <span class="small muted">${KINDS[f.kind]} · ${f.items.length} ${f.items.length === 1 ? 'item' : 'itens'}</span>
        </button>`).join('')}
    </div>
    ${folders.length ? '' : `<p class="small muted">${g.folders.length ? 'Nenhuma pasta neste filtro.' : 'Nenhuma pasta ainda. Crie a primeira abaixo.'}</p>`}

    <div class="card">
      <h3>Nova pasta</h3>
      <input class="field-input" id="fName" placeholder="Ex.: Caso 012 – Classe II, ou Projeto Logo Café">
      <select class="field-input" id="fKind" style="margin-top:8px">
        ${Object.keys(KINDS).map(k => `<option value="${k}">${KINDS[k]}</option>`).join('')}
      </select>
      <button class="btn primary block" id="fAdd">Criar pasta</button>
    </div>

    <div class="card pastel lavender small">
      <b>Privacidade.</b> Fotos de pacientes são dados de saúde (LGPD). Guarde só com o consentimento do paciente,
      prefira nomear a pasta com o código do caso, e não com o nome dele, e ative a senha abaixo.
      As fotos e os vídeos ficam só neste celular: não vão para o backup, para a nuvem nem para a parte social.
    </div>

    <details class="card settings-card">
      <summary><b>${icon('lock')} Senha da Galeria ${g.pinHash ? '(ativada)' : '(desativada)'}</b></summary>
      <p class="small muted">Pede a senha toda vez que você abrir a Galeria. É uma trava de privacidade contra quem pegar o celular,
        não uma criptografia.</p>
      <div class="inline">
        <input id="pin1" type="password" inputmode="numeric" placeholder="Nova senha (4 a 8 números)" autocomplete="off">
        <button class="btn" id="pinSave">${g.pinHash ? 'Trocar' : 'Ativar'}</button>
      </div>
      ${g.pinHash ? '<button class="btn danger block" id="pinOff">Desativar senha</button>' : ''}
      <p class="small muted" id="storageInfo" style="margin-bottom:0"></p>
    </details>`;

  hydrateMedia(view);
  view.querySelectorAll('[data-gf]').forEach(b => b.onclick = () => { galFilter = b.dataset.gf; renderGaleria(); });
  view.querySelectorAll('[data-folder]').forEach(b => b.onclick = () => { galFolder = b.dataset.folder; galView = 'pasta'; renderGaleria(); window.scrollTo(0, 0); });
  document.getElementById('fAdd').onclick = () => {
    const name = document.getElementById('fName').value.trim();
    if (!name) return toast('Dê um nome à pasta');
    const f = { id: uid(), name, kind: document.getElementById('fKind').value, note: '', createdAt: iso(today()), items: [] };
    g.folders.unshift(f);
    save();
    galFolder = f.id; galView = 'pasta';
    renderGaleria();
  };
  document.getElementById('pinSave').onclick = async () => {
    const pin = document.getElementById('pin1').value.trim();
    if (!/^\d{4,8}$/.test(pin)) return toast('Use de 4 a 8 números');
    g.pinHash = await sha(pin);
    galUnlocked = true;
    save();
    toast('Senha ativada');
    renderGaleria();
  };
  const off = document.getElementById('pinOff');
  if (off) off.onclick = () => { g.pinHash = ''; save(); toast('Senha desativada'); renderGaleria(); };
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => {
    const el = document.getElementById('storageInfo');
    if (el && e.usage != null) el.textContent = 'Espaço usado pelo app neste celular: ' + (e.usage / 1048576).toFixed(1) + ' MB.';
  });
}

function renderGalLock() {
  view.innerHTML = `
    <div class="card lock-card">
      <div class="ico-circle big">${icon('lock')}</div>
      <div class="feature-title" style="font-size:20px">Galeria protegida</div>
      <input id="pinIn" type="password" inputmode="numeric" class="field-input" placeholder="Senha" autocomplete="off">
      <button class="btn primary block" id="pinGo">Desbloquear</button>
    </div>`;
  const go = async () => {
    if (await sha(document.getElementById('pinIn').value.trim()) === state.gallery.pinHash) { galUnlocked = true; renderGaleria(); }
    else { toast('Senha incorreta'); document.getElementById('pinIn').value = ''; }
  };
  document.getElementById('pinGo').onclick = go;
  document.getElementById('pinIn').onkeydown = e => { if (e.key === 'Enter') go(); };
}

const TAGS = ['Antes', 'Durante', 'Depois'];

function renderPasta() {
  const f = findFolder(galFolder);
  view.innerHTML = `
    <button class="back" id="galBack">‹ Galeria</button>
    <div class="card">
      <div class="goal-top"><div><div class="feature-title" style="font-size:20px">${esc(f.name)}</div>
        <div class="small muted">${KINDS[f.kind]} · criada em ${ddmm(parseIso(f.createdAt))} · ${f.items.length} itens</div></div></div>
      <button class="btn primary block" id="addMedia">+ Adicionar fotos e vídeos</button>
    </div>
    ${f.items.length ? `<div class="grid">${f.items.map((it, i) => `
      <button class="tile-media" data-open="${i}">
        ${it.type === 'image' ? `<img data-mid="${it.id}_t" alt="">`
          : `<video data-mid="${it.id}" muted playsinline preload="metadata"></video><span class="play">${icon('play')}</span>`}
        ${it.tag ? `<span class="tag">${it.tag}</span>` : ''}
      </button>`).join('')}</div>` : '<p class="small muted">A pasta está vazia.</p>'}

    <details class="card settings-card">
      <summary><b>Editar pasta</b></summary>
      <div class="pf" style="margin-top:10px">
        <label>Nome<input class="field-input" id="efName" value="${esc(f.name)}"></label>
        <label>Tipo<select class="field-input" id="efKind">${Object.keys(KINDS).map(k =>
          `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${KINDS[k]}</option>`).join('')}</select></label>
        <label>Descrição<textarea id="efNote" placeholder="Ex.: planejamento, materiais usados, cliente">${esc(f.note)}</textarea></label>
      </div>
      <div class="btnrow">
        <button class="btn danger" id="efDel">Apagar pasta</button>
        <button class="btn primary" id="efSave">Salvar</button>
      </div>
    </details>`;

  hydrateMedia(view);
  document.getElementById('galBack').onclick = () => { galView = 'home'; renderGaleria(); };
  const input = document.getElementById('mediaFile');
  document.getElementById('addMedia').onclick = () => input.click();
  input.onchange = async () => {
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    toast('Salvando ' + files.length + ' arquivo' + (files.length > 1 ? 's' : '') + '…');
    let ok = 0;
    for (const file of files) {
      try {
        const id = uid(), video = file.type.startsWith('video/');
        if (video) {
          if (file.size > 300 * 1048576 && !confirm('"' + file.name + '" tem ' + Math.round(file.size / 1048576) + ' MB. Vídeos grandes ocupam muito espaço no celular. Salvar mesmo assim?')) continue;
          await mediaPut(id, file);
        } else {
          await mediaPut(id, await shrinkImage(file, 2048, 0.88));
          await mediaPut(id + '_t', await shrinkImage(file, 480, 0.8));
        }
        f.items.push({ id, type: video ? 'video' : 'image', date: iso(today()), caption: '', tag: '' });
        ok++;
      } catch (e) { toast('Não consegui salvar "' + file.name + '"'); }
    }
    save();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    toast(ok + ' salvo' + (ok === 1 ? '' : 's'));
    renderPasta();
  };
  view.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openViewer(+b.dataset.open));
  document.getElementById('efSave').onclick = () => {
    const name = document.getElementById('efName').value.trim();
    if (!name) return toast('A pasta precisa de um nome');
    f.name = name;
    f.kind = document.getElementById('efKind').value;
    f.note = document.getElementById('efNote').value.trim();
    save(); toast('Pasta salva'); renderPasta();
  };
  document.getElementById('efDel').onclick = async () => {
    if (!confirm('Apagar a pasta "' + f.name + '" com ' + f.items.length + ' fotos e vídeos? Não dá para desfazer.')) return;
    for (const it of f.items) { await mediaDel(it.id); await mediaDel(it.id + '_t'); }
    state.gallery.folders = state.gallery.folders.filter(x => x.id !== f.id);
    save();
    galView = 'home';
    renderGaleria();
  };
}

// Visualizador em tela cheia, com legenda, etiqueta antes/durante/depois e navegação.
function openViewer(i) {
  const f = findFolder(galFolder), it = f && f.items[i];
  const v = document.getElementById('viewer');
  if (!it) { v.hidden = true; v.innerHTML = ''; viewerIdx = -1; return; }
  viewerIdx = i;
  v.hidden = false;
  v.innerHTML = `
    <div class="viewer-top">
      <button class="iconbtn" id="vClose" aria-label="Fechar">×</button>
      <span class="small">${i + 1} de ${f.items.length}</span>
      <button class="iconbtn" id="vDel" aria-label="Apagar">🗑</button>
    </div>
    <div class="viewer-media">
      ${it.type === 'image' ? `<img data-mid="${it.id}" alt="">` : `<video data-mid="${it.id}" controls playsinline></video>`}
      ${i > 0 ? '<button class="nav prev" id="vPrev" aria-label="Anterior">‹</button>' : ''}
      ${i < f.items.length - 1 ? '<button class="nav next" id="vNext" aria-label="Próxima">›</button>' : ''}
    </div>
    <div class="viewer-bottom">
      <div class="chips" style="margin:0 0 8px">${['', ...TAGS].map(t =>
        `<button class="chip ${it.tag === t ? 'on' : ''}" data-tag="${t}">${t || 'Sem etiqueta'}</button>`).join('')}</div>
      <input class="field-input" id="vCap" placeholder="Legenda" value="${esc(it.caption)}">
      <div class="small" style="opacity:.6;margin-top:6px">Adicionada em ${ddmm(parseIso(it.date))}/${it.date.slice(0, 4)}</div>
    </div>`;
  hydrateMedia(v);
  const close = () => { v.hidden = true; v.innerHTML = ''; viewerIdx = -1; renderPasta(); };
  document.getElementById('vClose').onclick = close;
  const prev = document.getElementById('vPrev'), next = document.getElementById('vNext');
  if (prev) prev.onclick = () => openViewer(i - 1);
  if (next) next.onclick = () => openViewer(i + 1);
  v.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { it.tag = b.dataset.tag; save(); openViewer(i); });
  document.getElementById('vCap').onchange = e => { it.caption = e.target.value.trim(); save(); };
  document.getElementById('vDel').onclick = async () => {
    if (!confirm('Apagar este item? Não dá para desfazer.')) return;
    await mediaDel(it.id); await mediaDel(it.id + '_t');
    f.items.splice(i, 1);
    save();
    if (f.items.length) openViewer(Math.min(i, f.items.length - 1)); else close();
  };
}

// Ao sair do app, a Galeria volta a pedir a senha.
document.addEventListener('visibilitychange', () => { if (document.hidden) galUnlocked = false; });

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

// ---------- Perfil ----------
function ageFrom(birth) {
  if (!birth) return null;
  const b = parseIso(birth), t = today();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}
function currentWeight() { const w = state.profile.weights; return w.length ? w[w.length - 1].kg : null; }

// Reduz a foto para 320 px, recortada em quadrado, para caber no armazenamento do celular.
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const S = 320, side = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = S;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Tela de enquadramento: arrastar para posicionar, pinça ou barra para o zoom.
// Devolve a foto recortada (320 px, quadrada) ou null se cancelar.
function cropPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const v = document.getElementById('viewer');
      const S = Math.min(window.innerWidth - 40, 340);
      const w = img.naturalWidth, h = img.naturalHeight;
      const minScale = S / Math.min(w, h);
      let scale = minScale, x = (S - w * scale) / 2, y = (S - h * scale) / 2;

      v.hidden = false;
      v.innerHTML = `
        <div class="crop">
          <div class="crop-title">Enquadre a foto</div>
          <div class="crop-stage" style="width:${S}px;height:${S}px">
            <img src="${img.src}" alt="" draggable="false">
            <div class="crop-mask"></div>
          </div>
          <input type="range" class="crop-zoom" min="1" max="4" step="0.01" value="1" aria-label="Zoom">
          <div class="small crop-hint" style="width:${S}px">Arraste para posicionar · use dois dedos ou a barra para o zoom</div>
          <div class="btnrow" style="width:${S}px">
            <button class="btn" id="cropCancel">Cancelar</button>
            <button class="btn primary" id="cropOk">Usar foto</button>
          </div>
        </div>`;
      const stage = v.querySelector('.crop-stage'), pic = stage.querySelector('img'), zoom = v.querySelector('.crop-zoom');

      // A foto sempre cobre o círculo inteiro: sem bordas vazias.
      const clamp = () => {
        x = Math.min(0, Math.max(S - w * scale, x));
        y = Math.min(0, Math.max(S - h * scale, y));
      };
      const draw = () => {
        clamp();
        pic.style.width = w + 'px';
        pic.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        zoom.value = (scale / minScale).toFixed(2);
      };
      const zoomTo = (next, cx, cy) => {
        next = Math.max(minScale, Math.min(minScale * 4, next));
        x = cx - (cx - x) * next / scale;
        y = cy - (cy - y) * next / scale;
        scale = next;
        draw();
      };
      draw();

      const pts = new Map();
      let last = null;
      const local = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const snapshot = () => {
        const p = [...pts.values()];
        if (p.length === 1) return { cx: p[0].x, cy: p[0].y, d: 0 };
        return { cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
      };
      stage.onpointerdown = e => {
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* sem captura, segue igual */ }
        pts.set(e.pointerId, local(e));
        last = snapshot();
      };
      stage.onpointermove = e => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, local(e));
        const now = snapshot();
        if (last && pts.size >= 2 && last.d) {
          x += now.cx - last.cx; y += now.cy - last.cy;
          zoomTo(scale * now.d / last.d, now.cx, now.cy);
        } else if (last) {
          x += now.cx - last.cx; y += now.cy - last.cy;
          draw();
        }
        last = now;
      };
      const up = e => { pts.delete(e.pointerId); last = pts.size ? snapshot() : null; };
      stage.onpointerup = up;
      stage.onpointercancel = up;
      zoom.oninput = () => zoomTo(minScale * +zoom.value, S / 2, S / 2);

      const close = out => {
        v.hidden = true; v.innerHTML = '';
        URL.revokeObjectURL(img.src);
        resolve(out);
      };
      v.querySelector('#cropCancel').onclick = () => close(null);
      v.querySelector('#cropOk').onclick = () => {
        const OUT = 320, c = document.createElement('canvas');
        c.width = c.height = OUT;
        c.getContext('2d').drawImage(img, -x / scale, -y / scale, S / scale, S / scale, 0, 0, OUT, OUT);
        close(c.toDataURL('image/jpeg', 0.88));
      };
    };
    img.src = URL.createObjectURL(file);
  });
}

function renderPerfil() {
  const p = state.profile;
  const age = ageFrom(p.birth);
  const birthTxt = p.birth ? p.birth.split('-').reverse().join('/') : '';

  view.innerHTML = `
    <button class="back" id="perfilBack">‹ Hoje</button>
    <div class="card profile-photo">
      ${avatar('xl')}
      <div class="btnrow">
        <button class="btn" id="pickPhoto">${p.photo ? 'Trocar foto' : 'Escolher foto'}</button>
        ${p.photo ? '<button class="btn danger" id="rmPhoto">Remover</button>' : ''}
      </div>
      <input type="file" id="photoInput" accept="image/*" hidden>
    </div>

    <div class="card pf">
      <h3>Dados pessoais</h3>
      <label>Nome<input class="field-input" data-p="name" placeholder="Como quer ser chamado" value="${esc(p.name)}"></label>
      <label>Nome de usuário<span class="at-field"><span>@</span><input class="field-input" data-p="username"
        placeholder="ex.: pedro" autocapitalize="none" autocomplete="off" value="${esc(p.username)}"></span></label>
      <div class="small muted pf-note">É como seus amigos vão te encontrar. Letras minúsculas, números, ponto e _.</div>
      <label>Data de nascimento<input class="field-input" id="pBirth" inputmode="numeric" maxlength="10"
        placeholder="DD/MM/AAAA" autocomplete="bday" value="${birthTxt}"></label>
      ${age != null ? `<div class="small muted pf-note">${age} anos</div>` : ''}
      <label>Sexo<select class="field-input" data-p="sex">
        ${['', 'Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'].map(o =>
          `<option value="${o}" ${p.sex === o ? 'selected' : ''}>${o || '—'}</option>`).join('')}
      </select></label>
      <label>Profissão<input class="field-input" data-p="job" placeholder="Ex.: cirurgião-dentista" value="${esc(p.job)}"></label>
    </div>

    <p class="small muted" style="text-align:center">${social.user
      ? 'Nome, @ e foto aparecem para seus amigos. O resto fica só neste celular.'
      : 'Esses dados ficam só neste celular.'}</p>`;

  document.getElementById('perfilBack').onclick = () => goTab('hoje');
  view.querySelectorAll('[data-p]').forEach(el => el.addEventListener('change', async () => {
    const k = el.dataset.p;
    const value = k === 'height' ? (el.value === '' ? null : Math.round(num(el.value)))
      : k === 'username' ? el.value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.]/g, '').slice(0, 20)
      : el.value.trim();
    // Com conta, o @ muda primeiro no servidor (ele garante que é único).
    if (k === 'username' && social.user && value !== p.username) {
      if (!/^[a-z0-9_.]{3,20}$/.test(value)) { toast('O @ precisa ter de 3 a 20 caracteres'); return renderPerfil(); }
      const { error } = await sb.from('profiles').update({ username: value }).eq('id', social.user.id);
      if (error) { toast(error.code === '23505' ? '@' + value + ' já está em uso' : 'Sem conexão com o servidor agora'); return renderPerfil(); }
      social.loaded = false;
    }
    p[k] = value;
    save();
    if (k === 'name') pushProfile();
    toast('Salvo');
    renderPerfil();
  }));
  // Data digitada: as barras entram sozinhas (DD/MM/AAAA) e a data é conferida ao sair do campo.
  const birth = document.getElementById('pBirth');
  birth.addEventListener('input', () => {
    const d = birth.value.replace(/\D/g, '').slice(0, 8);
    birth.value = d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4)
      : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  });
  birth.addEventListener('change', () => {
    if (!birth.value) { p.birth = ''; save(); return renderPerfil(); }
    const m = birth.value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const dt = m && new Date(+m[3], +m[2] - 1, +m[1]);
    const ok = dt && dt.getDate() === +m[1] && dt.getMonth() === +m[2] - 1 && dt < today() && +m[3] > 1900;
    if (!ok) return toast('Data inválida. Use DD/MM/AAAA');
    p.birth = m[3] + '-' + m[2] + '-' + m[1];
    save();
    toast('Salvo');
    renderPerfil();
  });

  const input = document.getElementById('photoInput');
  document.getElementById('pickPhoto').onclick = () => input.click();
  input.onchange = async () => {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    try {
      const photo = await cropPhoto(f);
      if (!photo) return;
      p.photo = photo;
      pushProfile();
      save();
      toast('Foto salva');
    } catch (e) { alert('Não consegui abrir essa imagem. Tente outra.'); }
    renderPerfil();
  };
  const rm = document.getElementById('rmPhoto');
  if (rm) rm.onclick = () => { p.photo = ''; save(); pushProfile(); renderPerfil(); };
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
  const byTopic = {};
  state.sessions.filter(s => s.date >= iso(r.start) && s.date <= iso(r.end))
    .forEach(s => { byTopic[s.topic] = (byTopic[s.topic] || 0) + s.minutes; });
  const topics = Object.keys(byTopic);
  if (topics.length) lines.push('Estudo por tema: ' + topics.map(x => x + ' ' + fmtHours(byTopic[x] / 60)).join('; ') + '.');
  lines.push('Metas: ' + state.goals.map(g => g.name + ': ' + fmt(g.current) + ' de ' + fmtGoal(g.target, g.unit)).join('; ') + '.');
  return lines.join('\n');
}

function renderAjustes() {
  view.innerHTML = `
    <div class="card">
      <h3>Perfil</h3>
      <p class="small muted" style="margin-top:0">Nome, foto, nascimento, altura, peso e objetivo.</p>
      <button class="btn block" id="openProfile">Editar perfil</button>
    </div>
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
    <p class="small muted" style="text-align:center">Portes App · v1</p>`;

  document.getElementById('openProfile').onclick = () => goTab('perfil');

  document.getElementById('copySummary').onclick = async () => {
    const text = weekSummary();
    try { await navigator.clipboard.writeText(text); toast('Resumo copiado'); }
    catch (e) { prompt('Copie o texto abaixo:', text); }
  };

  document.getElementById('export').onclick = async () => {
    const name = 'portes-app-backup-' + iso(today()) + '.json';
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
      state = withDefaults(d); save(); toast('Backup importado');
    } catch (e) { alert('Arquivo de backup inválido.'); }
  };

  document.getElementById('wipe').onclick = () => {
    if (!confirm('Apagar todas as metas e registros? Não dá para desfazer.')) return;
    state = withDefaults({ goals: seedGoals(), days: {} }); save(); toast('Dados apagados');
  };
}

// ---------- início ----------
function tick() {
  tickGym();
  if (F().track && !F().track.pausedAt) {
    const el = document.getElementById('tTime');
    if (el) el.textContent = hms(trackElapsed(F().track));
  }
  if (checkTimer()) { if (tab === 'estudo') renderEstudo(); return; }
  const el = document.getElementById('clock');
  if (el && state.timer) el.textContent = clock(timerLeft(state.timer));
}
checkTimer();
sbClient(); // retoma a sessão salva, se houver
render();
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js');
}
