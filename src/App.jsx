import { useState, useEffect, useRef } from 'react'
import TelegramSDK from '@twa-dev/sdk'
import './App.css'
import HomeScreen from './components/HomeScreen'
import BotScreen from './components/BotScreen'
import ChatScreen from './components/ChatScreen'
import ProfileScreen from './components/ProfileScreen'
import { useMarketState } from './hooks/useMarketState'
import MarketBackground from './components/MarketBackground'
import WeatherOverlay from './components/WeatherOverlay'

const TABS = ['home', 'bot', 'chat', 'profile']

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState(null)
  const [isWeekday, setIsWeekday] = useState(true)
  const [sliderPosition, setSliderPosition] = useState(0)
  const [weatherState, setWeatherState] = useState('neutral')
  const [sdkReady, setSdkReady] = useState(false)
  
  const navRef = useRef(null)

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

  // Определяем состояние рынка
  const { marketState, price, change, isUp } = useMarketState()

  // Загрузка состояния погоды из localStorage
  useEffect(() => {
    const savedWeather = localStorage.getItem('weatherState')
    if (savedWeather) {
      setWeatherState(savedWeather)
    }
  }, [])

  // Применение класса к html для плавного изменения фона
  useEffect(() => {
    const html = document.documentElement
    html.className = `market-${marketState}`
  }, [marketState])

  // Обновление погоды
  const updateWeather = (state) => {
    setWeatherState(state)
    localStorage.setItem('weatherState', state)
    
    // Вибрация при смене погоды
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
        const position = itemRect.left - navRect.left + itemRect.width / 2 - 30
        
        setSliderPosition(position)
      }
    }
  }, [activeTab])

  const navigateTo = (tab) => {
    setActiveTab(tab)
    // Вибрация при переключении
    if (TelegramSDK.HapticFeedback) {
      TelegramSDK.HapticFeedback.selectionChanged()
    }
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen user={user} isWeekday={isWeekday} marketState={marketState} />
      case 'bot':
        return <BotScreen user={user} isWeekday={isWeekday} marketState={marketState} onWeatherUpdate={updateWeather} />
      case 'chat':
        return <ChatScreen user={user} />
      case 'profile':
        return <ProfileScreen user={user} />
      default:
        return <HomeScreen user={user} isWeekday={isWeekday} marketState={marketState} />
    }
  }

  // Получаем индикатор состояния рынка
  const getMarketIndicator = () => {
    switch (marketState) {
      case 'bull':
        return { icon: '📈', label: 'Бычий', sublabel: 'Рост', color: '#34d399' }
      case 'bear':
        return { icon: '📉', label: 'Медвежий', sublabel: 'Падение', color: '#f87171' }
      default:
        return { icon: '🌊', label: 'Спокойный', sublabel: 'Флэт', color: '#8ecae6' }
    }
  }

  const indicator = getMarketIndicator()

  // Получаем данные для индикатора погоды
  const getWeatherIndicator = () => {
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

  const weatherIndicator = getWeatherIndicator()

  return (
    <div className="app">
      {/* Фоновое изображение рынка */}
      <MarketBackground marketState={marketState} />
      
      {/* Погода в терминале — анимированный overlay */}
      <WeatherOverlay profitState={weatherState} />
      
      {/* Индикатор состояния рынка */}
      <div className="market-indicator" style={{ '--indicator-color': indicator.color }}>
        <span className="indicator-icon">{indicator.icon}</span>
        <div className="indicator-text">
          <span className="indicator-label">{indicator.label}</span>
          <span className="indicator-sublabel">{indicator.sublabel}</span>
        </div>
        <span className="indicator-price">{price}</span>
      </div>

      {/* Индикатор погоды */}
      <div className={`weather-indicator ${weatherIndicator.className}`}>
        <span className="weather-icon">{weatherIndicator.icon}</span>
        <div className="weather-text">
          <span className="weather-label">{weatherIndicator.label}</span>
          <span className="weather-sublabel">{weatherIndicator.sublabel}</span>
        </div>
      </div>

      {/* Декоративные медузы на фоне */}
      <div className="jellyfish-bg">
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
      <div className="jellyfish-bg">
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
      <div className="jellyfish-bg">
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

      {/* Декоративные элементы */}
      <div className="leaf-decoration top-left">🌿</div>
      <div className="leaf-decoration top-right">🍃</div>
      
      {/* Основной контент */}
      <div className="main-content">
        {renderScreen()}
      </div>

      {/* Нижняя навигация с волновым слайдером */}
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
          className={`nav-item ${activeTab === 'bot' ? 'active' : ''}`}
          onClick={() => navigateTo('bot')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span>Бот</span>
        </div>
        
        <div 
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => navigateTo('chat')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>AI</span>
        </div>
        
        <div 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => navigateTo('profile')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Профиль</span>
        </div>
      </nav>
    </div>
  )
}

export default App
