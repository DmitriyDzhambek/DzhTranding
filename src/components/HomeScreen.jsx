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

  // Загрузка TradingView Advanced Chart (интерактивный с навигацией)
  useEffect(() => {
    const container = document.getElementById('home-tradingview-widget')
    if (!container) return
    
    // Очищаем старый виджет если есть
    container.innerHTML = ''
    
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'
    
    const chartDiv = document.createElement('div')
    chartDiv.className = 'tradingview-chart-container'
    chartDiv.style.height = '100%'
    chartDiv.style.width = '100%'
    widgetDiv.appendChild(chartDiv)
    
    // Панель навигации как в TradingView
    const navBar = document.createElement('div')
    navBar.className = 'tv-custom-navbar'
    navBar.innerHTML = `
      <div class="tv-pair-selector">
        <span class="tv-pair-label">Пара:</span>
        <select class="tv-pair-select" id="tv-pair-select">
          <option value="OANDA:EURUSD" selected>EUR/USD</option>
          <option value="OANDA:GBPUSD">GBP/USD</option>
          <option value="OANDA:USDJPY">USD/JPY</option>
          <option value="OANDA:AUDUSD">AUD/USD</option>
          <option value="OANDA:USDCAD">USD/CAD</option>
          <option value="BINANCE:BTCUSDT">BTC/USDT</option>
          <option value="BINANCE:ETHUSDT">ETH/USDT</option>
        </select>
      </div>
      <div class="tv-timeframe-selector">
        <span class="tv-pair-label">Таймфрейм:</span>
        <select class="tv-pair-select" id="tv-timeframe-select">
          <option value="1">1 мин</option>
          <option value="5">5 мин</option>
          <option value="15">15 мин</option>
          <option value="60" selected>1 час</option>
          <option value="240">4 часа</option>
          <option value="D">1 день</option>
          <option value="W">1 неделя</option>
        </select>
      </div>
    `
    widgetDiv.insertBefore(navBar, chartDiv)
    
    container.appendChild(widgetDiv)
    
    // Функция загрузки графика
    const loadChart = () => {
      const symbol = document.getElementById('tv-pair-select')?.value || 'OANDA:EURUSD'
      const interval = document.getElementById('tv-timeframe-select')?.value || '60'
      
      const widgetConfig = {
        autosize: true,
        symbol: symbol,
        interval: interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'ru',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        gridColor: 'rgba(255, 255, 255, 0.03)',
        toolbar_bg: '#0a0e17',
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        container: 'tradingview-chart-' + symbol.replace(/[:]/g, '_') + '-' + interval,
        stock_workflow: false,
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        hide_volume: false,
        support_host: 'https://www.tradingview.com'
      }
      
      if (typeof TradingView !== 'undefined') {
        new TradingView.widget(widgetConfig)
      } else {
        // Если TradingView ещё не загружен, загружаем через iframe fallback
        loadIframeChart(symbol, interval)
      }
    }
    
    // Fallback: iframe график
    const loadIframeChart = (symbol, interval) => {
      const chartDiv = container.querySelector('.tradingview-chart-container')
      if (!chartDiv) return
      
      const timeframeMap = {
        '1': '1',
        '5': '5',
        '15': '15',
        '60': '60',
        '240': '240',
        'D': 'D',
        'W': 'W'
      }
      
      const encodedSymbol = encodeURIComponent(symbol)
      const encodedInterval = encodeURIComponent(timeframeMap[interval] || '60')
      
      chartDiv.innerHTML = `
        <iframe 
          src="https://s.tradingview.com/embed-widget/advanced-chart/?symbol=${encodedSymbol}&interval=${encodedInterval}&hidesidetoolbar=0&saveimage=1&popupbutton=0&studies=%5B%22RSI%40tv-basicstudies%22%2C%22MASimple%40tv-basicstudies%22%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=true&popup_width=1000&popup_height=650&locale=ru&backgroundColor=rgba%280%2C0%2C0%2C0.9%29&gridColor=rgba%28255%2C255%2C255%2C0.03%29&toolbar_bg=%230a0e17&hide_top_toolbar=false&hide_legend=false&allow_symbol_change=true&hide_volume=false"
          style="width: 100%; height: 100%; border: none;"
          frameborder="0"
          allowFullScreen
          loading="eager"
          title="TradingView ${symbol} Chart"
        ></iframe>
      `
    }
    
    // Загружаем TradingView библиотеку
    if (typeof TradingView === 'undefined') {
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = loadChart
      script.onerror = () => {
        // Если библиотека не загрузилась, используем iframe
        const symbol = document.getElementById('tv-pair-select')?.value || 'OANDA:EURUSD'
        const interval = document.getElementById('tv-timeframe-select')?.value || '60'
        loadIframeChart(symbol, interval)
      }
      document.head.appendChild(script)
    } else {
      loadChart()
    }
    
    // Обработчики переключения
    setTimeout(() => {
      const pairSelect = document.getElementById('tv-pair-select')
      const timeframeSelect = document.getElementById('tv-timeframe-select')
      
      pairSelect?.addEventListener('change', () => {
        const symbol = pairSelect.value
        const interval = timeframeSelect?.value || '60'
        loadIframeChart(symbol, interval)
      })
      
      timeframeSelect?.addEventListener('change', () => {
        const symbol = pairSelect?.value || 'OANDA:EURUSD'
        const interval = timeframeSelect.value
        loadIframeChart(symbol, interval)
      })
    }, 100)
    
    // Начальная загрузка
    setTimeout(() => {
      const symbol = document.getElementById('tv-pair-select')?.value || 'OANDA:EURUSD'
      const interval = document.getElementById('tv-timeframe-select')?.value || '60'
      loadIframeChart(symbol, interval)
    }, 500)
    
    return () => {
      // Очистка при размонтировании
      const container = document.getElementById('home-tradingview-widget')
      if (container) container.innerHTML = ''
    }
  }, [])

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
