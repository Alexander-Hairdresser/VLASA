/* =============================================
   B.LIKE DASHBOARD v2 — app.js
   ============================================= */

// ── CALENDAR CONFIG ─────────────────────────────────────────────
// Вставь сюда ссылку на опубликованный Google Sheet (формат CSV):
// Таблица → Файл → Опубликовать в интернете → Формат: CSV → Лист: Dashboard_Source
// Пример: https://docs.google.com/spreadsheets/d/XXXXX/gviz/tq?tqx=out:csv&sheet=Dashboard_Source
const VLASA_CONTENT_SOURCE_URL = '/api/calendar';

// Интервал авто-обновления данных (мс). 300000 = 5 минут
const AUTO_REFRESH_MS = 300000;

const BASE_DATE    = new Date('2026-06-20');
const HIGGSFIELD_URL = 'https://higgsfield.ai';

// ── STATE ──────────────────────────────────────────────────────
let currentChar    = 'vlasa-lab';
let currentLang    = 'en';
let allPosts       = [];
let allTasks       = {};
let allCalendar    = [];
let calendarFilter = 'all';
const taskState    = {};

// ── I18N ────────────────────────────────────────────────────────
const I18N = {
  en: {
    today:      'Today in the lab',
    tomorrow:   'Tomorrow in the lab',
    upcoming:   'Upcoming posts',
    noToday:    'No content scheduled for today',
    noTomorrow: 'No content scheduled for tomorrow',
    brief:      'Brief',
    visual:     'Visual',
    post:       'Post',
    thesis:     'Main thesis',
    hook:       'Hook / punchline',
    scene:      'Visual scene',
    imgPrompt:  'Image prompt',
    vidPrompt:  'Video prompt 10s',
    postRu:     'Post RU',
    postEn:     'Post EN',
    copyImg:    '📋 Image prompt',
    copyVid:    '🎬 Video prompt',
    copyRu:     '📋 RU',
    copyEn:     '📋 EN',
    refresh:    'Refresh data',
    errorBanner:'Data temporarily unavailable. Showing last saved data.',
    fAll:       'All',
    fMif:       'Myth Autopsy',
    fProd:      'Products',
    fAcc:       'Accessories',
    fProt:      'Protocols',
    fMask:      'Masks',
    fQA:        'Q&A',
  },
  ru: {
    today:      'Сегодня в лаборатории',
    tomorrow:   'Завтра в лаборатории',
    upcoming:   'Ближайшие публикации',
    noToday:    'На сегодня контент не запланирован',
    noTomorrow: 'На завтра контент не запланирован',
    brief:      'Кратко',
    visual:     'Визуал',
    post:       'Пост',
    thesis:     'Главный тезис',
    hook:       'Крючок / панчлайн',
    scene:      'Визуальная сцена',
    imgPrompt:  'Промпт картинка',
    vidPrompt:  'Промпт видео 10s',
    postRu:     'Пост RU',
    postEn:     'Пост EN',
    copyImg:    '📋 Промпт картинки',
    copyVid:    '🎬 Промпт видео',
    copyRu:     '📋 RU',
    copyEn:     '📋 EN',
    refresh:    'Обновить данные',
    errorBanner:'Таблица временно недоступна. Показаны последние сохранённые данные.',
    fAll:       'Все',
    fMif:       'Мифопсии',
    fProd:      'Продукты',
    fAcc:       'Аксессуары',
    fProt:      'Протоколы',
    fMask:      'Маски',
    fQA:        'Q&A',
  }
};
function tr(key) { return (I18N[currentLang] || I18N.en)[key] || key; }

// Статус источника данных
let calStatus = {
  ok:           true,    // данные загружены (из любого источника)
  isLoading:    false,   // идёт запрос прямо сейчас
  lastUpdate:   null,    // Date последнего успешного получения
  usingFallback:false,   // true = основной источник не ответил, используем TSV
};

