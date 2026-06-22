/* =============================================
   B.LIKE DASHBOARD v2 — app.js
   ============================================= */

const BASE_DATE = new Date('2026-06-20');

// ── STATE ─────────────────────────────────────
let currentChar = 'vlasa-lab';
let currentLang = 'en';
let allPosts = [];
let allTasks = {};
const taskState = {};

// ── CHARACTERS ────────────────────────────────
const CHARS = {
  'vlasa-lab':  { emoji: '🧪', name: 'Власа Смоленская', tagline: 'B.Like Active Lab', heroPos: 'center 25%' },
  'vlasa-hair': { emoji: '✂️', name: 'Власа — Парикмахер', tagline: 'Salon Mode', heroPos: 'center 20%' },
  'cats':       { emoji: '🐱', name: 'Уголёк & Огонёк', tagline: 'Warehouse Reviews', heroPos: 'center 30%' },
  'products':   { emoji: '🛍', name: 'B.Like Products', tagline: 'Продукты', heroPos: 'center 25%' },
  'alexander':  { emoji: '👑', name: 'Александр Ром', tagline: 'B.Like Luxury', heroPos: 'center 20%' },
};

// ── INIT ──────────────────────────────────────
async function init() {
  const today = new Date(); today.setHours(0,0,0,0);
  const dayIndex = Math.floor((today - BASE_DATE) / 86400000);
  renderHeader(today, dayIndex + 1);
  try {
    const [posts, tasks] = await Promise.all([
      fetch('data/posts.json').then(r => r.json()),
      fetch('data/tasks.json').then(r => r.json()),
    ]);
    allPosts = posts; allTasks = tasks;
    renderPage(dayIndex);
  } catch(e) {
    document.getElementById('main-content').innerHTML =
      '<p style="color:#888;padding:32px;text-align:center">Ошибка загрузки данных.<br>Нужен сервер (не file://).</p>';
  }
}

// ── RENDER PAGE (character-aware) ─────────────
function renderPage(dayIndex) {
  const main = document.getElementById('main-content');
  if (currentChar === 'vlasa-lab') {
    renderVlasaLab(dayIndex, main);
  } else {
    renderPlaceholder(main);
  }
}

// ── VLASA LAB PAGE ────────────────────────────
function renderVlasaLab(dayIndex, container) {
  const todayPost   = allPosts[dayIndex] || null;
  const tomorrowPost = allPosts[dayIndex + 1] || null;
  const lang = currentLang;

  let html = '';

  // Sprint progress
  html += `<div id="sprint-section">${sprintBarHTML(dayIndex + 1, allPosts.length)}</div>`;

  // Today X
  html += `<div class="section-label">🐦 Сегодня в X / Twitter</div>`;
  html += `<div id="today-x">${todayXHTML(todayPost, lang)}</div>`;

  // Today IG
  html += `<div class="section-label">📸 Сегодня в Instagram</div>`;
  html += `<div id="today-ig">${todayIGHTML(todayPost)}</div>`;

  // Tomorrow
  if (tomorrowPost) {
    html += `<div class="section-label">Завтра</div>`;
    html += `<div id="tomorrow-section">${tomorrowHTML(tomorrowPost, lang)}</div>`;
  }

  // Tasks
  html += `<div class="section-label">Задачи</div>`;
  html += `<div id="tasks-section">${tasksHTML()}</div>`;

  // Cats accordion
  html += `<div id="cats-section">${catsHTML()}</div>`;


  // Footer
  html += `<footer class="footer">B.Like Active Lab · Sprint 01 · v2</footer>`;

  container.innerHTML = html;
}

