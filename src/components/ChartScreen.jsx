import { useState, useEffect, useRef } from 'react'
import './ChartScreen.css'

/**
 * ChartScreen — полноценный график с навигацией как в TradingView
 * Переключение пар, таймфреймов, индикаторов
 */
const PAIRS = [
  { symbol: 'OANDA:EURUSD', name: 'EUR/USD', type: 'forex' },
  { symbol: 'OANDA:GBPUSD', name: 'GBP/USD', type: 'forex' },
  { symbol: 'OANDA:USDJPY', name: 'USD/JPY', type: 'forex' },
  { symbol: 'OANDA:AUDUSD', name: 'AUD/USD', type: 'forex' },
  { symbol: 'OANDA:USDCAD', name: 'USD/CAD', type: 'forex' },
  { symbol: 'OANDA:XAUUSD', name: 'XAU/USD', type: 'forex' },
  { symbol: 'BINANCE:BTCUSDT', name: 'BTC/USDT', type: 'crypto' },
  { symbol: 'BINANCE:ETHUSDT', name: 'ETH/USDT', type: 'crypto' },
]

const TIMEFRAMES = [
  { value: '1', label: '1м' },
  { value: '3', label: '3м' },
  { value: '5', label: '5м' },
  { value: '15', label: '15м' },
  { value: '30', label: '30м' },
  { value: '60', label: '1ч' },
  { value: '240', label: '4ч' },
  { value: 'D', label: '1д' },
  { value: 'W', label: '1н' },
]

const INDICATORS = [
  { id: 'rsi', name: 'RSI', enabled: false },
  { id: 'ma', name: 'MA (SMA)', enabled: false },
  { id: 'ema', name: 'EMA', enabled: false },
  { id: 'bb', name: 'Bollinger Bands', enabled: false },
  { id: 'macd', name: 'MACD', enabled: false },
]