// ── CHARACTERS ─────────────────────────────────────────────────
const CHARS = {
  'vlasa-lab':  { emoji:'🧪', name:'Власа Смоленская', tagline:'B.Like Active Lab', heroPos:'center 25%' },
  'vlasa-hair': { emoji:'✂️', name:'Власа — Парикмахер', tagline:'Salon Mode',        heroPos:'center 20%' },
  'cats':       { emoji:'🐱', name:'Уголёк & Огонёк',   tagline:'Warehouse Reviews', heroPos:'center 30%' },
  'products':   { emoji:'🛍', name:'B.Like Products',   tagline:'Продукты',           heroPos:'center 25%' },
  'alexander':  { emoji:'⚡', name:'Александр Ром',     tagline:'B.Like Luxury',      heroPos:'center 20%' },
};

// ── INIT ────────────────────────────────────────────────────────
async function init() {
  const today    = new Date(); today.setHours(0,0,0,0);
  const dayIndex = Math.floor((today - BASE_DATE) / 86400000);
  renderHeader(today, dayIndex + 1);

  const [postsRes, tasksRes, calRes] = await Promise.allSettled([
    fetch('data/posts.json').then(r => r.json()),
    fetch('data/tasks.json').then(r => r.json()),
    loadCalendarData(),
  ]);

  allPosts    = postsRes.status === 'fulfilled' ? postsRes.value : [];
  allTasks    = tasksRes.status === 'fulfilled' ? tasksRes.value : {};
  allCalendar = calRes.status   === 'fulfilled' ? calRes.value  : [];

  renderPage(dayIndex);

  // Авто-обновление каждые AUTO_REFRESH_MS
  if (VLASA_CONTENT_SOURCE_URL) {
    setInterval(refreshCalendarData, AUTO_REFRESH_MS);
  }
}

// ── CALENDAR LOADING ────────────────────────────────────────────
async function loadCalendarData() {
  // 1. Пробуем основной источник (Google Sheets)
  if (VLASA_CONTENT_SOURCE_URL) {
    try {
      // cache-bust параметр — чтобы браузер не брал устаревшую копию
      const url = VLASA_CONTENT_SOURCE_URL +
        (VLASA_CONTENT_SOURCE_URL.includes('?') ? '&' : '?') +
        '_t=' + Date.now();
      const res = await fetch(url, { credentials: 'omit', redirect: 'follow' });
      if (res.ok) {
        const text = await res.text();
        const items = parseCSV(text);
        if (items.length > 0) {
          calStatus = { ok: true, isLoading: false, lastUpdate: new Date(), usingFallback: false };
          return items;
        }
      }
    } catch(e) { /* fall through */ }
    // Основной источник недоступен → fallback
    calStatus.usingFallback = true;
  }

  // 2. Локальный TSV-fallback
  try {
    const res = await fetch('data/vlasa-content-calendar.tsv');
    if (res.ok) {
      const items = parseTSV(await res.text());
      calStatus = {
        ok:           !calStatus.usingFallback, // ok=false если основной не ответил
        isLoading:    false,
        lastUpdate:   new Date(),
        usingFallback: calStatus.usingFallback,
      };
      return items;
    }
  } catch(e) {}

  calStatus = { ok: false, isLoading: false, lastUpdate: new Date(), usingFallback: true };
  return [];
}

// ── REFRESH (вызывается кнопкой и setInterval) ───────────────────
async function refreshCalendarData() {
  if (calStatus.isLoading) return;
  calStatus.isLoading = true;
  updateRefreshUI();

  const fresh = await loadCalendarData();
  allCalendar = fresh;
  calStatus.isLoading = false;

  // Обновляем только зоны календаря — задачи и спринт не трогаем
  const calEl = document.getElementById('cal-sections');
  if (calEl) calEl.innerHTML = calendarInnerHTML();

  updateRefreshUI();
}