// ── PLACEHOLDER PAGE ──────────────────────────
function renderPlaceholder(container) {
  const placeholders = {
    'vlasa-hair': {
      emoji: '✂️', title: 'Власа — Парикмахер',
      text: 'Посты из жизни салона, работа с клиентами, закулисье мастера. Скоро.',
      link: null
    },
    'cats': {
      emoji: '🐱', title: 'Уголёк & Огонёк',
      text: 'Уголёк проверяет отзывы. Огонёк молчит в коробке. Всё под контролем.',
      link: '../04_Content/Cats_Warehouse_Reviews/CATS_CASE_01_CHAIN.html',
      linkLabel: '📦 Case #01 — Карбоновый планшет'
    },
    'products': {
      emoji: '🛍', title: 'B.Like Products',
      text: 'Карточки продуктов, описания, истории создания. В разработке.',
      link: null
    },
    'alexander': {
      emoji: '👑', title: 'Александр Ром',
      text: 'Личный бренд. Люкс. Преподавание. Основатель B.Like. Скоро.',
      link: null
    },
  };
  const p = placeholders[currentChar] || {};
  container.innerHTML = `
    <div class="placeholder-page">
      <div class="placeholder-emoji">${p.emoji || '✦'}</div>
      <div class="placeholder-title">${p.title || ''}</div>
      <div class="placeholder-text">${p.text || ''}</div>
      ${p.link ? `<a class="placeholder-link" href="${p.link}" target="_blank">${p.linkLabel}</a>` : ''}
    </div>
    <footer class="footer">B.Like Active Lab · v2</footer>`;
}

// ── HEADER ────────────────────────────────────
function renderHeader(date, dayNum) {
  const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  document.getElementById('header-date').innerHTML =
    `<strong>${date.getDate()} ${months[date.getMonth()]}</strong>${days[date.getDay()]}`;
  document.getElementById('header-day').textContent = `День ${dayNum}`;
}

// ── SPRINT BAR HTML ───────────────────────────
function sprintBarHTML(dayNum, total) {
  const pct = Math.min(100, Math.round((dayNum / total) * 100));
  return `<div class="sprint-bar">
    <div class="sprint-info">
      <div class="sprint-label">Sprint 01 — Progress</div>
      <div class="sprint-track"><div class="sprint-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="sprint-count">${dayNum}<span>/${total}</span></div>
  </div>`;
}

// ── TODAY X HTML ──────────────────────────────
function todayXHTML(post, lang) {
  if (!post) return `<div class="card"><div class="card-body" style="color:var(--text-dim);text-align:center;padding:24px">Sprint завершён</div></div>`;
  const x = post.x;
  const text = (lang === 'ru' && x.text_ru) ? x.text_ru : x.text;
  return `<div class="card">
    <div class="card-header">
      <span class="card-icon">🐦</span>
      <span class="card-title">X / Twitter</span>
      <span class="card-badge">${x.id}</span>
    </div>
    <div class="card-body">
      <div class="post-pillar">${x.pillar}</div>
      <div class="post-text" id="x-text">${escHtml(text)}</div>
      <div class="post-tags">${escHtml(x.tags)}</div>
      <div class="post-visual">${escHtml(x.visual)}</div>
      <div class="btn-row">
        <button class="btn btn-copy" onclick="copyText('x-text',this)">📋 Скопировать</button>
        <button class="btn btn-copy" onclick="copyRaw('${escAttr(x.text + '\n\n' + x.tags)}',this)"># Теги</button>
      </div>
    </div>
  </div>`;
}

// ── TODAY IG HTML ─────────────────────────────
function todayIGHTML(post) {
  if (!post || !post.instagram) return `<div class="card"><div class="card-body" style="color:var(--text-dim);text-align:center;padding:20px">Instagram-очередь заполнена на 7 дней. Новый контент — в работе.</div></div>`;
  const ig = post.instagram;
  return `<div class="card">
    <div class="card-header">
      <span class="card-icon">📸</span>
      <span class="card-title">Instagram</span>
      <span class="card-badge ${ig.status==='ready'?'ready':''}">${ig.status==='ready'?'✓ Готово':'⬜ Pending'}</span>
    </div>
    <div class="card-body">
      <div class="ig-format-badge">${escHtml(ig.format)}</div>
      <div class="ig-caption" id="ig-caption">${escHtml(ig.caption)}</div>
      <div class="ig-reels-hint">${escHtml(ig.reels)}</div>
      <div class="ig-repost-tag ${ig.repost_alexander?'yes':''}">↗ Репост к Александру: ${ig.repost_alexander?'да':'нет'}</div>
      <div class="btn-row">
        <button class="btn btn-copy" onclick="copyText('ig-caption',this)">📋 Скопировать подпись</button>
      </div>
    </div>
  </div>`;
}

