import { useState, useEffect, useRef } from 'react'
import TelegramSDK from '@twa-dev/sdk'
import './App.css'
import NavigatorScreen from './components/NavigatorScreen'
import JournalScreen from './components/JournalScreen'
import ProfileScreen from './components/ProfileScreen'

const TABS = ['home', 'navigator', 'journal', 'settings']

function DateTimeWidget() {
  const [dateTime, setDateTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  
  const timeStr = dateTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = dateTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  const dayName = dateTime.toLocaleDateString('ru-RU', { weekday: 'short' })
  
  return (
    <div className="datetime-widget">
      <div className="datetime-time">{timeStr}</div>
      <div className="datetime-date">
        <span className="datetime-day">{dayName}</span>
        <span className="datetime-sep">·</span>
        <span>{dateStr}</span>
      </div>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState(null)
  const [sliderPosition, setSliderPosition] = useState(0)
  const [weatherState, setWeatherState] = useState('neutral')
  const [sdkReady, setSdkReady] = useState(false)
  
  const navRef = useRef(null)

  // Смена фона при переключении вкладок
  useEffect(() => {
    const app = document.querySelector('.app')
    if (!app) return
    
    switch (activeTab) {
      case 'home':
        app.style.backgroundImage = "url('/assets/yacht-paradise.jpg')"
        break
      case 'navigator':
        app.style.backgroundImage = "url('/assets/yacht-paradise.jpg')"
        break
      case 'journal':
        app.style.backgroundImage = "url('/assets/yacht-paradise.jpg')"
        break
      case 'settings':
        app.style.backgroundImage = "url('/assets/yacht-paradise.jpg')"
        break
      default:
        app.style.backgroundImage = "url('/assets/yacht-paradise.jpg')"
    }
  }, [activeTab])

  // Инициализация Telegram SDK
  useEffect(() => {
    try {
      if (TelegramSDK) {
        TelegramSDK.ready()
        TelegramSDK.expand()
        setSdkReady(true)
      }
    } catch (error) {
      console.log('Telegram SDK not available (running outside Telegram)')
    }
  }, [])

  // Обновление погоды
  const updateWeather = (state) => {
    setWeatherState(state)
    localStorage.setItem('weatherState', state)
    
    if (TelegramSDK.HapticFeedback) {
      if (state === 'profit') {
        TelegramSDK.HapticFeedback.notificationOccurred('success')
      } else if (state === 'loss') {
        TelegramSDK.HapticFeedback.notificationOccurred('warning')
      }
    }
  }

  // Обновляем позицию слайдера
  useEffect(() => {
    if (navRef.current) {
      const navItems = navRef.current.querySelectorAll('.nav-item')
      const activeIndex = TABS.indexOf(activeTab)
      const activeItem = navItems[activeIndex]
      
      if (activeItem) {
        const navRect = navRef.current.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        const position = itemRect.left - navRect.left + itemRect.width / 2 - 25
        setSliderPosition(position)
      }
    }
  }, [activeTab])

  const navigateTo = (tab) => {
    setActiveTab(tab)
    if (TelegramSDK.HapticFeedback) {
      TelegramSDK.HapticFeedback.selectionChanged()
    }
  }

  const renderScreen = () => {
    try {
      switch (activeTab) {
        case 'home':
          return <NavigatorScreen />
        case 'navigator':
          return <NavigatorScreen />
        case 'journal':
          return <JournalScreen />
        case 'settings':
          return <ProfileScreen user={user} />
        default:
          return <NavigatorScreen />
      }
    } catch (err) {
      return (
        <div style={{ padding: '20px', color: '#fff', textAlign: 'center' }}>
          <h2>Ошибка загрузки</h2>
          <p>{err.message}</p>
        </div>
      )
    }
  }

  return (
    <div className="app">
      {/* datetime widget */}
      <div className="datetime-top">
        <DateTimeWidget />
      </div>
      
      {/* Основной контент */}
      <div className="main-content">
        {renderScreen()}
      </div>

      {/* Нижняя навигация */}
      <nav className="bottom-nav" ref={navRef}>
        <div className="nav-slider" style={{ left: `${sliderPosition}px` }}></div>
        
        <div 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => navigateTo('home')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Главная</span>
        </div>
        
        <div 
          className={`nav-item nav-item-center ${activeTab === 'navigator' ? 'active' : ''}`}
          onClick={() => navigateTo('navigator')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
          <span>Штурман</span>
        </div>
        
        <div 
          className={`nav-item ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => navigateTo('journal')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Журнал</span>
        </div>
        
        <div 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => navigateTo('settings')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Настройки</span>
        </div>
      </nav>
    </div>
  )
}

export default App
