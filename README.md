# 🌺 Секреты Большого Счастья

**Telegram Mini App** — спокойный торговый бот с AI-ассистентом

## ✨ Возможности

- 🏠 **Главная страница** — приветствие, статус рынка, привычки трейдера
- 🤖 **Торговый бот** — выбор пары, таймфрейм, AI-сигналы
- 💬 **AI-ассистент** — чат для советов по трейдингу и психологии
- 👤 **Профиль** — статистика, привычки, настройки
- ✅ **Проверка на будние дни** — сигналы только пн-пт
- 🎨 **Тропический дизайн** — спокойные, приятные цвета

## 🚀 Быстрый старт

### Установка
```bash
npm install
```

### Разработка
```bash
npm run dev
```

### Сборка
```bash
npm run build
```

## 📱 Деплой в Telegram

### 1. Создай бота
1. Открой [@BotFather](https://t.me/BotFather)
2. Отправь `/newbot`
3. Дай имя и username боту

### 2. Задеплой приложение
**Вариант A — GitHub Pages (бесплатно)**
```bash
# Установи gh-pages
npm install -D gh-pages

# В package.json добавь:
"homepage": "https://твой-ник.github.io/secret-happiness",
"scripts": {
  "deploy": "vite build && gh-pages -d dist"
}

# Запусти деплой
npm run build
npm run deploy
```

**Вариант B — Vercel (бесплатно)**
```bash
npm install -g vercel
vercel
```

**Вариант C — Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### 3. Подключи к Telegram
1. Открой [@BotFather](https://t.me/BotFather)
2. Отправь `/newapp`
3. Выбери своего бота
4. Введи название и описание
5. Отправь URL твоего деплоя (например: `https://твой-ник.github.io/secret-happiness`)
6. Получи прямую ссылку на Mini App

### 4. Готово! 🎉
Отправь ссылку боту или используй `/start` команду с Mini App кнопкой.

## 🎨 Структура проекта

```
secret-happiness/
├── src/
│   ├── components/
│   │   ├── HomeScreen.jsx      # Главная страница
│   │   ├── BotScreen.jsx       # Торговый бот
│   │   ├── ChatScreen.jsx      # AI-ассистент
│   │   └── ProfileScreen.jsx   # Профиль
│   ├── App.jsx                 # Основной компонент
│   ├── main.jsx                # Точка входа
│   └── index.css               # Глобальные стили
├── index.html
├── package.json
└── vite.config.js
```

## 🌿 Дизайн-система

### Цвета
- **Основной:** `#1a472a` — тропический зелёный
- **Акцент:** `#40916c` — мягкий зелёный
- **Океан:** `#219ebc` — бирюзовый
- **Песок:** `#d4a373` — тёплый бежевый
- **Коралл:** `#e76f51` — акцентный

### Шрифт
System font stack для нативного вида на iOS/Android

### Анимации
- Плавные переходы между экранами
- Пульсирующие индикаторы
- Плавающие декоративные элементы

## 🔧 Кастомизация

### Изменение API для сигналов
Отредактируй `src/components/BotScreen.jsx`:
```javascript
// Найди функцию generateSignal и замени на свой API вызов
const response = await fetch('твой-api-endpoint', {
  method: 'POST',
  body: JSON.stringify({ pair, timeframe })
})
```

### Добавление новых торговых пар
Добавь в массив `PAIRS` в `BotScreen.jsx`:
```javascript
{ id: 'xauusd', name: 'XAU/USD', icon: '🥇' }
```

## 📝 Примечания

- Сигналы генерируются случайно для демо
- Подключи реальный API (TradingView, Binance и т.д.)
- Для продакшена добавь бэкенд для безопасности API ключей
- Выходные дни автоматически блокируют сигналы

## 🤝 Поддержка

При возникновении вопросов:
- Telegram: [сообщество](https://t.me/kodacommunity)
- Документация: [Koda Docs](https://docs.kodacode.ru)

---

Сделано с 💚 для спокойного трейдинга 🌺
