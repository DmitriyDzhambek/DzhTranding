import { useState, useEffect, useRef } from 'react'
import { calculateRSI, calculateMACD, determineTrend, calculateMarketConfidence } from '../services/AIEngine'
import './HomeScreen.css'

function HomeScreen({ isWeekday, marketState, price, change, isUp, priceHistory: propPriceHistory, currentPrice: propCurrentPrice }) {
  const [chartLoaded, setChartLoaded] = useState(false)
  const [volatilityLevel, setVolatilityLevel] = useState(null)
  const [prevVolatility, setPrevVolatility] = useState(null)
  const [showVolAlert, setShowVolAlert] = useState(false)
  
  // Получаем актуальные данные
  const currentPriceValue = propCurrentPrice || price || '1.14130'
  
  // Расчёт индикаторов (если есть данные)
  const rsi = propPriceHistory && propPriceHistory.length >= 15 ? calculateRSI(propPriceHistory, 14) : null
  const macd = propPriceHistory && propPriceHistory.length >= 27 ? calculateMACD(propPriceHistory) : null
  const trend = propPriceHistory && propPriceHistory.length >= 21 ? determineTrend(propPriceHistory) : 'neutral'
  const marketConfidence = propPriceHistory && propPriceHistory.length >= 20 ? calculateMarketConfidence(propPriceHistory) : { score: 0, level: 'low' }

  // Расчёт волатильности (ATR)
  const volatility = propPriceHistory && propPriceHistory.length >= 15 ? calculateATR(propPriceHistory, 14) : null
  
  function calculateATR(data, period = 14) {
    if (data.length < period + 1) return null
    const ranges = []
    for (let i = 1; i <= data.length; i++) {
      ranges.push(Math.abs(data[data.length - i] - data[data.length - i - 1]))
    }
    if (ranges.length < period) return null
    const atr = ranges.slice(0, period).reduce((a, b) => a + b, 0) / period
    return parseFloat(atr.toFixed(6))
  }

  // Определение уровня волатильности
  const getVolatilityInfo = (atr) => {
    if (!atr) return { level: 'unknown', text: 'Нет данных', emoji: '❓', color: '#a0a0a0' }
    const price = parseFloat(currentPriceValue)
    const atrPercent = (atr / price) * 100
    
    if (atrPercent < 0.02) {
      return { level: 'low', text: 'Низкая — рынок спит', emoji: '❄️', color: '#34d399', action: 'wait' }
    } else if (atrPercent < 0.04) {
      return { level: 'medium', text: 'Средняя — норма', emoji: '☁️', color: '#fbbf24', action: 'normal' }
    } else {
      return { level: 'high', text: 'Высокая — торгуем!', emoji: '🔥', color: '#f87171', action: 'active' }
    }
  }

  const volInfo = getVolatilityInfo(volatility)

  // Отслеживание изменений волатильности
  useEffect(() => {
    if (prevVolatility === null) {
      setPrevVolatility(volatilityLevel)
      return
    }
    
    // Если волатильность резко изменилась
    if (prevVolatility !== volatilityLevel) {
      setShowVolAlert(true)
      setTimeout(() => setShowVolAlert(false), 3000)
      
      // Уведомление в Telegram (если доступно)
      if (window.Telegram?.WebApp?.HapticFeedback) {
        if (volatilityLevel === 'high') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
        } else if (volatilityLevel === 'low') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning')
        }
      }
    }
    
    setPrevVolatility(volatilityLevel)
  }, [volatilityLevel])

  // Статусы
  const isMarketOpen = isWeekday
  const marketStatusText = isMarketOpen ? '🟢 Рынок открыт' : '🔴 Рынок закрыт'
  
  // "Температура" рынка (Спокойный рынок)
  const getMarketMood = () => {
    if (!isMarketOpen) return '❄️ Рынок закрыт'
    if (marketState === 'bull') return '🔥 Горячий (Рост)'
    if (marketState === 'bear') return '❄️ Холодный (Падение)'
    return '☁️ Спокойный (Флэт)'
  }
  const marketMoodText = getMarketMood()

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

  // Обновление уровня волатильности
  useEffect(() => {
    const interval = setInterval(() => {
      if (volatility) {
        const info = getVolatilityInfo(volatility)
        setVolatilityLevel(info.level)
      }
    }, 60000) // Обновление каждую минуту
    
    return () => clearInterval(interval)
  }, [volatility])

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

      {/* Уведомление о волатильности */}
      {showVolAlert && (
        <div className={`vol-alert ${volInfo.level}`}>
          <div className="vol-alert-icon">{volInfo.emoji}</div>
          <div className="vol-alert-text">
            <strong>{volInfo.level === 'high' ? '🔥 Волатильность выросла!' : volInfo.level === 'low' ? '❄️ Рынок остывает' : '⚡ Изменение активности'}</strong>
            <p>{volInfo.text}</p>
          </div>
        </div>
      )}

      {/* Волатильность */}
      <section className="volatility-section">
        <div className="volatility-header">
          <h2>📊 Волатильность</h2>
          <span className={`volatility-badge ${volInfo.level}`}>
            {volInfo.emoji} {volInfo.text}
          </span>
        </div>
        
        <div className="volatility-meter">
          <div className="meter-label">
            <span>Низкая</span>
            <span>Средняя</span>
            <span>Высокая</span>
          </div>
          <div className="meter-track">
            <div 
              className="meter-fill" 
              style={{ 
                width: volatility ? `${Math.min(100, (parseFloat(currentPriceValue) / volatility) * 0.5)}%` : '50%',
                backgroundColor: volInfo.color
              }}
            ></div>
          </div>
          <div className="volatility-value">
            <span>ATR: {volatility ? volatility.toFixed(5) : '—'}</span>
            <span>Ожидаемое движение: {volatility ? Math.round(volatility * 10000 * 2) : '—'} пипсов/час</span>
          </div>
        </div>
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
            
            if (volInfo.level === 'high' && marketConfidence.score > 60) {
              text = '🔥 Высокая волатильность + сильный сигнал. Отличное время для входа!'
              icon = '🎯'
            } else if (volInfo.level === 'low') {
              text = '❄️ Рынок спит. Нет смысла входить — нет движения.'
              icon = '💤'
            } else if (marketConfidence.score > 70) {
              text = 'Индикаторы показывают сильный сигнал. Следуйте системе.'
              icon = '✅'
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

      {/* Улучшенный чек-лист */}
      <PreFlightChecklist />
    </div>
  )
}

