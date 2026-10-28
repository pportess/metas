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
  d.fit = Object.assign({ steps: {}, stepsGoal: 8000, kcalGoal: 500, activities: [], objective: '', targetKg: null,
    runGoal: 0, bikeGoal: 0, shared: {} }, d.fit);
  d.activeWorkout = d.activeWorkout || null;
  d.gymGoal = d.gymGoal ?? 4;
  // Módulo de estudo: os antigos "temas" viram projetos.
  d.study = Object.assign({ dailyGoalMin: 120, weeklyGoalMin: 600, focusMin: 25, breakMin: 5,
    projects: null, tasks: [], cards: [], reviews: [], pendingSession: null,
    cats: [], lastCat: null, live: null, daysPerWeek: 5 }, d.study);
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
  d.gallery = Object.assign({ folders: [], pinHash: '', categories: null }, d.gallery);
  // Projetos: as pastas antigas tinham um tipo fixo (caso clínico, projeto, outro); viram categorias com cor.
  if (!d.gallery.categories) {
    const OLD = { paciente: ['Pacientes', '#eab308'], projeto: ['Projetos', '#3b82f6'], outro: ['Outros', '#6b7280'] };
    d.gallery.categories = [];
    d.gallery.folders.forEach(f => {
      if (!f.kind || !OLD[f.kind]) return;
      let c = d.gallery.categories.find(x => x.name === OLD[f.kind][0]);
      if (!c) d.gallery.categories.push(c = { id: uid(), name: OLD[f.kind][0], color: OLD[f.kind][1] });
      f.catId = c.id;
      delete f.kind;
    });
  }
  d.profile = Object.assign({ name: '', username: '', photo: '', birth: '', sex: '', job: '', height: null, goal: '', weights: [] }, d.profile);
  // Saúde: água por dia em ml (indexada pela data) e o recipiente usado no contador.
  d.health = Object.assign({ water: {}, cup: { name: 'Copo', ml: 250 }, asked: false }, d.health);
  // updatedAt: quando os dados mudaram pela última vez (para comparar com o backup da conta).
  d.meta = Object.assign({ updatedAt: '', backup: false, backupAt: '' }, d.meta);
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
function writeLocal() { localStorage.setItem(KEY, JSON.stringify(state)); }
function save() {
  state.meta.updatedAt = new Date().toISOString();
  writeLocal();
  scheduleBackup();
}

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
  ajustes: 'Ajustes', perfil: 'Perfil', amigos: 'Social', clube: 'Clube do livro', galeria: 'Projetos', mais: 'Mais',
  estudos: 'Estudo', saude: 'Saúde', sono: 'Sono', nutricao: 'Nutrição' };
// Painéis da barra de baixo e o que fica dentro de cada um.
const PARENT = { estudo: 'estudos', clube: 'estudos', academia: 'saude', sono: 'saude', nutricao: 'saude' };
let tab = 'hoje';
let dayKey = iso(today());
let period = 'semana';
let periodOffset = 0;

function goTab(name) {
  // Tocar no painel estando dentro dele: primeiro volta ao início da tela, depois ao painel.
  if (PARENT[tab] === name) {
    if (tab === 'academia' && acad !== 'home' && !draft) name = 'academia';
    else if (tab === 'estudo' && stdView !== 'home') name = 'estudo';
  }
  // tocar de novo na aba volta ao início dela
  if (name === 'academia' && tab === 'academia' && !draft) acad = 'home';
  if (name === 'estudo' && tab === 'estudo') stdView = 'home';
  if (name === 'galeria' && tab === 'galeria') galView = 'home';
  const viewer = document.getElementById('viewer');
  viewer.hidden = true; viewer.innerHTML = '';
  tab = name;
  dayKey = iso(today());
  document.querySelectorAll('.tabbar button').forEach(x => x.classList.toggle('active', x.dataset.tab === (PARENT[name] || name)));
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
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  rows: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4.5V11h-6.5"/>',
  graph: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10.5" cy="18" r="2.5"/><path d="M8.4 7 15.5 7.7M7 8.9l2.5 6.8M16.6 10.1l-4.6 5.9"/>',
  // rede de bolinhas ligadas, como o grafo do Obsidian
  brain: '<circle cx="12" cy="12" r="2.2"/><circle cx="5" cy="6" r="1.6"/><circle cx="19" cy="5.5" r="1.6"/><circle cx="4.5" cy="16.5" r="1.6"/><circle cx="18.5" cy="18" r="1.6"/><circle cx="12" cy="3" r="1.2"/><circle cx="12" cy="21" r="1.2"/><path d="M6.3 7l4 3.6M17.7 6.6l-4 3.6M6 15.6l4.2-2.4M17.2 17l-3.6-3.4M12 4.2v5.6M12 14.2v5.6M6.6 6l3.8-2.6M17.4 5.2 13.2 3.4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  grid4: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  salad: '<path d="M3 11.5h18a9 9 0 0 1-18 0z"/><path d="M9 20.5h6"/><path d="M7.5 11.5C7 8.6 9 6.5 12 6.5c0 3-2 5-4.5 5"/><path d="M13 11.5c.3-2.4 2.1-4 4.5-4 0 2.2-1.6 3.8-4 4"/>',
  pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>',
  run: '<circle cx="15" cy="4.5" r="2"/><path d="M7 10.5 10 8h3.5l3 3.2H20"/><path d="M13.5 8 10.5 14"/><path d="m10.5 14 3 3-1 4.5"/><path d="m10.5 14-3 2.5H4"/>',
  bike: '<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><circle cx="15" cy="4.5" r="1.8"/><path d="M5.5 17 9 10.5h5.5l4 6.5"/><path d="m9 10.5 3-3.5 2.5 3.5H18"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 18.5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
};
function icon(name) { return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`; }

const TAB_ICONS = { hoje: 'home', estudos: 'cap', saude: 'heart', amigos: 'users', galeria: 'folder' };
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
  document.body.classList.remove('study-live');
  const name = (state.profile.name || '').trim();
  document.getElementById('title').innerHTML = tab === 'hoje'
    ? `<div class="hello">
        ${avatar()}
        <div><div class="hello-sub">${greeting()}</div><div class="hello-name">${name ? esc(name) : 'Bem-vindo'}</div></div>
        <button class="iconbtn sm" id="editProfile" aria-label="Editar perfil">${icon('gear')}</button>
      </div>`
    : tab === 'saude'
      ? `<div class="hub-head"><h1>Saúde <svg class="heart-red" viewBox="0 0 24 24" aria-hidden="true">${ICONS.heart}</svg></h1>
          <button class="iconbtn sm" id="healthCfg" aria-label="Ajustes da saúde">${icon('gear')}</button></div>`
    : PARENT[tab]
      ? `<h1 class="with-back"><button class="back" id="backBtn" aria-label="Voltar para ${titles[PARENT[tab]]}">‹</button>${titles[tab]}</h1>`
      : `<h1>${titles[tab]}</h1>`;
  const ep = document.getElementById('editProfile');
  if (ep) ep.onclick = () => goTab('perfil');
  const bb = document.getElementById('backBtn');
  if (bb) bb.onclick = () => { const to = PARENT[tab]; tab = to; goTab(to); };
  const hc = document.getElementById('healthCfg');
  if (hc) hc.onclick = openHealthSettings;
  ({ hoje: renderHoje, estudo: renderEstudo, academia: renderAcademia, metas: renderMetas,
    progresso: renderProgresso, ajustes: renderAjustes, perfil: renderPerfil, amigos: renderAmigos,
    clube: renderClube, galeria: renderGaleria, mais: renderMais,
    estudos: renderEstudos, saude: renderSaude, sono: renderSono, nutricao: renderNutricao })[tab]();
}

// Painel de Estudo: quadrados que abrem cada parte.
function renderEstudos() {
  view.innerHTML = `<div class="hub-grid">
    <button class="hub-tile lavender" data-open="estudo"><span class="ico-circle">${icon('cap')}</span>
      <b>Estudo e planejamento</b></button>
    <button class="hub-tile sky" data-open="clube"><span class="ico-circle">${icon('book')}</span>
      <b>Clube do livro</b></button>
  </div>`;
  view.querySelectorAll('[data-open]').forEach(b => b.onclick = () => goTab(b.dataset.open));
}

// ---------- Saúde ----------
// Painel de Saúde: retângulos que abrem cada parte e, embaixo, os widgets do dia.
// A tela não rola: tudo se ajusta à altura do celular (ver fitSaude).
const WATER_PRESETS = [['Copo', 200], ['Copo', 250], ['Copo', 300], ['Garrafa', 500], ['Garrafa', 1000]];
const LEVELS = [ // nota do dia de 0 a 1
  [0.8, 'Ótimo', '#5fd068'], [0.6, 'Bom', '#1f8a4c'], [0.4, 'Ok', '#f5b301'], [0, 'Ruim', '#e5484d']];
function level(score) { return LEVELS.find(l => score >= l[0]); }

// Meta de água calculada sozinha: 1,5 L por m² de superfície corporal (fórmula de Mosteller,
// que usa peso e altura). Sem altura, usa 35 ml por kg. Arredonda para 50 ml.
function waterGoalFor(kg, cm) {
  if (!kg) return null;
  const ml = cm ? 1500 * Math.sqrt(kg * cm / 3600) : kg * 35;
  return Math.round(ml / 50) * 50;
}
function waterGoal() { return waterGoalFor(currentWeight(), state.profile.height); }
// Limite saudável: até 1,5× a meta ainda é tranquilo (calor, treino pesado). Acima disso o rim
// começa a trabalhar demais e, em excesso, o sódio do sangue cai (hiponatremia).
function waterLimit(goal) { return goal ? Math.round(goal * 1.5 / 50) * 50 : null; }
// Nota da água de 0 a 1: sobe até a meta, fica em 1 até o limite e cai rápido depois dele.
function waterScore(ml, goal) {
  const r = ml / goal;
  return r <= 1 ? r : r <= 1.5 ? 1 : Math.max(0, 1 - (r - 1.5) * 2);
}
function waterOn(k) { return state.health.water[k] || 0; }
function plannedOn(d) { return state.workouts.some(w => (w.days || []).includes(d.getDay())); }
function trainedOn(k) { return state.gymLogs.some(l => l.date === k) || getDay(k).gym; }

// Nota do dia: média do que dá para medir (água em relação à meta e treino feito nos dias marcados).
// O sono entra aqui quando a parte de Sono tiver registros.
function dayScore(d) {
  const k = iso(d), parts = [], goal = waterGoal();
  // A água só conta a partir do primeiro dia em que foi registrada.
  const first = Object.keys(state.health.water).sort()[0];
  if (goal && first && k >= first) parts.push(waterScore(waterOn(k), goal));
  if (trainedOn(k)) parts.push(1);
  else if (plannedOn(d) && k !== iso(today())) parts.push(0); // hoje ainda dá tempo
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
}

// Energia do dia (0 a 1). Treino: treinos dos últimos 7 dias em relação à meta semanal.
// Sono e nutrição: ainda sem registros (entram aqui depois). Água: peso 0,5.
function energyScore(d) {
  const parts = []; // [nota, peso]
  let done = 0;
  for (let i = 0; i < 7; i++) if (trainedOn(iso(addDays(d, -i)))) done++;
  parts.push([Math.min(1, done / totalGoal()), 1]);
  const goal = waterGoal(), first = Object.keys(state.health.water).sort()[0];
  if (goal && first) parts.push([waterScore(waterOn(iso(d)), goal), 0.5]);
  const w = parts.reduce((a, p) => a + p[1], 0);
  return parts.reduce((a, p) => a + p[0] * p[1], 0) / w;
}

function glassSvg(pct, warn) {
  const h = 42 * Math.max(0, Math.min(1, pct));
  return `<svg class="glass" viewBox="0 0 40 52" aria-hidden="true">
    <defs><clipPath id="glassClip"><path d="M6 5h28l-3.5 42h-21z"/></clipPath></defs>
    <rect x="0" y="${47 - h}" width="40" height="${h}" fill="${warn ? '#f59e0b' : '#3b9eff'}" clip-path="url(#glassClip)"/>
    <path d="M6 5h28l-3.5 42h-21z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
}

function renderSaude() {
  const h = state.health, t = today(), k = iso(t), goal = waterGoal(), ml = waterOn(k);
  const n = ml / h.cup.ml, unit = h.cup.name.toLowerCase() + (Math.round(n * 10) === 10 ? '' : 's');

  // bem-estar de hoje
  const pctW = goal ? ml / goal : null, limit = waterLimit(goal), tooMuch = limit && ml > limit;
  const trained = trainedOn(k), planned = plannedOn(t);
  const score = dayScore(t);
  const face = s => s == null ? '😶' : s >= 0.8 ? '😄' : s >= 0.6 ? '🙂' : s >= 0.4 ? '😐' : '😣';
  // Energia: equilíbrio entre treino, sono e nutrição; a água pesa só metade.
  // Sono e nutrição entram quando essas partes tiverem registros.
  const energy = energyScore(t);
  // Treino: ✓ verde se treinou, ✗ vermelho se era dia de treino e não foi, — em dia de descanso.
  const workoutMark = trained ? '<span class="ok-mark">✓</span>' : planned ? '<span class="no-mark">✗</span>' : '—';

  // últimos 7 dias
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = addDays(t, -i); days.push({ d, s: dayScore(d) }); }
  const valid = days.filter(x => x.s != null);
  const week = valid.length ? valid.reduce((a, x) => a + x.s, 0) / valid.length : null;
  const wl = week == null ? null : level(week);

  view.innerHTML = `<div class="saude" id="saudeScreen">
    <button class="hub-bar treino" data-open="academia"><b>Treino</b><span class="hub-ico">${icon('dumbbell')}</span></button>
    <button class="hub-bar nutricao" data-open="nutricao"><b>Nutrição</b><span class="hub-ico">${icon('salad')}</span></button>
    <button class="hub-bar sono" data-open="sono"><b>Sono</b><span class="hub-ico">${icon('cloud')}</span></button>

    <div class="sw-row">
      <div class="sw water">
        <div class="sw-head">Água</div>
        <div class="water-mid">${glassSvg(pctW || 0, tooMuch)}
          <div><div class="water-n">${fmt(Math.round(n * 10) / 10)}</div><div class="small muted">${esc(unit)}</div></div></div>
        <div class="small ${tooMuch ? 'warn-txt' : 'muted'}">${!goal ? 'Informe seu peso ⚙'
          : tooMuch ? 'Acima do limite de ' + fmt(limit) + ' ml' : fmt(ml) + ' de ' + fmt(goal) + ' ml'}</div>
        <div class="water-btns">
          <button class="round-btn" id="waterMinus" aria-label="Tirar um ${esc(h.cup.name.toLowerCase())}">−</button>
          <button class="round-btn primary" id="waterPlus" aria-label="Somar um ${esc(h.cup.name.toLowerCase())}">+</button>
        </div>
      </div>
      <div class="sw mood">
        <div class="sw-head">Bem-estar</div>
        <div class="mood-faces">
          <div><span class="mood-emoji">${tooMuch ? '😟' : face(score)}</span><span class="small muted">Humor</span></div>
          <div><span class="mood-emoji">${energy == null ? '😶' : energy >= 0.8 ? '⚡' : energy >= 0.5 ? '🙂' : '🥱'}</span><span class="small muted">Energia</span></div>
        </div>
        <div class="mood-stats">
          <div><b class="${tooMuch ? 'warn-txt' : ''}">${pctW == null ? '—' : Math.round(pctW * 100) + '%'}</b><span>Água</span></div>
          <div><b>${workoutMark}</b><span>Treino</span></div>
          <div><b>—</b><span>Sono</span></div>
        </div>
      </div>
    </div>

    <div class="sw perf">
      <div class="perf-head"><span class="sw-head">Desempenho da semana</span>
        ${wl ? `<span class="pill" style="background:${wl[2]}">${wl[1]}</span>` : '<span class="small muted">sem dados</span>'}</div>
      <div class="perf-chart" id="perfChart"></div>
      <div class="perf-legend small muted">${LEVELS.slice().reverse().map(l => `<span><i style="background:${l[2]}"></i>${l[1]}</span>`).join('')}</div>
    </div>
  </div>`;

  view.querySelectorAll('[data-open]').forEach(b => b.onclick = () => goTab(b.dataset.open));
  const addWater = delta => {
    const v = Math.max(0, waterOn(k) + delta);
    if (v) h.water[k] = v; else delete h.water[k];
    save();
    renderSaude();
    if (limit && delta > 0 && v > limit) toast('Já passou do limite saudável de hoje');
  };
  document.getElementById('waterPlus').onclick = () => addWater(h.cup.ml);
  document.getElementById('waterMinus').onclick = () => addWater(-h.cup.ml);
  fitSaude();
  drawPerf(days);
  // Primeira vez na Saúde: pede peso e altura para calcular a água.
  if (!h.asked) { h.asked = true; save(); openHealthSettings(); }
}

function fitSaude() {
  const el = document.getElementById('saudeScreen');
  if (!el) return;
  const top = document.querySelector('.topbar').offsetHeight;
  const bottom = parseFloat(getComputedStyle(document.body).paddingBottom);
  el.style.height = Math.max(520, window.innerHeight - top - bottom - 20) + 'px';
}
window.addEventListener('resize', () => { if (tab === 'saude') renderSaude(); });

// Gráfico de linha da semana, desenhado no tamanho exato do espaço que sobrou.
// A cor da linha muda com a altura: vermelho embaixo, verde em cima (as mesmas faixas da nota).
function drawPerf(days) {
  const box = document.getElementById('perfChart');
  if (!box) return;
  const W = box.clientWidth, H = box.clientHeight, top = 10, bottom = 18, side = 12;
  const x = i => side + i * (W - 2 * side) / (days.length - 1);
  const y = s => top + (1 - s) * (H - top - bottom);
  const pts = days.map((p, i) => p.s == null ? null : [x(i), y(p.s), p.s]);
  let d = '';
  pts.forEach((p, i) => { if (p) d += (d && pts[i - 1] ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); });
  const stops = [[0, '#e5484d'], [0.4, '#e5484d'], [0.4, '#f5b301'], [0.6, '#f5b301'], [0.6, '#1f8a4c'], [0.8, '#1f8a4c'], [0.8, '#5fd068'], [1, '#5fd068']];
  const grid = [0.4, 0.6, 0.8].map(s => `<line x1="${side}" x2="${W - side}" y1="${y(s)}" y2="${y(s)}" stroke="var(--line)" stroke-dasharray="3 4"/>`).join('');
  box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Desempenho dos últimos 7 dias">
    <defs><linearGradient id="perfGrad" gradientUnits="userSpaceOnUse" x1="0" y1="${y(0)}" x2="0" y2="${y(1)}">
      ${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs>
    ${grid}
    <path d="${d}" fill="none" stroke="url(#perfGrad)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(p => p ? `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${level(p[2])[2]}" stroke="var(--card)" stroke-width="2"/>` : '').join('')}
    ${days.map((p, i) => `<text x="${x(i)}" y="${H - 3}" text-anchor="middle" fill="var(--muted)" font-size="11">${WEEKDAYS[p.d.getDay()][0]}</text>`).join('')}
  </svg>`;
}

// Ajustes da Saúde (engrenagem no topo): peso, altura, meta de água e o recipiente do contador.
function openHealthSettings() {
  const h = state.health, p = state.profile;
  let dlg = document.getElementById('healthDialog');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'healthDialog'; document.body.appendChild(dlg); }
  dlg.innerHTML = `<form method="dialog">
    <h2>Ajustes da saúde</h2>
    <div class="row2">
      <label>Peso (kg)<input name="kg" type="number" inputmode="decimal" step="0.1" value="${currentWeight() || ''}" placeholder="ex.: 75"></label>
      <label>Altura (cm)<input name="height" type="number" inputmode="numeric" value="${p.height || ''}" placeholder="ex.: 178"></label>
    </div>
    <p class="small muted" id="hGoal" style="margin:0 0 12px"></p>
    <div class="small muted" style="margin-bottom:6px">Como você toma água</div>
    <div class="chips" style="margin-bottom:10px">${WATER_PRESETS.map(([nm, v]) =>
      `<button type="button" class="chip" data-preset="${nm}|${v}">${nm} ${v >= 1000 ? v / 1000 + ' L' : v + ' ml'}</button>`).join('')}</div>
    <div class="row2">
      <label>Recipiente<input name="cupName" value="${esc(h.cup.name)}"></label>
      <label>Quantidade (ml)<input name="cupMl" type="number" inputmode="numeric" value="${h.cup.ml}"></label>
    </div>
    <div class="dialog-actions">
      <span class="spacer"></span>
      <button value="cancel" formnovalidate class="btn">Cancelar</button>
      <button value="save" class="btn primary">Salvar</button>
    </div>
  </form>`;
  const f = dlg.querySelector('form');
  const showGoal = () => {
    const kg = num(f.kg.value), cm = num(f.height.value), goal = waterGoalFor(kg, cm);
    f.querySelector('#hGoal').innerHTML = goal
      ? `Meta de água: <b>${fmt(goal)} ml por dia</b>, calculada pelo peso${cm ? ' e pela altura' : ' (com a altura fica mais precisa)'}.
        Limite saudável: ${fmt(waterLimit(goal))} ml.`
      : 'Coloque peso e altura para calcular a meta de água.';
  };
  showGoal();
  f.kg.oninput = f.height.oninput = showGoal;
  dlg.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
    const [nm, v] = b.dataset.preset.split('|');
    f.cupName.value = nm; f.cupMl.value = v;
  });
  dlg.onclose = () => {
    if (dlg.returnValue !== 'save') return;
    const kg = num(f.kg.value), tk = iso(today());
    if (kg) {
      const w = p.weights, last = w[w.length - 1], v = Math.max(20, Math.min(300, kg));
      if (last && last.date === tk) last.kg = v; else w.push({ date: tk, kg: v });
    }
    if (f.height.value !== '') p.height = Math.round(num(f.height.value));
    h.cup = { name: f.cupName.value.trim() || 'Copo', ml: Math.max(10, Math.round(num(f.cupMl.value)) || 250) };
    save();
    toast('Ajustes salvos');
    if (tab === 'saude') renderSaude();
  };
  dlg.returnValue = '';
  dlg.showModal();
}

