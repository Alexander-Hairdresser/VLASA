/* =============================================
   VLASA DAILY DASHBOARD — app.js
   B.Like Active Lab | No API keys
   ============================================= */

const BASE_DATE = new Date('2026-06-20');
const HIXEL_URL = 'https://hixel.ai'; // Replace with actual Hixel link

// In-memory task state (resets on reload — by design)
const taskState = {};

// ── INIT ──────────────────────────────────────
async function init() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayIndex = Math.floor((today - BASE_DATE) / 86400000); // 0-based

  renderHeader(today, dayIndex + 1);

  try {
    const [posts, tasks] = await Promise.all([
      fetch('data/posts.json').then(r => r.json()),
      fetch('data/tasks.json').then(r => r.json()),
    ]);

    const todayPost = posts[dayIndex] || null;
    const tomorrowPost = posts[dayIndex + 1] || null;

    renderSprintProgress(dayIndex + 1, posts.length);
    renderTodayX(todayPost);
    renderTodayIG(todayPost);
    renderTomorrow(tomorrowPost);
    renderTasks(tasks);
    renderCats();
    renderHixel();

  } catch (err) {
    console.error('Data load error:', err);
    document.getElementById('main-content').innerHTML =
      '<p style="color:#888;padding:32px;text-align:center">Не удалось загрузить данные.<br>Проверьте что файлы data/*.json доступны.</p>';
  }
}

// ── HEADER ────────────────────────────────────
function renderHeader(date, dayNum) {
  const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const dayName = days[date.getDay()];
  const dateStr = `${date.getDate()} ${months[date.getMonth()]}`;

  document.getElementById('header-date').innerHTML =
    `<strong>${dateStr}</strong>${dayName}`;
  document.getElementById('header-day').textContent = `День ${dayNum}`;
}

// ── SPRINT PROGRESS ────────────────────────────
function renderSprintProgress(dayNum, total) {
  const pct = Math.min(100, Math.round((dayNum / total) * 100));
  const el = document.getElementById('sprint-section');
  el.innerHTML = `
    <div class="sprint-bar">
      <div class="sprint-info">
        <div class="sprint-label">Sprint 01 — Progress</div>
        <div class="sprint-track">
          <div class="sprint-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="sprint-count">${dayNum}<span>/${total}</span></div>
    </div>`;
}

