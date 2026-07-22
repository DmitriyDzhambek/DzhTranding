import { useState, useEffect } from 'react'
import './HomeScreen.css'
import { calculateMarketConfidence, getCurrentPrice } from '../services/AIEngine'
import { getTimeUntilMarketOpen } from '../services/MarketAvailability'

function HomeScreen({ user, isWeekday, marketState = 'flat', price: propPrice, change: propChange, isUp: propIsUp, lastUpdate: propLastUpdate }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [marketConfidence, setMarketConfidence] = useState(null)
  const [isLoadingConfidence, setIsLoadingConfidence] = useState(false)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isOpen: true })

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const updateCountdown = () => {
      const cd = getTimeUntilMarketOpen()
      setCountdown(cd)
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const loadConfidence = async () => {
      setIsLoadingConfidence(true)
      try {
        const [historicalData, currentPrice] = await Promise.all([
          (await import('../services/AIEngine')).getHistoricalData(30),
          getCurrentPrice()
        ])
        
        if (historicalData && historicalData.length >= 20) {
          const prices = historicalData.map(d => d.price)
          const confidence = calculateMarketConfidence(prices)
          setMarketConfidence(confidence)
        }
      } catch (error) {
        console.error('Ошибка загрузки уверенности:', error)
      } finally {
        setIsLoadingConfidence(false)
      }
    }
    
    loadConfidence()
    const interval = setInterval(loadConfidence, 120000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  const formatCountdownDisplay = () => {
    if (countdown.isOpen && !countdown.isClosingSoon) return 'Рынок открыт'
    
    const hh = String(countdown.hours).padStart(2, '0')
    const mm = String(countdown.minutes).padStart(2, '0')
    const ss = String(countdown.seconds).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  const getMarketInfo = () => {
    switch (marketState) {
      case 'bull':
        return {
          icon: '📈',
          label: 'Бычий тренд',
          sublabel: 'Рост • Тёплый янтарь',
          color: '#34d399',
          desc: 'Рынок теплеет — подсознательный сигнал "профит"'
        }
      case 'bear':
        return {
          icon: '📉',
          label: 'Медвежий тренд',
          sublabel: 'Падение • Ледяной холод',
          color: '#f87171',
          desc: 'Рынок охлаждается — ныряем в подлёдное течение'
        }
      default:
        return {
          icon: '🌊',
          label: 'Спокойный рынок',
          sublabel: 'Флэт • Лагуна',
          color: '#8ecae6',
          desc: 'Рынок спокоен — минимальное давление на психику'
        }
    }
  }

  const marketInfo = getMarketInfo()

  const price = propPrice || '1.0850'
  const change = propChange || '0.00'
  const isUp = propIsUp !== undefined ? propIsUp : true
  const lastUpdate = propLastUpdate || null

  const formatLastUpdate = (date) => {
    if (!date) return 'Подключение...'
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    if (diff < 5) return 'Обновлено только что'
    if (diff < 60) return `${diff} сек назад`
    return `${Math.floor(diff / 60)} мин назад`
  }

  return (
    <div className="container animate-fadeIn">
      {/* Заголовок */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🌺 Секреты Большого Счастья</h1>
          <p className="page-subtitle">Твой спокойный путь к успеху</p>
        </div>
      </div>

      {/* Карточка приветствия */}
      <div className="card welcome-card">
        <div className="welcome-icon">🏝️</div>
        <h2>Добро пожаловать</h2>
        {user && (
          <div className="user-info">
            <span className="status-dot"></span>
            <span>{user.firstName} {user.lastName || user.username}</span>
          </div>
        )}
        <div className="datetime">
          <div className="date">{formatDate(currentTime)}</div>
          <div className="time">{formatTime(currentTime)}</div>
        </div>
      </div>

      {/* Статус рынка EUR/USD */}
      <div className={`card market-status-card ${countdown.isOpen ? (countdown.isClosingSoon ? 'closing' : 'open') : 'closed'}`}>
        <div className="market-status-header">
          <div className="market-status-icon">
            {countdown.isOpen ? (countdown.isClosingSoon ? '🟡' : '🟢') : '🔴'}
          </div>
          <div className="market-status-info">
            <h3>EUR/USD</h3>
            <p className="market-status-message">
              {countdown.isOpen 
                ? (countdown.isClosingSoon ? 'Скоро закроется' : 'Рынок открыт') 
                : 'Рынок закрыт'}
            </p>
          </div>
        </div>

        <button className={`market-status-btn ${countdown.isOpen ? (countdown.isClosingSoon ? 'closing' : 'open') : 'waiting'}`}>
          <span className="countdown-timer">{formatCountdownDisplay()}</span>
          {!countdown.isOpen && (
            <span className="countdown-label">до открытия</span>
          )}
          {countdown.isClosingSoon && (
            <span className="countdown-label">до закрытия</span>
          )}
        </button>

        <div className="market-status-time">
          Обновлено: {formatTime(currentTime)}
        </div>
      </div>

      {/* Индикатор состояния рынка */}
      <div className="card market-sense-card" style={{ '--market-color': marketInfo.color }}>
        <div className="market-sense-header">
          <div className="market-sense-icon">{marketInfo.icon}</div>
          <div className="market-sense-info">
            <h3>{marketInfo.label}</h3>
            <p className="market-sense-sublabel">{marketInfo.sublabel}</p>
          </div>
          <div className="market-color-dot" style={{ background: marketInfo.color }}></div>
        </div>
        <p className="market-sense-desc">{marketInfo.desc}</p>
        
        <div className="live-price-section">
          <div className="live-price-header">
            <span className="live-indicator">
              <span className="live-dot"></span>
              LIVE
            </span>
            <span className="price-update-time">{formatLastUpdate(lastUpdate)}</span>
          </div>
          <div className="live-price-value">
            <span className="price-main">{price}</span>
            <span className={`price-change ${isUp ? 'up' : 'down'}`}>
              {isUp ? '↑' : '↓'} {Math.abs(parseFloat(change))}%
            </span>
          </div>
        </div>
        
        <div className="market-temperature-bar">
          <div className="market-temperature-fill" style={{ 
            width: marketState === 'bull' ? '75%' : marketState === 'bear' ? '25%' : '50%',
            background: marketState === 'bull' 
              ? 'linear-gradient(90deg, #e76f51, #e9c46a)' 
              : marketState === 'bear' 
              ? 'linear-gradient(90deg, #4a0e4e, #219ebc)' 
              : 'linear-gradient(90deg, #0A1C2E, #8ecae6)'
          }}></div>
        </div>
        <div className="market-temperature-labels">
          <span>❄️ Холод</span>
          <span>🌊 Спокойно</span>
          <span>🔥 Тепло</span>
        </div>
      </div>

      {/* Статус торговли */}
      <div className={`card status-card ${isWeekday ? 'open' : 'closed'}`}>
        <div className="status-header">
          <div>
            <h3>
              📊 Торговый рынок
              {isWeekday && (
                <span className="confidence-badge">
                  {isLoadingConfidence ? (
                    <span className="confidence-loading">...</span>
                  ) : marketConfidence ? (
                    <>
                      <span 
                        className="confidence-dot" 
                        style={{ background: marketConfidence.color }}
                      ></span>
                      <span className="confidence-percent">{marketConfidence.score}%</span>
                    </>
                  ) : (
                    <span className="confidence-none">—</span>
                  )}
                </span>
              )}
            </h3>
            <p className="status-text">
              {isWeekday ? 'Рынок открыт • Будний день' : 'Рынок закрыт • Выходной'}
            </p>
            {isWeekday && marketConfidence && (
              <p className="confidence-reason">
                {marketConfidence.emoji} {marketConfidence.reason}
              </p>
            )}
          </div>
          <span className={`badge ${isWeekday ? 'badge-success' : 'badge-warning'}`}>
            {isWeekday ? 'Открыт' : 'Выходной'}
          </span>
        </div>
        {isWeekday && (
          <p className="market-note">
            🌿 Торговые сигналы доступны только в будние дни
          </p>
        )}
        {!isWeekday && (
          <p className="market-note">
            💆 Отдохни в выходные. Новые сигналы будут в понедельник!
          </p>
        )}
      </div>

      {/* Быстрые привычки */}
      <h3 style={{ marginBottom: '12px', color: 'rgba(255,255,255,0.95)' }}>
        🌱 Привычки трейдера
      </h3>
      
      <div className="habit-list">
        <div className="habit-item">
          <div className="habit-icon" style={{ background: 'rgba(64, 145, 108, 0.2)' }}>
            🧘
          </div>
          <div className="habit-info">
            <div className="habit-name">Утренний анализ</div>
            <div className="habit-desc">Изучи рынок перед торговлей</div>
          </div>
          <div className="habit-streak">🔥 7</div>
        </div>

        <div className="habit-item">
          <div className="habit-icon" style={{ background: 'rgba(33, 158, 188, 0.2)' }}>
            📝
          </div>
          <div className="habit-info">
            <div className="habit-name">Торговый дневник</div>
            <div className="habit-desc">Записывай свои сделки</div>
          </div>
          <div className="habit-streak">🔥 12</div>
        </div>

        <div className="habit-item">
          <div className="habit-icon" style={{ background: 'rgba(212, 163, 115, 0.2)' }}>
            🎯
          </div>
          <div className="habit-info">
            <div className="habit-name">Дисциплина</div>
            <div className="habit-desc">Следуй своему плану</div>
          </div>
          <div className="habit-streak">🔥 5</div>
        </div>
      </div>

      {/* Быстрый доступ к боту */}
      <div className="card quick-access">
        <div className="quick-icon">🤖</div>
        <div className="quick-text">
          <h3>AI Торговый Бот</h3>
          <p>Получи сигнал от нашего умного помощника</p>
        </div>
        <div className="quick-arrow">→</div>
      </div>
    </div>
  )
}

export default HomeScreen