// ── ОБНОВЛЯЕТ КНОПКУ / TIMESTAMP / БАННЕР ───────────────────────
function updateRefreshUI() {
  const btn    = document.getElementById('cal-refresh-btn');
  const timeEl = document.getElementById('cal-last-update');
  const banner = document.getElementById('cal-error-banner');

  if (btn) {
    btn.disabled   = calStatus.isLoading;
    btn.textContent = calStatus.isLoading ? 'Загрузка...' : 'Обновить данные';
    btn.classList.toggle('loading', calStatus.isLoading);
  }

  if (timeEl && calStatus.lastUpdate) {
    const d  = calStatus.lastUpdate;
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const dd = d.getDate();
    const mo = String(d.getMonth()+1).padStart(2,'0');
    timeEl.textContent = `Обновлено: ${hh}:${mm}, ${dd}.${mo}`;
  }

  if (banner) {
    const show = calStatus.usingFallback && !!VLASA_CONTENT_SOURCE_URL;
    banner.style.display = show ? 'flex' : 'none';
  }
}

// ── CSV PARSER (Google Sheets export) ───────────────────────────
function parseCSV(text) {
  const parseRow = line => {
    const fields = []; let field = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { field += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { fields.push(field.trim()); field = ''; }
      else field += c;
    }
    fields.push(field.trim()); return fields;
  };
  const lines = text.trim().split('\n');
  if (!lines.length) return [];
  const headers = parseRow(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = parseRow(line); const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = cells[i] || ''; });
    return normalizeCalItem(obj);
  }).filter(i => i.postDate);
}

// ── TSV PARSER (local fallback) ─────────────────────────────────
function parseTSV(text) {
  const lines = text.trim().split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = line.split('\t'); const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i]?.trim() || ''; });
    return normalizeCalItem(obj);
  }).filter(i => i.postDate);
}

// ── NORMALIZE ───────────────────────────────────────────────────
function normalizeCalItem(row) {
  let d = (row.Post_Date || '').trim();
  // Excel serial number (e.g. 46199) → YYYY-MM-DD
  if (/^\d{4,6}$/.test(d)) {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + parseInt(d));
    const yy = epoch.getFullYear();
    const mm = String(epoch.getMonth()+1).padStart(2,'0');
    const dd = String(epoch.getDate()).padStart(2,'0');
    d = `${yy}-${mm}-${dd}`;
  }
  // DD.MM.YYYY → YYYY-MM-DD
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) {
    const [dd, mm, yy] = d.split('.'); d = `${yy}-${mm}-${dd}`;
  }
  return {
    postDate:        d,
    contentType:     row.Content_Type      || '',
    episodeId:       row.Episode_ID        || '',
    dashboardTitle:  row.Dashboard_Title   || '',
    mainThesis:      row.Main_Thesis       || '',
    punchlineOrHook: row.Punchline_or_Hook || '',
    visualSituation: row.Visual_Situation  || '',
    imagePromptShort:row.Image_Prompt_Short|| '',
    grokVideo10s:    row.Grok_Video_10s    || '',
    postRu:          row.Post_RU           || '',
    postEn:          row.Post_EN           || '',
    cta:             row.CTA               || '',
    status:          row.Status            || '',
    channel:         row.Channel           || '',
    notes:           row.Notes             || '',
  };
}