// === Компонент Предполётной проверки ===
function PreFlightChecklist() {
  const checklistKey = new Date().toISOString().split('T')[0] // Ключ на сегодня
  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem(`checklist_${checklistKey}`)
    return saved ? JSON.parse(saved) : {
      trend: false,
      level: false,
      news: false,
      volatility: false,
      rsi: false,
      patience: false
    }
  })
  const [isComplete, setIsComplete] = useState(false)

  // Сохранение при изменении
  useEffect(() => {
    localStorage.setItem(`checklist_${checklistKey}`, JSON.stringify(checklist))
    setIsComplete(Object.values(checklist).every(Boolean))
  }, [checklist])

  const handleChange = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Статусы для каждого пункта
  const getCheckStatus = (key) => {
    switch (key) {
      case 'trend': return '✅ Тренд совпадает с системой'
      case 'level': return '📍 Цена у уровня поддержки/сопротивления'
      case 'news': return '📅 Нет важных новостей (или прошло 30 мин)'
      case 'volatility': return '📊 Волатильность нормальная (не слишком низкая)'
      case 'rsi': return '🌡️ RSI не в экстремуме (30-70)'
      case 'patience': return '⏳ Я жду закрытия свечи перед входом'
      default: return ''
    }
  }

  return (
    <section className="checklist-section">
      <h2>✅ Предполётная проверка</h2>
      
      {/* Индикатор готовности */}
      <div className={`readiness-bar ${isComplete ? 'ready' : 'not-ready'}`}>
        <div className="readiness-track">
          <div className="readiness-fill" style={{ width: `${(Object.values(checklist).filter(Boolean).length / Object.keys(checklist).length) * 100}%` }}></div>
        </div>
        <div className="readiness-text">
          <span className="readiness-count">{Object.values(checklist).filter(Boolean).length}/{Object.keys(checklist).length}</span>
          <span className="readiness-label">
            {isComplete ? '🚀 Готов к взлёту!' : '⏳ Проверь все пункты'}
          </span>
        </div>
      </div>

      <div className="checklist-grid">
        {Object.keys(checklist).map((key) => (
          <label key={key} className={`check-item ${checklist[key] ? 'checked' : ''}`}>
            <input 
              type="checkbox" 
              checked={checklist[key]} 
              onChange={() => handleChange(key)} 
            />
            <span>{getCheckStatus(key)}</span>
          </label>
        ))}
      </div>

      {isComplete && (
        <div className="checklist-success">
          <div className="success-icon">🎯</div>
          <p>Отлично! Все условия выполнены. Можно входить по системе!</p>
        </div>
      )}
    </section>
  )
}

export default HomeScreen
