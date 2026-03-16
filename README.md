# 💊 MedSchedule — MVP

AI-помощник по назначениям врача. Анализирует медицинские выписки через **Gemini AI** и автоматически формирует расписание лечения.

---

## 🚀 Деплой за 5 шагов

### 1. Получить Gemini API ключ
1. Перейди на [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Нажми **Create API key**
3. Скопируй ключ — он понадобится на шаге 4

---

### 2. Загрузить на GitHub
```bash
# Инициализировать репозиторий
git init
git add .
git commit -m "feat: MedSchedule MVP"

# Создать репозиторий на github.com, затем:
git remote add origin https://github.com/ВАШ_ЮЗЕР/medschedule.git
git push -u origin main
```

---

### 3. Подключить к Vercel
1. Зайди на [vercel.com](https://vercel.com) → **Add New Project**
2. Выбери репозиторий `medschedule`
3. Framework: **Vite** (Vercel определит автоматически)
4. Нажми **Deploy** (первый деплой без API ключа — ОК)

---

### 4. Добавить переменную окружения
В Vercel → Settings → **Environment Variables**:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | `AIza...` (твой ключ) |

После добавления нажми **Redeploy**.

---

### 5. Установить как PWA (опционально)
- **iPhone**: Safari → Поделиться → «На экран "Домой"»
- **Android**: Chrome → меню ⋮ → «Добавить на главный экран»

---

## 🗂 Структура проекта

```
medschedule/
├── api/
│   └── analyze.js          # Serverless function — Gemini API
├── public/
│   ├── manifest.json       # PWA манифест
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── screens/
│   │   ├── Onboarding.jsx  # Загрузка документа
│   │   ├── Analyzing.jsx   # Экран обработки
│   │   ├── Preview.jsx     # Подтверждение назначений
│   │   ├── Today.jsx       # Расписание дня
│   │   ├── Week.jsx        # Недельный вид
│   │   ├── Analytics.jsx   # Графики и статистика
│   │   ├── Report.jsx      # Отчёт для врача
│   │   └── Settings.jsx    # Настройки
│   ├── components/
│   │   ├── BottomNav.jsx   # Нижняя навигация
│   │   └── ItemModal.jsx   # Карточка пункта
│   ├── constants.js        # Типы, демо-данные
│   ├── App.jsx             # Главный компонент
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 💻 Локальная разработка

```bash
npm install

# Создать файл .env.local
echo "GEMINI_API_KEY=ваш_ключ" > .env.local

npm run dev
# → http://localhost:3000
```

---

## 🛠 Стек

| Слой | Технология |
|------|-----------|
| Frontend | React 18 + Vite |
| Графики | Recharts |
| AI | Google Gemini 1.5 Flash |
| Деплой | Vercel (Serverless Functions) |
| PWA | Web App Manifest |

---

## 📋 MVP Экраны

- ✅ Онбординг — вставка текста выписки
- ✅ Gemini AI анализ назначений
- ✅ Превью и подтверждение
- ✅ Расписание дня + чекбоксы + прогресс-бар
- ✅ Добавление/удаление пунктов вручную
- ✅ Недельный вид с тепловой картой
- ✅ Аналитика + график самочувствия
- ✅ Отчёт для врача
- ✅ Настройки уведомлений и режима тишины