// Sono e Nutrição: só o lugar, as funções entram depois.
function renderSono() {
  view.innerHTML = '';
}
function renderNutricao() {
  view.innerHTML = '';
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
  const n = weekCount(0), goal = totalGoal(), left = Math.max(0, goal - n);
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
    if (!active) acad = 'escolher';
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
// home | nova | aovivo | resumo | historico | aula | retomadas | retomada | base
// | dashboard | projetos | projeto | sessao | revisao | conquistas
let stdView = 'home';
let stdProject = null;  // projeto aberto
let stdSession = null;  // sessão aberta
let reportOffset = 0;   // semana mostrada no relatório
let reviewFilter = '';  // projeto filtrado na revisão ('' = todos)
let reviewShown = false;
let draftTitle = '', draftProj = '';
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

// Pomodoro antigo (antes das sessões): só termina um que tenha ficado em andamento.
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

// ----- sessão de estudo (pomodoro) -----
// A sessão guarda a hora em que a fase acaba, então o tempo continua certo com o app fechado.
// Fases: foco → descanso → pronto (espera você começar o próximo foco, para não contar estudo
// enquanto você está longe do celular).
function stdCat(id) { return S().cats.find(c => c.id === id); }
function sessionCat(s) {
  const c = stdCat(s.catId);
  if (c) return c;
  if (s.projectId) return { name: projName(s.projectId), color: '#9ca3af' }; // sessões antigas, ligadas a um projeto
  return { name: 'Sem categoria', color: '#9ca3af' };
}

// Categoria marcada como marca-texto: fundo translúcido e borda na cor dela.
function catMark(c) { return `<span class="cat-mark" style="--c:${c.color}">${esc(c.name)}</span>`; }

function startLive(title, catId) {
  unlockAudio();
  S().live = { title, catId, phase: 'foco', focusMin: S().focusMin, breakMin: S().breakMin,
    endAt: Date.now() + S().focusMin * 60000, pausedLeft: null, count: 0, focusMs: 0, startAt: Date.now() };
  save();
}
function liveLeft(L) {
  if (L.phase === 'pronto') return 0;
  return L.pausedLeft != null ? L.pausedLeft : Math.max(0, L.endAt - Date.now());
}
function liveTotal(L) { return (L.phase === 'pausa' ? L.breakMin : L.focusMin) * 60000; }
// Minutos de foco até agora, contando o pedaço do pomodoro em andamento.
function liveFocusMs(L) {
  return L.focusMs + (L.phase === 'foco' ? liveTotal(L) - liveLeft(L) : 0);
}
function advanceLive() {
  const L = S().live;
  if (!L || L.pausedLeft != null || L.phase === 'pronto' || Date.now() < L.endAt) return false;
  if (L.phase === 'foco') {
    L.count++;
    L.focusMs += L.focusMin * 60000;
    L.phase = 'pausa';
    L.endAt += L.breakMin * 60000;
    if (Date.now() >= L.endAt) L.phase = 'pronto';
    toast('Pomodoro concluído! Descanso de ' + L.breakMin + ' min');
  } else {
    L.phase = 'pronto';
    toast('Descanso encerrado');
  }
  beep();
  if (navigator.vibrate) navigator.vibrate(300);
  save();
  return true;
}
function nextFocus() {
  const L = S().live;
  L.phase = 'foco'; L.pausedLeft = null;
  L.endAt = Date.now() + L.focusMin * 60000;
  save();
}

function liveRing(L) {
  const R = 118, C = 2 * Math.PI * R, frac = L.phase === 'pronto' ? 1 : liveLeft(L) / liveTotal(L);
  const color = L.phase === 'pausa' ? '#10b981' : '#0b2a7a'; // foco: azul escuro sobre o fundo azul
  return `<svg class="live-ring" viewBox="0 0 260 260" aria-hidden="true">
    <circle cx="130" cy="130" r="${R}" fill="none" stroke="var(--line)" stroke-width="14"/>
    <circle id="ringArc" cx="130" cy="130" r="${R}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
      stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 130 130)"/></svg>`;
}
function tickStudy() {
  const L = S().live;
  if (!L) return;
  if (advanceLive()) { if (tab === 'estudo' && stdView === 'aovivo') renderEstudo(); return; }
  const el = document.getElementById('liveClock');
  if (!el) return;
  el.textContent = clock(liveLeft(L));
  const arc = document.getElementById('ringArc');
  if (arc) {
    const C = 2 * Math.PI * 118, frac = liveLeft(L) / liveTotal(L);
    arc.setAttribute('stroke-dasharray', (C * frac).toFixed(1) + ' ' + C.toFixed(1));
  }
}

// Escolha de categoria: as que já existem (com a cor) ou uma nova, como nos Projetos.
function stdCatPicker(sel) {
  const cats = S().cats, used = new Set(cats.map(c => c.color));
  const free = (CAT_COLORS.find(([, c]) => !used.has(c)) || CAT_COLORS[0])[1];
  return `<div class="chips cat-pick" style="margin:0 0 8px">
      ${cats.map(c => `<button type="button" class="chip cat-opt ${c.id === sel ? 'on' : ''}" data-scat="${c.id}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}
      <button type="button" class="chip ${cats.length ? '' : 'on'}" data-scat="new">+ Nova categoria</button>
    </div>
    <div class="new-cat" id="newCatBox" ${cats.length ? 'hidden' : ''}>
      <input class="field-input" id="newCatName" placeholder="Nome da categoria (ex.: Prótese, DTM)">
      <div class="small muted" style="margin:8px 0 6px">Cor da categoria</div>
      ${colorPicker(free)}
    </div>`;
}
// Liga o seletor e devolve uma função que lê a categoria escolhida (criando a nova, se for o caso).
function bindStdCatPicker(initial) {
  let sel = initial, isNew = !S().cats.length;
  bindColorPicker(view);
  view.querySelectorAll('[data-scat]').forEach(b => b.onclick = () => {
    const v = b.dataset.scat;
    view.querySelectorAll('[data-scat]').forEach(x => x.classList.toggle('on', x === b));
    isNew = v === 'new';
    sel = isNew ? null : v;
    document.getElementById('newCatBox').hidden = !isNew;
    if (isNew) document.getElementById('newCatName').focus();
  });
  return () => {
    if (!isNew) return sel;
    const name = document.getElementById('newCatName').value.trim();
    if (!name) return null;
    const same = S().cats.find(c => fold(c.name) === fold(name));
    if (same) return same.id;
    const c = { id: uid(), name, color: view.querySelector('#newCatBox .color-pick .on').dataset.color };
    S().cats.push(c);
    return c.id;
  };
}

// Página "Iniciar sessão": o que vai estudar, categoria e os tempos (ficam salvos para as próximas).
function renderNovaSessao() {
  if (S().live) return stdGo('aovivo');
  const sel = S().lastCat && stdCat(S().lastCat) ? S().lastCat : null;
  view.innerHTML = stdBack('Voltar', 'home') + `<div class="ns-page">
    <div class="card pf">
      <label>O que você vai estudar<input class="field-input" id="nsTitle" placeholder="Ex.: Aula 7 – Oclusão em prótese total" value="${esc(draftTitle)}"></label>
      <div class="small muted" style="margin-bottom:6px">Categoria</div>
      ${stdCatPicker(sel)}
      ${S().projects.length ? `<label style="margin-top:10px">Projeto (opcional)<select class="field-input" id="nsProj">${projectOptions(draftProj)}</select></label>` : ''}
    </div>
    <div class="card">
      <div class="ns-row"><div><b>Foco</b><div class="small muted">de 5 em 5 minutos</div></div>
        <div class="stepper"><button class="iconbtn sm" data-ns="focusMin" data-d="-5">−</button>
          <output>${S().focusMin} min</output><button class="iconbtn sm" data-ns="focusMin" data-d="5">+</button></div></div>
      <div class="ns-row"><div><b>Descanso</b><div class="small muted">de 1 em 1 minuto</div></div>
        <div class="stepper"><button class="iconbtn sm" data-ns="breakMin" data-d="-1">−</button>
          <output>${S().breakMin} min</output><button class="iconbtn sm" data-ns="breakMin" data-d="1">+</button></div></div>
      <p class="small muted" style="margin:8px 0 0">Os tempos ficam salvos para as próximas sessões.</p>
    </div>
    <button class="btn primary block live-go" id="nsGo">${icon('play')} Começar sessão</button>
    <details class="manual card" style="margin-top:12px">
      <summary class="small muted">Já estudei sem cronômetro</summary>
      <div class="inline">
        <input id="nsManual" class="short" type="number" inputmode="numeric" min="1" placeholder="min">
        <span class="small muted" style="flex:1">minutos, com o título e a categoria acima</span>
        <button class="btn" id="nsManualGo">Registrar</button>
      </div>
    </details></div>`;

  bindStdGo();
  const getCat = bindStdCatPicker(sel);
  const ti = document.getElementById('nsTitle');
  ti.oninput = () => { draftTitle = ti.value; };
  view.querySelectorAll('[data-ns]').forEach(b => b.onclick = () => {
    const k = b.dataset.ns, lim = k === 'focusMin' ? [5, 120] : [1, 30];
    S()[k] = Math.min(lim[1], Math.max(lim[0], S()[k] + +b.dataset.d));
    save();
    b.parentNode.querySelector('output').textContent = S()[k] + ' min';
  });
  const ready = () => {
    const title = ti.value.trim();
    if (!title) { toast('Escreva o que vai estudar'); ti.focus(); return null; }
    const catId = getCat();
    if (!catId) { toast('Escolha ou crie uma categoria'); return null; }
    S().lastCat = catId;
    const pj = document.getElementById('nsProj');
    return { title, catId, projectId: pj && pj.value || null };
  };
  document.getElementById('nsGo').onclick = () => {
    const r = ready();
    if (!r) return;
    draftTitle = ''; draftProj = '';
    startLive(r.title, r.catId);
    S().live.projectId = r.projectId;
    save();
    stdGo('aovivo');
  };
  document.getElementById('nsManualGo').onclick = () => {
    const min = Math.round(num(document.getElementById('nsManual').value));
    if (min <= 0) return toast('Digite os minutos');
    const r = ready();
    if (!r) return;
    draftTitle = ''; draftProj = '';
    // vira uma sessão "terminada", que segue para o resumo
    S().live = { title: r.title, catId: r.catId, projectId: r.projectId, phase: 'pronto', focusMin: S().focusMin, breakMin: S().breakMin,
      endAt: null, pausedLeft: null, count: 0, focusMs: min * 60000, startAt: Date.now() - min * 60000, manual: true };
    save();
    stdGo('resumo');
  };
}

// Sessão em andamento: círculo grande que esvazia com o tempo, contador de pomodoros, título e categoria.
let liveSheet = false;   // janela de interromper aberta
function renderAoVivo() {
  const L = S().live;
  if (!L) return stdGo('home');
  advanceLive();
  const c = sessionCat(L), paused = L.pausedLeft != null;
  const phaseTxt = L.phase === 'foco' ? (paused ? 'Pausado' : 'Foco') : L.phase === 'pausa' ? (paused ? 'Pausado' : 'Descanso') : 'Descanso encerrado';
  view.innerHTML = stdBack('Voltar', 'home') + `
    <div class="live">
      <div class="live-timer">
        ${liveRing(L)}
        <div class="live-center">
          <div class="live-phase">${phaseTxt}</div>
          <div class="live-clock" id="liveClock">${clock(liveLeft(L))}</div>
          <div class="live-of small muted">${L.phase === 'pausa' ? L.breakMin + ' min de descanso' : L.focusMin + ' min de foco'}</div>
        </div>
      </div>
      ${L.phase === 'pronto' ? `<button class="btn primary block live-go" id="liveNext">${icon('play')} Começar próximo pomodoro</button>`
        : paused ? `<button class="btn primary block live-go" id="liveResume">${icon('play')} Continuar sessão</button>`
        : '<button class="btn block live-stop" id="liveStop">Interromper sessão</button>'}
      ${L.phase === 'pronto' || paused ? '<button class="btn block" id="liveEnd" style="margin-top:8px">Finalizar sessão</button>' : ''}
      <div class="live-count"><b>${L.count}</b> ${L.count === 1 ? 'pomodoro concluído' : 'pomodoros concluídos'} ·
        ${fmtHours(liveFocusMs(L) / 3600000)} de foco</div>
      <div class="live-title">${esc(L.title)}</div>
      <div class="live-cat">${catMark(c)}</div>
    </div>
    ${liveSheet ? `
    <div class="sheet-back" id="sheetBack"></div>
    <div class="sheet">
      <div class="grab"></div>
      <h3>Interromper sessão</h3>
      <button class="btn block" id="shPause">Pausar</button>
      <button class="btn primary block" id="shEnd" style="margin-top:8px">Finalizar sessão</button>
      <button class="btn block" id="shCancel" style="margin-top:8px;border:0">Voltar</button>
    </div>` : ''}`;

  bindStdGo();
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on('liveStop', () => { liveSheet = true; renderAoVivo(); });
  on('sheetBack', () => { liveSheet = false; renderAoVivo(); });
  on('shCancel', () => { liveSheet = false; renderAoVivo(); });
  on('shPause', () => { L.pausedLeft = liveLeft(L); liveSheet = false; save(); renderAoVivo(); });
  on('liveResume', () => { L.endAt = Date.now() + L.pausedLeft; L.pausedLeft = null; save(); renderAoVivo(); });
  on('liveNext', () => { nextFocus(); renderAoVivo(); });
  const end = () => {
    if (L.pausedLeft == null && L.phase !== 'pronto') L.pausedLeft = liveLeft(L); // congela o tempo enquanto escreve
    liveSheet = false;
    save();
    stdGo('resumo');
  };
  on('shEnd', end);
  on('liveEnd', end);
}

// Depois de finalizar: o resumo do que aprendeu. Ele alimenta o Histórico, as Retomadas e a Base.
function renderResumo() {
  const L = S().live;
  if (!L) return stdGo('home');
  const c = sessionCat(L), min = Math.round(liveFocusMs(L) / 60000);
  view.innerHTML = `
    <div class="card">
      <div class="small muted">${catMark(c)} ${fmtHours(min / 60)} de foco · ${L.count} ${L.count === 1 ? 'pomodoro' : 'pomodoros'}</div>
      <div class="feature-title" style="font-size:20px;margin:4px 0 12px">${esc(L.title)}</div>
      <label class="small muted" for="rsText">Me diga tudo que aprendeu nessa sessão de maneira resumida</label>
      <textarea id="rsText" class="rs-text" placeholder="Explique com suas palavras, como se contasse para alguém."></textarea>
      <p class="small muted rs-hint">Para falar em vez de digitar, toque no microfone do teclado do iPhone.</p>
      <button class="btn primary block" id="rsSave">Salvar sessão</button>
      <div class="btnrow" style="margin-top:8px">
        <button class="btn" id="rsBack">Voltar à sessão</button>
        <button class="btn danger" id="rsDiscard">Descartar</button>
      </div>
    </div>`;
  const ta = document.getElementById('rsText');
  ta.value = L.draft || '';
  ta.oninput = () => { L.draft = ta.value; writeLocal(); };
  document.getElementById('rsSave').onclick = () => {
    if (!ta.value.trim() && !confirm('Salvar sem o resumo? Sem ele, a sessão não entra nas Retomadas nem na Base de conhecimento.')) return;
    const k = iso(today());
    const s = { id: uid(), date: k, title: L.title, catId: L.catId, projectId: L.projectId || null, topic: '', minutes: min,
      pomodoro: L.count, summary: ta.value.trim(), startAt: L.startAt };
    state.sessions.push(s);
    const d = getDay(k);
    setDay(k, { study: round4(d.study + min / 60), pomodoros: d.pomodoros + L.count });
    S().live = null;
    save();
    toast('Sessão salva');
    stdGo('home');
  };
  document.getElementById('rsBack').onclick = () => {
    if (L.manual) { S().live = null; save(); return stdGo('nova'); }
    stdGo('aovivo');
  };
  document.getElementById('rsDiscard').onclick = () => {
    if (!confirm('Descartar esta sessão? O tempo não será registrado.')) return;
    S().live = null;
    save();
    stdGo('home');
  };
}

// ----- histórico -----
let stdAula = null;   // sessão aberta no histórico
function studySessions() {
  return state.sessions.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.startAt || 0) - (a.startAt || 0));
}
// Lista: 5 sessões; "Mostrar mais" abre 10 por página, com página anterior e próxima.
// Embaixo, o gráfico de torres da semana escolhida: objetivo (laranja) × estudado (azul).
let hsMore = false, hsPage = 0, hsWeek = null, hsPick = false, hsPickMonth = null;
function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }

function renderHistoricoEstudo() {
  const list = studySessions(), PER = 10;
  const pages = Math.max(1, Math.ceil(list.length / PER));
  if (hsPage >= pages) hsPage = pages - 1;
  const shown = hsMore ? list.slice(hsPage * PER, hsPage * PER + PER) : list.slice(0, 5);
  const row = s => {
    const c = sessionCat(s);
    return `<button class="hist-row" data-aula="${s.id}">
      <span class="hist-title">${esc(s.title || 'Sem título')}</span>
      <span class="hist-cat" style="--c:${c.color}">${esc(c.name)}</span>
      <span class="hist-date">${ddmm(parseIso(s.date))}</span></button>`;
  };
  view.innerHTML = stdBack('Voltar', 'home') + `
    <div class="hist-list">${list.length ? shown.map(row).join('')
      : '<p class="small muted" style="padding:14px">Nenhuma sessão ainda. Toque em Iniciar sessão para começar.</p>'}</div>
    ${!hsMore && list.length > 5 ? '<button class="hist-more" id="hsMore">Mostrar mais ⌄</button>' : ''}
    ${hsMore ? `<div class="hist-pager">
        <button class="btn sm" id="hsPrev" ${hsPage ? '' : 'disabled'}>‹ Página anterior</button>
        <span class="small muted">${hsPage + 1} de ${pages}</span>
        <button class="btn sm" id="hsNext" ${hsPage < pages - 1 ? '' : 'disabled'}>Próxima página ›</button>
      </div>
      <button class="hist-more" id="hsLess">Mostrar menos ⌃</button>` : ''}
    ${weekBarsHtml()}`;
  bindStdGo();
  view.querySelectorAll('[data-aula]').forEach(b => b.onclick = () => { stdAula = b.dataset.aula; stdGo('aula'); });
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on('hsMore', () => { hsMore = true; hsPage = 0; renderHistoricoEstudo(); });
  on('hsLess', () => { hsMore = false; renderHistoricoEstudo(); });
  on('hsPrev', () => { hsPage--; renderHistoricoEstudo(); });
  on('hsNext', () => { hsPage++; renderHistoricoEstudo(); });
  bindWeekBars();
}

function weekBarsHtml() {
  const start = hsWeek ? parseIso(hsWeek) : mondayOf(today()), tk = iso(today());
  const days = daysIn({ start, end: addDays(start, 6) });
  const goalH = S().dailyGoalMin / 60;
  const vals = days.map(d => getDay(iso(d)).study);
  const W = 340, H = 170, top = 12, bottom = 34, left = 30, right = 6;
  const max = Math.max(goalH, 1, ...vals) * 1.1;
  const slot = (W - left - right) / 7, bw = Math.min(14, slot * 0.32);
  const y = h => top + (1 - h / max) * (H - top - bottom);
  const bars = days.map((d, i) => {
    const cx = left + slot * i + slot / 2, k = iso(d), future = k > tk;
    const tower = (x, h, color, title) => `<rect x="${x.toFixed(1)}" y="${y(h).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, H - bottom - y(h)).toFixed(1)}" rx="4" fill="${color}"><title>${title}</title></rect>`;
    return tower(cx - bw - 1, goalH, '#f97316', 'Objetivo: ' + fmtHours(goalH))
      + (future ? '' : tower(cx + 1, vals[i], vals[i] >= goalH ? '#16a34a' : '#3b82f6', 'Estudado: ' + fmtHours(vals[i])))
      + `<text x="${cx}" y="${H - 18}" text-anchor="middle">${WEEKDAYS[d.getDay()]}</text>`
      + `<text x="${cx}" y="${H - 5}" text-anchor="middle">${d.getDate()}</text>`;
  }).join('');
  const total = vals.reduce((a, b) => a + b, 0), met = vals.filter(v => v >= goalH && v > 0).length;
  return `<div class="wbars">
    <div class="prog-head" style="cursor:default"><b>Semana</b>
      <button class="wb-date" id="wbDate">${icon('calendar')} ${ddmm(start)} a ${ddmm(addDays(start, 6))}</button></div>
    ${hsPick ? weekPickerHtml(start, hsPickMonth) : ''}
    <div class="small muted">${fmtHours(total)} estudadas · ${met} ${met === 1 ? 'dia' : 'dias'} com o objetivo batido</div>
    <svg viewBox="0 0 ${W} ${H}" class="prog-chart" aria-label="Objetivo e horas estudadas por dia">
      ${[0, max / 2].map(v => `<text x="${left - 6}" y="${y(v) + 3}" text-anchor="end">${fmtHours(v)}</text>`).join('')}
      <line x1="${left}" x2="${W - right}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--line)"/>
      ${bars}
    </svg>
    <div class="small muted prog-legend"><span><i class="sq" style="background:#f97316"></i>objetivo</span>
      <span><i class="sq" style="background:#3b82f6"></i>estudado</span><span><i class="sq" style="background:#16a34a"></i>objetivo batido</span></div>
  </div>`;
}
// Janela de calendário para escolher a semana: tocar num dia escolhe a semana inteira (segunda a domingo).
// month: mês mostrado (iso do dia 1) ou null para o mês da semana escolhida.
function weekPickerHtml(start, month) {
  const base = month ? parseIso(month) : new Date(start.getFullYear(), start.getMonth(), 1);
  const first = new Date(base.getFullYear(), base.getMonth(), 1), tk = iso(today());
  const mdays = daysIn({ start: first, end: new Date(first.getFullYear(), first.getMonth() + 1, 0) });
  const a = iso(start), b = iso(addDays(start, 6));
  let cells = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(x => `<span class="cal-h">${x}</span>`).join('') + '<span></span>'.repeat((first.getDay() + 6) % 7);
  mdays.forEach(d => {
    const k = iso(d);
    cells += `<button class="wp-d ${k >= a && k <= b ? 'in' : ''} ${k === a ? 'first' : ''} ${k === b ? 'last' : ''}" data-wpd="${k}" ${k > tk ? 'disabled' : ''}>${d.getDate()}</button>`;
  });
  return `<div class="wpick">
    <div class="datenav" style="margin:0 0 8px">
      <button class="iconbtn sm" id="wpPrev" aria-label="Mês anterior">‹</button>
      <strong style="font-size:15px">${cap(MONTHS[first.getMonth()])} ${first.getFullYear()}</strong>
      <button class="iconbtn sm" id="wpNext" aria-label="Próximo mês" ${iso(addDays(new Date(first.getFullYear(), first.getMonth() + 1, 1), 0)) > tk ? 'disabled' : ''}>›</button>
    </div>
    <div class="wp-grid">${cells}</div>
    <div class="wp-foot"><span class="small muted">Toque num dia para escolher a semana dele.</span>
      <button class="see" id="wpNow">Esta semana</button></div>
  </div>`;
}
// Liga a janela: o = { start, month, setMonth(iso), pick(isoSegunda), rerender }.
function bindWeekPicker(o) {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  const move = n => {
    const cur = o.month ? parseIso(o.month) : new Date(o.start.getFullYear(), o.start.getMonth(), 1);
    o.setMonth(iso(new Date(cur.getFullYear(), cur.getMonth() + n, 1)));
    o.rerender();
  };
  on('wpPrev', () => move(-1));
  on('wpNext', () => move(1));
  on('wpNow', () => { o.pick(null); o.rerender(); });
  view.querySelectorAll('[data-wpd]').forEach(b => b.onclick = () => { o.pick(iso(mondayOf(parseIso(b.dataset.wpd)))); o.rerender(); });
}
function keepScroll(fn) { return () => { const y = window.scrollY; fn(); window.scrollTo(0, y); }; }

function bindWeekBars() {
  const rerender = keepScroll(renderHistoricoEstudo);
  const btn = document.getElementById('wbDate');
  if (btn) btn.onclick = () => { hsPick = !hsPick; hsPickMonth = null; rerender(); };
  if (hsPick) bindWeekPicker({ start: hsWeek ? parseIso(hsWeek) : mondayOf(today()), month: hsPickMonth,
    setMonth: m => { hsPickMonth = m; }, pick: w => { hsWeek = w; hsPick = false; }, rerender });
}

function renderAula() {
  const s = state.sessions.find(x => x.id === stdAula);
  if (!s) return stdGo('historico');
  const c = sessionCat(s), d = parseIso(s.date);
  view.innerHTML = stdBack('Histórico', 'historico') + `
    <div class="aula-head">
      <div class="aula-title">${esc(s.title || 'Sem título')}</div>
      <div class="aula-cat">${catMark(c)}</div>
      <div class="small muted">${cap(WEEKDAY_FULL[d.getDay()])}, ${ddmm(d)}/${s.date.slice(0, 4)} · ${fmtHours(s.minutes / 60)}${s.pomodoro ? ' · ' + s.pomodoro + (s.pomodoro === 1 ? ' pomodoro' : ' pomodoros') : ''}</div>
    </div>
    <div class="card">
      <h3>O que eu aprendi</h3>
      <textarea id="aulaText" class="rs-text" placeholder="Sem resumo. Escreva aqui (ou use o microfone do teclado).">${esc(s.summary || '')}</textarea>
      <p class="small muted rs-hint" id="aulaSaved" style="margin-bottom:0">As mudanças são salvas sozinhas.</p>
    </div>
    <button class="btn danger block" id="aulaDel">Apagar sessão</button>`;
  bindStdGo();
  const ta = document.getElementById('aulaText');
  ta.onchange = () => { s.summary = ta.value.trim(); save(); toast('Resumo salvo'); };
  document.getElementById('aulaDel').onclick = () => {
    if (!confirm('Apagar esta sessão? O tempo sai do registro do dia.')) return;
    removeSession(s.id);
    stdGo('historico');
  };
}

// ----- análise das transcrições (palavras-chave, perguntas e grafo) -----
// Tudo é feito no celular, sem internet: o app lê os resumos e acha os termos importantes de cada aula.
const STOP = new Set(('a o e de do da dos das em no na nos nas num numa um uma uns umas que para pra pro por pelo pela pelos pelas com sem se ao aos as os ' +
  'como mais menos muito muita muitos muitas pouco pouca tambem ja nao sim sua seu suas seus ele ela eles elas isso isto esse essa esses essas ' +
  'este esta estes estas aquele aquela aquilo ser sao foi foram era eram tem ter tinha temos pode podem podemos deve devem quando onde qual quais ' +
  'porque porquê pois entao assim depois antes entre sobre ate mas ou cada todo toda todos todas outro outra outros outras mesmo mesma ainda bem ' +
  'vai vao fica ficar fazer feito sendo estar estao estava aqui ali la eu voce voces nos gente coisa coisas tipo aula hoje aprendi sessao falou ' +
  'professor professora basicamente exemplo forma parte vez vezes acho dele dela deles delas nesse nessa neste nesta disso desse dessa deste desta ' +
  'importante sempre nunca melhor maior menor grande pequeno pequena muito tudo nada algo alguns algumas qualquer quanto quanta durante apos ' +
  'tambem fazem faz fiz vamos tenho temos estou sobre mesmo usar usa usado usada uso modo cada quando entender entendi visto vimos').split(/\s+/));

function stemKey(w) { return w.length > 5 && w.endsWith('s') ? w.slice(0, -1) : w; }
// Palavras de um texto: [{key, word}] — key sem acento/maiúscula (para comparar), word como foi escrita.
function words(text) {
  const out = [];
  for (const m of (text || '').matchAll(/[\p{L}\d]+/gu)) {
    const f = fold(m[0]);
    if (f.length < 4 || STOP.has(f) || /^\d+$/.test(f)) continue;
    out.push({ key: stemKey(f), word: m[0].toLowerCase() });
  }
  return out;
}
function sentences(text) {
  return (text || '').replace(/\s+/g, ' ').split(/(?<=[.!?;])\s+|\n+/).map(x => x.trim()).filter(x => x.split(' ').length >= 5);
}
// Para cada sessão com resumo: as palavras-chave (peso tf × idf) e a forma mais usada de cada termo.
function analyzeSessions(list) {
  const docs = list.map(s => ({ s, ws: words(s.summary + ' ' + (s.title || '')) }));
  const df = {}, label = {};
  docs.forEach(d => {
    new Set(d.ws.map(w => w.key)).forEach(k => { df[k] = (df[k] || 0) + 1; });
    d.ws.forEach(w => { (label[w.key] = label[w.key] || {})[w.word] = (label[w.key][w.word] || 0) + 1; });
  });
  const N = docs.length;
  const idf = k => Math.log((N + 1) / ((df[k] || 0) + 1)) + 1;
  docs.forEach(d => {
    const tf = {};
    d.ws.forEach(w => { tf[w.key] = (tf[w.key] || 0) + 1; });
    d.keys = Object.keys(tf).map(k => [k, tf[k] * idf(k)]).sort((a, b) => b[1] - a[1]);
    d.set = new Set(Object.keys(tf));
  });
  const nice = k => { const v = label[k] || {}; return Object.keys(v).sort((a, b) => v[b] - v[a])[0] || k; };
  return { docs, df, idf, nice };
}

// Perguntas geradas a partir dos resumos: definições, frases para completar e ligações entre aulas.
function makeQuestions(list, mode) {
  const withText = list.filter(s => s.summary && s.summary.trim());
  if (!withText.length) return [];
  const all = analyzeSessions(studySessions().filter(s => s.summary && s.summary.trim()));
  const score = k => all.idf(k) * (k.length > 6 ? 1.2 : 1);
  const out = [];
  withText.forEach(s => {
    sentences(s.summary).forEach(sen => {
      const def = sen.match(/^(?:(?:o|a|os|as)\s+)?(.{3,50}?)\s+(é|são|significa|serve para|servem para|consiste em|ocorre quando)\s+(.{8,})$/i);
      if (def) {
        const subj = def[1].replace(/^[\s,]+|[\s,]+$/g, ''), v = def[2].toLowerCase();
        const q = v.startsWith('serve') ? `Para que serve${v === 'servem para' ? 'm' : ''} ${subj}?`
          : v === 'consiste em' ? `Em que consiste ${subj}?` : v === 'ocorre quando' ? `Quando ocorre ${subj}?`
          : v === 'significa' ? `O que significa ${subj}?` : `O que ${v} ${subj}?`;
        out.push({ q, a: sen, from: s, kind: 'def' });
        return;
      }
      // frase para completar: some o termo mais "raro" da frase
      const ws = words(sen).filter(w => w.word.length >= 5);
      if (!ws.length) return;
      const best = ws.slice().sort((a, b) => score(b.key) - score(a.key))[0];
      const re = new RegExp('(^|[^\\p{L}])(' + best.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[^\\p{L}]|$)', 'iu');
      if (!re.test(sen)) return;
      out.push({ q: 'Complete: ' + sen.replace(re, '$1_____'), a: best.word + ' — ' + sen, from: s, kind: 'cloze' });
    });
    out.push({ q: `Explique com suas palavras o principal de "${s.title || 'esta aula'}".`, a: s.summary, from: s, kind: 'livre' });
  });
  // modo geral: ligações entre aulas diferentes que falam do mesmo termo
  if (mode === 'geral' && withText.length > 1) {
    const an = analyzeSessions(withText), seen = new Set();
    // termos que andam juntos ("dimensão vertical") dariam a mesma resposta: só a primeira entra
    Object.keys(an.df).filter(k => an.df[k] >= 2).sort((a, b) => an.df[b] - an.df[a] || b.length - a.length).forEach(k => {
      if (seen.size >= 2) return;
      const ds = an.docs.filter(d => d.set.has(k)).slice(0, 2);
      const pick = d => sentences(d.s.summary).find(x => fold(x).includes(k)) || d.s.summary.slice(0, 160);
      const a = `${ds[0].s.title}: ${pick(ds[0])}\n\n${ds[1].s.title}: ${pick(ds[1])}`;
      if (seen.has(a)) return;
      seen.add(a);
      out.push({ q: `Como "${an.nice(k)}" aparece em "${ds[0].s.title}" e em "${ds[1].s.title}"?`, a, from: ds[0].s, kind: 'liga' });
    });
  }
  // embaralha, mas mantém uma mistura de tipos
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, 12);
}

// ----- retomadas -----
let retCat = null, retMode = 'geral', retAula = null, retQs = null, retIdx = 0, retShown = false;
function catSessions(catId) { return studySessions().filter(s => s.catId === catId && s.summary && s.summary.trim()); }

function renderRetomadas() {
  const cats = S().cats.map(c => ({ c, n: catSessions(c.id).length }));
  view.innerHTML = stdBack('Voltar', 'home') + `
    <p class="small muted" style="margin:0 0 10px">Escolha uma categoria. As perguntas saem do que você escreveu depois de cada sessão.</p>
    <div class="ret-grid">${cats.length ? cats.map(({ c, n }) => `
      <button class="ret-cat" data-rcat="${c.id}" style="--c:${c.color}" ${n ? '' : 'disabled'}>
        <b>${esc(c.name)}</b><span>${n} ${n === 1 ? 'aula' : 'aulas'}</span></button>`).join('')
      : '<p class="small muted">Nenhuma categoria ainda. Elas nascem quando você inicia uma sessão.</p>'}</div>`;
  bindStdGo();
  view.querySelectorAll('[data-rcat]').forEach(b => b.onclick = () => {
    retCat = b.dataset.rcat; retMode = 'geral'; retAula = null; retQs = null; stdGo('retomada');
  });
}

function renderRetomada() {
  const c = stdCat(retCat);
  if (!c) return stdGo('retomadas');
  const aulas = catSessions(c.id);
  if (retMode === 'aula' && !aulas.some(s => s.id === retAula)) retAula = aulas[0] ? aulas[0].id : null;
  const scope = retMode === 'geral' ? aulas : aulas.filter(s => s.id === retAula);
  // perguntas importadas do Claude para esta categoria/aula vêm primeiro
  const imported = S().cards.filter(k => k.catId === c.id && (retMode === 'geral' || k.sessionId === retAula))
    .map(k => ({ q: k.q, a: k.a, kind: 'claude' }));
  if (!retQs) { retQs = imported.concat(makeQuestions(scope, retMode)); retIdx = 0; retShown = false; }
  const q = retQs[retIdx];
  view.innerHTML = stdBack('Retomadas', 'retomadas') + `
    <div class="cat-head" style="--c:${c.color}"><b>${esc(c.name)}</b><span>${aulas.length} ${aulas.length === 1 ? 'aula' : 'aulas'}</span></div>
    <div class="seg ret-mode">
      <button data-rm="geral" class="${retMode === 'geral' ? 'on' : ''}">${icon('layers')} Geral</button>
      <button data-rm="aula" class="${retMode === 'aula' ? 'on' : ''}">${icon('doc')} Por aula</button>
    </div>
    ${retMode === 'aula' ? `<select class="field-input" id="retAula" style="margin-top:10px">${aulas.map(s =>
      `<option value="${s.id}" ${s.id === retAula ? 'selected' : ''}>${esc(s.title || 'Sem título')} · ${ddmm(parseIso(s.date))}</option>`).join('')}</select>` : ''}
    ${q ? `
    <div class="card review" style="margin-top:12px">
      <div class="small muted">Pergunta ${retIdx + 1} de ${retQs.length}${q.from ? ' · ' + esc(q.from.title || '') : ''}${q.kind === 'claude' ? ' · do Claude' : ''}</div>
      <div class="review-q">${esc(q.q)}</div>
      ${retShown ? `<div class="review-a">${esc(q.a).replace(/\n/g, '<br>')}</div>`
        : `<textarea id="retTry" placeholder="Tente responder antes de ver. Pode ditar pelo microfone do teclado."></textarea>
           <button class="btn primary block" id="retShow">Mostrar resposta</button>`}
      <div class="btnrow" style="margin-top:10px">
        <button class="btn" id="retPrev" ${retIdx ? '' : 'disabled'}>‹ Anterior</button>
        <button class="btn" id="retNext">${retIdx < retQs.length - 1 ? 'Próxima ›' : 'Novas perguntas'}</button>
      </div>
    </div>` : '<div class="card small muted" style="margin-top:12px">Não deu para criar perguntas: os resumos estão muito curtos. Escreva um pouco mais depois das sessões.</div>'}

    <details class="card settings-card">
      <summary><b>Perguntas mais elaboradas com o Claude</b></summary>
      <ol class="steps small">
        <li>Toque em <b>Copiar pedido</b> e cole numa conversa com o Claude.</li>
        <li>Copie a resposta dele e cole aqui embaixo.</li>
      </ol>
      <button class="btn block" id="retCopy">Copiar pedido</button>
      <textarea id="retPaste" placeholder="Cole aqui a resposta do Claude (P: ... R: ...)" style="margin-top:10px"></textarea>
      <button class="btn primary block" id="retImport">Importar perguntas</button>
    </details>`;

  bindStdGo();
  view.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { retMode = b.dataset.rm; retQs = null; renderRetomada(); });
  const sel = document.getElementById('retAula');
  if (sel) sel.onchange = () => { retAula = sel.value; retQs = null; renderRetomada(); };
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on('retShow', () => { retShown = true; renderRetomada(); });
  on('retPrev', () => { retIdx--; retShown = false; renderRetomada(); });
  on('retNext', () => {
    if (retIdx < retQs.length - 1) retIdx++; else retQs = null;
    retShown = false;
    renderRetomada();
  });
  on('retCopy', async () => {
    const text = questionPrompt({ name: c.name }, scope.slice(-6));
    try { await navigator.clipboard.writeText(text); toast('Pedido copiado. Cole no Claude'); }
    catch (e) { prompt('Copie o texto abaixo:', text); }
  });
  on('retImport', () => {
    const qa = parseQA(document.getElementById('retPaste').value);
    if (!qa.length) return alert('Não encontrei perguntas. O texto precisa ter linhas começando com "P:" e "R:".');
    qa.forEach(x => S().cards.push(Object.assign(newCard(null, retMode === 'aula' ? retAula : null, x.q, x.a), { catId: c.id })));
    save();
    toast(qa.length + ' perguntas importadas');
    retQs = null;
    renderRetomada();
  });
}

// ----- base de conhecimento (grafo) -----
// Bolinhas: categorias (grandes), aulas (médias, na cor da categoria) e termos que aparecem em
// mais de uma aula (pequenas). Os termos ligam aulas de categorias diferentes. Dá para arrastar,
// mover a tela e dar zoom com dois dedos.
let kg = null;
const KG_HINT = '<span class="small muted">Toque numa bolinha para ler o que você já registrou sobre ela. Arraste para mover, use dois dedos para dar zoom.</span>';
function buildGraph() {
  const list = studySessions().filter(s => s.summary && s.summary.trim());
  const nodes = [], links = [], idx = {};
  const add = n => { idx[n.id] = nodes.length; nodes.push(Object.assign({ x: (Math.random() - .5) * 300, y: (Math.random() - .5) * 300, vx: 0, vy: 0 }, n)); };
  const catsUsed = new Map();
  list.forEach(s => { const c = sessionCat(s); catsUsed.set(c.name + c.color, c); });
  catsUsed.forEach((c, key) => add({ id: 'c:' + key, kind: 'cat', label: c.name, color: c.color, r: 16 }));
  list.forEach(s => {
    const c = sessionCat(s);
    add({ id: 's:' + s.id, kind: 'aula', label: s.title || 'Sem título', color: c.color, r: 9, ref: s });
    links.push([idx['c:' + c.name + c.color], idx['s:' + s.id]]);
  });
  if (list.length > 1) {
    const an = analyzeSessions(list);
    Object.keys(an.df).filter(k => an.df[k] >= 2).sort((a, b) => an.df[b] - an.df[a]).slice(0, 60).forEach(k => {
      const ds = an.docs.filter(d => d.set.has(k));
      // cor do termo: a da categoria que mais usa ele
      const count = {};
      ds.forEach(d => { const c = sessionCat(d.s); count[c.color] = (count[c.color] || 0) + 1; });
      const color = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      add({ id: 't:' + k, kind: 'termo', label: an.nice(k), color, r: 4 + Math.min(5, ds.length), n: ds.length });
      ds.forEach(d => links.push([idx['s:' + d.s.id], idx['t:' + k]]));
    });
  }
  return { nodes, links, cam: { x: 0, y: 0, k: 1 }, alpha: 1, sel: null, drag: null, raf: 0 };
}

function stepGraph(g) {
  const N = g.nodes, a = g.alpha;
  for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
    const p = N[i], q = N[j];
    let dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy || 0.01;
    if (d2 > 160000) continue;
    const f = Math.min(8, 2600 / d2) * a, d = Math.sqrt(d2);
    dx /= d; dy /= d;
    p.vx -= dx * f; p.vy -= dy * f; q.vx += dx * f; q.vy += dy * f;
  }
  g.links.forEach(([i, j]) => {
    const p = N[i], q = N[j], rest = p.kind === 'cat' ? 100 : 75;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01, f = (d - rest) * 0.02 * a;
    p.vx += dx / d * f; p.vy += dy / d * f; q.vx -= dx / d * f; q.vy -= dy / d * f;
  });
  N.forEach(n => {
    n.vx -= n.x * 0.004 * a; n.vy -= n.y * 0.004 * a;
    if (n === g.drag) { n.vx = n.vy = 0; return; }
    n.vx *= 0.82; n.vy *= 0.82;
    n.x += n.vx; n.y += n.vy;
  });
  g.alpha = Math.max(0.03, g.alpha * 0.992);
}

function drawGraph(g, cv) {
  const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = cv.width / dpr, H = cv.height / dpr;
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const { x: cx, y: cy, k } = g.cam;
  const sx = x => (x - cx) * k + W / 2, sy = y => (y - cy) * k + H / 2;
  const near = g.sel != null ? new Set(g.links.filter(l => l.includes(g.sel)).flat()) : null;
  ctx.lineWidth = 1;
  g.links.forEach(([i, j]) => {
    const hot = near && (i === g.sel || j === g.sel);
    ctx.strokeStyle = hot ? (dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)') : (dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.12)');
    ctx.beginPath(); ctx.moveTo(sx(g.nodes[i].x), sy(g.nodes[i].y)); ctx.lineTo(sx(g.nodes[j].x), sy(g.nodes[j].y)); ctx.stroke();
  });
  g.nodes.forEach((n, i) => {
    const r = n.r * Math.max(0.6, Math.min(1.6, k)), faded = near && !near.has(i);
    ctx.globalAlpha = faded ? 0.25 : 1;
    ctx.fillStyle = n.color;
    if (n.kind !== 'termo') { ctx.shadowColor = n.color; ctx.shadowBlur = n.kind === 'cat' ? 14 : 6; }
    ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (i === g.sel) { ctx.strokeStyle = dark ? '#fff' : '#111'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
    const showLabel = n.kind === 'cat' || i === g.sel || (near && near.has(i)) || (n.kind === 'aula' && k > 0.9) || k > 1.5;
    if (showLabel) {
      ctx.fillStyle = dark ? '#f2f2f4' : '#121214';
      ctx.font = (n.kind === 'cat' ? '700 13px ' : n.kind === 'aula' ? '600 11px ' : '11px ') + '-apple-system, sans-serif';
      ctx.textAlign = 'center';
      const t = n.label.length > 26 ? n.label.slice(0, 25) + '…' : n.label;
      ctx.fillText(t, sx(n.x), sy(n.y) + r + 13);
    }
  });
  ctx.globalAlpha = 1;
}

function renderBase() {
  if (kg) cancelAnimationFrame(kg.raf);
  kg = buildGraph();
  const cats = S().cats.filter(c => kg.nodes.some(n => n.kind === 'cat' && n.color === c.color && n.label === c.name));
  view.innerHTML = stdBack('Voltar', 'home') + `
    <div class="kg-legend">${cats.map(c => `<span><i style="background:${c.color}"></i>${esc(c.name)}</span>`).join('')}</div>
    <div class="kg-wrap" id="kgWrap">
      ${kg.nodes.length ? '<canvas id="kgCanvas"></canvas>' : '<p class="small muted" style="padding:16px">A base nasce dos resumos que você escreve depois das sessões. Faça a primeira sessão para ver a primeira bolinha.</p>'}
      <div class="kg-zoom"><button class="iconbtn sm" id="kgIn" aria-label="Aproximar">+</button><button class="iconbtn sm" id="kgOut" aria-label="Afastar">−</button></div>
    </div>
    <div class="card kg-info" id="kgInfo">${KG_HINT}</div>`;
  bindStdGo();
  const cv = document.getElementById('kgCanvas');
  if (!cv) return;
  const wrap = document.getElementById('kgWrap');
  const top = document.querySelector('.topbar').offsetHeight, bottom = parseFloat(getComputedStyle(document.body).paddingBottom);
  wrap.style.height = Math.max(320, window.innerHeight - top - bottom - 220) + 'px';
  const size = () => {
    const dpr = window.devicePixelRatio || 1;
    cv.width = wrap.clientWidth * dpr; cv.height = wrap.clientHeight * dpr;
    cv.style.width = wrap.clientWidth + 'px'; cv.style.height = wrap.clientHeight + 'px';
  };
  size();
  const g = kg;
  const loop = () => {
    if (!document.body.contains(cv)) return; // saiu da tela: para a animação
    if (g.alpha > 0.031 || g.drag) stepGraph(g);
    drawGraph(g, cv);
    g.raf = requestAnimationFrame(loop);
  };
  for (let i = 0; i < 120; i++) stepGraph(g); // já abre quase arrumado
  loop();

  // toque, arrasto e zoom
  const pts = new Map();
  let start = null, pinch = null;
  const world = (px, py) => {
    const r = cv.getBoundingClientRect();
    return { x: (px - r.left - r.width / 2) / g.cam.k + g.cam.x, y: (py - r.top - r.height / 2) / g.cam.k + g.cam.y };
  };
  const hit = (px, py) => {
    const w = world(px, py);
    let best = -1, bd = Infinity;
    g.nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - w.x, n.y - w.y), lim = (n.r + 10) / Math.min(1, g.cam.k);
      if (d < lim && d < bd) { bd = d; best = i; }
    });
    return best;
  };
  const zoomAt = (f, px, py) => {
    const before = world(px, py);
    g.cam.k = Math.max(0.25, Math.min(4, g.cam.k * f));
    const after = world(px, py);
    g.cam.x += before.x - after.x; g.cam.y += before.y - after.y;
  };
  cv.addEventListener('pointerdown', e => {
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* sem captura, o arrasto ainda funciona dentro do quadro */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: g.cam.k };
      g.drag = null; start = null;
      return;
    }
    const i = hit(e.clientX, e.clientY);
    start = { x: e.clientX, y: e.clientY, t: Date.now(), node: i, cam: { ...g.cam }, moved: false };
    if (i >= 0) { g.drag = g.nodes[i]; g.alpha = Math.max(g.alpha, 0.3); }
  });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      zoomAt(pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d / g.cam.k, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) start.moved = true;
    if (g.drag) { const w = world(e.clientX, e.clientY); g.drag.x = w.x; g.drag.y = w.y; g.alpha = Math.max(g.alpha, 0.3); }
    else if (start.moved) {
      g.cam.x = start.cam.x - (e.clientX - start.x) / g.cam.k;
      g.cam.y = start.cam.y - (e.clientY - start.y) / g.cam.k;
    }
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (start && !start.moved) selectNode(start.node);
    g.drag = null; start = null;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); }, { passive: false });
  const center = () => { const r = cv.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  document.getElementById('kgIn').onclick = () => zoomAt(1.25, ...center());
  document.getElementById('kgOut').onclick = () => zoomAt(1 / 1.25, ...center());

  // Tocar numa bolinha mostra o que você já registrou sobre ela, juntando os resumos das aulas.
  function selectNode(i) {
    g.sel = i >= 0 ? i : null;
    const box = document.getElementById('kgInfo');
    if (g.sel == null) { box.innerHTML = KG_HINT; return; }
    const n = g.nodes[i];
    const aulas = n.kind === 'aula' ? [n.ref]
      : g.links.filter(l => l.includes(i)).map(l => g.nodes[l[0] === i ? l[1] : l[0]]).filter(x => x.kind === 'aula').map(x => x.ref);
    const open = s => `<button class="see" data-kgaula="${s.id}">abrir aula ›</button>`;
    const head = (sub) => `<div class="kg-sel"><i style="background:${n.color}"></i><b>${esc(n.label)}</b><span class="small muted">${sub}</span></div>`;
    let body;
    if (n.kind === 'aula') {
      const s = n.ref;
      body = head(ddmm(parseIso(s.date)) + ' · ' + fmtHours(s.minutes / 60))
        + `<div class="kg-note">${esc(s.summary).replace(/\n/g, '<br>')}</div>${open(s)}`;
    } else if (n.kind === 'termo') {
      // as frases de cada aula que falam desse termo
      const key = n.id.slice(2);
      body = head('em ' + aulas.length + ' aulas') + aulas.map(s => {
        const hits = sentences(s.summary).filter(x => fold(x).includes(key));
        return `<div class="kg-src"><span class="cat-mark" style="--c:${sessionCat(s).color}">${esc(s.title || 'Sem título')}</span>
          <div class="kg-note">${(hits.length ? hits : [s.summary.slice(0, 200)]).map(esc).join(' ')}</div>${open(s)}</div>`;
      }).join('');
    } else {
      // categoria: o começo do resumo de cada aula
      body = head(aulas.length + (aulas.length === 1 ? ' aula' : ' aulas')) + aulas.map(s => {
        const first = sentences(s.summary).slice(0, 2).join(' ') || s.summary.slice(0, 200);
        return `<div class="kg-src"><b class="small">${esc(s.title || 'Sem título')}</b>
          <div class="kg-note">${esc(first)}</div>${open(s)}</div>`;
      }).join('');
    }
    box.innerHTML = body;
    box.querySelectorAll('[data-kgaula]').forEach(b => b.onclick = () => { stdAula = b.dataset.kgaula; stdGo('aula'); });
  }
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
// Título do topo em cada página do Estudo (sem a seta: a volta é pelo "‹ Voltar" da página).
const STD_TITLES = { novoproj: 'Novo projeto', nova: 'Iniciar sessão', aovivo: 'Sessão', resumo: 'O que aprendi', historico: 'Histórico', aula: 'Aula',
  retomadas: 'Retomadas', retomada: 'Retomadas', base: 'Base de conhecimento', dashboard: 'Dashboard', projetos: 'Projetos',
  projeto: 'Projeto', sessao: 'Sessão', revisao: 'Revisão', conquistas: 'Conquistas' };

function renderEstudo() {
  if (recog && stdView !== 'sessao') { recog.stop(); }
  // durante a sessão o fundo vira um degradê azul
  document.body.classList.toggle('study-live', stdView === 'aovivo');
  const title = document.getElementById('title');
  if (stdView === 'home') {
    title.innerHTML = `<h1 class="with-back"><button class="back" id="backBtn" aria-label="Voltar para Estudo">‹</button>Estudo</h1>`;
    document.getElementById('backBtn').onclick = () => { tab = 'estudos'; goTab('estudos'); };
  } else title.innerHTML = `<h1>${STD_TITLES[stdView]}</h1>`;
  ({ home: renderStudyHome, nova: renderNovaSessao, aovivo: renderAoVivo, resumo: renderResumo,
    historico: renderHistoricoEstudo, aula: renderAula, novoproj: renderNovoProjeto, retomadas: renderRetomadas, retomada: renderRetomada, base: renderBase,
    dashboard: renderDashboard, projetos: renderProjetos, projeto: renderProjeto,
    sessao: renderSessaoEstudo, revisao: renderRevisao, conquistas: renderConquistas })[stdView]();
}
function stdGo(v) { stdView = v; renderEstudo(); window.scrollTo(0, 0); }
function stdBack(label, to) { return `<button class="back" data-sgo="${to}">‹ ${label}</button>`; }
function bindStdGo() { view.querySelectorAll('[data-sgo]').forEach(b => b.onclick = () => stdGo(b.dataset.sgo)); }

// Dashboard, Projetos, Revisão, Conquistas e o relatório saíram desta tela (o código delas continua,
// para voltar depois em outro formato).
function renderStudyHome() {
  const L = S().live, withText = state.sessions.filter(s => s.summary && s.summary.trim()).length;
  view.innerHTML = `
    <button class="std-start ${L ? 'running' : ''}" data-sgo="${L ? (L.phase === 'pronto' && L.manual ? 'resumo' : 'aovivo') : 'nova'}">
      <span><b>${L ? 'Sessão em andamento' : 'Iniciar sessão'}</b>
        <span class="small">${L ? esc(L.title) : S().focusMin + ' min de foco · ' + S().breakMin + ' de descanso'}</span></span>
      <span class="hub-ico">${icon(L ? 'timer' : 'play')}</span></button>
    <button class="std-hist" data-sgo="historico"><span><b>Histórico</b>
      <span class="small">${state.sessions.length} ${state.sessions.length === 1 ? 'sessão' : 'sessões'}</span></span>
      <span class="hub-ico">${icon('timer')}</span></button>
    <div class="std-squares">
      <button class="std-sq ret" data-sgo="retomadas"><span class="sq-ico">${icon('refresh')}</span>
        <b>Retomadas</b><span class="small">perguntas do que você estudou</span></button>
      <button class="std-sq kb" data-sgo="base"><span class="sq-ico">${icon('brain')}</span>
        <b>Base de conhecimento</b><span class="small">${withText} ${withText === 1 ? 'aula ligada' : 'aulas ligadas'}</span></button>
    </div>
    ${progressHtml()}
    ${recentProjectsHtml()}
    ${goalsHtml()}`;
  bindStdGo();
  bindProgress();
  bindGoals();
}

// ----- progresso: a semana escolhida (azul) comparada com a anterior (vermelha), de segunda a domingo -----
// "calendário" abre uma janela para escolher a semana, sem sair da tela.
let progWeek = null, progPick = false, progPickMonth = null;
function progressHtml() {
  const t = today(), tk = iso(t), goalH = S().dailyGoalMin / 60;
  const start = progWeek ? parseIso(progWeek) : mondayOf(t), isNow = !progWeek;
  const cur = { start, end: addDays(start, 6) }, prev = { start: addDays(start, -7), end: addDays(start, -1) };
  const hours = (r, stopAtToday) => daysIn(r).map(d => stopAtToday && iso(d) > tk ? null : getDay(iso(d)).study);
  const now = hours(cur, true), last = hours(prev, false);
  const weekMin = studyMin(cur), lastMin = studyMin(prev), weekDays = now.filter(h => h > 0).length;
  const W = 340, H = 150, top = 14, bottom = 22, left = 30, right = 10;
  const max = Math.max(goalH * 1.25, 1, ...now.filter(h => h != null), ...last);
  const x = i => left + i * (W - left - right) / 6, y = h => top + (1 - h / max) * (H - top - bottom);
  const path = vals => vals.reduce((d, h, i) => h == null ? d : d + (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(h).toFixed(1), '');
  const diff = weekMin - lastMin;
  return `<div class="prog">
    <div class="prog-head"><b>Progresso</b>
      <span class="prog-right"><button class="small red-link prog-cal" id="progCal">${icon('calendar')} calendário</button>
        <span class="small muted">${ddmm(cur.start)} a ${ddmm(cur.end)}</span></span></div>
    ${progPick ? `<div class="wpick-float">${weekPickerHtml(start, progPickMonth)}</div>` : ''}
    <div class="small muted">${isNow ? 'Esta semana' : 'Semana'}: <b class="prog-num">${fmtHours(weekMin / 60)}</b> de ${fmtHours(goalH * S().daysPerWeek)} ·
      ${weekDays} de ${S().daysPerWeek} dias${lastMin || weekMin ? ` · ${diff >= 0 ? '+' : '−'}${fmtHours(Math.abs(diff) / 60)} que a anterior` : ''}</div>
    <svg viewBox="0 0 ${W} ${H}" class="prog-chart" aria-label="Horas de estudo: esta semana e a semana passada">
      <defs><linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3b82f6" stop-opacity=".25"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs>
      ${[0, max / 2, max].map(v => `<text x="${left - 6}" y="${y(v) + 3}" text-anchor="end">${fmtHours(v)}</text>`).join('')}
      <line x1="${left}" x2="${W - right}" y1="${y(goalH)}" y2="${y(goalH)}" stroke="var(--good)" stroke-dasharray="5 5"/>
      <path d="${path(last)}" fill="none" stroke="#ef4444" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>
      ${(() => { const n = now.filter(h => h != null).length - 1;
        return n > 0 ? `<path d="${path(now)}L${x(n)} ${H - bottom}L${x(0)} ${H - bottom}z" fill="url(#progFill)"/>` : ''; })()}
      <path d="${path(now)}" fill="none" stroke="#3b82f6" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${now.map((h, i) => h ? `<circle cx="${x(i)}" cy="${y(h)}" r="3.6" fill="#3b82f6"/>` : '').join('')}
      ${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((l, i) => `<text x="${x(i)}" y="${H - 5}" text-anchor="middle">${l}</text>`).join('')}
    </svg>
    <div class="small muted prog-legend">
      <span><i class="ln blue"></i>${isNow ? 'esta semana' : 'semana escolhida'}</span><span><i class="ln red"></i>${isNow ? 'semana passada' : 'semana anterior'}</span><span><i class="ln goal"></i>meta (${fmtHours(goalH)})</span></div>
  </div>`;
}
function bindProgress() {
  const rerender = keepScroll(renderStudyHome);
  document.getElementById('progCal').onclick = () => { progPick = !progPick; progPickMonth = null; rerender(); };
  if (progPick) bindWeekPicker({ start: progWeek ? parseIso(progWeek) : mondayOf(today()), month: progPickMonth,
    setMonth: m => { progPickMonth = m; }, pick: w => { progWeek = w === iso(mondayOf(today())) ? null : w; progPick = false; }, rerender });
}

// ----- projetos de estudo -----
// Mais recentes primeiro: o que foi estudado ou criado por último.
function projLastTouch(p) {
  return state.sessions.filter(s => s.projectId === p.id).reduce((a, s) => s.date > a ? s.date : a, p.createdAt || '');
}
// No empate de data, o criado por último vem antes.
function recentProjects() {
  const ps = S().projects;
  return ps.slice().sort((a, b) => projLastTouch(b).localeCompare(projLastTouch(a)) || ps.indexOf(b) - ps.indexOf(a));
}
function projCat(p) { return stdCat(p.catId) || { name: p.area || 'Sem categoria', color: '#9ca3af' }; }
function projRow(p, q) {
  return `<button class="sproj-row" data-proj="${p.id}"><span class="sproj-name"><i class="sproj-dot"></i>${highlight(p.name, q)}</span>
    ${catMark(projCat(p))}<span class="sproj-date">${p.createdAt ? ddmm(parseIso(p.createdAt)) : ''}</span></button>`;
}
function recentProjectsHtml() {
  const ps = recentProjects().slice(0, 4);
  return `<div class="sproj">
    <button class="prog-head" data-sgo="projetos"><b>Projetos</b><span class="small red-link">ver todos ›</span></button>
    ${ps.length ? `<div class="sproj-list" data-sgo="projetos">${ps.map(p => projRow(p)).join('')}</div>`
      : '<button class="small muted sproj-empty" data-sgo="projetos">Nenhum projeto ainda. Toque para criar o primeiro.</button>'}
  </div>`;
}

let spSearch = '';
function renderProjetos() {
  const q = spSearch;
  const ps = recentProjects().filter(p => !q || fold(p.name).includes(fold(q.trim())) || fold(p.note || '').includes(fold(q.trim())));
  view.innerHTML = stdBack('Voltar', 'home') + `
    <div class="gal-tools">
      <input class="field-input gal-search" id="spQ" placeholder="Pesquisar projeto…" value="${esc(q)}" autocomplete="off" style="margin:0;flex:1">
      <button class="add-proj" id="spAdd" aria-label="Novo projeto">+</button>
    </div>
    <div class="sproj-list" style="margin-top:12px">${ps.length ? ps.map(p => projRow(p, q)).join('')
      : `<p class="small muted" style="padding:12px 4px">${S().projects.length ? 'Nenhum projeto encontrado.' : 'Nenhum projeto ainda. Toque no + para criar.'}</p>`}</div>`;
  bindStdGo();
  view.querySelectorAll('[data-proj]').forEach(b => b.onclick = () => { stdProject = b.dataset.proj; stdGo('projeto'); });
  document.getElementById('spAdd').onclick = () => { spSearch = ''; stdGo('novoproj'); };
  const qi = document.getElementById('spQ');
  qi.oninput = () => {
    spSearch = qi.value;
    renderProjetos();
    const n = document.getElementById('spQ');
    n.focus(); n.setSelectionRange(n.value.length, n.value.length);
  };
}

// Novo projeto: nome, categoria (as mesmas das sessões), descrição e objetivos (um por linha).
function renderNovoProjeto() {
  view.innerHTML = stdBack('Projetos', 'projetos') + `<div class="ns-page">
    <div class="card pf">
      <label>Nome do projeto<input class="field-input" id="npName" placeholder="Ex.: Dominar resina composta"></label>
      <div class="small muted" style="margin-bottom:6px">Categoria</div>
      ${stdCatPicker(S().lastCat && stdCat(S().lastCat) ? S().lastCat : null)}
      <label style="margin-top:10px">Descrição<textarea id="npNote" class="rs-text" style="min-height:90px" placeholder="Do que se trata e por que é importante"></textarea></label>
      <label>Objetivos (um por linha)<textarea id="npGoals" class="rs-text" style="min-height:90px" placeholder="Ex.: Ler o capítulo de adesão&#10;Fazer 5 restaurações classe II"></textarea></label>
    </div>
    <button class="btn primary block live-go" id="npSave">Criar projeto</button></div>`;
  bindStdGo();
  const getCat = bindStdCatPicker(S().lastCat && stdCat(S().lastCat) ? S().lastCat : null);
  document.getElementById('npSave').onclick = () => {
    const name = document.getElementById('npName').value.trim();
    if (!name) return toast('Dê um nome ao projeto');
    const catId = getCat();
    const steps = document.getElementById('npGoals').value.split('\n').map(x => x.trim()).filter(Boolean)
      .map(text => ({ id: uid(), text, done: false }));
    const p = { id: uid(), name, area: '', catId, note: document.getElementById('npNote').value.trim(), targetHours: null, steps, createdAt: iso(today()) };
    S().projects.push(p);
    save();
    stdProject = p.id;
    stdGo('projeto');
  };
}

// ----- objetivos: horas por dia e dias por semana (a linha verde do gráfico) -----
function goalsHtml() {
  const h = S().dailyGoalMin / 60, d = S().daysPerWeek;
  return `<div class="std-goals">
    <div class="std-goals-head"><b>Objetivos</b><span class="small">≈ ${fmtHours(h * d)} por semana</span></div>
    <div class="ns-row"><div><b>Horas por dia</b><div class="small">nos dias em que estudar</div></div>
      <div class="stepper"><button class="iconbtn sm" data-sg="h" data-d="-30">−</button><output>${fmtHours(h)}</output>
        <button class="iconbtn sm" data-sg="h" data-d="30">+</button></div></div>
    <div class="ns-row"><div><b>Dias por semana</b><div class="small">seja realista</div></div>
      <div class="stepper"><button class="iconbtn sm" data-sg="d" data-d="-1">−</button><output>${d}</output>
        <button class="iconbtn sm" data-sg="d" data-d="1">+</button></div></div>
  </div>`;
}
function bindGoals() {
  view.querySelectorAll('[data-sg]').forEach(b => b.onclick = () => {
    if (b.dataset.sg === 'h') S().dailyGoalMin = Math.min(720, Math.max(30, S().dailyGoalMin + +b.dataset.d));
    else S().daysPerWeek = Math.min(7, Math.max(1, S().daysPerWeek + +b.dataset.d));
    S().weeklyGoalMin = S().dailyGoalMin * S().daysPerWeek;
    save();
    renderStudyHome();
  });
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

  view.innerHTML = stdBack('Voltar', 'home') + `
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
    draftTitle = nt ? nt.title : '';
    stdGo('nova');
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
        <div class="hero-sub" style="margin:6px 0 4px">${catMark(projCat(p))}</div>
        <div class="hero-sub">${fmtHours(projectMinutes(p.id) / 60)} estudadas · ${sessions.length} sessões · criado em ${ddmm(parseIso(p.createdAt))}</div>
      </div>
      ${pct == null ? '' : ring(pct)}
    </div>
    ${p.note ? `<p class="proj-note" style="margin:0 2px 12px">${esc(p.note).replace(/\n/g, '<br>')}</p>` : ''}
    ${pct == null ? '<p class="small muted">Para ver a porcentagem, adicione objetivos ou uma meta de horas.</p>' : ''}

    <div class="btnrow" style="margin-bottom:12px">
      <button class="btn primary" id="projStart">${icon('play')} Estudar agora</button>
      <button class="btn" id="projReview" ${due ? '' : 'disabled'}>Revisar (${due})</button>
    </div>

    <div class="card">
      <h3>Objetivos</h3>
      ${p.steps.length ? `<ul class="list tasks">${p.steps.map(s => `
        <li class="${s.done ? 'done' : ''}">
          <button class="check ${s.done ? 'on' : ''}" data-step="${s.id}" aria-label="Concluir objetivo">${s.done ? '✓' : ''}</button>
          <div style="flex:1" class="task-t">${esc(s.text)}</div>
          <button class="x" data-delstep="${s.id}" aria-label="Apagar objetivo">×</button></li>`).join('')}</ul>`
        : '<p class="small muted" style="margin:0 0 6px">Liste o que você quer alcançar (capítulos, aulas, técnicas). A porcentagem sai daqui.</p>'}
      <div class="inline"><input id="stepText" placeholder="Novo objetivo"><button class="btn" id="stepAdd">Adicionar</button></div>
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
        <div class="small muted" style="margin-bottom:6px">Categoria</div>
        ${stdCatPicker(p.catId)}
        <label>Descrição<textarea class="field-input" id="epNote" rows="3">${esc(p.note || '')}</textarea></label>
        <label>Meta de horas (usada se não houver objetivos)<input class="field-input" type="number" inputmode="numeric" id="epHours" value="${p.targetHours ?? ''}" placeholder="—"></label>
      </div>
      <div class="btnrow">
        <button class="btn danger" id="epDel">Apagar projeto</button>
        <button class="btn primary" id="epSave">Salvar</button>
      </div>
    </details>`;

  bindStdGo();
  const getCat = bindStdCatPicker(p.catId);
  const rr = () => renderProjeto();
  document.getElementById('projStart').onclick = () => { draftTitle = ''; draftProj = p.id; if (p.catId) S().lastCat = p.catId; stdGo('nova'); };
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
    p.catId = getCat() || p.catId || null;
    p.note = document.getElementById('epNote').value.trim();
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
  view.innerHTML = (p ? stdBack(p.name, 'projeto') : stdBack('Voltar', 'home')) + `
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
  view.innerHTML = stdBack('Voltar', 'home') + `
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
  view.innerHTML = stdBack('Voltar', 'home') + `
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
  ({ home: renderAcadHome, escolher: renderEscolher, treinos: renderTreinos, editar: renderEditor, historico: renderHistorico, rota: renderRota, evolucao: renderEvolucao, atividade: renderAtividade,
    indoor: F().indoor ? renderIndoor : renderAcadHome })[acad]();
}

function backBar() { return `<button class="back" data-go="home">‹ Voltar</button>`; }
function bindGo() {
  view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { acad = b.dataset.go; renderAcademia(); window.scrollTo(0, 0); });
}

