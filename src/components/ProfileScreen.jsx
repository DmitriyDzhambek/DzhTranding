import { useState } from 'react'
import './ProfileScreen.css'

function ProfileScreen({ user }) {
  const [settings, setSettings] = useState({
    notifications: true,
    sound: true,
    autoSignals: false,
  })

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const stats = [
    { label: 'Сигналов получено', value: '47', icon: '📊' },
    { label: 'Точность AI', value: '78%', icon: '🎯' },
    { label: 'Дней подряд', value: '12', icon: '🔥' },
    { label: 'Уроков пройдено', value: '5', icon: '📚' },
  ]

  return (
    <div className="container animate-fadeIn">
      {/* Профиль */}
      <div className="profile-header">
        <div className="profile-avatar">🌺</div>
        <div className="profile-name">
          {user ? `${user.firstName} ${user.lastName || ''}` : 'Трейдер'}
        </div>
        <div className="profile-id">
          {user ? `@${user.username || user.id}` : 'ID: 123456'}
        </div>
      </div>

      {/* Статистика */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Привычки трейдера */}
      <h3 style={{ marginBottom: '12px', color: 'var(--primary-dark)' }}>
        🌱 Привычки трейдера
      </h3>
      <div className="habit-list">
        <div className="habit-item">
          <div className="habit-icon" style={{ background: 'rgba(64, 145, 108, 0.15)' }}>
            🧘
          </div>
          <div className="habit-info">
            <div className="habit-name">Утренняя медитация</div>
            <div className="habit-desc">5 минут спокойствия перед торговлей</div>
          </div>
          <div className="habit-streak">🔥 7</div>
        </div>

        <div className="habit-item">
          <div className="habit-icon" style={{ background: 'rgba(33, 158, 188, 0.15)' }}>
            📝
          </div>
          <div className="habit-info">
            <div className="habit-name">Торговый дневник</div>
            <div className="habit-desc">Записать все сделки дня</div>
          </div>
          <div className="habit-streak">🔥 12</div>
        </div>

        <div className="habit-item">
          <div className="habit-icon" style={{ background: 'rgba(212, 163, 115, 0.15)' }}>
            📚
          </div>
          <div className="habit-info">
            <div className="habit-name">Обучение</div>
            <div className="habit-desc">Изучить новую стратегию</div>
          </div>
          <div className="habit-streak">🔥 3</div>
        </div>

        <div className="habit-item">
          <div className="habit-icon" style={{ background: 'rgba(231, 111, 81, 0.15)' }}>
            🎯
          </div>
          <div className="habit-info">
            <div className="habit-name">Дисциплина</div>
            <div className="habit-desc">Следовать плану без отклонений</div>
          </div>
          <div className="habit-streak">🔥 5</div>
        </div>
      </div>

      {/* Настройки */}
      <h3 style={{ marginBottom: '12px', marginTop: '20px', color: 'var(--primary-dark)' }}>
        ⚙️ Настройки
      </h3>
      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">🔔</span>
            <div>
              <div className="setting-name">Уведомления</div>
              <div className="setting-desc">Получать push-уведомления о сигналах</div>
            </div>
          </div>
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={settings.notifications}
              onChange={() => toggleSetting('notifications')}
            />
            <span className={`toggle-slider ${settings.notifications ? 'on' : ''}`}></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">🔊</span>
            <div>
              <div className="setting-name">Звуки</div>
              <div className="setting-desc">Звуковые уведомления</div>
            </div>
          </div>
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={settings.sound}
              onChange={() => toggleSetting('sound')}
            />
            <span className={`toggle-slider ${settings.sound ? 'on' : ''}`}></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">🤖</span>
            <div>
              <div className="setting-name">Авто-сигналы</div>
              <div className="setting-desc">Получать сигналы автоматически</div>
            </div>
          </div>
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={settings.autoSignals}
              onChange={() => toggleSetting('autoSignals')}
            />
            <span className={`toggle-slider ${settings.autoSignals ? 'on' : ''}`}></span>
          </label>
        </div>
      </div>

      {/* Выход */}
      <button className="btn btn-primary" style={{ marginTop: '20px' }}>
        🚪 Выйти
      </button>

      {/* Версия */}
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-light)' }}>
        Секреты Большого Счастья v1.0.0<br/>
        Сделано с 💚 для спокойного трейдинга
      </div>
    </div>
  )
}

export default ProfileScreen
