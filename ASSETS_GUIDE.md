# 🌺 Секреты Большого Счастья — Telegram Mini App

## 🎨 Фоны рынка

### SVG изображения в `assets/`

| Файл | Состояние | Цвет | Описание |
|---|---|---|---|
| `flat-market.svg` | 🌊 Спокойный | `#0A1C2E` | Лагуна с волнами и пузырьками |
| `bull-market.svg` | 📈 Бычий | `#1A2535` | Тёплый янтарь с восходящими линиями |
| `bear-market.svg` | 📉 Медвежий | `#090F1C` | Ледяной с кристаллами и звёздами |

### Как работают фоны:

1. **Автоматическое переключение** — фон меняется плавно (2.5 сек) при смене фазы рынка
2. **Адаптивность** — SVG масштабируется на любом экране
3. **Оптимизация** — контент поверх фона с overlay для читаемости
4. **Telegram** — работает внутри WebView Telegram

## ✨ Шрифты и читаемость

### Оптимизации:

```css
/* Антиалиасинг для чёткости */
-webkit-font-smoothing: antialiased;
text-rendering: optimizeLegibility;

/* Оптимальные размеры */
h1: 28px (заголовки)
h2: 22px (карточки)
h3: 18px (секции)
p: 15px (основной текст)
code: 14px monospace (числа)

/* Межстрочные интервалы */
Заголовки: 1.15-1.25
Текст: 1.6
Мелкий: 1.35
```

### Адаптация под Telegram:

- ✅ Предотвращение зумов на iOS
- ✅ Поддержка safe-area (iPhone notch)
- ✅ Retina дисплеи
- ✅ Тёмная тема Telegram
- ✅ Мелкие экраны (320px+)

## 📁 Структура

```
├── assets/              # Исходные SVG
│   ├── flat-market.svg
│   ├── bull-market.svg
│   └── bear-market.svg
├── public/assets/       # Для веб-доступа
│   ├── flat-market.svg
│   ├── bull-market.svg
│   └── bear-market.svg
└── src/
    ├── components/
    │   └── MarketBackground.jsx  # Компонент фона
    └── services/
        ├── AIEngine.js           # AI ядро
        └── VoiceAI.js            # Голосовой AI
```

## 🚀 Использование

```jsx
import MarketBackground from './components/MarketBackground'

function App() {
  const marketState = 'bull' // 'flat' | 'bull' | 'bear'
  
  return (
    <div>
      <MarketBackground marketState={marketState} />
      {/* Ваш контент */}
    </div>
  )
}
```

## 🎯 Преимущества SVG фонов

1. **Масштабирование** — без потери качества на любом экране
2. **Размер** — ~5-10KB против ~200KB для JPG/PNG
3. **Анимации** — можно анимировать через CSS/SVG filters
4. **Темизация** — легко менять цвета через CSS variables
5. **Telegram** — идеально для Mini App с ограниченным трафиком
