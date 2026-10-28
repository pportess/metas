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
const titles = { hoje: 'Hoje', estudo: 'Estudo', academia: 'Academia', metas: 'Metas', progresso: 'Progresso',
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
    ['perfil', 'user', 'Perfil', 'Nome, @, foto, nascimento, peso'],
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
      <h3>Academia</h3>
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
  if (state.activeWorkout) return renderSessao();
  ({ home: renderAcadHome, treinos: renderTreinos, editar: renderEditor, historico: renderHistorico })[acad]();
}

function backBar() { return `<button class="back" data-go="home">‹ Academia</button>`; }
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

// --- tela inicial (com a presença) ---
function renderAcadHome() {
  const sug = suggestedWorkout();
  const t = today();
  const first = new Date(t.getFullYear(), t.getMonth() + presOffset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const monthDays = daysIn({ start: first, end: last });
  const monthCount = monthDays.filter(d => getDay(iso(d)).gym).length;
  const done = state.gymLogs.length;

  // semanas seguidas batendo a meta (a semana atual só conta se já bateu)
  let streakW = 0;
  for (let o = weekCount(0) >= state.gymGoal ? 0 : -1; weekCount(o) >= state.gymGoal; o--) streakW++;

  const durs = gymList().map(lg => lg.duration).filter(Boolean).slice(-10);
  const avg = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length / 60) : null;

  // calendário do mês (semana começando na segunda)
  const lead = (first.getDay() + 6) % 7;
  let cal = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(x => `<span class="cal-h">${x}</span>`).join('');
  cal += '<span></span>'.repeat(lead);
  monthDays.forEach(d => {
    const k = iso(d);
    cal += `<span class="cal-d ${getDay(k).gym ? 'on' : ''} ${k === iso(t) ? 'today' : ''} ${k > iso(t) ? 'future' : ''}">${d.getDate()}</span>`;
  });

  // últimas 12 semanas
  const weeks = [];
  for (let o = -11; o <= 0; o++) weeks.push({ n: weekCount(o), start: periodRange('semana', o).start });
  const W = 320, H = 130, bottom = 22, top = 8;
  const maxN = Math.max(state.gymGoal, 7);
  const slot = W / weeks.length, bw = slot * 0.6;
  const y = n => H - bottom - (n / maxN) * (H - top - bottom);
  const bars = weeks.map((wk, i) => {
    const x = i * slot + (slot - bw) / 2;
    return `<rect x="${x}" y="${y(wk.n)}" width="${bw}" height="${Math.max(H - bottom - y(wk.n), 2)}" rx="2"
        fill="${wk.n >= state.gymGoal ? 'var(--bar)' : 'var(--bar-dim)'}"><title>Semana de ${ddmm(wk.start)}: ${wk.n} treinos</title></rect>
      ${wk.n ? `<text x="${x + bw / 2}" y="${y(wk.n) - 3}" text-anchor="middle">${wk.n}</text>` : ''}
      ${i % 3 === 2 || i === weeks.length - 1 ? `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${ddmm(wk.start)}</text>` : ''}`;
  }).join('');

  view.innerHTML = `
    <div class="tiles">
      <button class="tile" data-go="treinos">
        <span class="tile-ico">${icon('dumbbell')}</span><b>Treinos</b>
        <span class="small muted">${state.workouts.length} montado${state.workouts.length === 1 ? '' : 's'}</span>
      </button>
      <button class="tile" data-go="historico">
        <span class="tile-ico">${icon('chart')}</span><b>Histórico</b>
        <span class="small muted">${done} treino${done === 1 ? '' : 's'} feito${done === 1 ? '' : 's'}</span>
      </button>
    </div>
    ${sug ? `
    <div class="card pastel peach">
      <div class="small" style="opacity:.7">Próximo treino</div>
      <div class="feature-title">${esc(sug.name)}</div>
      <div class="feature-sub">${sug.exercises.length} exercícios · ~${estimateMin(sug)} min</div>
      <button class="btn pill" id="startSug">${icon('play')} Iniciar treino</button>
    </div>` : ''}

    <div class="card">
      <h3>Presença</h3>
      <div class="datenav" style="margin-bottom:8px">
        <button class="iconbtn" id="prevM" aria-label="Mês anterior">‹</button>
        <strong>${MONTHS[first.getMonth()]} de ${first.getFullYear()}</strong>
        <button class="iconbtn" id="nextM" aria-label="Próximo mês" ${presOffset >= 0 ? 'disabled' : ''}>›</button>
      </div>
      <div class="cal">${cal}</div>
    </div>

    <div class="stats">
      <div class="stat"><div class="v">${weekCount(0)} de ${state.gymGoal}</div><div class="l">nesta semana</div></div>
      <div class="stat"><div class="v">${streakW}</div><div class="l">semana${streakW === 1 ? '' : 's'} seguida${streakW === 1 ? '' : 's'} na meta</div></div>
      <div class="stat"><div class="v">${monthCount}</div><div class="l">treinos em ${MONTHS[first.getMonth()]}</div></div>
      <div class="stat"><div class="v">${avg ? avg + ' min' : '–'}</div><div class="l">duração média</div></div>
    </div>

    <div class="card chart">
      <h3>Treinos por semana</h3>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Treinos por semana nas últimas 12 semanas">
        <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--line)"/>
        <line x1="0" x2="${W}" y1="${y(state.gymGoal)}" y2="${y(state.gymGoal)}" stroke="var(--accent)" stroke-dasharray="4 4"/>
        ${bars}
      </svg>
      <div class="legend"><span><i style="background:var(--bar)"></i>bateu a meta</span><span><i style="background:var(--bar-dim)"></i>abaixo</span><span>- - meta</span></div>
    </div>

    <div class="card">
      <div class="field">
        <span>Meta de treinos por semana</span>
        <div class="stepper">
          <button class="iconbtn" id="goalMinus" aria-label="Diminuir meta">−</button>
          <output>${state.gymGoal}</output>
          <button class="iconbtn" id="goalPlus" aria-label="Aumentar meta">+</button>
        </div>
      </div>
    </div>`;

  bindGo();
  if (sug) document.getElementById('startSug').onclick = () => startWorkout(sug);
  document.getElementById('prevM').onclick = () => { presOffset--; renderAcadHome(); };
  document.getElementById('nextM').onclick = () => { presOffset++; renderAcadHome(); };
  document.getElementById('goalMinus').onclick = () => { state.gymGoal = Math.max(1, state.gymGoal - 1); save(); renderAcadHome(); };
  document.getElementById('goalPlus').onclick = () => { state.gymGoal = Math.min(7, state.gymGoal + 1); save(); renderAcadHome(); };
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
    draft = { id: null, name: '', exercises: [{ name: '', sets: 3, reps: '', kg: null, rest: 90 }] };
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

function renderSessao() {
  const a = state.activeWorkout;
  const w = findWorkout(a.workoutId);
  if (!w) { state.activeWorkout = null; save(); return renderAcademia(); }

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
          <div class="ex-name">${i + 1}. ${esc(e.name)}${up ? '<span class="badge">↑ subir carga</span>' : ''}</div>
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
  document.getElementById('finishWorkout').onclick = () => {
    const date = iso(new Date(a.startAt));
    const dur = Math.round((Date.now() - a.startAt) / 1000);
    state.gymLogs.push({ id: uid(), date, startAt: a.startAt, workoutId: w.id, workout: w.name, sets: a.sets, duration: dur });
    // A carga do treino montado passa a ser a maior usada hoje.
    w.exercises.forEach(e => { const m = maxKg(a.sets[e.name]); if (m != null) e.kg = m; });
    state.activeWorkout = null;
    setDay(date, { gym: true, workout: w.name });
    toast('Treino salvo: ' + fmtHours(dur / 3600));
    acad = 'home';
    renderAcademia();
    window.scrollTo(0, 0);
  };
}

// Roda a cada segundo: cronômetro do treino e do intervalo.
function tickGym() {
  const a = state.activeWorkout;
  if (!a) return;
  const el = document.getElementById('elapsed');
  if (el) el.textContent = hms(Date.now() - a.startAt);
  if (!a.rest) return;
  const left = a.rest.endAt - Date.now();
  if (left <= 0) {
    a.rest = null;
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

function friendsData() {
  if (!demoFriends) demoFriends = [
    demoFriend('Lucas (exemplo)', 'lucas', 7, 9, 3.5),
    demoFriend('Marina (exemplo)', 'marina', 21, 13, 2.5),
    demoFriend('Rafael (exemplo)', 'rafa', 42, 6, 4.5),
  ];
  const p = state.profile;
  const me = { name: p.name || 'Você', username: p.username || '', photo: p.photo, me: true, weeks: myWeeks() };
  return [me].concat(demoFriends).map((f, i) =>
    Object.assign(f, { color: i === 0 ? 'var(--accent)' : FRIEND_COLORS[(i - 1) % FRIEND_COLORS.length] }));
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

  view.innerHTML = `
    <div class="card pastel peach small">
      <b>Modo demonstração.</b> Lucas, Marina e Rafael são amigos de exemplo, para você ver como a tela fica.
      Os seus números são reais. Quando o servidor for conectado, aparecem seus amigos de verdade.
    </div>

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

    <div class="section-head"><h2>Ranking da semana</h2><span class="small muted">zera na segunda</span></div>
    ${seg('rk', amgMetric, [['geral', 'Geral'], ['estudo', 'Estudo'], ['academia', 'Academia']])}
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
    ${seg('ch', amgChart, [['estudo', 'Estudo'], ['academia', 'Academia'], ['geral', 'Pontos']])}
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
    </div>`;

  view.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { amgMetric = b.dataset.rk; renderAmigos(); });
  view.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { amgChart = b.dataset.ch; renderAmigos(); });
  view.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => { amgRange = b.dataset.rg; renderAmigos(); });
  document.getElementById('amgProfile').onclick = () => goTab('perfil');
  document.getElementById('addFriend').onclick = () =>
    toast('Adicionar amigos vai funcionar quando o servidor estiver conectado');
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
  const people = friendsData();
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
      <b>Modo demonstração.</b> As sugestões e o progresso de Lucas, Marina e Rafael são exemplos.
      Quando o servidor for conectado, o clube passa a ser com seus amigos de verdade.
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

function renderPerfil() {
  const p = state.profile;
  const age = ageFrom(p.birth), kg = currentWeight();
  const bmi = kg && p.height ? kg / Math.pow(p.height / 100, 2) : null;
  const w = p.weights;
  const wDiff = w.length > 1 ? w[w.length - 1].kg - w[0].kg : 0;

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
      <label>Data de nascimento<input class="field-input" type="date" data-p="birth" value="${esc(p.birth)}"></label>
      ${age != null ? `<div class="small muted pf-note">${age} anos</div>` : ''}
      <label>Sexo<select class="field-input" data-p="sex">
        ${['', 'Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'].map(o =>
          `<option value="${o}" ${p.sex === o ? 'selected' : ''}>${o || '—'}</option>`).join('')}
      </select></label>
      <label>Profissão<input class="field-input" data-p="job" placeholder="Ex.: cirurgião-dentista" value="${esc(p.job)}"></label>
    </div>

    <div class="card pf">
      <h3>Corpo</h3>
      <div class="row2">
        <label>Altura (cm)<input class="field-input" type="number" inputmode="numeric" data-p="height" placeholder="—" value="${p.height ?? ''}"></label>
        <label>Peso (kg)<input class="field-input" type="number" inputmode="decimal" step="any" id="pWeight" placeholder="—" value="${kg ?? ''}"></label>
      </div>
      ${bmi ? `<div class="small muted pf-note">IMC ${fmt(+bmi.toFixed(1))}</div>` : ''}
      ${w.length > 1 ? `
        <div class="chart" style="margin-top:8px">${loadChart(w.map(x => ({ date: x.date, kg: x.kg })))}</div>
        <div class="small muted">De ${fmt(w[0].kg)} kg (${ddmm(parseIso(w[0].date))}) para ${fmt(w[w.length - 1].kg)} kg:
          <b>${wDiff > 0 ? '+' : ''}${fmt(+wDiff.toFixed(1))} kg</b></div>` : ''}
      ${w.length ? `<ul class="list" style="margin-top:6px">${w.slice().reverse().slice(0, 5).map(x =>
        `<li><span class="small">${ddmm(parseIso(x.date))}/${x.date.slice(0, 4)}</span><span class="small muted">${fmt(x.kg)} kg</span></li>`).join('')}</ul>` : ''}
      <div class="small muted pf-note">Cada vez que você muda o peso, ele entra no histórico com a data de hoje.</div>
    </div>

    <div class="card pf">
      <h3>Objetivo</h3>
      <textarea data-p="goal" placeholder="Ex.: ganhar massa muscular e terminar a especialização">${esc(p.goal)}</textarea>
    </div>

    <p class="small muted" style="text-align:center">Esses dados ficam só neste celular.</p>`;

  document.getElementById('perfilBack').onclick = () => goTab('hoje');
  view.querySelectorAll('[data-p]').forEach(el => el.addEventListener('change', () => {
    const k = el.dataset.p;
    p[k] = k === 'height' ? (el.value === '' ? null : Math.round(num(el.value)))
      : k === 'username' ? el.value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.]/g, '').slice(0, 20)
      : el.value.trim();
    save();
    toast('Salvo');
    renderPerfil();
  }));
  document.getElementById('pWeight').addEventListener('change', e => {
    if (e.target.value === '') return;
    const kgNew = Math.max(0, num(e.target.value)), key = iso(today());
    const last = p.weights[p.weights.length - 1];
    if (last && last.date === key) last.kg = kgNew; else p.weights.push({ date: key, kg: kgNew });
    save();
    toast('Peso registrado');
    renderPerfil();
  });

  const input = document.getElementById('photoInput');
  document.getElementById('pickPhoto').onclick = () => input.click();
  input.onchange = async () => {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    try {
      p.photo = await shrinkPhoto(f);
      save();
      toast('Foto salva');
    } catch (e) { alert('Não consegui abrir essa imagem. Tente outra.'); }
    renderPerfil();
  };
  const rm = document.getElementById('rmPhoto');
  if (rm) rm.onclick = () => { p.photo = ''; save(); renderPerfil(); };
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
  if (checkTimer()) { if (tab === 'estudo') renderEstudo(); return; }
  const el = document.getElementById('clock');
  if (el && state.timer) el.textContent = clock(timerLeft(state.timer));
}
checkTimer();
render();
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js');
}
