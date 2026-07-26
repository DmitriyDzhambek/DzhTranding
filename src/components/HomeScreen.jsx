import { useState, useEffect, useRef } from 'react'
import { calculateRSI, calculateMACD, determineTrend, calculateMarketConfidence } from '../services/AIEngine'
import './HomeScreen.css'

function HomeScreen({ isWeekday, marketState, price, change, isUp, priceHistory: propPriceHistory, currentPrice: propCurrentPrice }) {
  const [chartLoaded, setChartLoaded] = useState(false)
  
  // Получаем актуальные данные
  const currentPriceValue = propCurrentPrice || price || '1.14130'
  
  // Расчёт индикаторов (если есть данные)
  const rsi = propPriceHistory && propPriceHistory.length >= 15 ? calculateRSI(propPriceHistory, 14) : null
  const macd = propPriceHistory && propPriceHistory.length >= 27 ? calculateMACD(propPriceHistory) : null
  const trend = propPriceHistory && propPriceHistory.length >= 21 ? determineTrend(propPriceHistory) : 'neutral'
  const marketConfidence = propPriceHistory && propPriceHistory.length >= 20 ? calculateMarketConfidence(propPriceHistory) : { score: 0, level: 'low' }

  // Статусы
  const isMarketOpen = isWeekday // isWeekday здесь означает, что рынок открыт (проверка по логике App.jsx)
  const marketStatusText = isMarketOpen ? '🟢 Рынок открыт' : '🔴 Рынок закрыт'
  
  // "Температура" рынка (Спокойный рынок)
  const getMarketMood = () => {
    if (!isMarketOpen) return '❄️ Рынок закрыт'
    if (marketState === 'bull') return '🔥 Горячий (Рост)'
    if (marketState === 'bear') return '❄️ Холодный (Падение)'
    return '☁️ Спокойный (Флэт)'
  }
  const marketMoodText = getMarketMood()

  // Цель
  const goalAmount = 1000
  const currentGoal = parseFloat(localStorage.getItem('traderGoalProgress') || '0')
  const progressPercent = Math.min(100, Math.round((currentGoal / goalAmount) * 100))

  // Загрузка TradingView
  useEffect(() => {
    if (chartLoaded) return
    const container = document.getElementById('home-tradingview-widget')
    if (container && !container.querySelector('script')) {
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
      script.async = true
      script.innerHTML = JSON.stringify({
        symbol: 'OANDA:EURUSD',
        width: '100%',
        height: '100%',
        locale: 'ru',
        dateRange: '1D',
        colorTheme: 'dark',
        isTransparent: true,
        autosize: true,
        largeChartUrl: ''
      })
      container.appendChild(script)
      setChartLoaded(true)
    }
  }, [chartLoaded])

  return (
    <div className="home-screen">
      {/* Шапка: Статус и Температура */}
      <header className="cockpit-header">
        <div className="header-top">
          <h1>🌺 Секреты Большого Счастья</h1>
          <div className={`status-badge ${isMarketOpen ? 'open' : 'closed'}`}>
            {marketStatusText}
          </div>
        </div>
        <div className="market-mood">
          <span className="mood-icon">{marketState === 'bull' ? '📈' : marketState === 'bear' ? '📉' : '🌊'}</span>
          <span className="mood-text">{marketMoodText}</span>
        </div>
      </header>

      {/* Цель: Прогресс */}
      <section className="goal-section">
        <div className="goal-header">
          <span>🎯 Миссия: ${goalAmount}</span>
          <span>${currentGoal.toFixed(2)}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="progress-label">{progressPercent}% до цели</div>
      </section>

      {/* Приборная панель: Индикаторы */}
      <section className="dashboard-section">
        <h2>📊 Приборная панель</h2>
        <div className="indicators-grid">
          
          {/* RSI */}
          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">RSI (14)</span>
              <span className="indicator-value">{rsi ? rsi.toFixed(1) : '—'}</span>
            </div>
            <div className="indicator-status">
              {rsi < 30 ? '🟢 Перепродан' : rsi > 70 ? '🔴 Перекуплен' : '⚪ Нейтрально'}
            </div>
          </div>

          {/* MACD */}
          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">MACD</span>
              <span className="indicator-value">{macd ? macd.histogram.toFixed(5) : '—'}</span>
            </div>
            <div className="indicator-status">
              {macd && macd.histogram > 0 ? '📈 Рост' : macd && macd.histogram < 0 ? '📉 Падение' : '➖ Нейтрально'}
            </div>
          </div>

          {/* Trend */}
          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">Тренд</span>
              <span className="indicator-value">{trend === 'bullish' ? 'Вверх' : trend === 'bearish' ? 'Вниз' : 'Флэт'}</span>
            </div>
            <div className="indicator-status">
              SMA 200 &bull; {trend === 'bullish' ? 'Бычий' : trend === 'bearish' ? 'Медвежий' : 'Спокойный'}
            </div>
          </div>

          {/* Confidence */}
          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">Сила</span>
              <span className="indicator-value">{marketConfidence.score}%</span>
            </div>
            <div className="indicator-status">
              {marketConfidence.level === 'high' ? '🟢 Сигналы сильные' : marketConfidence.level === 'medium' ? '🟡 Есть риск' : '🔴 Нет сигнала'}
            </div>
          </div>

        </div>
      </section>

      {/* Вердикт Штурмана (AI) */}
      <section className="verdict-section">
        <h2>🧭 Вердикт Штурмана</h2>
        <div className="verdict-card">
          {(() => {
            if (!isMarketOpen) return '🛑 Рынок закрыт. Ожидайте открытия.'
            
            let text = ''
            let icon = '⏸️'
            
            if (marketState === 'bull' && rsi < 30) {
              text = 'Бычий тренд, но цена перепродана. Хорошая зона для входа в покупку.'
              icon = '📈'
            } else if (marketState === 'bear' && rsi > 70) {
              text = 'Медвежий тренд, но цена перекуплена. Ждем отскока для продажи.'
              icon = '📉'
            } else if (marketConfidence.score > 70) {
              text = 'Индикаторы показывают сильный сигнал. Следуйте системе.'
              icon = '🎯'
            } else {
              text = 'Рынок в зоне турбулентности. Индикаторы противоречивы. Ждите ясности.'
              icon = '🌊'
            }

            return (
              <>
                <div className="verdict-icon">{icon}</div>
                <p>{text}</p>
              </>
            )
          })()}
        </div>
      </section>

      {/* График */}
      <section className="chart-section">
        <h2>📉 Навигация</h2>
        <div className="chart-container" id="home-tradingview-widget"></div>
      </section>

      {/* Чек-лист */}
      <section className="checklist-section">
        <h2>✅ Предполётная проверка</h2>
        <div className="checklist-grid">
          <label className="check-item">
            <input type="checkbox" />
            <span>Тренд совпадает?</span>
          </label>
          <label className="check-item">
            <input type="checkbox" />
            <span>Цена у уровня?</span>
          </label>
          <label className="check-item">
            <input type="checkbox" />
            <span>Нет новостей?</span>
          </label>
        </div>
      </section>
    </div>
  )
}

export default HomeScreen