// ── TODAY X POST ──────────────────────────────
function renderTodayX(post) {
  const el = document.getElementById('today-x');
  if (!post) {
    el.innerHTML = noContent('Sprint завершён — новые посты в работе');
    return;
  }
  const x = post.x;
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-icon">🐦</span>
        <span class="card-title">X / Twitter</span>
        <span class="card-badge">${x.id}</span>
      </div>
      <div class="card-body">
        <div class="post-pillar">${x.pillar}</div>
        <div class="post-text" id="x-text">${escHtml(x.text)}</div>
        <div class="post-tags">${escHtml(x.tags)}</div>
        <div class="post-visual">${escHtml(x.visual)}</div>
        <div class="btn-row">
          <button class="btn btn-copy" onclick="copyText('x-text', this)">
            📋 Скопировать пост
          </button>
          <button class="btn btn-copy" onclick="copyText('x-tags-hidden', this)">
            # Теги
          </button>
        </div>
        <span id="x-tags-hidden" style="display:none">${escHtml(x.text + '\n\n' + x.tags)}</span>
      </div>
    </div>`;
}

// ── TODAY INSTAGRAM ────────────────────────────
function renderTodayIG(post) {
  const el = document.getElementById('today-ig');
  if (!post || !post.instagram) {
    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-icon">📸</span>
          <span class="card-title">Instagram</span>
        </div>
        <div class="card-body">
          <div class="no-content">Instagram очередь заполнена на 7 дней.<br>Новый контент — в работе.</div>
        </div>
      </div>`;
    return;
  }
  const ig = post.instagram;
  const statusBadge = ig.status === 'ready'
    ? '<span class="card-badge ready">✓ Готово</span>'
    : '<span class="card-badge">⬜ Pending</span>';
  const repostLine = ig.repost_alexander
    ? '<div class="ig-repost-tag yes">↗ Репост к Александру: да</div>'
    : '<div class="ig-repost-tag">↗ Репост к Александру: нет</div>';

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-icon">📸</span>
        <span class="card-title">Instagram</span>
        ${statusBadge}
      </div>
      <div class="card-body">
        <div class="ig-format-badge">${escHtml(ig.format)}</div>
        <div class="ig-caption" id="ig-caption">${escHtml(ig.caption)}</div>
        <div class="ig-reels-hint">${escHtml(ig.reels)}</div>
        ${repostLine}
        <div class="btn-row">
          <button class="btn btn-copy" onclick="copyText('ig-caption', this)">
            📋 Скопировать подпись
          </button>
        </div>
      </div>
    </div>`;
}

// ── TOMORROW PREVIEW ───────────────────────────
function renderTomorrow(post) {
  const el = document.getElementById('tomorrow-section');
  if (!post) {
    el.innerHTML = '';
    return;
  }
  const preview = post.x.text.split('\n')[0];
  el.innerHTML = `
    <div class="tomorrow-card" onclick="toggleTomorrow()">
      <span class="tomorrow-label">Завтра</span>
      <span class="tomorrow-title" id="tmrw-title">${escHtml(preview)}</span>
      <span class="tomorrow-arrow" id="tmrw-arrow">▾</span>
    </div>
    <div id="tmrw-body" style="display:none">
      <div class="card" style="margin-top:6px;border-top-left-radius:4px;border-top-right-radius:4px">
        <div class="card-body">
          <div class="post-pillar">${escHtml(post.x.pillar)}</div>
          <div class="post-text">${escHtml(post.x.text)}</div>
          <div class="post-tags" style="opacity:0.6">${escHtml(post.x.tags)}</div>
        </div>
      </div>
    </div>`;
}

function toggleTomorrow() {
  const body = document.getElementById('tmrw-body');
  const arrow = document.getElementById('tmrw-arrow');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  arrow.textContent = open ? '▾' : '▴';
}

// ── TASKS ──────────────────────────────────────
function renderTasks(tasks) {
  const el = document.getElementById('tasks-section');

  const dailyItems = tasks.daily.map(t => taskItem(t)).join('');
  const catsItems = tasks.cats.map(t => taskItem(t, true)).join('');

  const completedDaily = tasks.daily.filter(t => taskState[t.id]).length;
  const completedCats = tasks.cats.filter(t => taskState[t.id]).length;

  el.innerHTML = `
    <div class="acc-block">
      <button class="acc-trigger" onclick="toggleAcc('acc-daily')" aria-expanded="true">
        <span class="acc-trigger-icon">📋</span>
        <span class="acc-trigger-label">Задачи на сегодня</span>
        <span class="acc-trigger-count" id="daily-count">${completedDaily}/${tasks.daily.length}</span>
        <span class="acc-trigger-arrow">▾</span>
      </button>
      <div class="acc-body open" id="acc-daily">
        <ul class="task-list" id="task-list-daily">
          ${dailyItems}
        </ul>
      </div>
    </div>`;

  // store tasks for re-rendering
  window._tasks = tasks;
}

function taskItem(t, isCats) {
  const done = taskState[t.id] ? 'done' : '';
  const check = taskState[t.id] ? '✓' : '';
  return `
    <li class="task-item ${done}" id="task-${t.id}" onclick="toggleTask('${t.id}')">
      <div class="task-check">${check}</div>
      <span class="task-icon">${t.icon}</span>
      <span class="task-label">${escHtml(t.label)}</span>
    </li>`;
}

function toggleTask(id) {
  taskState[id] = !taskState[id];
  const item = document.getElementById('task-' + id);
  if (taskState[id]) {
    item.classList.add('done');
    item.querySelector('.task-check').textContent = '✓';
  } else {
    item.classList.remove('done');
    item.querySelector('.task-check').textContent = '';
  }
  // Update counter
  if (window._tasks) {
    const list = window._tasks.daily.concat(window._tasks.cats);
    const t = list.find(x => x.id === id);
    const isDaily = window._tasks.daily.find(x => x.id === id);
    const isCAT = window._tasks.cats.find(x => x.id === id);
    if (isDaily) {
      const count = window._tasks.daily.filter(x => taskState[x.id]).length;
      const el = document.getElementById('daily-count');
      if (el) el.textContent = `${count}/${window._tasks.daily.length}`;
    }
    if (isCAT) {
      const count = window._tasks.cats.filter(x => taskState[x.id]).length;
      const el = document.getElementById('cats-count');
      if (el) el.textContent = `${count}/${window._tasks.cats.length}`;
    }
  }
}

// ── CATS BLOCK ─────────────────────────────────
function renderCats() {
  const el = document.getElementById('cats-section');
  const cats = window._tasks ? window._tasks.cats : [];
  const completedCats = cats.filter(t => taskState[t.id]).length;

  el.innerHTML = `
    <div class="acc-block">
      <button class="acc-trigger cats-trigger" onclick="toggleAcc('acc-cats')" aria-expanded="false">
        <span class="acc-trigger-icon">🐱</span>
        <span class="acc-trigger-label">Cats / Warehouse Reviews</span>
        <span class="acc-trigger-count" id="cats-count">${completedCats}/${cats.length}</span>
        <span class="acc-trigger-arrow">▾</span>
      </button>
      <div class="acc-body" id="acc-cats">
        <ul class="task-list" id="task-list-cats">
          ${cats.map(t => taskItem(t, true)).join('')}
        </ul>
        <div style="padding-top:12px;display:flex;flex-direction:column;gap:6px">
          <a class="cats-link" href="../04_Content/Cats_Warehouse_Reviews/CATS_CASE_01_CHAIN.html" target="_blank">
            📦 Case #01 — Карбоновый планшет (цепочка постов)
          </a>
          <a class="cats-link" href="../04_Content/Cats_Warehouse_Reviews/CATS_REVIEW_INBOX.md" target="_blank">
            📝 CATS_REVIEW_INBOX.md
          </a>
          <a class="cats-link" href="../04_Content/Cats_Warehouse_Reviews/CATS_OFFICIAL_REPLY_RULES.md" target="_blank">
            📋 Правила официального ответа
          </a>
        </div>
      </div>
    </div>`;
}

// ── HIXEL ──────────────────────────────────────
function renderHixel() {
  const el = document.getElementById('hixel-section');
  el.innerHTML = `
    <div class="hixel-section">
      <a class="btn-hixel" href="${HIXEL_URL}" target="_blank" rel="noopener">
        🖼 Открыть Hixel
      </a>
    </div>`;
}

// ── ACCORDION TOGGLE ───────────────────────────
function toggleAcc(id) {
  const body = document.getElementById(id);
  const trigger = body.previousElementSibling;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  trigger.setAttribute('aria-expanded', !isOpen);
}

// ── COPY TEXT ──────────────────────────────────
function copyText(elementId, btn) {
  const el = document.getElementById(elementId);
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Скопировано';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // Fallback for non-HTTPS
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.innerHTML = '✓ Скопировано';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = '📋 Скопировать';
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ── UTILS ──────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function noContent(msg) {
  return `<div class="no-content"><span class="emoji">✦</span>${msg}</div>`;
}

// ── START ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