// ── DATE HELPERS ────────────────────────────────────────────────
function dateStr(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function getTodayContent()    { return allCalendar.filter(i => i.postDate === dateStr(0)); }
function getTomorrowContent() { return allCalendar.filter(i => i.postDate === dateStr(1)); }
function getNextSevenDays(typeFilter = 'all') {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(start); end.setDate(end.getDate() + 7);
  return allCalendar.filter(i => {
    const d = new Date(i.postDate); if (isNaN(d)) return false;
    if (d < start || d >= end) return false;
    return typeFilter === 'all' || i.contentType === typeFilter;
  }).sort((a, b) => a.postDate.localeCompare(b.postDate));
}

// ── FIELD GUARD — никогда не придумываем текст ───────────────────
const NEED_FILL = '<span class="cal-empty">Нужно заполнить в таблице</span>';
function fval(v) { return (v && v.trim()) ? escHtml(v) : NEED_FILL; }

// ── RENDER PAGE ─────────────────────────────────────────────────
function renderPage(dayIndex) {
  const main = document.getElementById('main-content');
  if (currentChar === 'vlasa-lab') renderVlasaLab(dayIndex, main);
  else renderPlaceholder(main);
}

// ── VLASA LAB PAGE ───────────────────────────────────────────────
function renderVlasaLab(dayIndex, container) {
  let html = '';
  html += `<div id="sprint-section">${sprintBarHTML(dayIndex + 1, allPosts.length || 30)}</div>`;
  html += `<div id="cal-sections">${calendarInnerHTML()}</div>`;
  html += `<div class="section-label">Задачи</div>`;
  html += `<div id="tasks-section">${tasksHTML()}</div>`;
  html += `<div id="cats-section">${catsHTML()}</div>`;
  html += `<div class="hixel-section"><a class="btn-hixel" href="${HIGGSFIELD_URL}" target="_blank" rel="noopener">🎬 Открыть Higgsfield</a></div>`;
  html += `<footer class="footer">B.Like Active Lab · Sprint 01 · v2</footer>`;
  container.innerHTML = html;
  // Обновляем статусные UI-элементы после рендера
  updateRefreshUI();
}

// ── INNER HTML для #cal-sections (вызывается при рендере и рефреше)
function calendarInnerHTML() {
  let html = '';

  // ── Шапка секции: кнопка + timestamp ──
  html += `<div class="cal-toolbar">
    <button class="btn-refresh" id="cal-refresh-btn"
      onclick="refreshCalendarData()">${tr('refresh')}</button>
    <span class="cal-timestamp" id="cal-last-update"></span>
  </div>`;

  // ── Error banner (hidden by default) ──
  html += `<div class="cal-error-banner" id="cal-error-banner" style="display:none">
    <span class="cal-error-icon">⚠</span>
    <span>${tr('errorBanner')}</span>
  </div>`;

  // ── Zone 1: Today ──
  const todayItems = getTodayContent();
  html += `<div class="section-label">${tr('today')}</div>`;
  if (!todayItems.length) {
    html += `<div class="cal-empty-state">${tr('noToday')}</div>`;
  } else {
    html += todayItems.map(item => calCardHTML(item)).join('');
  }

  // ── Zone 2: Tomorrow ──
  const tomorrowItems = getTomorrowContent();
  html += `<div class="section-label">${tr('tomorrow')}</div>`;
  if (!tomorrowItems.length) {
    html += `<div class="cal-empty-state">${tr('noTomorrow')}</div>`;
  } else {
    html += tomorrowItems.map(item => calCardHTML(item)).join('');
  }

  // ── Zone 3: Upcoming ──
  html += `<div class="section-label">${tr('upcoming')}</div>`;
  html += filterBarHTML();
  html += `<div id="cal-7d-list" class="cal-week-wrap">${sevenDayListHTML('all')}</div>`;

  return html;
}

// ── CALENDAR CARD ────────────────────────────────────────────────
function calCardHTML(item, compact = false) {
  const uid = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
  const hasImg = item.imagePromptShort && item.imagePromptShort.trim();
  const hasVid = item.grokVideo10s     && item.grokVideo10s.trim();
  const hasRu  = item.postRu           && item.postRu.trim();
  const hasEn  = item.postEn           && item.postEn.trim();

  const visualAcc = !compact ? `
    <div class="cal-acc">
      <button class="cal-acc-trigger" onclick="toggleCalAcc('${uid}-vis')">
        ${tr('visual')} <span class="cal-acc-arrow">▾</span>
      </button>
      <div class="cal-acc-body" id="${uid}-vis">
        <div class="cal-field">
          <div class="cal-field-lbl">${tr('scene')}</div>
          <div class="cal-field-val">${fval(item.visualSituation)}</div>
        </div>
        <div class="cal-field">
          <div class="cal-field-lbl">${tr('imgPrompt')}</div>
          <div class="cal-field-val cal-prompt" id="${uid}-img">${fval(item.imagePromptShort)}</div>
        </div>
        <div class="cal-field">
          <div class="cal-field-lbl">${tr('vidPrompt')}</div>
          <div class="cal-field-val cal-prompt" id="${uid}-vid">${fval(item.grokVideo10s)}</div>
        </div>
        ${hasImg||hasVid ? `<div class="btn-row" style="margin-top:8px">
          ${hasImg?`<button class="btn btn-copy" onclick="copyText('${uid}-img',this)">${tr('copyImg')}</button>`:''}
          ${hasVid?`<button class="btn btn-copy" onclick="copyText('${uid}-vid',this)">${tr('copyVid')}</button>`:''}
        </div>` : ''}
      </div>
    </div>` : '';

  const postAcc = !compact ? `
    <div class="cal-acc">
      <button class="cal-acc-trigger" onclick="toggleCalAcc('${uid}-post')">
        ${tr('post')} <span class="cal-acc-arrow">▾</span>
      </button>
      <div class="cal-acc-body" id="${uid}-post">
        <div class="cal-field">
          <div class="cal-field-lbl">${tr('postRu')}</div>
          <div class="cal-field-val cal-post-text" id="${uid}-ru">${fval(item.postRu)}</div>
        </div>
        <div class="cal-field">
          <div class="cal-field-lbl">${tr('postEn')}</div>
          <div class="cal-field-val cal-post-text" id="${uid}-en">${fval(item.postEn)}</div>
        </div>
        ${hasRu||hasEn ? `<div class="btn-row" style="margin-top:8px">
          ${hasRu?`<button class="btn btn-copy" onclick="copyText('${uid}-ru',this)">${tr('copyRu')}</button>`:''}
          ${hasEn?`<button class="btn btn-copy" onclick="copyText('${uid}-en',this)">${tr('copyEn')}</button>`:''}
        </div>` : ''}
      </div>
    </div>` : '';

  return `<div class="cal-card">
    <div class="cal-card-header">
      ${typeBadge(item.contentType)}
      ${item.episodeId ? `<span class="cal-episode">${escHtml(item.episodeId)}</span>` : ''}
      ${item.channel   ? `<span class="cal-channel">${escHtml(item.channel)}</span>`   : ''}
      ${item.status    ? `<span class="cal-status ${statusCls(item.status)}">${escHtml(item.status)}</span>` : ''}
    </div>
    <div class="cal-card-title">${fval(item.dashboardTitle)}</div>
    <div class="cal-acc">
      <button class="cal-acc-trigger" onclick="toggleCalAcc('${uid}-brief')">
        ${tr('brief')} <span class="cal-acc-arrow" style="transform:rotate(180deg)">▾</span>
      </button>
      <div class="cal-acc-body open" id="${uid}-brief">
        <div class="cal-field">
          <div class="cal-field-lbl">${tr('thesis')}</div>
          <div class="cal-field-val">${fval(item.mainThesis)}</div>
        </div>
        <div class="cal-field">
          <div class="cal-field-lbl">${tr('hook')}</div>
          <div class="cal-field-val cal-hook">${fval(item.punchlineOrHook)}</div>
        </div>
        ${item.cta ? `<div class="cal-cta">${escHtml(item.cta)}</div>` : ''}
      </div>
    </div>
    ${visualAcc}
    ${postAcc}
  </div>`;
}

// ── TYPE BADGES ──────────────────────────────────────────────────
const BADGE_MAP = {
  'Мифопсия':'badge-myth', 'Продукт':'badge-product', 'Аксессуар':'badge-acc',
  'Протокол':'badge-prot', 'Маска':'badge-mask',       'Q&A':'badge-qa',
  'Backstage':'badge-back','Обучение':'badge-edu',      'Пост Власы':'badge-vlasa',
};
function typeBadge(type) {
  if (!type) return '';
  return `<span class="cal-badge ${BADGE_MAP[type]||'badge-def'}">${escHtml(type)}</span>`;
}
function statusCls(s) {
  const l = (s||'').toLowerCase();
  if (l.includes('ready')||l.includes('готов')) return 'status-ready';
  if (l.includes('draft')||l.includes('черн'))  return 'status-draft';
  if (l.includes('done')||l.includes('опублик'))return 'status-done';
  return '';
}

// ── FILTER BAR ───────────────────────────────────────────────────
const FILTER_TYPES  = ['all','Мифопсия','Продукт','Аксессуар','Протокол','Маска','Q&A'];
const FILTER_LABELS = { all:'Все','Мифопсия':'Мифопсии','Продукт':'Продукты',
  'Аксессуар':'Аксессуары','Протокол':'Протоколы','Маска':'Маски','Q&A':'Q&A' };

function filterBarHTML() {
  return `<div class="filter-bar">` +
    FILTER_TYPES.map(t =>
      `<button class="filter-btn${calendarFilter===t?' active':''}"
        onclick="setCalFilter('${t}')">${FILTER_LABELS[t]}</button>`
    ).join('') + `</div>`;
}

function sevenDayListHTML(typeFilter) {
  const items = getNextSevenDays(typeFilter);
  if (!items.length) return `<div class="cal-empty-state">Публикаций не запланировано</div>`;
  const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const WDAYS  = ['вс','пн','вт','ср','чт','пт','сб'];
  return items.map(item => {
    const d   = new Date(item.postDate);
    const lbl = isNaN(d) ? item.postDate : `${d.getDate()} ${MONTHS[d.getMonth()]} ${WDAYS[d.getDay()]}`;
    return `<div class="cal-row">
      <span class="cal-row-date">${lbl}</span>
      ${typeBadge(item.contentType)}
      <span class="cal-row-title">${item.dashboardTitle
        ? escHtml(item.dashboardTitle)
        : '<span class="cal-empty">—</span>'}</span>
      ${item.status
        ? `<span class="cal-row-status ${statusCls(item.status)}">${escHtml(item.status)}</span>`
        : ''}
    </div>`;
  }).join('');
}

function setCalFilter(type) {
  calendarFilter = type;
  document.querySelectorAll('.filter-btn').forEach(btn =>
    btn.classList.toggle('active', btn.textContent.trim() === (FILTER_LABELS[type]||'')));
  const el = document.getElementById('cal-7d-list');
  if (el) el.innerHTML = sevenDayListHTML(type);
}

function toggleCalAcc(id) {
  const body    = document.getElementById(id);
  if (!body) return;
  const trigger = body.previousElementSibling;
  const isOpen  = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  const arrow = trigger?.querySelector('.cal-acc-arrow');
  if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ── PLACEHOLDER PAGE ─────────────────────────────────────────────
function renderPlaceholder(container) {
  const placeholders = {
    'vlasa-hair': { emoji:'✂️', title:'Власа — Парикмахер', text:'Посты из жизни салона, закулисье мастера. Скоро.',
      link:null },
    'cats': { emoji:'🐱', title:'Уголёк & Огонёк', text:'Уголёк проверяет отзывы. Огонёк молчит в коробке.',
      link:'../04_Content/Cats_Warehouse_Reviews/CATS_CASE_01_CHAIN.html',
      linkLabel:'📦 Case #01 — Карбоновый планшет' },
    'products': { emoji:'🛍', title:'B.Like Products', text:'Карточки продуктов, истории создания. В разработке.', link:null },
    'alexander': { emoji:'⚡', title:'Александр Ром', text:'Личный бренд. Люкс. Преподавание. Основатель B.Like.', link:null },
  };
  const p = placeholders[currentChar] || {};
  container.innerHTML = `
    <div class="placeholder-page">
      <div class="placeholder-emoji">${p.emoji||'✦'}</div>
      <div class="placeholder-title">${p.title||''}</div>
      <div class="placeholder-text">${p.text||''}</div>
      ${p.link ? `<a class="placeholder-link" href="${p.link}" target="_blank">${p.linkLabel}</a>` : ''}
    </div>
    <footer class="footer">B.Like Active Lab · v2</footer>`;
}

// ── HEADER ───────────────────────────────────────────────────────
function renderHeader(date, dayNum) {
  const days   = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  document.getElementById('header-date').innerHTML =
    `<strong>${date.getDate()} ${months[date.getMonth()]}</strong>${days[date.getDay()]}`;
  document.getElementById('header-day').textContent = `День ${dayNum}`;
}

// ── SPRINT BAR ───────────────────────────────────────────────────
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

// ── TASKS ────────────────────────────────────────────────────────
function tasksHTML() {
  if (!allTasks.daily) return '';
  const items = allTasks.daily.map(t => taskItemHTML(t)).join('');
  const done  = allTasks.daily.filter(t => taskState[t.id]).length;
  return `<div class="acc-block">
    <button class="acc-trigger" onclick="toggleAcc('acc-daily')" aria-expanded="true">
      <span class="acc-trigger-label">Задачи на сегодня</span>
      <span class="acc-trigger-count" id="daily-count">${done}/${allTasks.daily.length}</span>
      <span class="acc-trigger-arrow">▾</span>
    </button>
    <div class="acc-body open" id="acc-daily"><ul class="task-list">${items}</ul></div>
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

// ── CATS ─────────────────────────────────────────────────────────
function catsHTML() {
  if (!allTasks.cats) return '';
  const items = allTasks.cats.map(t => taskItemHTML(t)).join('');
  const done  = allTasks.cats.filter(t => taskState[t.id]).length;
  return `<div class="acc-block">
    <button class="acc-trigger" onclick="toggleAcc('acc-cats')" aria-expanded="false" style="color:var(--red)">
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

// ── CHARACTER SWITCH ─────────────────────────────────────────────
function switchChar(char) {
  currentChar = char;
  document.body.setAttribute('data-char', char);
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.char === char));
  const c = CHARS[char] || CHARS['vlasa-lab'];
  const nameEl = document.getElementById('char-name');
  if (nameEl) nameEl.textContent = c.name;
  const today    = new Date(); today.setHours(0,0,0,0);
  const dayIndex = Math.floor((today - BASE_DATE) / 86400000);
  renderPage(dayIndex);
}

// ── LANGUAGE TOGGLE ──────────────────────────────────────────────
function toggleLang() {
  currentLang = currentLang === 'en' ? 'ru' : 'en';
  const btn = document.getElementById('btn-lang');
  btn.textContent = currentLang === 'ru' ? 'EN' : 'РУ';
  btn.classList.toggle('ru-active', currentLang === 'ru');
  // Re-render calendar section with new language
  const calEl = document.getElementById('cal-sections');
  if (calEl) calEl.innerHTML = calendarInnerHTML();
  updateRefreshUI();
}

// ── ACCORDION ────────────────────────────────────────────────────
function toggleAcc(id) {
  const body = document.getElementById(id);
  if (!body) return;
  const trigger = body.previousElementSibling;
  const isOpen  = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if (trigger) trigger.setAttribute('aria-expanded', !isOpen);
}

// ── TASK TOGGLE ──────────────────────────────────────────────────
function toggleTask(id) {
  taskState[id] = !taskState[id];
  const item = document.getElementById('task-' + id);
  if (!item) return;
  item.classList.toggle('done', taskState[id]);
  item.querySelector('.task-check').textContent = taskState[id] ? '✓' : '';
  if (allTasks.daily) {
    const done = allTasks.daily.filter(t => taskState[t.id]).length;
    const el   = document.getElementById('daily-count');
    if (el) el.textContent = `${done}/${allTasks.daily.length}`;
  }
  if (allTasks.cats) {
    const done = allTasks.cats.filter(t => taskState[t.id]).length;
    const el   = document.getElementById('cats-count');
    if (el) el.textContent = `${done}/${allTasks.cats.length}`;
  }
}

// ── COPY HELPERS ─────────────────────────────────────────────────
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

// ── UTILS ────────────────────────────────────────────────────────
function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return (s||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/\n/g,'\\n');
}

// ── START ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.body.setAttribute('data-char', 'vlasa-lab');
  init();
});