function weekCount(offset) {
  return daysIn(periodRange('semana', offset)).filter(d => getDay(iso(d)).gym).length;
}
// Meta da semana somando musculação, corrida e ciclismo (treino híbrido).
function totalGoal() { return Math.max(1, state.gymGoal + F().runGoal + F().bikeGoal); }
// Quantas sessões de cada tipo houve na semana (musculacao | corrida | ciclismo).
function weekTypeCount(type, offset) {
  const r = periodRange('semana', offset), s = iso(r.start), e = iso(r.end);
  const inWeek = x => x.date >= s && x.date <= e;
  return type === 'musculacao' ? state.gymLogs.filter(inWeek).length
    : F().activities.filter(a => a.type === type && inWeek(a)).length;
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
    parts[a.type] += a.kcal != null ? a.kcal : (a.type === 'corrida' ? runMet(a) : bikeMet(a)) * kg * a.minutes / 60;
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

// Redesenha a tela do Treino mantendo "Ajustar objetivos" aberto e a tela parada onde estava.
function rerenderGoals() {
  const y = window.scrollY;
  renderAcadHome();
  document.getElementById('goalsBox').open = true;
  window.scrollTo(0, y);
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
  const W = 320, H = 120, bottom = 20, top = 10, maxN = Math.max(totalGoal(), 7);
  const slot = W / weeks.length, bw = slot * 0.56, y = n => H - bottom - (n / maxN) * (H - top - bottom);
  const bars = weeks.map((w, i) => {
    const x = i * slot + (slot - bw) / 2;
    return `<rect x="${x}" y="${y(w.n)}" width="${bw}" height="${Math.max(H - bottom - y(w.n), 3)}" rx="${bw / 2}"
        fill="${w.n >= totalGoal() ?'var(--accent)' : 'var(--bar-dim)'}"><title>Semana de ${ddmm(w.start)}: ${w.n}</title></rect>
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
          <span style="flex:1;min-width:0"><b>${a.indoor ? (a.type === 'corrida' ? 'Esteira' : 'Bike na academia') : a.type === 'corrida' ? 'Corrida' : 'Pedalada'}</b>
            <span class="small muted" style="display:block">${a.km ? fmt(a.km) + ' km · ' : ''}${a.sec ? hms(a.sec * 1000) : a.minutes + ' min'}${a.km ? ' · ' + speedText(a.km / ((a.sec || a.minutes * 60) / 3600), a.type === 'corrida') : ''}</span></span>
          <span class="small muted">${actKcal(a)} kcal ›</span></li>`).join('')}
      </ul>` : ''}
      ${acadCat === 'corrida' || acadCat === 'ciclismo' ? `
        <button class="btn block indoor-start" id="indoorStart">${icon('dumbbell')}
          ${F().indoor && F().indoor.type === acadCat ? 'Continuar na academia'
            : acadCat === 'corrida' ? 'Na academia (esteira)' : 'Na academia (bike)'}</button>
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
        <div class="w-pill"><span style="width:${Math.min(100, wk / totalGoal() * 100)}%"></span><b>${wk}/${totalGoal()}</b></div>
        <div class="w-foot">${wk >= totalGoal() ? 'Meta batida!' : 'Faltam ' + (totalGoal() - wk)}</div>
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
        <line x1="0" x2="${W}" y1="${y(totalGoal())}" y2="${y(totalGoal())}" stroke="var(--accent)" stroke-dasharray="4 4" opacity=".6"/>
        ${bars}
      </svg>
      <div class="datenav" style="margin:14px 0 8px">
        <button class="iconbtn sm" id="prevM" aria-label="Mês anterior">‹</button>
        <strong>${cap(MONTHS[first.getMonth()])}</strong>
        <button class="iconbtn sm" id="nextM" aria-label="Próximo mês" ${presOffset >= 0 ? 'disabled' : ''}>›</button>
      </div>
      <div class="cal">${cal}</div>
    </div>

    <button class="acad-bar orange" data-go="treinos"><span><b>Treinos</b>
      <span class="acad-sub">${state.workouts.length} montados</span></span><span class="hub-ico">${icon('dumbbell')}</span></button>
    <button class="acad-bar ink" data-go="historico"><span><b>Histórico</b>
      <span class="acad-sub">${state.gymLogs.length} feitos</span></span><span class="hub-ico">${icon('chart')}</span></button>
    <button class="acad-bar soft" data-go="evolucao"><span><b>Acompanhar progresso</b>
      <span class="acad-sub">${weighDue() ? 'Pesagem da semana pendente' : OBJECTIVES[F().objective] ? OBJECTIVES[F().objective].name : 'Peso, frequência e força'}</span></span>
      <span class="hub-ico">${icon('trend')}</span></button>

    <details class="card settings-card" id="goalsBox">
      <summary><b>Ajustar objetivos</b></summary>
      <div class="field-label small muted">Seu objetivo</div>
      <div class="chips obj-chips">${Object.keys(OBJECTIVES).map(o =>
        `<button class="chip ${F().objective === o ? 'on' : ''}" data-obj="${o}">${OBJECTIVES[o].name}</button>`).join('')}</div>
      ${F().objective ? `<p class="small muted" style="margin:8px 0 4px">${OBJECTIVES[F().objective].plan}</p>` : ''}
      <div class="field"><span>Peso-alvo (kg, opcional)</span>
        <input type="number" inputmode="decimal" step="any" id="fitTarget" placeholder="—" value="${F().targetKg ?? ''}"></div>
      <div class="field-label small muted" style="margin-top:10px">Treinos por semana (dá para misturar: treino híbrido)</div>
      ${[['gymGoal', 'Musculação', 1, 0, 7, state.gymGoal, v => v],
         ['runGoal', 'Corrida', 1, 0, 7, F().runGoal, v => v],
         ['bikeGoal', 'Ciclismo', 1, 0, 7, F().bikeGoal, v => v],
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
    acad = 'escolher'; renderAcademia(); window.scrollTo(0, 0);
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
  const indoor = document.getElementById('indoorStart');
  if (indoor) indoor.onclick = () => {
    if (!F().indoor || F().indoor.type !== acadCat) {
      if (F().indoor && !confirm('Há uma atividade na academia em andamento. Descartar e começar outra?')) return;
      F().indoor = newIndoor(acadCat);
      save();
    }
    acad = 'indoor'; renderAcademia(); window.scrollTo(0, 0);
  };
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
    rerenderGoals();
  });
  document.getElementById('fitKg').onchange = e => {
    if (e.target.value === '') return;
    const w = state.profile.weights, last = w[w.length - 1], v = Math.max(20, Math.min(300, num(e.target.value)));
    if (last && last.date === tk) last.kg = v; else w.push({ date: tk, kg: v });
    save();
    toast('Peso salvo');
    rerenderGoals();
  };
  document.getElementById('prevM').onclick = () => { presOffset--; renderAcadHome(); };
  document.getElementById('nextM').onclick = () => { presOffset++; renderAcadHome(); };
  view.querySelectorAll('[data-obj]').forEach(b => b.onclick = () => {
    F().objective = F().objective === b.dataset.obj ? '' : b.dataset.obj;
    save();
    rerenderGoals();
  });
  document.getElementById('fitTarget').onchange = e => {
    F().targetKg = e.target.value === '' ? null : Math.max(20, Math.min(300, num(e.target.value)));
    save();
    toast('Peso-alvo salvo');
  };
}

// --- objetivo e acompanhamento ---
// Ritmo de peso por semana, em % do peso: [mínimo, máximo] do que é saudável para o objetivo.
const OBJECTIVES = {
  hipertrofia: { name: 'Hipertrofia', rate: [0.1, 0.5], loads: true,
    plan: 'Ganhar massa muscular: subir as cargas aos poucos, treinar com frequência e ganhar de 0,1% a 0,5% do peso por semana. Mais rápido que isso costuma ser gordura.' },
  emagrecer: { name: 'Perda de peso', rate: [-1, -0.25], loads: false,
    plan: 'Diminuir gordura: perder de 0,25% a 1% do peso por semana, sem largar a musculação para não perder músculo junto.' },
  recomposicao: { name: 'Recomposição', rate: [-0.3, 0.2], loads: true,
    plan: 'Perder gordura e ganhar músculo ao mesmo tempo: o peso fica quase parado enquanto as cargas sobem.' },
  manter: { name: 'Manter e saúde', rate: [-0.25, 0.25], loads: false,
    plan: 'Manter o peso estável e a frequência de treino em dia.' },
  condicionamento: { name: 'Condicionamento', rate: [-0.5, 0.25], loads: false,
    plan: 'Melhorar o fôlego: frequência alta e mais corrida ou bicicleta. O peso fica estável ou cai um pouco.' },
};

function weighDue() {
  const w = state.profile.weights, last = w[w.length - 1];
  return !last || (today() - parseIso(last.date)) / 864e5 >= 7;
}

// Ritmo de peso em % por semana, usando as pesagens das últimas 6 semanas.
function weightRate() {
  const since = iso(addDays(today(), -42));
  const w = state.profile.weights.filter(x => x.date >= since);
  if (w.length < 2) return null;
  const a = w[0], b = w[w.length - 1], weeks = (parseIso(b.date) - parseIso(a.date)) / (7 * 864e5);
  if (weeks < 1) return null;
  return { pct: (b.kg - a.kg) / a.kg * 100 / weeks, kg: (b.kg - a.kg) / weeks, weeks };
}

// Força: para cada exercício, a carga máxima de cada treino comparada à primeira registrada.
// A média por semana mostra quanto a força subiu desde o começo (em %).
function strengthWeeks(n) {
  const firstKg = {}, out = [];
  const logs = gymList();
  logs.forEach(lg => Object.keys(lg.sets || {}).forEach(ex => {
    const m = maxKg(lg.sets[ex]);
    if (m != null && firstKg[ex] == null && m > 0) firstKg[ex] = m;
  }));
  for (let o = 1 - n; o <= 0; o++) {
    const r = periodRange('semana', o), s = iso(r.start), e = iso(r.end), ratios = [];
    logs.filter(lg => lg.date >= s && lg.date <= e).forEach(lg => Object.keys(lg.sets || {}).forEach(ex => {
      const m = maxKg(lg.sets[ex]);
      if (m != null && firstKg[ex]) ratios.push(m / firstKg[ex]);
    }));
    out.push({ start: r.start, v: ratios.length ? (ratios.reduce((a, b) => a + b, 0) / ratios.length - 1) * 100 : null });
  }
  return out;
}

// Gráfico de linha simples. values: números ou null; target: linha tracejada opcional.
function trendChart(values, labels, fmtY, opts = {}) {
  const W = 320, H = 140, top = 12, bottom = 22, left = 38, right = 12;
  const nums = values.filter(v => v != null).concat(opts.target != null ? [opts.target] : []);
  if (!nums.length) return '<p class="small muted" style="margin:8px 0 0">Ainda sem dados.</p>';
  let lo = opts.zero ? Math.min(0, ...nums) : Math.min(...nums), hi = Math.max(...nums);
  if (hi - lo < (opts.minSpan || 1)) { const m = (hi + lo) / 2, s = (opts.minSpan || 1) / 2; lo = m - s; hi = m + s; }
  const pad = (hi - lo) * 0.1; lo -= opts.zero && lo === 0 ? 0 : pad; hi += pad;
  const x = i => left + i * (W - left - right) / Math.max(1, values.length - 1);
  const y = v => top + (1 - (v - lo) / (hi - lo)) * (H - top - bottom);
  let d = '';
  values.forEach((v, i) => { if (v != null) d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); });
  const grid = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>
    <text x="${left - 6}" y="${y(v) + 3}" text-anchor="end">${fmtY(v)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${grid}
    ${opts.target != null ? `<line x1="${left}" x2="${W - right}" y1="${y(opts.target)}" y2="${y(opts.target)}" stroke="var(--good)" stroke-dasharray="4 4"/>` : ''}
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${values.map((v, i) => v == null ? '' : `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="var(--accent)"/>`).join('')}
    ${labels.map((l, i) => l ? `<text x="${x(i)}" y="${H - 5}" text-anchor="middle">${l}</text>` : '').join('')}</svg>`;
}

function renderEvolucao() {
  const obj = OBJECTIVES[F().objective], kg = currentWeight(), rate = weightRate(), tk = iso(today());
  const ws = state.profile.weights;
  const last = ws[ws.length - 1];
  const freq = [], strength = strengthWeeks(12);
  for (let o = -11; o <= 0; o++) freq.push(weekCount(o));
  const wkLabels = strength.map((w, i) => i % 3 === 2 || i === 11 ? ddmm(w.start) : '');
  const freqOk = freq.slice(-4).reduce((a, b) => a + b, 0) / 4 >= totalGoal() * 0.75;
  // sessões por semana de cada tipo, para o gráfico de frequência
  const TYPES = [['musculacao', 'Musculação', '#ff6a13', state.gymGoal], ['corrida', 'Corrida', '#0ea5e9', F().runGoal],
    ['ciclismo', 'Ciclismo', '#10b981', F().bikeGoal]];
  const typeSeries = TYPES.map(([t, name, color, goal]) => {
    const values = [];
    for (let o = -11; o <= 0; o++) values.push(weekTypeCount(t, o));
    return { name, color, goal, values, me: t === 'musculacao' };
  }).filter(s => s.goal || s.values.some(v => v));
  const recent = strength.slice(-4).filter(w => w.v != null), older = strength.slice(-8, -4).filter(w => w.v != null);
  const avg = a => a.reduce((s, w) => s + w.v, 0) / a.length;
  const loadsUp = recent.length && older.length ? avg(recent) - avg(older) : null;

  // sinal do objetivo
  let sig = null;
  if (obj && rate) {
    const [mn, mx] = obj.rate, p = rate.pct;
    const inRange = p >= mn && p <= mx;
    const dir = rate.kg >= 0 ? 'ganhando' : 'perdendo';
    const pace = `Você está ${dir} ${fmt(Math.abs(Math.round(rate.kg * 100) / 100))} kg por semana (${p > 0 ? '+' : ''}${fmt(Math.round(p * 100) / 100)}%).`;
    if (inRange && freqOk && (!obj.loads || loadsUp == null || loadsUp >= 0)) {
      sig = ['good', '💪 Você está seguindo o seu objetivo!', pace + ' Esse é o ritmo certo para ' + obj.name.toLowerCase() + '.'];
    } else if (inRange) {
      sig = ['ok', '👍 O peso está no ritmo certo', pace + (freqOk ? '' : ' Falta manter a frequência de treinos.')
        + (obj.loads && loadsUp != null && loadsUp < 0 ? ' As cargas caíram nas últimas semanas.' : '')];
    } else {
      sig = ['bad', '⚠️ Fora do ritmo do objetivo', pace + (p < mn
        ? (mn > 0 ? ' Para ' + obj.name.toLowerCase() + ', o peso precisa subir um pouco mais.' : ' Está caindo rápido demais: cuidado para não perder músculo.')
        : (mx < 0 ? ' Para perder peso, ele precisa cair um pouco a cada semana.' : ' Está subindo rápido demais: provavelmente é gordura.'))];
    }
  }

  view.innerHTML = backBar() + `
    <div class="card weigh">
      <h3>Pesagem da semana</h3>
      <p class="small muted" style="margin-top:0">${last ? 'Última: ' + fmt(last.kg) + ' kg em ' + ddmm(parseIso(last.date))
        + (weighDue() ? ' · já faz uma semana, pese de novo' : '') : 'Pese-se uma vez por semana, no mesmo dia e horário (de manhã, em jejum).'}</p>
      <div class="inline">
        <input id="weighIn" type="number" inputmode="decimal" step="0.1" placeholder="Peso de hoje (kg)" value="${last && last.date === tk ? last.kg : ''}">
        <button class="btn primary" id="weighSave">Registrar</button>
      </div>
    </div>

    ${obj ? `<div class="card obj-card ${sig ? sig[0] : ''}">
      <div class="small muted">Objetivo: <b>${obj.name}</b></div>
      ${sig ? `<h3 style="margin:6px 0 4px">${sig[1]}</h3><p class="small" style="margin:0">${sig[2]}</p>`
        : `<p class="small" style="margin:6px 0 0">Registre pelo menos duas pesagens com uma semana de diferença para ver se você está no caminho.</p>`}
      <p class="small muted" style="margin:8px 0 0">${obj.plan}</p>
    </div>` : `<div class="card pastel peach small">Escolha seu objetivo em <b>Ajustar objetivos</b>, na tela do Treino,
      para o app dizer se você está no caminho.</div>`}

    <div class="card chart">
      <h3>Peso</h3>
      ${trendChart(ws.slice(-16).map(x => x.kg), ws.slice(-16).map((x, i, a) => i === 0 || i === a.length - 1 || i % 4 === 0 ? ddmm(parseIso(x.date)) : ''),
        v => fmt(Math.round(v * 10) / 10), { target: F().targetKg, minSpan: 2 })}
      ${F().targetKg && kg ? `<div class="small muted">Peso-alvo ${fmt(F().targetKg)} kg · faltam ${fmt(Math.abs(Math.round((F().targetKg - kg) * 10) / 10))} kg</div>` : ''}
    </div>

    <div class="card chart">
      <h3>Frequência · sessões por semana</h3>
      ${typeSeries.length ? multiLine(typeSeries, wkLabels, v => String(Math.round(v)), 1) : '<p class="small muted" style="margin:8px 0 0">Ainda sem dados.</p>'}
      <div class="legend people">${typeSeries.map(s => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>
      <div class="small muted">${TYPES.filter(t => t[3]).map(t => t[1] + ': ' + weekTypeCount(t[0], 0) + ' de ' + t[3]).join(' · ') || 'Defina as metas em Ajustar objetivos.'} nesta semana.</div>
    </div>

    <div class="card chart">
      <h3>Evolução de força</h3>
      ${trendChart(strength.map(w => w.v), wkLabels, v => (v > 0 ? '+' : '') + Math.round(v) + '%', { zero: true, minSpan: 10 })}
      <div class="small muted">Quanto as cargas subiram em relação à primeira vez de cada exercício.</div>
    </div>`;

  bindGo();
  document.getElementById('weighSave').onclick = () => {
    const v = num(document.getElementById('weighIn').value);
    if (!v) return toast('Digite o peso');
    const w = state.profile.weights, l = w[w.length - 1], kgv = Math.max(20, Math.min(300, v));
    if (l && l.date === tk) l.kg = kgv; else w.push({ date: tk, kg: kgv });
    save();
    toast('Pesagem registrada');
    renderEvolucao();
  };
}

// --- esteira e bike na academia (sem GPS) ---
// Calorias calculadas segundo a segundo com o que está no painel da máquina:
// esteira pela equação do ACSM (velocidade e inclinação); bike pela potência em watts
// (o corpo converte ~24% da energia em pedalada) mais o gasto de repouso.
function newIndoor(type) {
  return { type, running: false, elapsed: 0, lastTs: null, kcal: 0, km: 0, unit: 'kmh',
    speed: type === 'corrida' ? 9 : 20, incline: 1, watts: 100, samples: [] };
}
function indoorRate(i) { // kcal por hora
  const kg = currentWeight() || 75;
  if (i.type === 'corrida') {
    const S = i.speed * 1000 / 60, G = i.incline / 100;
    const vo2 = i.speed < 7 ? 0.1 * S + 1.8 * S * G + 3.5 : 0.2 * S + 0.9 * S * G + 3.5;
    return vo2 * kg / 1000 * 5 * 60;
  }
  return i.watts * 3.6 / 0.24 / 4.184 + kg;
}
function advanceIndoor() {
  const i = F().indoor;
  if (!i || !i.running) return;
  const now = Date.now(), dt = now - (i.lastTs || now);
  i.elapsed += dt;
  i.kcal += indoorRate(i) * dt / 3600000;
  i.km += i.speed * dt / 3600000;
  i.lastTs = now;
  const last = i.samples[i.samples.length - 1];
  if (!last || i.elapsed / 1000 - last.t >= 10) i.samples.push({ t: Math.round(i.elapsed / 1000), kcal: Math.round(i.kcal * 10) / 10 });
  writeLocal();
}
function tickIndoor() {
  const i = F().indoor;
  if (!i || !i.running) return;
  advanceIndoor();
  const c = document.getElementById('inClock');
  if (!c) return;
  c.textContent = hms(i.elapsed);
  document.getElementById('inKcal').textContent = Math.round(i.kcal);
  document.getElementById('inKm').textContent = fmt(Math.round(i.km * 100) / 100) + ' km';
  document.getElementById('inChart').innerHTML = indoorChart(i);
}
function indoorChart(i) {
  const W = 140, H = 84, pts = i.samples.concat([{ t: i.elapsed / 1000, kcal: i.kcal }]);
  const maxT = Math.max(60, pts[pts.length - 1].t), maxK = Math.max(10, ...pts.map(p => p.kcal));
  const x = t => 2 + t / maxT * (W - 4), y = k => H - 3 - k / maxK * (H - 8);
  const line = pts.map((p, n) => (n ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.kcal).toFixed(1)).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${line}L${x(pts[pts.length - 1].t).toFixed(1)} ${H}L${x(0)} ${H}z" fill="var(--accent)" opacity=".15"/>
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderIndoor() {
  const i = F().indoor, run = i.type === 'corrida';
  advanceIndoor();
  const speedTxt = i.unit === 'ms' ? fmt(Math.round(i.speed / 3.6 * 100) / 100) : fmt(Math.round(i.speed * 10) / 10);
  const ctrl = (key, label, value, unit, extra) => `
    <div class="in-ctrl">
      <div class="small muted">${label}</div>
      <div class="in-step">
        <button class="round-btn" data-in="${key}" data-d="-1" aria-label="Diminuir ${label.toLowerCase()}">−</button>
        <div class="in-val"><b>${value}</b><span>${unit}</span></div>
        <button class="round-btn" data-in="${key}" data-d="1" aria-label="Aumentar ${label.toLowerCase()}">+</button>
      </div>${extra || ''}
    </div>`;
  view.innerHTML = backBar() + `
    <div class="in-title">${run ? 'Esteira' : 'Bike'} na academia</div>
    <div class="in-grid">
      <div class="in-box in-clock"><div class="small muted">Tempo</div><div id="inClock">${hms(i.elapsed)}</div>
        <div class="small muted" id="inKm">${fmt(Math.round(i.km * 100) / 100)} km</div></div>
      <div class="in-box in-kcal"><div class="small muted">Calorias</div><div class="in-chart" id="inChart">${indoorChart(i)}</div>
        <div><b id="inKcal">${Math.round(i.kcal)}</b> <span class="small muted">kcal</span>
          <div class="small muted">${Math.round(indoorRate(i))} kcal/h agora</div></div></div>
    </div>
    <div class="in-ctrls">
      ${ctrl('speed', 'Velocidade', speedTxt, i.unit === 'ms' ? 'm/s' : 'km/h',
        `<button class="see in-unit" id="inUnit">mudar para ${i.unit === 'ms' ? 'km/h' : 'm/s'}</button>`)}
      ${run ? ctrl('incline', 'Inclinação', fmt(i.incline), '%') : ctrl('watts', 'Carga', i.watts, 'W',
        '<div class="small muted in-hint">a potência do painel da bike</div>')}
    </div>
    <button class="btn primary block in-go" id="inGo">${icon(i.running ? 'pause' : 'play')} ${i.running ? 'Pausar' : i.elapsed ? 'Continuar' : 'Iniciar treino'}</button>
    ${i.elapsed ? `<div class="btnrow" style="margin-top:8px">
      <button class="btn" id="inDiscard">Descartar</button>
      <button class="btn primary" id="inFinish">Finalizar e salvar</button></div>` : ''}
    <p class="small muted" style="margin-top:12px">Estimativa com ${currentWeight() ? 'seu peso de ' + fmt(currentWeight()) + ' kg' : '75 kg (informe seu peso em Ajustar objetivos)'}.
      Mude ${run ? 'velocidade e inclinação' : 'velocidade e carga'} sempre que mudar na máquina: a conta acompanha.</p>`;

  bindGo();
  const STEPS = { speed: i.unit === 'ms' ? 0.36 : 0.5, incline: 0.5, watts: 10 };
  const LIM = { speed: [1, run ? 25 : 60], incline: [0, 15], watts: [20, 500] };
  view.querySelectorAll('[data-in]').forEach(b => b.onclick = () => {
    advanceIndoor();
    const k = b.dataset.in, [mn, mx] = LIM[k];
    i[k] = Math.round(Math.min(mx, Math.max(mn, i[k] + STEPS[k] * +b.dataset.d)) * 100) / 100;
    save();
    renderIndoor();
  });
  document.getElementById('inUnit').onclick = () => { i.unit = i.unit === 'ms' ? 'kmh' : 'ms'; save(); renderIndoor(); };
  document.getElementById('inGo').onclick = () => {
    if (i.running) { advanceIndoor(); i.running = false; }
    else { i.running = true; i.lastTs = Date.now(); unlockAudio(); keepAwake(); }
    save();
    renderIndoor();
  };
  const fin = document.getElementById('inFinish');
  if (fin) fin.onclick = () => {
    advanceIndoor();
    const k = iso(today()), sec = Math.round(i.elapsed / 1000), actId = uid();
    F().activities.push({ id: actId, date: k, startAt: Date.now() - i.elapsed, type: i.type, indoor: true, sec, minutes: Math.max(1, Math.round(sec / 60)),
      km: Math.round(i.km * 100) / 100 || null, kcal: Math.round(i.kcal) });
    F().indoor = null;
    setDay(k, { gym: true, workout: getDay(k).workout || (run ? 'Esteira' : 'Bike') });
    toast('Salvo: ' + hms(sec * 1000) + ' · ' + Math.round(i.kcal) + ' kcal');
    acadDay = k; acadCat = i.type;
    openAct(actId, true);
  };
  const dis = document.getElementById('inDiscard');
  if (dis) dis.onclick = () => {
    if (!confirm('Descartar esta atividade?')) return;
    F().indoor = null; save();
    acad = 'home'; renderAcademia();
  };
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
function actKcal(a) {
  if (a.kcal != null) return Math.round(a.kcal); // esteira e bike da academia já guardam as calorias
  return Math.round((a.type === 'corrida' ? runMet(a) : bikeMet(a)) * (currentWeight() || 75) * a.minutes / 60); }

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
  openAct(id, true); // tela de conclusão, com foto e o botão de ver o percurso
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
// Antes de começar: escolher qual dos treinos montados vai fazer. O do dia e o próximo da sequência vêm marcados.
function renderEscolher() {
  const planned = workoutsOn(today().getDay()).map(w => w.id), sug = suggestedWorkout();
  const list = state.workouts.slice().sort((a, b) =>
    (planned.includes(b.id) - planned.includes(a.id)) || ((sug && b.id === sug.id) - (sug && a.id === sug.id)));
  view.innerHTML = backBar() + `
    <div class="pick-title">Qual treino você vai fazer?</div>
    ${list.length ? list.map(w => `
      <button class="pick-w ${planned.includes(w.id) ? 'today' : ''}" data-pick="${w.id}">
        <span class="pick-txt"><b>${esc(w.name)}</b>
          <span class="small muted">${w.exercises.length} exercícios · ~${estimateMin(w)} min${(w.days || []).length ? ' · ' + w.days.map(d => WEEKDAYS[d]).join(', ') : ''}</span></span>
        ${planned.includes(w.id) ? '<span class="pick-tag">hoje</span>' : sug && sug.id === w.id ? '<span class="pick-tag soft">próximo</span>' : ''}
        <span class="pick-go">${icon('play')}</span>
      </button>`).join('')
      : '<p class="muted">Nenhum treino montado ainda.</p>'}
    <button class="btn block" data-go="treinos" style="margin-top:6px">Ver e editar meus treinos</button>`;
  bindGo();
  view.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => startWorkout(findWorkout(b.dataset.pick)));
}

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
  const logId = uid();
  state.gymLogs.push({ id: logId, date, startAt: a.startAt, workoutId: w.id, workout: w.name, sets: a.sets, duration: dur });
  // A carga do treino montado passa a ser a maior usada hoje.
  w.exercises.forEach(e => { const m = maxKg(a.sets[e.name]); if (m != null) e.kg = m; });
  state.activeWorkout = null;
  setDay(date, { gym: true, workout: w.name });
  toast('Treino salvo: ' + fmtHours(dur / 3600));
  acadDay = date;
  openAct(logId, true); // tela de conclusão, com a opção de tirar foto
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

  const loadCard = `
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
    </div>`;
  // A lista de atividades vem antes do gráfico de carga.
  const acts = allActs().filter(x => histKind === 'todos' || x.kind === histKind);
  view.innerHTML = backBar() + `
    <div class="cats">${[['todos', 'Todas'], ['musculacao', 'Musculação'], ['corrida', 'Corrida'], ['ciclismo', 'Ciclismo']].map(([v, l]) =>
      `<button class="${histKind === v ? 'on' : ''}" data-hk="${v}">${l}</button>`).join('')}</div>
    <div class="act-list">${acts.length ? acts.map(x => `
      <button class="act-item" data-act="${x.id}">
        ${x.ref.photo ? `<img class="act-thumb" data-mid="act_${x.id}" alt="">`
          : `<span class="act-thumb ico ${x.kind}">${icon(ACT_KINDS[x.kind][1])}</span>`}
        <span class="act-txt"><span class="act-kind ${x.kind}">${icon(ACT_KINDS[x.kind][1])} ${ACT_KINDS[x.kind][0]}</span>
          <b>${esc(x.title)}</b>
          <span class="small muted">${WEEKDAYS[parseIso(x.date).getDay()]} ${ddmm(parseIso(x.date))} · ${fmtHours(x.sec / 3600)} · ${x.kcal} kcal${x.km ? ' · ' + fmt(x.km) + ' km' : ''}</span></span>
        ${F().shared[x.id] ? `<span class="act-shared" title="Visível para amigos">${icon('users')}</span>` : ''}
      </button>`).join('') : '<div class="card small muted">Nenhuma atividade ainda.</div>'}</div>
    ${loadCard}`;

  bindGo();
  hydrateMedia(view);
  view.querySelectorAll('[data-hk]').forEach(b => b.onclick = () => { histKind = b.dataset.hk; renderHistorico(); });
  view.querySelectorAll('[data-act]').forEach(b => b.onclick = () => openAct(b.dataset.act, false));
  const sel = document.getElementById('exSel');
  if (sel) sel.onchange = () => { selEx = sel.value; renderHistorico(); };
}

// --- atividades: musculação, corrida e ciclismo numa lista só, com foto opcional ---
// A foto fica só no celular (IndexedDB, chave act_<id>). Só vai para o servidor se você
// marcar "Mostrar para os amigos" naquela atividade.
const ACT_KINDS = { musculacao: ['Musculação', 'dumbbell'], corrida: ['Corrida', 'run'], ciclismo: ['Ciclismo', 'bike'] };
let histKind = 'todos';
let actView = null;          // { id, fresh }: fresh = acabou de terminar
let shareUrl = '';           // prévia da imagem de compartilhar

function allActs() {
  const kg = currentWeight() || 75;
  const gym = state.gymLogs.map(l => ({ id: l.id, kind: 'musculacao', date: l.date, startAt: l.startAt || 0, title: l.workout,
    sec: l.duration || 0, kcal: Math.round(5 * kg * (l.duration || 0) / 3600), km: null, ref: l }));
  const other = F().activities.map(a => ({ id: a.id, kind: a.type, date: a.date, startAt: a.startAt || 0,
    title: a.indoor ? (a.type === 'corrida' ? 'Esteira' : 'Bike na academia') : a.type === 'corrida' ? 'Corrida' : 'Pedalada',
    sec: a.sec || a.minutes * 60, kcal: actKcal(a), km: a.km, ref: a }));
  return gym.concat(other).sort((x, y) => x.date < y.date ? 1 : x.date > y.date ? -1 : y.startAt - x.startAt);
}
function findAct(id) { return allActs().find(x => x.id === id); }

// Resumo: números principais e, na musculação, as maiores cargas.
function actSummary(x) {
  const stats = [['Tempo', hms(x.sec * 1000)], ['Calorias', x.kcal + ' kcal']];
  let lines = [];
  if (x.kind === 'musculacao') {
    const sets = x.ref.sets || {};
    const vol = Object.values(sets).reduce((a, s) => a + filled(s).reduce((b, z) => b + (z.kg || 0) * (z.reps || 0), 0), 0);
    if (vol) stats.push(['Volume', fmt(Math.round(vol)) + ' kg']);
    lines = Object.keys(sets).map(n => [n, maxKg(sets[n])]).filter(p => p[1] != null)
      .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, k]) => n + ' · ' + fmt(k) + ' kg');
  } else {
    if (x.km) stats.push(['Distância', fmt(x.km) + ' km']);
    if (x.km && x.sec) lines = [(x.kind === 'corrida' ? 'Ritmo ' : 'Velocidade ') + speedText(x.km / (x.sec / 3600), x.kind === 'corrida')];
  }
  return { stats, lines };
}

function openAct(id, fresh) {
  actView = { id, fresh };
  if (shareUrl) { URL.revokeObjectURL(shareUrl); shareUrl = ''; }
  acad = 'atividade';
  renderAcademia();
  window.scrollTo(0, 0);
}

function loadImg(src) {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}
// Imagem para compartilhar: a foto com o resumo do treino por cima (1080×1350, formato de post).
async function shareImage(x) {
  const blob = await mediaGet('act_' + x.id);
  if (!blob) return null;
  await Promise.all(['800 80px Oxanium', '300 60px Oxanium', '600 30px Oxanium'].map(f => document.fonts.load(f).catch(() => null)));
  const W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d'), url = URL.createObjectURL(blob), img = await loadImg(url);
  URL.revokeObjectURL(url);
  const k = Math.max(W / img.width, H / img.height);
  g.drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k);
  const grad = g.createLinearGradient(0, H * 0.35, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,.85)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const top = g.createLinearGradient(0, 0, 0, 200);
  top.addColorStop(0, 'rgba(0,0,0,.45)'); top.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = top; g.fillRect(0, 0, W, 200);
  const F_ = (w, s) => `${w} ${s}px Oxanium, -apple-system, sans-serif`;
  g.fillStyle = '#fff'; g.font = F_(600, 30); g.fillText('PORTES APP', 60, 86);
  const d = parseIso(x.date);
  g.textAlign = 'right'; g.fillText(WEEKDAYS[d.getDay()].toUpperCase() + ' ' + ddmm(d), W - 60, 86); g.textAlign = 'left';

  const { stats, lines } = actSummary(x);
  let y = H - 70;
  // números
  const colW = (W - 120) / stats.length;
  stats.forEach(([l, v], i) => {
    g.fillStyle = 'rgba(255,255,255,.7)'; g.font = F_(600, 28); g.fillText(l.toUpperCase(), 60 + i * colW, y - 70);
    g.fillStyle = '#fff'; g.font = F_(300, 60); g.fillText(v, 60 + i * colW, y);
  });
  y -= 140;
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = F_(600, 32);
  lines.slice().reverse().forEach(t => { g.fillText(t, 60, y); y -= 46; });
  y -= 20;
  g.fillStyle = '#fff'; g.font = F_(800, 84); g.fillText(x.title, 60, y);
  g.fillStyle = '#ff7a2b'; g.font = F_(600, 32); g.fillText(ACT_KINDS[x.kind][0].toUpperCase(), 60, y - 96);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.88));
}

async function pickActPhoto(x) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      await mediaPut('act_' + x.id, await shrinkImage(f, 1600, 0.85));
      if (mediaUrls['act_' + x.id]) { URL.revokeObjectURL(mediaUrls['act_' + x.id]); delete mediaUrls['act_' + x.id]; }
      x.ref.photo = true;
      save();
      if (F().shared[x.id]) shareAct(x);
      openAct(x.id, actView && actView.fresh);
    } catch (e) { toast('Não consegui abrir essa foto'); }
  };
  input.click();
}

async function sendShareImage(x) {
  const blob = await shareImage(x);
  if (!blob) return;
  const name = 'treino-' + x.date + '.jpg', file = new File([blob], name, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch (e) { /* cancelado */ }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function deleteAct(x) {
  if (x.kind === 'musculacao') deleteLog(x.id);
  else {
    F().activities = F().activities.filter(a => a.id !== x.id);
    if (!F().activities.some(a => a.date === x.date) && !state.gymLogs.some(l => l.date === x.date)) setDay(x.date, { gym: false, workout: '' });
    else save();
    mediaDel('route_' + x.id).catch(() => null);
  }
  mediaDel('act_' + x.id).catch(() => null);
  if (F().shared[x.id]) unshareAct(x.id);
}

function renderAtividade() {
  const x = actView && findAct(actView.id);
  if (!x) { acad = 'historico'; return renderAcademia(); }
  const { stats, lines } = actSummary(x), d = parseIso(x.date), fresh = actView.fresh;
  view.innerHTML = backBar() + `
    <div class="act-head ${x.kind}">
      <span class="act-kind">${icon(ACT_KINDS[x.kind][1])} ${ACT_KINDS[x.kind][0]}</span>
      <div class="act-title">${fresh ? 'Concluído! ' : ''}${esc(x.title)}</div>
      <div class="small">${cap(WEEKDAY_FULL[d.getDay()])}, ${ddmm(d)}</div>
      <div class="act-stats">${stats.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>
      ${lines.length ? `<div class="act-lines small">${lines.map(esc).join('<br>')}</div>` : ''}
      <span class="ch-ico">${icon(ACT_KINDS[x.kind][1])}</span>
    </div>

    ${x.ref.photo ? `
      <div class="share-prev"><img id="sharePrev" alt="Foto do treino com o resumo"></div>
      <button class="btn primary block" id="actShare">Compartilhar foto com o resumo</button>
      <div class="btnrow" style="margin-top:8px">
        <button class="btn" id="actPhoto">Trocar foto</button>
        <button class="btn" id="actNoPhoto">Remover foto</button>
      </div>`
    : `<button class="photo-cta" id="actPhoto">${icon('image')}<b>Tirar foto do treino</b>
        <span class="small muted">Ela fica salva aqui, junto com este treino</span></button>`}

    ${social.user ? `<div class="card" style="margin-top:12px">
      <label class="consent-row"><input type="checkbox" id="actFriends" ${F().shared[x.id] ? 'checked' : ''}>
        <span><b>Mostrar para os amigos</b><br><span class="small muted">Seus amigos veem este treino${x.ref.photo ? ' e a foto' : ''}
        no Social. Dá para tirar quando quiser.</span></span></label></div>` : ''}

    ${x.ref.gps ? '<button class="btn block" id="actRoute" style="margin-top:8px">Ver percurso no mapa</button>' : ''}
    ${fresh ? '<button class="btn primary block" id="actDone" style="margin-top:10px">Concluir</button>'
      : '<button class="btn danger block" id="actDel" style="margin-top:16px">Apagar atividade</button>'}`;

  bindGo();
  document.getElementById('actPhoto').onclick = () => pickActPhoto(x);
  if (x.ref.photo) {
    shareImage(x).then(b => {
      const el = document.getElementById('sharePrev');
      if (!b || !el) return;
      if (shareUrl) URL.revokeObjectURL(shareUrl);
      shareUrl = URL.createObjectURL(b);
      el.src = shareUrl;
    });
    document.getElementById('actShare').onclick = () => sendShareImage(x);
    document.getElementById('actNoPhoto').onclick = async () => {
      if (!confirm('Remover a foto deste treino?')) return;
      await mediaDel('act_' + x.id);
      delete mediaUrls['act_' + x.id];
      x.ref.photo = false;
      save();
      if (F().shared[x.id]) shareAct(x);
      openAct(x.id, fresh);
    };
  }
  const fr = document.getElementById('actFriends');
  if (fr) fr.onchange = async () => {
    const ok = fr.checked ? await shareAct(x) : await unshareAct(x.id);
    if (ok) toast(fr.checked ? 'Visível para os amigos' : 'Tirado do feed dos amigos');
    else alert(shareErrText()); // aviso que fica na tela até você ler (o toast some rápido)
    renderAtividade();
  };
  const rt = document.getElementById('actRoute');
  if (rt) rt.onclick = () => { routeView = x.id; acad = 'rota'; renderAcademia(); window.scrollTo(0, 0); };
  const dn = document.getElementById('actDone');
  if (dn) dn.onclick = () => { acad = 'home'; renderAcademia(); window.scrollTo(0, 0); };
  const del = document.getElementById('actDel');
  if (del) del.onclick = () => {
    if (!confirm('Apagar esta atividade (' + x.title + ', ' + ddmm(d) + ')? Não dá para desfazer.')) return;
    deleteAct(x);
    toast('Atividade apagada');
    acad = 'historico'; renderAcademia();
  };
}

// --- treinos visíveis para os amigos (servidor) ---
// Vai: tipo, nome, data, tempo, calorias, km, as maiores cargas e a imagem com o resumo.
// A imagem fica num bucket privado: só você e os amigos aceitos conseguem abrir.
// Erro do servidor em palavras: "setup" = a tabela ainda não foi criada no Supabase; "net" = sem internet ou outro problema.
let shareErr = '';
function serverErr(error) {
  return error && (error.code === 'PGRST205' || error.code === '42P01' || /could not find the table|does not exist|bucket not found/i.test(error.message || ''))
    ? 'setup' : 'net';
}
function shareErrText() {
  return shareErr === 'setup' ? 'O servidor ainda não tem a parte de treinos dos amigos. Falta rodar o SQL no Supabase.'
    : 'Sem conexão com o servidor agora. Tente de novo em instantes.';
}
async function shareAct(x) {
  if (!social.user) return false;
  const path = social.user.id + '/' + x.id + '.jpg';
  let photo_path = '';
  if (x.ref.photo) {
    const blob = await shareImage(x);
    const up = blob && await sb.storage.from('activity-photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (up && !up.error) photo_path = path;
  } else await sb.storage.from('activity-photos').remove([path]);
  const { stats, lines } = actSummary(x);
  const { error } = await sb.from('shared_activities').upsert({ user_id: social.user.id, local_id: x.id, day: x.date,
    kind: x.kind, title: x.title, details: { stats, lines }, photo_path }, { onConflict: 'user_id,local_id' });
  if (error) { console.warn('treino não compartilhado:', error.message); shareErr = serverErr(error); return false; }
  F().shared[x.id] = true;
  save();
  return true;
}
async function unshareAct(id) {
  if (!social.user) return false;
  await sb.storage.from('activity-photos').remove([social.user.id + '/' + id + '.jpg']);
  const { error } = await sb.from('shared_activities').delete().eq('user_id', social.user.id).eq('local_id', id);
  if (error) { shareErr = serverErr(error); return false; }
  delete F().shared[id];
  save();
  return true;
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
      // Ao entrar, primeiro traz o que está na conta (backup, foto, nome e @), depois envia.
      if (social.user) setTimeout(async () => {
        await pullBackup();
        await pullProfile();
        pushProfile(); pushScores();
        if (state.meta.backup) pushBackup();
      }, 0);
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

function photoSig(photo) { return photo ? photo.length + ':' + photo.slice(-24) : ''; }
function blobToDataUrl(blob) {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = fail;
    r.readAsDataURL(blob);
  });
}

// Celular recém-instalado (ou com os dados apagados): traz foto, nome e @ da conta.
async function pullProfile() {
  if (!social.user) return;
  const { data, error } = await sb.from('profiles').select('username, name, avatar_url').eq('id', social.user.id).maybeSingle();
  if (error || !data) return;
  const p = state.profile;
  let changed = false;
  if (!p.name && data.name) { p.name = data.name; changed = true; }
  if (data.username && p.username !== data.username) { p.username = data.username; changed = true; }
  if (!p.photo && data.avatar_url) {
    try {
      const res = await fetch(data.avatar_url);
      if (res.ok) {
        p.photo = await blobToDataUrl(await res.blob());
        p.avatarSig = photoSig(p.photo); // já está no servidor: não reenviar
        changed = true;
      }
    } catch (e) { console.warn('foto não baixada:', e.message); }
  }
  if (changed) { save(); render(); }
}

// ----- backup privado (opcional) -----
// Cópia dos registros na conta, que só o dono lê. Fica de fora: a Galeria (fotos e vídeos ficam
// só no aparelho, ver regra de pacientes) e a foto de perfil (já vem do perfil).
let backupTimer = null;
function backupData() {
  const d = Object.assign({}, state);
  delete d.gallery;
  d.profile = Object.assign({}, state.profile, { photo: '', avatarSig: '' });
  return d;
}
function scheduleBackup() {
  if (!social.user || !state.meta.backup) return;
  clearTimeout(backupTimer);
  backupTimer = setTimeout(pushBackup, 15000);
}
async function pushBackup() {
  clearTimeout(backupTimer);
  backupTimer = null;
  if (!social.user || !state.meta.backup) return;
  const at = state.meta.updatedAt || new Date().toISOString();
  const { error } = await sb.from('user_backups').upsert({ user_id: social.user.id, data: backupData(), updated_at: at });
  if (error) { console.warn('backup não enviado:', error.message); return false; }
  state.meta.backupAt = at;
  writeLocal();
  return true;
}
// Ao sair do app, envia o que estiver pendente.
document.addEventListener('visibilitychange', () => { if (document.hidden && backupTimer) pushBackup(); });

function isEmptyDevice() {
  return !Object.keys(state.days).length && !state.sessions.length && !state.gymLogs.length;
}
function restoreBackup(data, at) {
  const keep = { gallery: state.gallery, photo: state.profile.photo, avatarSig: state.profile.avatarSig };
  state = withDefaults(data);
  state.gallery = keep.gallery;
  Object.assign(state.profile, { photo: keep.photo, avatarSig: keep.avatarSig });
  Object.assign(state.meta, { updatedAt: at, backupAt: at, backup: true });
  writeLocal();
}
// Ao entrar: se a conta tem uma cópia mais nova que a do celular, restaura.
// Celular vazio: restaura sozinho. Com dados: pergunta antes.
async function pullBackup() {
  if (!social.user) return;
  const { data, error } = await sb.from('user_backups').select('data, updated_at').eq('user_id', social.user.id).maybeSingle();
  if (error || !data) return;
  if (Date.parse(data.updated_at) <= (Date.parse(state.meta.updatedAt) || 0)) return;
  if (!isEmptyDevice()) {
    const when = new Date(data.updated_at);
    const msg = 'Sua conta tem um backup de ' + ddmm(when) + ' às ' + pad(when.getHours()) + ':' + pad(when.getMinutes())
      + ', mais novo que os dados deste celular. Restaurar? (Os Projetos deste celular são mantidos.)';
    if (!confirm(msg)) return;
  }
  restoreBackup(data.data, data.updated_at);
  toast('Seus dados voltaram');
  render();
}
async function setBackup(on) {
  state.meta.backup = on;
  writeLocal();
  if (on) toast(await pushBackup() ? 'Backup ligado' : 'Ligado, mas não consegui enviar agora');
  else {
    clearTimeout(backupTimer);
    backupTimer = null;
    if (confirm('Backup desligado. Apagar também a cópia que está na sua conta?')) {
      const { error } = await sb.from('user_backups').delete().eq('user_id', social.user.id);
      state.meta.backupAt = '';
      writeLocal();
      toast(error ? 'Não consegui apagar agora' : 'Cópia apagada');
    }
  }
  if (tab === 'amigos') renderAmigos();
}

// Nome e foto vão para o servidor; a foto só é reenviada quando muda.
async function pushProfile() {
  if (!social.user) return;
  const p = state.profile, patch = { name: p.name || '' };
  const sig = photoSig(p.photo);
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
      await loadFeed();
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

// Treinos que os amigos escolheram mostrar (últimos 30 dias). As fotos abrem por link temporário.
// Se a tabela ainda não existir no servidor, o feed só não aparece.
async function loadFeed() {
  social.feed = [];
  const since = iso(addDays(today(), -30));
  const r = await sb.from('shared_activities').select('id, user_id, local_id, day, kind, title, details, photo_path, created_at')
    .in('user_id', social.friends.map(f => f.id)).gte('day', since).order('day', { ascending: false }).limit(40);
  if (r.error) return console.warn('feed indisponível:', r.error.message);
  const paths = r.data.map(x => x.photo_path).filter(Boolean);
  const urls = {};
  if (paths.length) {
    const s = await sb.storage.from('activity-photos').createSignedUrls(paths, 3600);
    (s.data || []).forEach(u => { if (u.signedUrl) urls[u.path] = u.signedUrl; });
  }
  social.feed = r.data.map(x => Object.assign(x, { url: urls[x.photo_path] || '' }));
}

// Mural de fotos (aba Treino do ranking): os seus treinos com foto (do celular) e os treinos
// que os amigos mostraram (do servidor), do mais novo para o mais antigo.
function wallItems() {
  const p = state.profile;
  const mine = allActs().filter(x => x.ref.photo).map(x => ({ mine: true, id: x.id, day: x.date,
    kind: x.kind, title: x.title, who: p.name || 'Você', avatar: p.photo, mid: 'act_' + x.id, stats: actSummary(x).stats }));
  const byId = Object.fromEntries(social.friends.map(f => [f.id, f]));
  const theirs = (social.feed || []).map(x => {
    const f = byId[x.user_id] || {};
    return { id: x.id, day: x.day, kind: x.kind, title: x.title, who: f.name || '@' + (f.username || ''),
      avatar: f.avatar_url, url: x.url, stats: (x.details && x.details.stats) || [] };
  });
  return mine.concat(theirs).sort((a, b) => a.day < b.day ? 1 : a.day > b.day ? -1 : 0);
}

// Feed em formato de post, como no Instagram, com páginas de WALL_PER posts.
const WALL_PER = 8;
let wallPage = 0;
function wallHtml(items) {
  const pages = Math.ceil(items.length / WALL_PER);
  if (wallPage >= pages) wallPage = Math.max(0, pages - 1);
  const start = wallPage * WALL_PER;
  return `<div class="section-head" id="wallTop"><h2>Fotos dos treinos</h2><span class="small muted">você e seus amigos</span></div>
    ${items.length ? items.slice(start, start + WALL_PER).map((x, n) => {
      const i = start + n, kd = ACT_KINDS[x.kind] || ACT_KINDS.musculacao, d = parseIso(x.day);
      return `<article class="post">
        <div class="post-head">
          ${friendAvatar({ name: x.who, photo: x.avatar, color: 'var(--accent)' }, 'sm')}
          <div style="flex:1;min-width:0"><b>${esc(x.who)}</b>
            <div class="small muted">${WEEKDAYS[d.getDay()]} ${ddmm(d)}</div></div>
          <span class="act-kind ${x.kind}">${icon(kd[1])} ${kd[0]}</span>
        </div>
        <button class="post-media ${x.mid || x.url ? '' : 'act-thumb ico ' + x.kind}" data-wall="${i}" aria-label="Ampliar">
          ${x.mid ? `<img data-mid="${x.mid}" alt="">` : x.url ? `<img src="${esc(x.url)}" alt="">` : icon(kd[1])}</button>
        <div class="post-body"><b>${esc(x.title)}</b>
          <div class="small muted">${x.stats.map(s => esc(s[0]) + ' ' + esc(s[1])).join(' · ')}</div></div>
      </article>`;
    }).join('') + (pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, p) =>
      `<button class="${p === wallPage ? 'on' : ''}" data-wpage="${p}">${p + 1}</button>`).join('')}</div>` : '')
    : `<div class="card small muted">Ainda não há fotos. Tire uma foto ao terminar um treino e marque "Mostrar para os amigos"
        para ela aparecer aqui para eles também.</div>`}`;
}

// Foto em tela cheia, com o resumo do treino e setas para passar.
function openWallViewer(items, i) {
  const v = document.getElementById('viewer'), x = items[i];
  const close = () => { v.hidden = true; v.innerHTML = ''; };
  if (!x) return close();
  const d = parseIso(x.day), kd = ACT_KINDS[x.kind] || ACT_KINDS.musculacao;
  v.hidden = false;
  v.innerHTML = `
    <div class="viewer-top">
      <button class="iconbtn" id="vClose" aria-label="Fechar">×</button>
      <span class="small">${esc(x.who)} · ${WEEKDAYS[d.getDay()]} ${ddmm(d)}</span>
      <span style="width:44px"></span>
    </div>
    <div class="viewer-media">
      ${x.mid ? `<img data-mid="${x.mid}" alt="">` : x.url ? `<img src="${esc(x.url)}" alt="">` : `<span class="act-thumb ico ${x.kind}" style="width:120px;height:120px">${icon(kd[1])}</span>`}
      ${i > 0 ? '<button class="nav prev" id="vPrev" aria-label="Anterior">‹</button>' : ''}
      ${i < items.length - 1 ? '<button class="nav next" id="vNext" aria-label="Próxima">›</button>' : ''}
    </div>
    <div class="viewer-bottom">
      <div class="act-kind ${x.kind}">${icon(kd[1])} ${kd[0]}</div>
      <b style="font-size:18px">${esc(x.title)}</b>
      <div class="small" style="opacity:.75;margin-top:2px">${x.stats.map(s => esc(s[0]) + ' ' + esc(s[1])).join(' · ')}</div>
      ${x.mine ? '<button class="btn block" id="vOpenAct" style="margin-top:10px">Abrir treino</button>' : ''}
    </div>`;
  hydrateMedia(v);
  document.getElementById('vClose').onclick = close;
  const prev = document.getElementById('vPrev'), next = document.getElementById('vNext');
  if (prev) prev.onclick = () => openWallViewer(items, i - 1);
  if (next) next.onclick = () => openWallViewer(items, i + 1);
  const oa = document.getElementById('vOpenAct');
  if (oa) oa.onclick = () => { close(); goTab('academia'); openAct(x.id, false); };
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
          e sejam vistos pelos amigos que eu aceitar. O resto continua só no meu celular, a não ser que eu ligue o backup
          privado da conta, e posso apagar a conta quando quiser.</span></label>
        <button class="btn primary block" id="aGo">Criar conta</button>`
      : `
        <label>E-mail<input class="field-input" id="aEmail" type="email" autocapitalize="none" autocomplete="email"></label>
        <label>Senha<input class="field-input" id="aPass" type="password" autocomplete="current-password"></label>
        <button class="btn primary block" id="aGo">Entrar</button>`}
    </div>
    <div class="card">
      <h3>O que vai para o servidor</h3>
      <p class="small muted" style="margin:0">Só nome, @, foto de perfil, o placar de cada dia (minutos de estudo e número de treinos)
        e os treinos que você escolher mostrar aos amigos.
        Cargas, peso, metas, anotações e projetos ficam no celular. Se você ligar o <b>backup privado</b> (opcional,
        no cartão Conta), uma cópia deles fica na sua conta, que só você vê, para voltar ao trocar de celular.
        Os Projetos (pastas, fotos e vídeos) nunca saem do aparelho.</p>
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
  if (!confirm('Apagar sua conta? Seu perfil, amizades, placar e backup saem do servidor. Seus registros continuam neste celular.')) return;
  await sb.storage.from('avatars').remove([social.user.id + '/avatar.jpg']);
  const ls = await sb.storage.from('activity-photos').list(social.user.id, { limit: 1000 });
  if (ls.data && ls.data.length) await sb.storage.from('activity-photos').remove(ls.data.map(f => social.user.id + '/' + f.name));
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
  const wall = amgMetric === 'academia' ? wallItems() : [];

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
    ${amgMetric === 'academia' ? wallHtml(wall) : `
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
        E os treinos em que você marcar "Mostrar para os amigos" (com o resumo e a foto, se tiver).
        Peso, metas, observações e o resto continuam só no seu celular.</p>
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
      <label class="consent"><input type="checkbox" id="backupOn" ${state.meta.backup ? 'checked' : ''}>
        <span><b>Backup privado na conta</b><br><span class="small muted">Guarda uma cópia dos seus registros (estudo, treinos, metas, perfil)
        que só você vê. Ao entrar com este e-mail em outro celular, ou depois de reinstalar o app, tudo volta.
        Os Projetos e os percursos de GPS não entram: ficam só no aparelho.
        ${state.meta.backup && state.meta.backupAt ? `<br><span class="muted">Última cópia: ${ddmm(new Date(state.meta.backupAt))}
          às ${pad(new Date(state.meta.backupAt).getHours())}:${pad(new Date(state.meta.backupAt).getMinutes())}</span>` : ''}</span></span></label>
      <div class="btnrow">
        <button class="btn" id="logout">Sair</button>
        <button class="btn danger" id="delAccount">Apagar conta</button>
      </div>
    </div>`}`;

  view.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { amgMetric = b.dataset.rk; wallPage = 0; renderAmigos(); });
  hydrateMedia(view);
  view.querySelectorAll('[data-wall]').forEach(b => b.onclick = () => openWallViewer(wall, +b.dataset.wall));
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
  view.querySelectorAll('[data-wpage]').forEach(b => b.onclick = () => {
    wallPage = +b.dataset.wpage;
    renderAmigos();
    document.getElementById('wallTop').scrollIntoView({ block: 'start' });
  });
  if (amgMetric === 'academia') return; // na aba Treino, a tela termina no feed de fotos
  document.getElementById('logout').onclick = async () => {
    if (!confirm('Sair da conta? Seus registros continuam neste celular.')) return;
    await sb.auth.signOut({ scope: 'local' });
  };
  document.getElementById('delAccount').onclick = deleteAccount;
  document.getElementById('backupOn').onchange = e => setBackup(e.target.checked);
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
let galView = 'home';   // home | categoria | pasta
let galFolder = null;
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

// Projetos: cada um cria os seus (pacientes, clientes, peças...) e organiza por categorias com cor.
// Tudo fica só neste celular: nada vai para o backup, para a nuvem nem para o Social.
const CAT_COLORS = [['Vermelho', '#e5383b'], ['Laranja', '#f97316'], ['Âmbar', '#f59e0b'], ['Amarelo', '#eab308'],
  ['Lima', '#84cc16'], ['Verde', '#22c55e'], ['Esmeralda', '#10b981'], ['Turquesa', '#14b8a6'], ['Ciano', '#06b6d4'],
  ['Azul-claro', '#0ea5e9'], ['Azul', '#3b82f6'], ['Índigo', '#6366f1'], ['Roxo', '#8b5cf6'], ['Rosa', '#ec4899'],
  ['Vinho', '#9f1239'], ['Marrom', '#92400e'], ['Cinza', '#6b7280'], ['Preto', '#1f2937']];
let galTab = 'todos';       // todos | categorias
let galCat = null;          // categoria aberta
let galSearch = null;       // null = busca fechada; '' ou texto = aberta
let galLayout = 'lista';    // lista (pastas em linhas) | grade (quadrados com prévia)

function findFolder(id) { return state.gallery.folders.find(f => f.id === id); }
function findCat(id) { return state.gallery.categories.find(c => c.id === id); }
function folderThumb(f) {
  const first = f.items.find(i => i.type === 'image');
  return first ? `<img data-mid="${first.id}_t" alt="">` : `<span class="ph-ico">${icon('folder')}</span>`;
}
function folderIcon(color) {
  return `<svg class="proj-folder" viewBox="0 0 48 40" aria-hidden="true">
    <path d="M2 7a4 4 0 0 1 4-4h11l4 4h21a4 4 0 0 1 4 4v23a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="${color}"/>
    <path d="M2 14h44v20a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="#fff" opacity=".22"/></svg>`;
}
function catChip(c) {
  return c ? `<span class="cat-chip" style="--c:${c.color}">${esc(c.name)}</span>` : '<span class="cat-chip none">Sem categoria</span>';
}
// Busca sem diferenciar maiúsculas nem acentos ("cileia" acha "Cilêia").
// Cada letra vira uma só (é → e), então as posições do texto dobrado batem com as do original.
function fold(s) { return [...s].map(ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] || ch).join(''); }
function matches(f, q) {
  q = fold((q || '').trim());
  return !q || fold(f.name).includes(q) || fold(f.note || '').includes(q);
}
// Nome com o trecho pesquisado destacado em laranja.
function highlight(name, q) {
  q = fold((q || '').trim());
  if (!q) return esc(name);
  const chars = [...name], folded = fold(name);
  let out = '', i = 0, at;
  while ((at = folded.indexOf(q, i)) >= 0) {
    out += esc(chars.slice(i, at).join('')) + '<mark class="hl">' + esc(chars.slice(at, at + q.length).join('')) + '</mark>';
    i = at + q.length;
  }
  return out + esc(chars.slice(i).join(''));
}

// Lista de projetos, em linhas (pastas) ou em quadrados com prévia.
function projectsHtml(folders) {
  if (!folders.length) return '';
  return galLayout === 'grade'
    ? `<div class="folders">${folders.map(f => `
        <button class="folder" data-folder="${f.id}">
          <div class="folder-thumb">${folderThumb(f)}</div>
          <b>${highlight(f.name, galSearch)}</b>
          <span class="small muted">${catChip(findCat(f.catId))} ${f.items.length} ${f.items.length === 1 ? 'item' : 'itens'}</span>
        </button>`).join('')}</div>`
    : `<div class="proj-list">${folders.map(f => `<button class="proj-row" data-folder="${f.id}">
          <span class="proj-txt">${highlight(f.name, galSearch)}</span><span class="muted">›</span></button>`).join('')}</div>`;
}

function galToolbar(placeholder) {
  return `<div class="gal-tools">
      <button class="iconbtn sm ${galSearch !== null ? 'on' : ''}" id="galFind" aria-label="Pesquisar">${icon('search')}</button>
      <button class="iconbtn sm ${galLayout === 'lista' ? 'on' : ''}" data-layout="lista" aria-label="Ver em pastas">${icon('rows')}</button>
      <button class="iconbtn sm ${galLayout === 'grade' ? 'on' : ''}" data-layout="grade" aria-label="Ver em quadrados">${icon('grid4')}</button>
      <span class="spacer"></span>
      <button class="add-proj" id="galAdd" aria-label="Novo projeto">+</button>
    </div>
    ${galSearch !== null ? `<input class="field-input gal-search" id="galQ" placeholder="${placeholder}" value="${esc(galSearch)}"
      autocomplete="off" autocapitalize="none">` : ''}`;
}
function bindGalToolbar(rerender) {
  document.getElementById('galFind').onclick = () => { galSearch = galSearch === null ? '' : null; rerender(); };
  view.querySelectorAll('[data-layout]').forEach(b => b.onclick = () => { galLayout = b.dataset.layout; rerender(); });
  document.getElementById('galAdd').onclick = () => openProjectDialog(null);
  const q = document.getElementById('galQ');
  if (q) {
    if (document.activeElement !== q && galSearch === '') q.focus();
    q.oninput = () => {
      galSearch = q.value;
      const box = document.getElementById('projBox');
      if (!box) { // pesquisando na aba Categorias: mostra os projetos encontrados na aba Todos
        galTab = 'todos';
        rerender();
        const nq = document.getElementById('galQ');
        nq.focus();
        nq.setSelectionRange(nq.value.length, nq.value.length);
        return;
      }
      const list = state.gallery.folders.filter(f => (galView !== 'categoria' || f.catId === galCat) && matches(f, galSearch));
      box.innerHTML = projectsHtml(list) || '<p class="small muted">Nenhum projeto encontrado.</p>';
      hydrateMedia(box);
      bindFolders(box);
    };
  }
}
function bindFolders(root) {
  root.querySelectorAll('[data-folder]').forEach(b => b.onclick = () => {
    galFolder = b.dataset.folder; galView = 'pasta'; renderGaleria(); window.scrollTo(0, 0);
  });
}

function renderGaleria() {
  const g = state.gallery;
  if (g.pinHash && !galUnlocked) return renderGalLock();
  if (galView === 'pasta' && findFolder(galFolder)) return renderPasta();
  if (galView === 'categoria' && findCat(galCat)) return renderCategoria();
  galView = 'home';
  galCat = null; // projeto aberto daqui volta para esta tela, não para uma categoria
  const folders = g.folders.filter(f => matches(f, galSearch));

  view.innerHTML = `
    ${galToolbar('Pesquisar projeto, paciente, cliente…')}
    <div class="seg" style="margin:10px 0 12px">
      <button data-gt="todos" class="${galTab === 'todos' ? 'on' : ''}">Todos</button>
      <button data-gt="categorias" class="${galTab === 'categorias' ? 'on' : ''}">Categorias</button>
    </div>
    ${galTab === 'categorias' ? `
      <div class="cat-list">${g.categories.map(c => {
        const n = g.folders.filter(f => f.catId === c.id).length;
        return `<button class="cat-bar" data-cat="${c.id}" style="--c:${c.color}"><b>${esc(c.name)}</b>
          <span>${n} ${n === 1 ? 'projeto' : 'projetos'} ›</span></button>`;
      }).join('')}</div>
      ${g.categories.length ? '' : '<p class="small muted">Nenhuma categoria ainda. Elas nascem quando você cria um projeto.</p>'}`
    : `<div id="projBox">${projectsHtml(folders) || `<p class="small muted">${g.folders.length ? 'Nenhum projeto encontrado.'
        : 'Nenhum projeto ainda. Toque no + para criar o primeiro.'}</p>`}</div>`}

    <div class="card pastel lavender small" style="margin-top:14px">
      <b>Privacidade.</b> Tudo aqui fica só neste celular: não vai para o backup, para a nuvem nem para o Social.
      Se guardar fotos de pacientes (dados de saúde, LGPD), tenha o consentimento deles e ative a senha abaixo.
    </div>

    <details class="card settings-card">
      <summary><b>${icon('lock')} Senha dos Projetos ${g.pinHash ? '(ativada)' : '(desativada)'}</b></summary>
      <p class="small muted">Pede a senha toda vez que você abrir os Projetos. É uma trava de privacidade contra quem pegar o celular,
        não uma criptografia.</p>
      <div class="inline">
        <input id="pin1" type="password" inputmode="numeric" placeholder="Nova senha (4 a 8 números)" autocomplete="off">
        <button class="btn" id="pinSave">${g.pinHash ? 'Trocar' : 'Ativar'}</button>
      </div>
      ${g.pinHash ? '<button class="btn danger block" id="pinOff">Desativar senha</button>' : ''}
      <p class="small muted" id="storageInfo" style="margin-bottom:0"></p>
    </details>`;

  hydrateMedia(view);
  bindGalToolbar(renderGaleria);
  bindFolders(view);
  view.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => { galTab = b.dataset.gt; renderGaleria(); });
  view.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
    galCat = b.dataset.cat; galView = 'categoria'; galSearch = null; renderGaleria(); window.scrollTo(0, 0);
  });
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
      <div class="feature-title" style="font-size:20px">Projetos protegidos</div>
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

