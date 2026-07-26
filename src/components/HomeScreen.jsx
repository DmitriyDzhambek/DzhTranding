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

  // --- ЛОГИКА ВОЛАТИЛЬНОСТИ ---
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

  const volatility = propPriceHistory && propPriceHistory.length >= 15 ? calculateATR(propPriceHistory, 14) : null
  
  const getVolatilityInfo = (atr) => {
    if (!atr) return { level: 'low', text: 'Нет данных', emoji: '❓', advice: 'Ждите данных' }
    const atrPercent = (atr / currentPriceValue) * 100
    
    if (atrPercent < 0.02) {
      return { 
        level: 'low', 
        text: 'Низкая (Сессия)', 
        emoji: '❄️', 
        color: '#38bdf8', // Blue
        advice: 'Рынок спит. Входить нельзя. Ждите Лондона/Нью-Йорка.' 
      }
    } else if (atrPercent < 0.04) {
      return { 
        level: 'medium', 
        text: 'Средняя (Активна)', 
        emoji: '☁️', 
        color: '#fbbf24', // Yellow
        advice: 'Нормальная торговая активность. Следите за трендом.' 
      }
    } else {
      return { 
        level: 'high', 
        text: 'Высокая (Торгуем)', 
        emoji: '🔥', 
        color: '#f87171', // Red
        advice: 'Сильное движение! Идеально для скальпинга и тренда.' 
      }
    }
  }

  const volInfo = getVolatilityInfo(volatility)

  // Статусы
  const isMarketOpen = isWeekday
  const marketStatusText = isMarketOpen ? '🟢 Открыт' : '🔴 Закрыт'
  
  // "Температура" рынка
  const getMarketMood = () => {
    if (!isMarketOpen) return '❄️ Рынок закрыт'
    if (marketState === 'bull') return '📈 Бычий (Рост)'
    if (marketState === 'bear') return '📉 Медвежий (Падение)'
    return '🌊 Спокойный (Флэт)'
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

  return (
    <div className="home-screen">
      {/* Шапка */}
      <header className="cockpit-header">
        <div className="header-top">
          <div>
            <h1>🌺 Секреты Большого Счастья</h1>
            <div className="header-subtitle">Профессиональный навигатор</div>
          </div>
          <div className={`status-badge ${isMarketOpen ? 'open' : 'closed'}`}>
            {marketStatusText}
          </div>
        </div>
        <div className="market-mood">
          <span className="mood-icon">{marketState === 'bull' ? '📈' : marketState === 'bear' ? '📉' : '🌊'}</span>
          <span className="mood-text">{marketMoodText}</span>
        </div>
      </header>

      {/* Блок Волатильности (Умный анализ) */}
      <section className="volatility-card">
        <div className="vol-header">
          <span className="vol-label">📊 Активность рынка</span>
          <span className={`vol-level ${volInfo.level}`}>{volInfo.text}</span>
        </div>
        
        <div className="vol-content">
          <div className="vol-icon-wrap">
            {volInfo.emoji}
          </div>
          <div className="vol-advice">
            <div className="vol-advice-label">Рекомендация:</div>
            <div className="vol-advice-text" style={{ color: volInfo.color }}>
              {volInfo.advice}
            </div>
          </div>
        </div>
      </section>

      {/* Приборная панель */}
      <section className="dashboard-section">
        <h2>📊 Приборная панель</h2>
        <div className="indicators-grid">
          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">RSI (14)</span>
              <span className="indicator-value">{rsi ? rsi.toFixed(1) : '—'}</span>
            </div>
            <div className="indicator-status">
              {rsi < 30 ? '🟢 Перепродан' : rsi > 70 ? '🔴 Перекуплен' : '⚪ Нейтрально'}
            </div>
          </div>

          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">MACD</span>
              <span className="indicator-value">{macd ? macd.histogram.toFixed(5) : '—'}</span>
            </div>
            <div className="indicator-status">
              {macd && macd.histogram > 0 ? '📈 Рост' : macd && macd.histogram < 0 ? '📉 Падение' : '➖ Нейтрально'}
            </div>
          </div>

          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">Тренд</span>
              <span className="indicator-value">{trend === 'bullish' ? '🟢 Вверх' : trend === 'bearish' ? '🔴 Вниз' : '⚪ Флэт'}</span>
            </div>
            <div className="indicator-status">
              SMA 200
            </div>
          </div>

          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">Сила</span>
              <span className="indicator-value">{marketConfidence.score}%</span>
            </div>
            <div className="indicator-status">
              {marketConfidence.level === 'high' ? '🟢 Сильный' : marketConfidence.level === 'medium' ? '🟡 Средний' : '🔴 Нет'}
            </div>
          </div>
        </div>
      </section>

      {/* Вердикт Штурмана */}
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

      {/* Навигация (График) */}
      <section className="chart-section">
        <h2>📉 Навигация</h2>
        <div className="chart-container" id="home-tradingview-widget"></div>
      </section>

      {/* Умный сигнал (Сразу под графиком) */}
      <SmartSignalSection volInfo={volInfo} trend={trend} marketConfidence={marketConfidence} isMarketOpen={isMarketOpen} />
    </div>
  )
}

// Компонент Умного сигнала
function SmartSignalSection({ volInfo, trend, marketConfidence, isMarketOpen }) {
  const getSignal = () => {
    if (!isMarketOpen) return { icon: '🛑', text: 'Рынок закрыт', sub: 'Ожидайте открытия', color: '#f87171' }
    
    if (volInfo.level === 'low') return { icon: '💤', text: 'Нет движения', sub: 'Ждите волатильности', color: '#38bdf8' }
    
    if (trend === 'bullish' && volInfo.level === 'high') return { icon: '🚀', text: 'Тренд ВВЕРХ', sub: 'Ищем покупки', color: '#4ade80' }
    if (trend === 'bearish' && volInfo.level === 'high') return { icon: '🔻', text: 'Тренд ВНИЗ', sub: 'Ищем продажи', color: '#4ade80' }
    
    if (marketConfidence.score > 70) return { icon: '🎯', text: 'Сильный сигнал', sub: 'Следуйте системе', color: '#fbbf24' }
    
    return { icon: '⚖️', text: 'Флэт', sub: 'Смотрим уровни', color: '#94a3b8' }
  }

  const signal = getSignal()

  return (
    <section className="smart-signal-section">
      <div className={`smart-signal-card ${signal.color === '#4ade80' ? 'active' : ''}`}>
        <div className="signal-icon" style={{ color: signal.color }}>{signal.icon}</div>
        <div className="signal-content">
          <div className="signal-title" style={{ color: signal.color }}>{signal.text}</div>
          <div className="signal-sub">{signal.sub}</div>
        </div>
        <div className="signal-arrow">➜</div>
      </div>
    </section>
  )
}

export default HomeScreen
