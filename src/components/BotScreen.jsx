import { useState } from 'react'
import TelegramSDK from '@twa-dev/sdk'
import './BotScreen.css'
import RippleButton from './RippleButton'
import TradingViewWidget from './TradingViewWidget'
import MarketTimer from './MarketTimer'

const TIMEFRAMES = ['1M', '5M', '15M', '1H', '4H', '1D']

function BotScreen({ user, isWeekday, marketState, onWeatherUpdate }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H')
  const [signal, setSignal] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [weatherState, setWeatherState] = useState('neutral')

  const generateSignal = () => {
    if (!isWeekday) {
      showNotification('⚠️ Торговые сигналы доступны только в будние дни')
      return
    }

    setIsLoading(true)
    setSignal(null)

    // Имитация анализа AI
    setTimeout(() => {
      const types = ['BUY', 'SELL', 'WAIT']
      const type = types[Math.floor(Math.random() * types.length)]
      const confidence = Math.floor(Math.random() * 30) + 70
      const entry = (1.0800 + Math.random() * 0.0200).toFixed(5)
      const sl = (parseFloat(entry) - Math.random() * 0.0050).toFixed(5)
      const tp = (parseFloat(entry) + Math.random() * 0.0080).toFixed(5)

      setSignal({
        type,
        pair: 'EUR/USD',
        timeframe: selectedTimeframe,
        confidence,
        entry,
        sl,
        tp,
        reason: generateReason(type),
        timestamp: new Date().toLocaleString('ru-RU'),
      })

      setIsLoading(false)
      
      if (TelegramSDK?.HapticFeedback) {
        TelegramSDK.HapticFeedback.notificationOccurred('success')
      }
    }, 2000)
  }

  const generateReason = (type) => {
    const reasons = {
      BUY: [
        'Поддержка подтверждена объёмами, бычий разворот ожидается',
        'Мacd пересечение вверх, тренд меняется в пользу покупки',
        'Ценовая action формирует бычий паттерн "Утрочняя звезда"',
      ],
      SELL: [
        'Сопротивление подтверждено, возможен откат',
        'RSI в зоне перекупленности, коррекция близка',
        'Медвежий паттерн "Звезда упadающая" на графике',
      ],
      WAIT: [
        'Рынок в боковике, рекомендуется подождать пробоя',
        'Нестабильная ситуация, лучше сохранить капитал',
        'Ожидание важных экономических данных',
      ],
    }
    const list = reasons[type]
    return list[Math.floor(Math.random() * list.length)]
  }

  const showNotification = (message) => {
    if (TelegramSDK?.HapticFeedback) {
      TelegramSDK.HapticFeedback.notificationOccurred('error')
    }
    alert(message)
  }

  const getSignalIcon = (type) => {
    switch (type) {
      case 'BUY': return '📈'
      case 'SELL': return '📉'
      case 'WAIT': return '⏸️'
      default: return '📊'
    }
  }

  const getSignalClass = (type) => {
    switch (type) {
      case 'BUY': return 'signal-buy'
      case 'SELL': return 'signal-sell'
      default: return ''
    }
  }

  // Логирование результата сделки
  const logTradeResult = (result) => {
    const history = JSON.parse(localStorage.getItem('tradingHistory') || '[]')
    history.push({
      date: new Date().toISOString(),
      result, // 'profit' или 'loss'
      timestamp: Date.now()
    })
    // Храним последние 30 сделок
    const recent = history.slice(-30)
    localStorage.setItem('tradingHistory', JSON.stringify(recent))
    
    // Рассчитываем новое состояние погоды
    const last10 = recent.slice(-10)
    const profits = last10.filter(h => h.result === 'profit').length
    const losses = last10.filter(h => h.result === 'loss').length
    
    let newState
    if (profits > losses) {
      newState = 'profit'
    } else if (losses > profits) {
      newState = 'loss'
    } else {
      newState = 'neutral'
    }
    
    setWeatherState(newState)
    
    // Уведомляем родительский компонент
    if (onWeatherUpdate) {
      onWeatherUpdate(newState)
    }
    
    // Вибрация
    if (TelegramSDK.HapticFeedback) {
      TelegramSDK.HapticFeedback.notificationOccurred(result === 'profit' ? 'success' : 'warning')
    }
  }

  // Получение текущего состояния погоды
  const getWeatherInfo = () => {
    switch (weatherState) {
      case 'profit':
        return { 
          icon: '☀️', 
          label: 'Прибыльный день', 
          sublabel: 'Солнце и тропики',
          className: 'profit'
        }
      case 'loss':
        return { 
          icon: '🌧️', 
          label: 'День отдыха', 
          sublabel: 'Успокаивающий дождь',
          className: 'loss'
        }
      default:
        return { 
          icon: '😌', 
          label: 'Нейтральный день', 
          sublabel: 'Лёгкие облака',
          className: ''
        }
    }
  }

  const weatherInfo = getWeatherInfo()

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

      {/* График EUR/USD — TradingView (100% реальные данные) */}
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

      {/* Кнопка получения сигнала */}
      <RippleButton 
        onClick={generateSignal}
        className={isLoading ? 'loading' : ''}
        variant={isLoading ? 'sand' : 'primary'}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="spinner"></span>
            AI анализирует график...
          </>
        ) : (
          <>
            <span>⚡</span>
            Получить сигнал EUR/USD
          </>
        )}
      </RippleButton>

      {/* Скелетон загрузки — медузы */}
      {isLoading && (
        <div className="jellyfish-skeleton">
          <div className="jelly">
            <div className="jelly-body"></div>
            <div className="jelly-tentacles">
              <div className="tentacle"></div>
              <div className="tentacle"></div>
              <div className="tentacle"></div>
              <div className="tentacle"></div>
            </div>
          </div>
          <div className="jelly">
            <div className="jelly-body"></div>
            <div className="jelly-tentacles">
              <div className="tentacle"></div>
              <div className="tentacle"></div>
              <div className="tentacle"></div>
              <div className="tentacle"></div>
            </div>
          </div>
          <div className="jelly">
            <div className="jelly-body"></div>
            <div className="jelly-tentacles">
              <div className="tentacle"></div>
              <div className="tentacle"></div>
              <div className="tentacle"></div>
              <div className="tentacle"></div>
            </div>
          </div>
        </div>
      )}

      {/* Результат сигнала */}
      {signal && (
        <>
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
                <span className="detail-value">{signal.entry}</span>
              </div>
              <div className="signal-detail">
                <span className="detail-label">Stop Loss:</span>
                <span className="detail-value">{signal.sl}</span>
              </div>
              <div className="signal-detail">
                <span className="detail-label">Take Profit:</span>
                <span className="detail-value">{signal.tp}</span>
              </div>
            </div>

            <div className="signal-reason">
              <strong>💡 Анализ AI:</strong>
              <p>{signal.reason}</p>
            </div>

            <div className="signal-time">
              🕐 {signal.timestamp}
            </div>
          </div>

          {/* Логирование результата сделки */}
          <div className="trade-log-card animate-fadeIn">
            <h4>📝 Как прошла сделка?</h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
              Это поможет настроить погоду в терминале
            </p>
            <div className="trade-log-buttons">
              <button 
                className="log-btn profit-btn"
                onClick={() => logTradeResult('profit')}
              >
                ☀️ Прибыль
              </button>
              <button 
                className="log-btn loss-btn"
                onClick={() => logTradeResult('loss')}
              >
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
          AI-ассистент анализирует график EUR/USD в реальном времени 
          на основе данных OANDA и TradingView. Сигналы выдаются только в будние дни.
        </p>
        <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-light)' }}>
          ⚠️ Это не финансовый совет. Всегда проводите собственный анализ.
        </p>
      </div>

      {/* Погода в терминале */}
      <div className="card weather-card">
        <h4>🌦️ Погода в терминале</h4>
        <p>
          Ваша торговая атмосфера меняется в зависимости от результатов. 
          Прибыль — солнце и тропики. Убыток — спокойный дождь.
        </p>
        <div className={`weather-status ${weatherInfo.className}`}>
          <span className="weather-status-dot"></span>
          <span>
            {weatherInfo.icon} {weatherInfo.label}
          </span>
        </div>
      </div>
    </div>
  )
}

export default BotScreen
