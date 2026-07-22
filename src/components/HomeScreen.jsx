import { useState, useEffect } from 'react'
import './HomeScreen.css'

function HomeScreen({ user, isWeekday, marketState = 'flat' }) {
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

  // Получаем данные о состоянии рынка
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
            <h3>📊 Торговый рынок</h3>
            <p className="status-text">
              {isWeekday ? 'Рынок открыт • Будний день' : 'Рынок закрыт • Выходной'}
            </p>
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