function ChartScreen() {
  const [selectedPair, setSelectedPair] = useState(PAIRS[0])
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[5])
  const [showPairMenu, setShowPairMenu] = useState(false)
  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false)
  const [indicators, setIndicators] = useState(INDICATORS)
  const [chartKey, setChartKey] = useState(0)
  const [chartLoaded, setChartLoaded] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(null)
  const [priceChange, setPriceChange] = useState(0)
  const wsRef = useRef(null)
  const menuRef = useRef(null)

  // Обновление цены через WebSocket
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    
    try {
      const binanceSymbol = selectedPair.symbol.includes('BINANCE') 
        ? selectedPair.symbol.replace('BINANCE:', '')
        : 'EURUSDT' // Для Forex используем EURUSDT как ближайший
      
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@ticker`)
      
      ws.onopen = () => {
        console.log(`🔌 WebSocket для ${selectedPair.name} подключён`)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const currentPriceVal = parseFloat(data.c)
          const changeVal = parseFloat(data.P)
          
          if (!isNaN(currentPriceVal)) {
            setCurrentPrice(currentPriceVal.toFixed(5))
            setPriceChange(changeVal)
          }
        } catch (err) {
          console.error('Ошибка парсинга цены:', err)
        }
      }
      
      ws.onerror = () => console.warn(`⚠️ WebSocket ошибка для ${selectedPair.name}`)
      ws.onclose = () => console.log(`WebSocket для ${selectedPair.name} отключён`)
      
      wsRef.current = ws
    } catch (err) {
      console.error('Ошибка создания WebSocket:', err)
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [selectedPair.symbol])

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowPairMenu(false)
        setShowTimeframeMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Переключение индикатора
  const toggleIndicator = (id) => {
    setIndicators(prev => prev.map(ind => 
      ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
    ))
  }

  // Формирование URL графика с индикаторами
  const getChartStudies = () => {
    const studies = []
    const enabled = indicators.filter(i => i.enabled)
    
    if (enabled.some(i => i.id === 'rsi')) studies.push('RSI@tv-basicstudies')
    if (enabled.some(i => i.id === 'ma')) studies.push('MASimple@tv-basicstudies')
    if (enabled.some(i => i.id === 'ema')) studies.push('EMA@tv-basicstudies')
    if (enabled.some(i => i.id === 'bb')) studies.push('BB@tv-basicstudies')
    if (enabled.some(i => i.id === 'macd')) studies.push('MACD@tv-basicstudies')
    
    return studies.length > 0 ? JSON.stringify(studies) : '[]'
  }

  // Формирование iframe URL
  const getIframeUrl = () => {
    const timeframeMap = {
      '1': '1', '3': '3', '5': '5', '15': '15', '30': '30',
      '60': '60', '240': '240', 'D': 'D', 'W': 'W'
    }
    
    const encodedSymbol = encodeURIComponent(selectedPair.symbol)
    const encodedInterval = encodeURIComponent(timeframeMap[selectedTimeframe.value] || '60')
    const encodedStudies = encodeURIComponent(getChartStudies())
    
    return `https://s.tradingview.com/embed-widget/advanced-chart/?symbol=${encodedSymbol}&interval=${encodedInterval}&hidesidetoolbar=0&saveimage=1&popupbutton=0&studies=${encodedStudies}&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=true&locale=ru&backgroundColor=rgba%280%2C0%2C0%2C0.9%29&gridColor=rgba%28255%2C255%2C255%2C0.03%29&toolbar_bg=%230a0e17&hide_top_toolbar=false&hide_legend=false&allow_symbol_change=true&hide_volume=false`
  }

  // Обработка изменения размера
  const [containerHeight, setContainerHeight] = useState(500)
  
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight - 200 // Учитываем навигацию и заголовки
      setContainerHeight(Math.max(300, Math.min(600, vh)))
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Форматирование изменения цены
  const formatChange = (change) => {
    const isPositive = change >= 0
    return {
      text: `${isPositive ? '+' : ''}${change.toFixed(2)}%`,
      color: isPositive ? '#34d399' : '#f87171',
      icon: isPositive ? '▲' : '▼'
    }
  }

  const changeFormat = currentPrice ? formatChange(priceChange) : null

  return (
    <div className="chart-screen">
      {/* Верхняя панель с информацией о паре */}
      <div className="chart-top-bar">
        <div className="chart-pair-info">
          <div className="pair-selector-wrapper" ref={menuRef}>
            <button 
              className="pair-selector-btn"
              onClick={() => {
                setShowPairMenu(!showPairMenu)
                setShowTimeframeMenu(false)
              }}
            >
              <span className="pair-icon">{selectedPair.type === 'forex' ? '💱' : '🪙'}</span>
              <span className="pair-name">{selectedPair.name}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showPairMenu && (
              <div className="pair-menu">
                <div className="menu-section">
                  <div className="menu-title">Forex</div>
                  {PAIRS.filter(p => p.type === 'forex').map(pair => (
                    <button
                      key={pair.symbol}
                      className={`menu-item ${selectedPair.symbol === pair.symbol ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedPair(pair)
                        setShowPairMenu(false)
                        setChartKey(k => k + 1)
                      }}
                    >
                      {pair.name}
                    </button>
                  ))}
                </div>
                <div className="menu-divider"></div>
                <div className="menu-section">
                  <div className="menu-title">Crypto</div>
                  {PAIRS.filter(p => p.type === 'crypto').map(pair => (
                    <button
                      key={pair.symbol}
                      className={`menu-item ${selectedPair.symbol === pair.symbol ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedPair(pair)
                        setShowPairMenu(false)
                        setChartKey(k => k + 1)
                      }}
                    >
                      {pair.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="price-display">
            <span className="current-price-value">
              {currentPrice || '---.--'}
            </span>
            {changeFormat && (
              <span className="price-change-badge" style={{ color: changeFormat.color }}>
                {changeFormat.icon} {changeFormat.text}
              </span>
            )}
          </div>
        </div>
        
        {/* Таймфреймы */}
        <div className="timeframe-selector-wrapper">
          <button 
            className="timeframe-btn"
            onClick={() => {
              setShowTimeframeMenu(!showTimeframeMenu)
              setShowPairMenu(false)
            }}
          >
            {selectedTimeframe.label}
          </button>
          
          {showTimeframeMenu && (
            <div className="timeframe-menu">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  className={`timeframe-menu-item ${selectedTimeframe.value === tf.value ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTimeframe(tf)
                    setShowTimeframeMenu(false)
                    setChartKey(k => k + 1)
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Панель индикаторов */}
      <div className="indicators-bar">
        <span className="indicators-label">Индикаторы:</span>
        <div className="indicators-list">
          {indicators.map(ind => (
            <button
              key={ind.id}
              className={`indicator-toggle ${ind.enabled ? 'enabled' : ''}`}
              onClick={() => toggleIndicator(ind.id)}
            >
              {ind.name}
            </button>
          ))}
        </div>
      </div>

      {/* График TradingView */}
      <div className="chart-main-container" style={{ height: containerHeight }}>
        <iframe
          key={chartKey}
          src={getIframeUrl()}
          style={{ width: '100%', height: '100%', border: 'none' }}
          frameBorder="0"
          allowFullScreen
          loading="lazy"
          title={`TradingView ${selectedPair.name} Chart`}
          onLoad={() => setChartLoaded(true)}
        />
        
        {!chartLoaded && (
          <div className="chart-loading-overlay">
            <div className="jelly">
              <div className="jelly-body"></div>
              <div className="jelly-tentacles">
                <div className="tentacle"></div>
                <div className="tentacle"></div>
                <div className="tentacle"></div>
                <div className="tentacle"></div>
              </div>
            </div>
            <p>Загрузка графика...</p>
          </div>
        )}
      </div>

      {/* Нижняя панель с информацией */}
      <div className="chart-bottom-bar">
        <div className="info-item">
          <span className="info-label">Пара:</span>
          <span className="info-value">{selectedPair.name}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Таймфрейм:</span>
          <span className="info-value">{selectedTimeframe.label}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Данные:</span>
          <span className="info-value">
            {selectedPair.type === 'forex' ? 'OANDA/Forex' : 'Binance'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Индикаторы:</span>
          <span className="info-value">
            {indicators.filter(i => i.enabled).length > 0 
              ? indicators.filter(i => i.enabled).map(i => i.name).join(', ')
              : 'Нет'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ChartScreen
