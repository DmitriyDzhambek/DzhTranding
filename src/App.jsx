import { useState, useEffect, useRef } from 'react'
import './App.css'
import NavigatorScreen from './components/NavigatorScreen'
import JournalScreen from './components/JournalScreen'
import ProfileScreen from './components/ProfileScreen'

const TABS = ['home', 'navigator', 'journal', 'settings']

function DateTimeWidget() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
      setDate(now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])
  
  return (
    <div className="datetime-widget">
      <div className="datetime-time">{time}</div>
      <div className="datetime-date">{date}</div>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [sliderPosition, setSliderPosition] = useState(0)
  const navRef = useRef(null)

  useEffect(() => {
    if (navRef.current) {
      const items = navRef.current.querySelectorAll('.nav-item')
      const idx = TABS.indexOf(activeTab)
      if (items[idx]) {
        const navR = navRef.current.getBoundingClientRect()
        const itemR = items[idx].getBoundingClientRect()
        setSliderPosition(itemR.left - navR.left + itemR.width / 2 - 25)
      }
    }
  }, [activeTab])

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
      case 'navigator':
        return <NavigatorScreen />
      case 'journal':
        return <JournalScreen />
      case 'settings':
        return <ProfileScreen />
      default:
        return <NavigatorScreen />
    }
  }

  return (
    <div className="app">
      <div className="datetime-top">
        <DateTimeWidget />
      </div>
      
      <div className="main-content">
        {renderScreen()}
      </div>

      <nav className="bottom-nav" ref={navRef}>
        <div className="nav-slider" style={{ left: sliderPosition + 'px' }}></div>
        
        {TABS.map(tab => (
          <div 
            key={tab}
            className={'nav-item' + (activeTab === tab ? ' active' : '')}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'home' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>}
            {tab === 'navigator' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>}
            {tab === 'journal' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>}
            {tab === 'settings' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>}
            <span>{tab === 'home' ? 'Главная' : tab === 'navigator' ? 'Штурман' : tab === 'journal' ? 'Журнал' : 'Настройки'}</span>
          </div>
        ))}
      </nav>
    </div>
  )
}

export default App
