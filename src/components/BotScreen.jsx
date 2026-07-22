import { useState, useEffect } from 'react'
import './BotScreen.css'
import RippleButton from './RippleButton'
import TradingViewWidget from './TradingViewWidget'
import MarketTimer from './MarketTimer'
import { analyzeMarket, getCurrentPrice } from '../services/AIEngine'

const TIMEFRAMES = ['1M', '5M', '15M', '1H', '4H', '1D']

function BotScreen({ user, isWeekday, marketState, onWeatherUpdate }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H')
  const [signal, setSignal] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [weatherState, setWeatherState] = useState('neutral')
  const [lastPrice, setLastPrice] = useState(null)

  // Получение текущей цены EUR/USD
  const fetchCurrentPrice = async () => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/EUR')
      const data = await response.json()
      if (data && data.rates && data.rates.USD) {
        return parseFloat(data.rates.USD)
      }
      return 1.0850
    } catch (e) {
      return 1.0850
    }
  }

  const generateSignal = async () => {
    if (!isWeekday) {
      alert('⚠️ Торговые сигналы доступны только в будние дни')
      return
    }

    setIsLoading(true)
    setSignal(null)
    setError(null)

    try {
      const marketAnalysis = await analyzeMarket()
      const currentPrice = await fetchCurrentPrice()
      setLastPrice(currentPrice)

      setSignal({
        type: marketAnalysis.type,
        pair: 'EUR/USD',
        timeframe: selectedTimeframe,
        confidence: marketAnalysis.confidence,
        entry: marketAnalysis.entry,
        sl: marketAnalysis.sl,
        tp: marketAnalysis.tp,
        reason: marketAnalysis.reason,
        timestamp: marketAnalysis.timestamp,
        price: currentPrice,
        indicators: marketAnalysis.indicators
      })
    } catch (err) {
      console.error('Ошибка анализа:', err)
      setError('❌ Ошибка получения данных с рынка. Проверьте соединение.')
    } finally {
      setIsLoading(false)
    }
  }

  const logTradeResult = (result) => {
    const history = JSON.parse(localStorage.getItem('tradingHistory') || '[]')
    history.push({
      date: new Date().toISOString(),
      result,
      timestamp: Date.now()
    })
    const recent = history.slice(-30)
    localStorage.setItem('tradingHistory', JSON.stringify(recent))
    
    const last10 = recent.slice(-10)
    const profits = last10.filter(h => h.result === 'profit').length
    const losses = last10.filter(h => h.result === 'loss').length
    
    let newState
    if (profits > losses) newState = 'profit'
    else if (losses > profits) newState = 'loss'
    else newState = 'neutral'
    
    setWeatherState(newState)
    if (onWeatherUpdate) onWeatherUpdate(newState)
  }

  const getWeatherInfo = () => {
    switch (weatherState) {
      case 'profit': return { icon: '☀️', label: 'Прибыльный день', sublabel: 'Солнце и тропики', className: 'profit' }
      case 'loss': return { icon: '🌧️', label: 'День отдыха', sublabel: 'Успокаивающий дождь', className: 'loss' }
      default: return { icon: '😌', label: 'Нейтральный день', sublabel: 'Лёгкие облака', className: '' }
    }
  }

  const getSignalIcon = (type) => {
    if (type === 'BUY') return '📈'
    if (type === 'SELL') return '📉'
    return '⏸️'
  }

  const getSignalClass = (type) => {
    if (type === 'BUY') return 'signal-buy'
    if (type === 'SELL') return 'signal-sell'
    return ''
  }

  const getTrendLabel = (trend) => {
    if (trend === 'bullish') return '📈 Бычий'
    if (trend === 'bearish') return '📉 Медвежий'
    return '➡️ Нейтральный'
  }

  return (
    <div className="container animate-fadeIn">
      {/* Заголовок */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🤖 Торговый Бот</h1>
          <p className="page-subtitle">EUR/USD • AI анализ рынка</p>
        </div>
        <span className="badge badge-beta">BETA</span>
      </div>

      {/* График */}
      <TradingViewWidget />

      {/* Таймер рынка */}
      <MarketTimer />

      {/* Выбор таймфрейма */}
      <div className="card">
        <div className="select-group">
          <label className="select-label">⏱️ Таймфрейм анализа</label>
          <div className="timeframe-grid">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                className={`timeframe-btn ${selectedTimeframe === tf ? 'active' : ''}`}
                onClick={() => setSelectedTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Кнопка сигнала */}
      <RippleButton 
        onClick={generateSignal}
        variant={isLoading ? 'sand' : 'primary'}
        disabled={isLoading}
      >
        {isLoading ? '⏳ AI анализирует...' : '⚡ Получить сигнал EUR/USD'}
      </RippleButton>

      {/* Загрузка — медузы */}
      {isLoading && (
        <div className="jellyfish-skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="jelly">
              <div className="jelly-body"></div>
              <div className="jelly-tentacles">
                {[1, 2, 3, 4].map(j => <div key={j} className="tentacle"></div>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="card" style={{ borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)' }}>
          <p style={{ color: '#f87171', textAlign: 'center' }}>{error}</p>
        </div>
      )}

      {/* Результат сигнала */}
      {signal && (
        <>
          {/* Текущая цена */}
          {lastPrice && (
            <div className="card price-card animate-fadeIn">
              <div className="price-header">
                <span className="price-label">📊 Текущая цена EUR/USD</span>
                <span className="price-value">{lastPrice.toFixed(5)}</span>
              </div>
              <div className="price-source">
                Обновлено: {signal.timestamp}
              </div>
            </div>
          )}

          {/* Карточка сигнала */}
          <div className={`signal-card ${getSignalClass(signal.type)} animate-fadeIn`}>
            <div className="signal-header">
              <div>
                <div className="signal-type">
                  {getSignalIcon(signal.type)} {signal.type === 'BUY' ? 'ПОКУПКА' : signal.type === 'SELL' ? 'ПРОДАЖА' : 'ПОДОЖДИ'}
                </div>
                <div className="signal-pair">
                  EUR/USD • {signal.timeframe}
                </div>
              </div>
              <div className="signal-confidence">
                {signal.confidence}%
              </div>
            </div>

            <div className="signal-details">
              <div className="signal-detail">
                <span className="detail-label">Вход:</span>
                <span className="detail-value">{signal.entry?.toFixed(5)}</span>
              </div>
              <div className="signal-detail">
                <span className="detail-label">Stop Loss:</span>
                <span className="detail-value">{signal.sl?.toFixed(5)}</span>
              </div>
              <div className="signal-detail">
                <span className="detail-label">Take Profit:</span>
                <span className="detail-value">{signal.tp?.toFixed(5)}</span>
              </div>
            </div>

            {/* Индикаторы */}
            {signal.indicators && (
              <div className="indicators-card animate-fadeIn">
                <h4>📈 Технические индикаторы</h4>
                
                <div className="indicator-row">
                  <span className="indicator-name">RSI (14):</span>
                  <span className={`indicator-value ${signal.indicators.rsi > 70 ? 'overbought' : signal.indicators.rsi < 30 ? 'oversold' : 'neutral'}`}>
                    {signal.indicators.rsi?.toFixed(2)}
                  </span>
                </div>
                
                {signal.indicators.macd && (
                  <div className="indicator-row">
                    <span className="indicator-name">MACD:</span>
                    <span className="indicator-value">
                      {signal.indicators.macd.macd.toFixed(5)} / {signal.indicators.macd.signal.toFixed(5)}
                    </span>
                  </div>
                )}
                
                {signal.indicators.bollinger && (
                  <div className="indicator-row">
                    <span className="indicator-name">Bollinger:</span>
                    <span className="indicator-value">
                      {signal.indicators.bollinger.lower.toFixed(5)} - {signal.indicators.bollinger.upper.toFixed(5)}
                    </span>
                  </div>
                )}
                
                <div className="indicator-row">
                  <span className="indicator-name">Тренд:</span>
                  <span className="indicator-value">
                    {getTrendLabel(signal.indicators.trend)}
                  </span>
                </div>
              </div>
            )}

            <div className="signal-reason">
              <strong>💡 Анализ AI:</strong>
              <p>{signal.reason}</p>
            </div>

            <div className="signal-time">
              🕐 {signal.timestamp}
            </div>
          </div>

          {/* Логирование */}
          <div className="trade-log-card animate-fadeIn">
            <h4>📝 Как прошла сделка?</h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
              Это поможет настроить погоду в терминале
            </p>
            <div className="trade-log-buttons">
              <button className="log-btn profit-btn" onClick={() => logTradeResult('profit')}>
                ☀️ Прибыль
              </button>
              <button className="log-btn loss-btn" onClick={() => logTradeResult('loss')}>
                🌧️ Убыток
              </button>
            </div>
          </div>
        </>
      )}

      {/* Информация */}
      <div className="card info-card">
        <h4>🌿 О торговых сигналах</h4>
        <p>
          AI-ассистент анализирует график EUR/USD в реальном времени. 
          Сигналы выдаются только в будние дни.
        </p>
        <p style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
          ⚠️ Это не финансовый совет. Всегда проводите собственный анализ.
        </p>
      </div>

      {/* Погода */}
      <div className="card weather-card">
        <h4>🌦️ Погода в терминале</h4>
        <p>
          Ваша торговая атмосфера меняется в зависимости от результатов.
        </p>
        <div className={`weather-status ${getWeatherInfo().className}`}>
          <span className="weather-status-dot"></span>
          <span>
            {getWeatherInfo().icon} {getWeatherInfo().label}
          </span>
        </div>
      </div>
    </div>
  )
}

export default BotScreen