// ── TOMORROW HTML ─────────────────────────────
function tomorrowHTML(post, lang) {
  const text = (lang === 'ru' && post.x.text_ru) ? post.x.text_ru : post.x.text;
  const preview = text.split('\n')[0];
  return `<div class="tomorrow-card" onclick="toggleTomorrow()">
    <span class="tomorrow-label">Завтра</span>
    <span class="tomorrow-title" id="tmrw-title">${escHtml(preview)}</span>
    <span id="tmrw-arrow">▾</span>
  </div>
  <div id="tmrw-body" style="display:none">
    <div class="card" style="margin-top:6px">
      <div class="card-body">
        <div class="post-pillar">${escHtml(post.x.pillar)}</div>
        <div class="post-text">${escHtml(text)}</div>
        <div class="post-tags" style="opacity:0.6">${escHtml(post.x.tags)}</div>
      </div>
    </div>
  </div>`;
}

function toggleTomorrow() {
  const body = document.getElementById('tmrw-body');
  const arrow = document.getElementById('tmrw-arrow');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  arrow.textContent = open ? '▾' : '▴';
}

// ── TASKS HTML ────────────────────────────────
function tasksHTML() {
  if (!allTasks.daily) return '';
  const items = allTasks.daily.map(t => taskItemHTML(t)).join('');
  const done = allTasks.daily.filter(t => taskState[t.id]).length;
  return `<div class="acc-block">
    <button class="acc-trigger" onclick="toggleAcc('acc-daily')" aria-expanded="true">
      <span class="acc-trigger-icon">📋</span>
      <span class="acc-trigger-label">Задачи на сегодня</span>
      <span class="acc-trigger-count" id="daily-count">${done}/${allTasks.daily.length}</span>
      <span class="acc-trigger-arrow">▾</span>
    </button>
    <div class="acc-body open" id="acc-daily">
      <ul class="task-list">${items}</ul>
    </div>
  </div>`;
}

function taskItemHTML(t) {
  const done = taskState[t.id] ? 'done' : '';
  return `<li class="task-item ${done}" id="task-${t.id}" onclick="toggleTask('${t.id}')">
    <div class="task-check">${taskState[t.id]?'✓':''}</div>
    <span class="task-icon">${t.icon}</span>
    <span class="task-label">${escHtml(t.label)}</span>
  </li>`;
}

// ── CATS HTML ─────────────────────────────────
function catsHTML() {
  if (!allTasks.cats) return '';
  const items = allTasks.cats.map(t => taskItemHTML(t)).join('');
  const done = allTasks.cats.filter(t => taskState[t.id]).length;
  return `<div class="acc-block">
    <button class="acc-trigger" onclick="toggleAcc('acc-cats')" aria-expanded="false" style="color:var(--red)">
      <span class="acc-trigger-icon">🐱</span>
      <span class="acc-trigger-label" style="color:var(--red)">Cats / Warehouse Reviews</span>
      <span class="acc-trigger-count" id="cats-count">${done}/${allTasks.cats.length}</span>
      <span class="acc-trigger-arrow">▾</span>
    </button>
    <div class="acc-body" id="acc-cats">
      <ul class="task-list">${items}</ul>
      <div style="padding-top:10px;display:flex;flex-direction:column;gap:4px">
        <a class="cats-link" href="../04_Content/Cats_Warehouse_Reviews/CATS_CASE_01_CHAIN.html" target="_blank">📦 Case #01 — Карбоновый планшет</a>
        <a class="cats-link" href="../04_Content/Cats_Warehouse_Reviews/CATS_REVIEW_INBOX.md" target="_blank">📝 CATS_REVIEW_INBOX.md</a>
        <a class="cats-link" href="../04_Content/Cats_Warehouse_Reviews/CATS_OFFICIAL_REPLY_RULES.md" target="_blank">📋 Правила официального ответа</a>
      </div>
    </div>
  </div>`;
}

