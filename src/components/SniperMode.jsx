import { useState, useEffect, useRef } from 'react'
import './SniperMode.css'
import { analyzeScalpersDream } from '../services/ScalpersDream'
import { fetchRealMarketData } from '../services/MarketDataGenerator'

function SniperMode() {
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [candles, setCandles] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [marketInfo, setMarketInfo] = useState(null)
  const [dataStatus, setDataStatus] = useState('closed')
  const [aiAdvice, setAiAdvice] = useState(null)
  const widgetRef = useRef(null)

  const isMarketOpen = () => {
    const now = new Date()
    const day = now.getDay()
    const hour = now.getHours()
    
    if (day === 0 || day === 6) return false
    return hour >= 9 && hour < 18
  }

  useEffect(() => {
    loadWidget()
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

  const startScan = async () => {
    if (!isMarketOpen()) {
      setDataStatus('closed')
      setAiAdvice({
        type: 'warning',
        message: '📅 Рынок закрыт. Торговля доступна только в будни (Пн-Пт) с 09:00 до 18:00 МСК.'
      })
      return
    }

    setIsScanning(true)
    setIsLoading(true)
    setDataStatus('loading')
    setAiAdvice(null)

    try {
      const data = await fetchRealMarketData()
      
      setCandles(data.candles)
      setCurrentPrice(data.currentPrice)
      setMarketInfo({
        symbol: data.symbol,
        exchange: data.exchange,
        source: data.source
      })
      
      const result = analyzeScalpersDream(data.candles)
      setAnalysis(result)
      
      setDataStatus('live')
      
      generateAiAdvice(result, data.currentPrice)
      
      console.log('🎯 Снайпер провёл сканирование:', data.candles.length, 'свечей')
      
    } catch (error) {
      console.error('❌ Ошибка сканирования:', error)
      setDataStatus('error')
      setAiAdvice({
        type: 'error',
        message: '⚠️ Не удалось получить данные. Попробуйте позже.'
      })
    } finally {
      setIsLoading(false)
      setIsScanning(false)
    }
  }

  const generateAiAdvice = (analysis, price) => {
    let advice = {
      type: 'neutral',
      message: '',
      tips: []
    }

    if (!analysis || analysis.signal === 'HOLD') {
      advice = {
        type: 'neutral',
        message: '🤔 Рынок в нейтральной фазе. Нет сильных сигналов для входа.',
        tips: [
          '💡 Подождите пробоя диапазона Боллинджера',
          '📊 Следите за ростом объёма',
          '⏰ Лучшее время для торговли — открытие сессий'
        ]
      }
    } else if (analysis.signal === 'BUY') {
      advice = {
        type: 'buy',
        message: `🎯 СИГНАЛ BUY! Цена: ${price.toFixed(5)} | Уверенность: ${analysis.confidence}%`,
        tips: [
          '✅ Цена у нижней полосы Боллинджера',
          '✅ RSI показывает перепроданность',
          '✅ Объём растёт — подтверждение движения',
          '✅ Пробой сопротивления подтверждён',
          '📌 Входить на закрытии свечи выше сопротивления'
        ]
      }
    } else if (analysis.signal === 'SELL') {
      advice = {
        type: 'sell',
        message: `🎯 СИГНАЛ SELL! Цена: ${price.toFixed(5)} | Уверенность: ${analysis.confidence}%`,
        tips: [
          '✅ Цена у верхней полосы Боллинджера',
          '✅ RSI показывает перекупленность',
          '✅ Объём растёт — подтверждение движения',
          '✅ Пробой поддержки подтверждён',
          '📌 Входить на закрытии свечи ниже поддержки'
        ]
      }
    }

    setAiAdvice(advice)
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

  const getAdviceColor = (type) => {
    switch (type) {
      case 'buy': return '#34d399'
      case 'sell': return '#f87171'
      case 'warning': return '#fbbf24'
      case 'error': return '#f87171'
      default: return '#8ecae6'
    }
  }

  return (
    <div className="sniper-mode-container">
      <div className="sniper-header">
        <div className="sniper-icon">🎯</div>
        <div className="sniper-info">
          <h1>Режим Снайпера</h1>
          <p>EUR/USD • 1 мин • SCALPER'S DREAM</p>
        </div>
        <div className="sniper-status" style={{ background: dataStatus === 'live' ? '#34d399' : '#94a3b8' }}>
          {dataStatus === 'live' ? '🎯' : dataStatus === 'loading' ? '⏳' : '⚠️'}
        </div>
      </div>

      <div className="tradingview-widget-container">
        <div id="tradingview-sniper" className="tradingview-widget"></div>
      </div>

      <div className="scan-button-container">
        <button 
          className={`scan-button ${isScanning ? 'scanning' : ''}`}
          onClick={startScan}
          disabled={isScanning || !isMarketOpen()}
        >
          {isScanning ? (
            <>
              <div className="button-spinner"></div>
              <span>Сканирую рынок...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>{isMarketOpen() ? 'Сканировать рынок' : 'Рынок закрыт'}</span>
            </>
          )}
        </button>
        
        {isMarketOpen() && (
          <div className="market-status-badge">
            🟢 Рынок открыт (Пн-Пт, 09:00-18:00 МСК)
          </div>
        )}
        
        {!isMarketOpen() && (
          <div className="market-status-badge closed">
            🔴 Рынок закрыт (выходные или вне часов торговли)
          </div>
        )}
      </div>

      <div className="sniper-analysis-panel">
        <div className="panel-header">
          <h2>Результаты анализа</h2>
          <div className={`scan-indicator ${dataStatus}`}>
            {dataStatus === 'loading' && (
              <>
                <div className="scan-dot"></div>
                <span>Загрузка данных...</span>
              </>
            )}
            {dataStatus === 'live' && (
              <>
                <div className="scan-dot live"></div>
                <span>✅ АНАЛИЗ ГОТОВ</span>
              </>
            )}
            {dataStatus === 'error' && (
              <>
                <div className="scan-dot error"></div>
                <span>⚠️ ОШИБКА</span>
              </>
            )}
            {dataStatus === 'closed' && (
              <span>📅 Рынок закрыт</span>
            )}
          </div>
        </div>

        {aiAdvice && (
          <div className="ai-advice-card" style={{ borderColor: getAdviceColor(aiAdvice.type) }}>
            <div className="advice-header">
              <div className="advice-icon">🤖</div>
              <div className="advice-title">AI Ассистент</div>
            </div>
            <div className="advice-content">
              <p className="advice-main">{aiAdvice.message}</p>
              {aiAdvice.tips && (
                <ul className="advice-tips">
                  {aiAdvice.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {isLoading && !analysis && (
          <div className="sniper-loading">
            <div className="loading-spinner"></div>
            <p>Анализирую Bollinger Bands, RSI и объём...</p>
            <small>Получаю данные с рынка EUR/USD</small>
          </div>
        )}

        {analysis && dataStatus === 'live' && (
          <div className="analysis-results">
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

            <div className="scan-status">
              <div className="scan-row">
                <span>Данные:</span>
                <strong style={{ color: '#34d399' }}>🟢 Торговые часы (Пн-Пт)</strong>
              </div>
              <div className="scan-row">
                <span>Инструмент:</span>
                <strong>{marketInfo?.symbol || 'EURUSD'}</strong>
              </div>
              <div className="scan-row">
                <span>Биржа:</span>
                <strong>{marketInfo?.exchange || 'FOREX'}</strong>
              </div>
              <div className="scan-row">
                <span>Обновлено:</span>
                <strong>{new Date().toLocaleTimeString('ru-RU')}</strong>
              </div>
            </div>
          </div>
        )}

        {dataStatus === 'closed' && !isLoading && (
          <div className="sniper-closed">
            <div className="closed-icon">📅</div>
            <p>Рынок EUR/USD закрыт</p>
            <small>Торговля доступна только в будни (Пн-Пт) с 09:00 до 18:00 МСК</small>
            <small>Нажмите "Сканировать" когда рынок откроется</small>
          </div>
        )}

        {dataStatus === 'error' && (
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
