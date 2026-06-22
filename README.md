# VLASA DAILY DASHBOARD WEB

Мобильный ежедневный дашборд публикаций — Власа Смоленская / B.Like Active Lab.

## Что это

Статический сайт без сервера и API-ключей. Показывает:
- Сегодняшний пост для X/Twitter (автоматически по дате)
- Сегодняшний пост для Instagram (из очереди)
- Превью завтрашнего поста
- Чеклист задач на день
- Блок Cats / Warehouse Reviews

## Деплой на Vercel

1. Загрузить папку на GitHub
2. Подключить репозиторий к [vercel.com](https://vercel.com)
3. Framework: Other (статический HTML)
4. Build command: — (пусто)
5. Output directory: . (точка — корень)
6. Deploy ✓

## Локальный запуск

Нужен любой локальный сервер (из-за fetch):

```bash
# Python
python3 -m http.server 3000

# Node
npx serve .

# VS Code — расширение Live Server
```

Открыть: http://localhost:3000

## Структура

```
VLASA_DAILY_DASHBOARD_WEB/
├── index.html          — главная страница
├── style.css           — стили (mobile-first, B.Like брендинг)
├── app.js              — логика (календарь, рендеринг, копирование)
├── data/
│   ├── posts.json      — X + Instagram посты по дням (Sprint 01)
│   └── tasks.json      — списки задач
├── README.md
└── .gitignore
```

## Логика дат

- BASE_DATE: 2026-06-20 (день публикации POST 01)
- Индекс дня = `Math.floor((сегодня - BASE_DATE) / 86400000)`
- Sprint 01: 10 постов, дни 1–10

## Добавить новый Sprint

Добавить записи в `data/posts.json` начиная с day 11.  
BASE_DATE менять не нужно — логика считается автоматически.

## Брендинг

- Фон: #0A0A0A
- Акцент: #C6FF00 (лайм)
- Шрифт: system-ui (без внешних зависимостей)