// ── CHARACTER SWITCH ──────────────────────────
function switchChar(char) {
  currentChar = char;
  document.body.setAttribute('data-char', char);
  // Update nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.char === char);
  });
  // Update header
  const c = CHARS[char] || CHARS['vlasa-lab'];
  document.getElementById('char-name').textContent = c.name;
  document.getElementById('hero-tagline').textContent = c.tagline;
  const hn = document.getElementById('hero-name'); if(hn) hn.textContent = c.name;
  document.getElementById('hero-img').style.objectPosition = c.heroPos;
  // Re-render
  const today = new Date(); today.setHours(0,0,0,0);
  const dayIndex = Math.floor((today - BASE_DATE) / 86400000);
  renderPage(dayIndex);
}

// ── TRANSLATE TOGGLE ──────────────────────────
function toggleLang() {
  currentLang = currentLang === 'en' ? 'ru' : 'en';
  const btn = document.getElementById('btn-lang');
  btn.textContent = currentLang === 'ru' ? 'RU' : 'EN';
  btn.classList.toggle('ru-active', currentLang === 'ru');
  // Re-render only text parts
  const today = new Date(); today.setHours(0,0,0,0);
  const dayIndex = Math.floor((today - BASE_DATE) / 86400000);
  if (currentChar === 'vlasa-lab') {
    const todayPost = allPosts[dayIndex] || null;
    const tomorrowPost = allPosts[dayIndex + 1] || null;
    const xEl = document.getElementById('today-x');
    if (xEl) xEl.innerHTML = todayXHTML(todayPost, currentLang);
    const tmrEl = document.getElementById('tomorrow-section');
    if (tmrEl && tomorrowPost) tmrEl.innerHTML = tomorrowHTML(tomorrowPost, currentLang);
  }
}

// ── ACCORDION ─────────────────────────────────
function toggleAcc(id) {
  const body = document.getElementById(id);
  if (!body) return;
  const trigger = body.previousElementSibling;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  trigger.setAttribute('aria-expanded', !isOpen);
}

// ── TASKS ─────────────────────────────────────
function toggleTask(id) {
  taskState[id] = !taskState[id];
  const item = document.getElementById('task-' + id);
  if (!item) return;
  item.classList.toggle('done', taskState[id]);
  item.querySelector('.task-check').textContent = taskState[id] ? '✓' : '';
  // Update counters
  if (allTasks.daily) {
    const done = allTasks.daily.filter(t => taskState[t.id]).length;
    const el = document.getElementById('daily-count');
    if (el) el.textContent = `${done}/${allTasks.daily.length}`;
  }
  if (allTasks.cats) {
    const done = allTasks.cats.filter(t => taskState[t.id]).length;
    const el = document.getElementById('cats-count');
    if (el) el.textContent = `${done}/${allTasks.cats.length}`;
  }
}

// ── COPY HELPERS ──────────────────────────────
function copyText(elementId, btn) {
  const el = document.getElementById(elementId);
  if (!el) return;
  doCopy(el.innerText || el.textContent, btn);
}

function copyRaw(text, btn) { doCopy(text, btn); }

function doCopy(text, btn) {
  const orig = btn ? btn.innerHTML : '';
  navigator.clipboard.writeText(text).then(() => {
    if (btn) { btn.innerHTML = '✓ Скопировано'; btn.classList.add('copied'); }
    setTimeout(() => { if (btn) { btn.innerHTML = orig; btn.classList.remove('copied'); } }, 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    if (btn) { btn.innerHTML = '✓'; btn.classList.add('copied'); }
    setTimeout(() => { if (btn) { btn.innerHTML = orig; btn.classList.remove('copied'); } }, 2000);
  });
}

// ── UTILS ─────────────────────────────────────
function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return (s||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/\n/g,'\\n');
}

// ── START ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.body.setAttribute('data-char', 'vlasa-lab');
  init();
});
