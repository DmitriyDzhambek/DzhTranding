import { useState, useEffect } from 'react'
import './HomeScreen.css'

function HomeScreen({ user, marketState = 'flat', price: propPrice, change: propChange, isUp: propIsUp, lastUpdate: propLastUpdate }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
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

      {/* Текущая цена */}
      <div className="card live-price-card">
        <div className="live-price-header">
          <span className="live-indicator">
            <span className="live-dot"></span>
            EUR/USD LIVE
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

      {/* Быстрые ссылки */}
      <div className="quick-links">
        <div className="quick-link-item" style={{ background: 'rgba(52, 211, 153, 0.15)' }}>
          <span className="quick-link-icon">📊</span>
          <span className="quick-link-label">Привычки</span>
        </div>
        <div className="quick-link-item" style={{ background: 'rgba(142, 202, 230, 0.15)' }}>
          <span className="quick-link-icon">🍾</span>
          <span className="quick-link-label">Бутылка</span>
        </div>
        <div className="quick-link-item" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
          <span className="quick-link-icon">🤖</span>
          <span className="quick-link-label">AI Бот</span>
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
