# 💊 MedSchedule v2.0

AI-помощник по назначениям врача. Gemini AI анализирует выписки, Supabase хранит данные, Vercel деплоит.

---

## 🚀 Деплой — пошагово

### Шаг 1 — Supabase (база данных + авторизация)

1. Зайди на [supabase.com](https://supabase.com) → **New project**
2. Запомни название и придумай пароль БД
3. После создания: **SQL Editor** → вставь содержимое файла `supabase_schema.sql` → **Run**
4. Перейди в **Project Settings → API** и скопируй:
   - `Project URL` → это `VITE_SUPABASE_URL`
   - `anon / public` ключ → это `VITE_SUPABASE_ANON_KEY`

### Шаг 2 — Gemini API ключ

1. Зайди на [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. **Create API key** → скопируй → это `GEMINI_API_KEY`

### Шаг 3 — GitHub

```bash
git init
git add .
git commit -m "feat: MedSchedule v2.0"

# Создай репо на github.com (без README), затем:
git remote add origin https://github.com/ВАШ_ЮЗЕР/medschedule.git
git push -u origin main
```

### Шаг 4 — Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → выбери репо
2. Framework: **Vite** (определится автоматически)
3. **Environment Variables** — добавь все три:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |
| `GEMINI_API_KEY` | `AIza...` |

4. **Deploy** → готово!

### Шаг 5 — Установить как PWA (опционально)
- **iPhone**: Safari → Поделиться → «На экран "Домой"»
- **Android**: Chrome → ⋮ → «Добавить на главный экран»

---

## 🗂 Структура

```
medschedule/
├── api/
│   └── analyze.js              ← Gemini AI serverless function
├── public/
│   ├── manifest.json           ← PWA
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── context/
│   │   └── AuthContext.jsx     ← Supabase auth
│   ├── hooks/
│   │   ├── useSchedule.js      ← CRUD расписания
│   │   └── useNotes.js         ← CRUD заметок
│   ├── components/
│   │   ├── Layout.jsx          ← Sidebar + BottomNav
│   │   ├── AddItemModal.jsx    ← Добавление пунктов
│   │   └── ItemModal.jsx       ← Детали / редактирование
│   ├── screens/
│   │   ├── Auth.jsx            ← Вход / Регистрация
│   │   ├── Dashboard.jsx       ← Сегодня
│   │   ├── CalendarView.jsx    ← Полный календарь
│   │   ├── Upload.jsx          ← ИИ-анализ документов
│   │   ├── Notes.jsx           ← Заметки (Notion-style)
│   │   └── Profile.jsx         ← Профиль + настройки + MedIQ
│   ├── lib/supabase.js
│   ├── constants.js
│   ├── App.jsx
│   └── main.jsx
├── supabase_schema.sql         ← SQL для Supabase
├── .env.example
├── vercel.json
└── package.json
```

---

## ✨ Что реализовано в v2.0

| Функция | Статус |
|---------|--------|
| Регистрация / Вход (Supabase) | ✅ |
| Расписание дня с фильтрами | ✅ |
| Добавление любых типов задач | ✅ |
| Редактирование / удаление | ✅ |
| Полный календарь (реальные даты) | ✅ |
| Загрузка файлов + текста для ИИ | ✅ |
| Gemini AI анализ выписок | ✅ |
| Заметки в стиле Notion | ✅ |
| Профиль + аналитика | ✅ |
| Синхронизация с MedIQ | ✅ |
| Настройки уведомлений | ✅ |
| Responsive (Desktop + Mobile) | ✅ |
| PWA (установка на экран) | ✅ |

---

## 🛠 Стек

| | |
|---|---|
| Frontend | React 18 + Vite |
| Auth + DB | Supabase |
| AI | Google Gemini 1.5 Flash |
| Charts | Recharts |
| Dates | date-fns |
| Deploy | Vercel |