// Uma categoria aberta: todos os projetos dela, com busca.
function renderCategoria() {
  const c = findCat(galCat), g = state.gallery;
  const folders = g.folders.filter(f => f.catId === c.id && matches(f, galSearch));
  const total = g.folders.filter(f => f.catId === c.id).length;
  view.innerHTML = `
    <button class="back" id="galBack">‹ Categorias</button>
    <div class="cat-head" style="--c:${c.color}"><b>${esc(c.name)}</b><span>${total} ${total === 1 ? 'projeto' : 'projetos'}</span></div>
    ${galToolbar('Pesquisar em ' + esc(c.name) + '…')}
    <div id="projBox" style="margin-top:10px">${projectsHtml(folders) || `<p class="small muted">${total ? 'Nenhum projeto encontrado.' : 'Nenhum projeto nesta categoria.'}</p>`}</div>

    <details class="card settings-card" style="margin-top:14px">
      <summary><b>Editar categoria</b></summary>
      <div class="pf" style="margin-top:10px"><label>Nome<input class="field-input" id="ecName" value="${esc(c.name)}"></label></div>
      <div class="small muted" style="margin-bottom:6px">Cor</div>
      ${colorPicker(c.color)}
      <div class="btnrow" style="margin-top:12px">
        <button class="btn danger" id="ecDel">Apagar categoria</button>
        <button class="btn primary" id="ecSave">Salvar</button>
      </div>
    </details>`;

  hydrateMedia(view);
  bindGalToolbar(renderGaleria);
  bindFolders(view);
  bindColorPicker(view);
  document.getElementById('galBack').onclick = () => { galView = 'home'; galTab = 'categorias'; galSearch = null; renderGaleria(); };
  document.getElementById('ecSave').onclick = () => {
    const name = document.getElementById('ecName').value.trim();
    if (!name) return toast('A categoria precisa de um nome');
    c.name = name;
    c.color = view.querySelector('.color-pick .on').dataset.color;
    save(); toast('Categoria salva'); renderGaleria();
  };
  document.getElementById('ecDel').onclick = () => {
    if (!confirm('Apagar a categoria "' + c.name + '"? Os ' + total + ' projetos dela continuam, só ficam sem categoria.')) return;
    g.folders.forEach(f => { if (f.catId === c.id) f.catId = null; });
    g.categories = g.categories.filter(x => x.id !== c.id);
    save();
    galView = 'home'; galTab = 'categorias'; renderGaleria();
  };
}

