import { useState, useEffect, useRef } from 'react'
import './SniperMode.css'
import { analyzeScalpersDream } from '../services/ScalpersDream'
import { fetchRealCandles, startRealTimeUpdate } from '../services/RealDataFetcher'

function SniperMode() {
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [candles, setCandles] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [marketInfo, setMarketInfo] = useState(null)
  const [dataStatus, setDataStatus] = useState('loading') // loading, live, error
  const widgetRef = useRef(null)

  // Загрузка виджета TradingView
  useEffect(() => {
    loadWidget()
    
    // Запускаем сканирование реальных данных
    startRealDataAnalysis()
    
    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove()
      }
    }
  }, [])

  const loadWidget = () => {
    const container = document.getElementById('tradingview-sniper')
    if (!container) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: 'OANDA:EURUSD',
      interval: '1',
      timezone: 'Europe/Moscow',
      theme: 'dark',
      style: '1',
      locale: 'ru',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      gridColor: 'rgba(255, 255, 255, 0.05)',
      hide_volume: false,
      hide_axis: false,
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false,
      studies: ['BB@tv-basicstudies', 'RSI@tv-basicstudies', 'VolatilityMomentum@tv-basicstudies'],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650'
    })

    container.appendChild(script)
  }

  const startRealDataAnalysis = () => {
    setIsScanning(true)
    setDataStatus('loading')

    const scan = async () => {
      try {
        // Запрашиваем реальные данные с Yahoo Finance
        const data = await fetchRealCandles('EURUSD=X', '1m', '1d')
        
        setCandles(data.candles)
        setCurrentPrice(data.currentPrice)
        setMarketInfo({
          symbol: data.symbol,
          exchange: data.exchange,
          currency: data.currency
        })
        
        // Анализируем реальные свечи
        const result = analyzeScalpersDream(data.candles)
        setAnalysis(result)
        
        setDataStatus('live')
        setIsLoading(false)
        console.log('🎯 Снайпер анализирует РЕАЛЬНЫЕ данные:', data.candles.length, 'свечей')
        
      } catch (error) {
        console.error('❌ Ошибка получения реальных данных:', error)
        setDataStatus('error')
        setIsLoading(false)
      }
    }

    // Первоначальное сканирование
    scan()
    
    // Обновление каждые 30 секунд (реальные данные)
    const interval = setInterval(scan, 30000)
    
    return () => clearInterval(interval)
  }

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'BUY': return '#34d399'
      case 'SELL': return '#f87171'
      default: return '#fbbf24'
    }
  }

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'BUY': return '🎯'
      case 'SELL': return '🎯'
      default: return '🔍'
    }
  }

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 80) return 'ОТЛИЧНО'
    if (confidence >= 70) return 'ХОРОШО'
    if (confidence >= 50) return 'СРЕДНЕ'
    return 'СЛАБО'
  }

  return (
    <div className="sniper-mode-container">
      <div className="sniper-header">
        <div className="sniper-icon">🎯</div>
        <div className="sniper-info">
          <h1>Режим Снайпера</h1>
          <p>EUR/USD • 1 мин • SCALPER'S DREAM</p>
        </div>
        <div className="sniper-status" style={{ background: analysis ? getSignalColor(analysis.signal) : '#94a3b8' }}>
          {isLoading ? '⏳' : (analysis ? getSignalIcon(analysis.signal) : '⚠️')}
        </div>
      </div>

      {/* Виджет TradingView */}
      <div className="tradingview-widget-container">
        <div id="tradingview-sniper" className="tradingview-widget"></div>
      </div>

      {/* Панель анализа */}
      <div className="sniper-analysis-panel">
        <div className="panel-header">
          <h2>Анализ в реальном времени</h2>
          <div className={`scan-indicator ${dataStatus}`}>
            {isLoading ? (
              <>
                <div className="scan-dot"></div>
                <span>Загружаю данные...</span>
              </>
            ) : dataStatus === 'live' ? (
              <>
                <div className="scan-dot live"></div>
                <span>✅ LIVE DATA</span>
              </>
            ) : (
              <>
                <div className="scan-dot error"></div>
                <span>⚠️ Ошибка данных</span>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="sniper-loading">
            <div className="loading-spinner"></div>
            <p>Инициализация стратегии...</p>
            <small>Загружаю Bollinger Bands, RSI и объём</small>
          </div>
        ) : analysis ? (
          <>
            {/* Сигнал */}
            <div className="signal-card" style={{ borderColor: getSignalColor(analysis.signal) }}>
              <div className="signal-main">
                <div className="signal-icon">{getSignalIcon(analysis.signal)}</div>
                <div className="signal-text">
                  <div className="signal-type">{analysis.signal === 'HOLD' ? 'ОЖИДАНИЕ' : `СИГНАЛ ${analysis.signal}`}</div>
                  <div className="signal-confidence">
                    Уверенность: <strong>{analysis.confidence}%</strong>
                  </div>
                </div>
              </div>
              
              {analysis.signal !== 'HOLD' && (
                <div className="breakout-badge">
                  ✅ Пробой подтверждён
                </div>
              )}
            </div>

            {/* Индикаторы */}
            <div className="indicators-grid">
              <div className="indicator-card">
                <div className="indicator-icon">📊</div>
                <div className="indicator-info">
                  <div className="indicator-label">RSI (14)</div>
                  <div className="indicator-value" style={{ color: analysis.rsi < 30 ? '#34d399' : analysis.rsi > 70 ? '#f87171' : '#ffffff' }}>
                    {analysis.rsi ? analysis.rsi.toFixed(1) : '—'}
                  </div>
                  <div className="indicator-status">
                    {analysis.rsi < 30 ? '🟢 Перепроданность' : analysis.rsi > 70 ? '🔴 Перекупленность' : '⚪ Нейтрально'}
                  </div>
                </div>
              </div>

              <div className="indicator-card">
                <div className="indicator-icon">📈</div>
                <div className="indicator-info">
                  <div className="indicator-label">Боллинджер</div>
                  <div className="indicator-value">
                    {analysis.bb ? analysis.bb.width.toFixed(2) : '—'}%
                  </div>
                  <div className="indicator-status">
                    {analysis.bb && analysis.bb.width < 0.5 ? '📉 Сужение' : '➖ Норма'}
                  </div>
                </div>
              </div>

              <div className="indicator-card">
                <div className="indicator-icon">📊</div>
                <div className="indicator-info">
                  <div className="indicator-label">Объём</div>
                  <div className="indicator-value">
                    {analysis.volume ? (analysis.volume.ratio * 100).toFixed(0) : '—'}%
                  </div>
                  <div className="indicator-status">
                    {analysis.volume && analysis.volume.increasing ? '📈 Растёт' : '➖ Норма'}
                  </div>
                </div>
              </div>
            </div>

            {/* Детали сигнала */}
            {analysis.details && analysis.details.length > 0 && (
              <div className="details-card">
                <h3>Детали сигнала</h3>
                <ul className="details-list">
                  {analysis.details.map((detail, index) => (
                    <li key={index} className={`detail-item ${detail.includes('✅') ? 'confirmed' : detail.includes('⚠️') ? 'warning' : ''}`}>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Статус сканирования */}
            <div className="scan-status">
              <div className="scan-row">
                <span>Данные:</span>
                <strong style={{ color: dataStatus === 'live' ? '#34d399' : '#f87171' }}>
                  {dataStatus === 'live' ? '🟢 РЕАЛЬНЫЕ (Yahoo Finance)' : '❌ НЕТ ДАННЫХ'}
                </strong>
              </div>
              <div className="scan-row">
                <span>Инструмент:</span>
                <strong>{marketInfo?.symbol || 'EURUSD'}</strong>
              </div>
              <div className="scan-row">
                <span>Биржа:</span>
                <strong>{marketInfo?.exchange || 'OANDA'}</strong>
              </div>
              <div className="scan-row">
                <span>Обновлено:</span>
                <strong>{new Date().toLocaleTimeString('ru-RU')}</strong>
              </div>
            </div>
          </>
        ) : (
          <div className="sniper-error">
            <div className="error-icon">⚠️</div>
            <p>Не удалось загрузить данные</p>
            <small>Проверьте подключение к интернету</small>
          </div>
        )}
      </div>
    </div>
  )
}

export default SniperMode
