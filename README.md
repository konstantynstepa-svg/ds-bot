# META Family Bot + Веб-панель

## Структура файлов
```
meta-bot/
├── index.js       ← бот + Express сервер (всё в одном)
├── panel.html     ← веб-панель управления
├── package.json   ← зависимости
├── .env.example   ← пример переменных окружения
├── db.json        ← база данных коинов (создаётся автоматически)
├── afkdb.json     ← база данных AFK (создаётся автоматически)
└── config.json    ← сохранённые настройки панели (создаётся автоматически)
```

## Деплой на Railway (бесплатно, 24/7)

1. Зайди на https://railway.app и зарегистрируйся через GitHub
2. Нажми **New Project → Deploy from GitHub repo**
3. Загрузи эти файлы в репозиторий (или через GitHub Desktop)
4. В Railway → вкладка **Variables** добавь:
   - `TOKEN` = токен твоего Discord-бота
5. Railway сам запустит `npm start`
6. Во вкладке **Settings → Domains** нажми **Generate Domain** — 
   получишь ссылку вида `https://твой-проект.up.railway.app`
7. Открывай эту ссылку в браузере — это и есть панель управления

## Деплой на Render (альтернатива)

1. Зайди на https://render.com
2. New → Web Service → Connect GitHub
3. Build Command: `npm install`
4. Start Command: `node index.js`
5. Environment Variable: `TOKEN` = твой токен
6. После деплоя получишь ссылку `https://твой-проект.onrender.com`

## Локальный запуск (для теста)

```bash
npm install
TOKEN=твой_токен node index.js
```

Панель откроется на http://localhost:3000