function colorPicker(sel) {
  return `<div class="color-pick">${CAT_COLORS.map(([n, c]) =>
    `<button type="button" class="${c === sel ? 'on' : ''}" data-color="${c}" style="--c:${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div>`;
}
function bindColorPicker(root) {
  root.querySelectorAll('.color-pick [data-color]').forEach(b => b.onclick = () => {
    b.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  });
}

// Novo projeto (f = null) ou edição: nome, categoria (uma que já existe ou uma nova com cor) e descrição.
function openProjectDialog(f) {
  const g = state.gallery;
  let dlg = document.getElementById('projDialog');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'projDialog'; document.body.appendChild(dlg); }
  let catSel = f ? f.catId : (galView === 'categoria' ? galCat : null);
  const used = new Set(g.categories.map(c => c.color));
  const freeColor = (CAT_COLORS.find(([, c]) => !used.has(c)) || CAT_COLORS[0])[1];
  dlg.innerHTML = `<form method="dialog" class="proj-form">
    <h2>${f ? 'Editar projeto' : 'Novo projeto'}</h2>
    <label>Nome do projeto<input name="name" required value="${f ? esc(f.name) : ''}" placeholder="Ex.: Maria – lentes, Cadeira Aurora"></label>
    <div class="small muted" style="margin-bottom:6px">Categoria</div>
    <div class="chips cat-pick" style="margin:0 0 8px">
      ${g.categories.map(c => `<button type="button" class="chip cat-opt ${c.id === catSel ? 'on' : ''}" data-catopt="${c.id}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}
      <button type="button" class="chip ${g.categories.length ? '' : 'on'}" data-catopt="new">+ Nova categoria</button>
    </div>
    <div class="new-cat" ${g.categories.length ? 'hidden' : ''}>
      <input name="catName" placeholder="Nome da categoria (ex.: Pacientes, Cadeiras)">
      <div class="small muted" style="margin:8px 0 6px">Cor da categoria</div>
      ${colorPicker(freeColor)}
    </div>
    <label style="margin-top:10px">Descrição do projeto<textarea name="note" rows="3" placeholder="Do que se trata, objetivo, detalhes importantes">${f ? esc(f.note || '') : ''}</textarea></label>
    <div class="dialog-actions">
      ${f ? '<button type="button" class="btn danger" id="pjDel">Apagar</button>' : ''}
      <span class="spacer"></span>
      <button value="cancel" formnovalidate class="btn">Cancelar</button>
      <button value="save" class="btn primary">${f ? 'Salvar' : 'Criar projeto'}</button>
    </div>
  </form>`;
  const form = dlg.querySelector('form'), newBox = dlg.querySelector('.new-cat');
  let isNew = !g.categories.length;
  bindColorPicker(dlg);
  dlg.querySelectorAll('[data-catopt]').forEach(b => b.onclick = () => {
    const v = b.dataset.catopt;
    if (v !== 'new' && v === catSel && !isNew) { catSel = null; b.classList.remove('on'); return; } // toque de novo: sem categoria
    dlg.querySelectorAll('[data-catopt]').forEach(x => x.classList.toggle('on', x === b));
    isNew = v === 'new';
    catSel = isNew ? null : v;
    newBox.hidden = !isNew;
    if (isNew) form.catName.focus();
  });
  const del = dlg.querySelector('#pjDel');
  if (del) del.onclick = async () => {
    if (!confirm('Apagar o projeto "' + f.name + '" com ' + f.items.length + ' fotos e vídeos? Não dá para desfazer.')) return;
    for (const it of f.items) { await mediaDel(it.id); await mediaDel(it.id + '_t'); }
    g.folders = g.folders.filter(x => x.id !== f.id);
    save();
    dlg.close();
    galView = 'home';
    renderGaleria();
  };
  dlg.onclose = () => {
    if (dlg.returnValue !== 'save') return;
    const name = form.name.value.trim();
    if (!name) return toast('Dê um nome ao projeto');
    if (isNew) {
      const cn = form.catName.value.trim();
      if (cn) {
        // Se já existe uma categoria com esse nome, usa ela em vez de criar outra.
        const same = g.categories.find(c => c.name.toLowerCase() === cn.toLowerCase());
        if (same) catSel = same.id;
        else {
          const c = { id: uid(), name: cn, color: dlg.querySelector('.color-pick .on').dataset.color };
          g.categories.push(c);
          catSel = c.id;
        }
      }
    }
    const note = form.note.value.trim();
    if (f) Object.assign(f, { name, catId: catSel, note });
    else {
      f = { id: uid(), name, catId: catSel, note, createdAt: iso(today()), items: [] };
      g.folders.unshift(f);
    }
    save();
    galFolder = f.id; galView = 'pasta';
    renderGaleria();
    window.scrollTo(0, 0);
  };
  dlg.returnValue = '';
  dlg.showModal();
  if (!f) form.name.focus();
}

const TAGS = ['Antes', 'Durante', 'Depois'];

function renderPasta() {
  const f = findFolder(galFolder), c = findCat(f.catId);
  view.innerHTML = `
    <button class="back" id="galBack">‹ ${galCat && c && c.id === galCat ? esc(c.name) : 'Projetos'}</button>
    <div class="proj-head" style="--c:${c ? c.color : '#9ca3af'}">
      <div class="proj-head-top">${catChip(c)}<button class="iconbtn sm" id="pjEdit" aria-label="Editar projeto">${icon('gear')}</button></div>
      <div class="proj-name">${esc(f.name)}</div>
      ${f.note ? `<div class="proj-note">${esc(f.note).replace(/\n/g, '<br>')}</div>` : '<div class="proj-note muted">Sem descrição. Toque na engrenagem para escrever uma.</div>'}
      <div class="small muted" style="margin-top:8px">Criado em ${ddmm(parseIso(f.createdAt))} · ${f.items.length} ${f.items.length === 1 ? 'item' : 'itens'}</div>
    </div>
    <button class="btn primary block" id="addMedia" style="margin-bottom:12px">+ Adicionar fotos e vídeos</button>
    ${f.items.length ? `<div class="grid">${f.items.map((it, i) => `
      <button class="tile-media" data-open="${i}">
        ${it.type === 'image' ? `<img data-mid="${it.id}_t" alt="">`
          : `<video data-mid="${it.id}" muted playsinline preload="metadata"></video><span class="play">${icon('play')}</span>`}
        ${it.tag ? `<span class="tag">${it.tag}</span>` : ''}
      </button>`).join('')}</div>` : '<p class="small muted">O projeto ainda não tem fotos nem vídeos.</p>'}`;

  hydrateMedia(view);
  document.getElementById('galBack').onclick = () => {
    galView = galCat && c && c.id === galCat ? 'categoria' : 'home';
    renderGaleria();
  };
  document.getElementById('pjEdit').onclick = () => openProjectDialog(f);
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
  tickIndoor();
  tickStudy();
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
