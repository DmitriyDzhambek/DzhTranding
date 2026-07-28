import { useState, useEffect, useRef, useCallback } from 'react'
import TelegramSDK from '@twa-dev/sdk'
import './App.css'
import { MarketDataProvider, useMarket } from './contexts/MarketDataContext'
import HomeScreen from './components/HomeScreen'
import NavigatorScreen from './components/NavigatorScreen'
import ChartScreen from './components/ChartScreen'
import ChatScreen from './components/ChatScreen'
import JournalScreen from './components/JournalScreen'
import ProfileScreen from './components/ProfileScreen'
import HabitsScreen from './components/HabitsScreen'
import BottleScreen from './components/BottleScreen'
import SniperMode from './components/SniperMode'
import TouchTrigger from './components/TouchTrigger'
import LiquidityClusters from './components/LiquidityClusters'
import RSIDivergence from './components/RSIDivergence'
import SilenceFilter from './components/SilenceFilter'
import WeatherOverlay from './components/WeatherOverlay'
import CandleTimer from './components/CandleTimer'

const TABS = ['home', 'chart', 'navigator', 'chat', 'journal', 'settings']

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

/**
 * AppShell — внутри провайдера рыночных данных,
 * поэтому может раздавать priceHistory / currentPrice всем аналитическим блокам.
 */
function AppShell() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState(null)
  const [sliderPosition, setSliderPosition] = useState(0)
  const [weatherState, setWeatherState] = useState(() => localStorage.getItem('weatherState') || 'neutral')

  const navRef = useRef(null)
  const { priceHistory, currentPrice, marketSignals, connected, source } = useMarket()

  const isWeekday = (() => {
    const day = new Date().getUTCDay()
    return day >= 1 && day <= 5
  })()

  const marketState =
    marketSignals.trend === 'bullish' ? 'bull' : marketSignals.trend === 'bearish' ? 'bear' : 'flat'

  // Инициализация Telegram SDK + данные пользователя
  useEffect(() => {
    try {
      TelegramSDK.ready()
      TelegramSDK.expand()

      const tgUser = TelegramSDK.initDataUnsafe?.user
      if (tgUser) {
        setUser({
          id: tgUser.id,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          username: tgUser.username
        })
      }
    } catch {
      console.log('[v0] Telegram SDK недоступен (запуск вне Telegram)')
    }
  }, [])

  // Обновление «погоды» терминала после сделки
  const updateWeather = useCallback((state) => {
    setWeatherState(state)
    localStorage.setItem('weatherState', state)

    try {
      if (TelegramSDK.HapticFeedback) {
        if (state === 'profit') TelegramSDK.HapticFeedback.notificationOccurred('success')
        else if (state === 'loss') TelegramSDK.HapticFeedback.notificationOccurred('warning')
      }
    } catch {
      /* вне Telegram haptic недоступен */
    }
  }, [])

  // Позиция слайдера навигации
  useEffect(() => {
    if (!navRef.current) return

    const updateSlider = () => {
      const navItems = navRef.current.querySelectorAll('.nav-item')
      const activeItem = navItems[TABS.indexOf(activeTab)]
      if (!activeItem) return

      const navRect = navRef.current.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()
      setSliderPosition(itemRect.left - navRect.left + itemRect.width / 2 - 25)
    }

    updateSlider()
    window.addEventListener('resize', updateSlider)
    return () => window.removeEventListener('resize', updateSlider)
  }, [activeTab])

  const navigateTo = (tab) => {
    setActiveTab(tab)
    try {
      if (TelegramSDK.HapticFeedback) TelegramSDK.HapticFeedback.selectionChanged()
    } catch {
      /* noop */
    }
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen isWeekday={isWeekday} />

      case 'chart':
        return (
          <div className="screen-stack">
            <ChartScreen />
            <LiquidityClusters priceHistory={priceHistory} currentPrice={currentPrice} />
            <RSIDivergence priceHistory={priceHistory} currentPrice={currentPrice} />
            <SilenceFilter priceHistory={priceHistory} currentPrice={currentPrice} />
          </div>
        )

      case 'navigator':
        return (
          <div className="screen-stack">
            <CandleTimer />
            <NavigatorScreen />
            <TouchTrigger
              user={user}
              isWeekday={isWeekday}
              marketState={marketState}
              onWeatherUpdate={updateWeather}
              priceHistory={priceHistory}
              currentPrice={currentPrice}
            />
            <SniperMode />
          </div>
        )

      case 'chat':
        return <ChatScreen user={user} />

      case 'journal':
        return <JournalScreen />

      case 'settings':
        return (
          <div className="screen-stack">
            <ProfileScreen user={user} />
            <HabitsScreen priceHistory={priceHistory} currentPrice={currentPrice} />
            <BottleScreen />
          </div>
        )

      default:
        return <HomeScreen isWeekday={isWeekday} />
    }
  }

  return (
    <div className="app">
      {/* Эмоциональная погода терминала */}
      <WeatherOverlay profitState={weatherState} />

      {/* Дата и время */}
      <div className="datetime-top">
        <DateTimeWidget />
        <div
          className={`feed-status ${connected ? 'live' : 'offline'}`}
          title={connected ? `Источник данных: ${source || '—'}` : 'Нет связи с рынком'}
        >
          <span className="feed-dot" aria-hidden="true"></span>
          <span>{connected ? 'Live' : 'Off'}</span>
          <span className="sr-only">
            {connected ? 'Данные рынка обновляются' : 'Нет связи с рынком'}
          </span>
        </div>
      </div>

      {/* Основной контент */}
      <main className="main-content">{renderScreen()}</main>

      {/* Нижняя навигация */}
      <nav className="bottom-nav" ref={navRef} aria-label="Основная навигация">
        <div className="nav-slider" style={{ left: `${sliderPosition}px` }}></div>

        <button
          type="button"
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => navigateTo('home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Главная</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => navigateTo('chart')}
          aria-current={activeTab === 'chart' ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>График</span>
        </button>

        <button
          type="button"
          className={`nav-item nav-item-center ${activeTab === 'navigator' ? 'active' : ''}`}
          onClick={() => navigateTo('navigator')}
          aria-current={activeTab === 'navigator' ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
          <span>Штурман</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => navigateTo('chat')}
          aria-current={activeTab === 'chat' ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"></path>
          </svg>
          <span>AI-чат</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => navigateTo('journal')}
          aria-current={activeTab === 'journal' ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Журнал</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => navigateTo('settings')}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Настройки</span>
        </button>
      </nav>
    </div>
  )
}

function App() {
  return (
    <MarketDataProvider>
      <AppShell />
    </MarketDataProvider>
  )
}

export default App
