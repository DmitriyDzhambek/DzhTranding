import { useState, useEffect, useCallback, useRef } from 'react'
import TelegramSDK from '@twa-dev/sdk'
import './MarketTimer.css'

/**
 * MarketTimer — таймер до открытия/закрытия рынка
 * Показывает точное время открытия и отправляет уведомления
 */
function MarketTimer() {
  const [timeLeft, setTimeLeft] = useState({})
  const [isOpen, setIsOpen] = useState(false)
  const [nextEvent, setNextEvent] = useState('')
  const [nextOpenTime, setNextOpenTime] = useState('')
  const [localTime, setLocalTime] = useState('')
  const [showNotification, setShowNotification] = useState(false)
  const lastNotificationRef = useRef(null)

  // Форматирование времени
  const formatTimeUTC = (date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'UTC'
    }) + ' UTC'
  }

  // Расчёт времени до следующего события
  const calculateTimeLeft = useCallback(() => {
    const now = new Date()
    const utcHour = now.getUTCHours()
    const utcMinute = now.getUTCMinutes()
    const utc = utcHour * 60 + utcMinute
    
    // Локальное время пользователя
    const localTimeStr = now.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // Торговые сессии (в UTC)
    // Лондон: 07:00-16:00 UTC
    // Нью-Йорк: 12:00-21:00 UTC
    // Перекрытие (самая активная): 12:00-16:00 UTC
    
    const dayOfWeek = now.getUTCDay() // 0=Вс, 6=Сб
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
    
    let targetTime
    let eventLabel
    let openTimeLabel
    
    if (isWeekday) {
      // Определяем ближайшую сессию
      if (utc < 420) {
        // До Лондона (07:00 UTC)
        targetTime = new Date(now)
        targetTime.setUTCHours(7, 0, 0, 0)
        eventLabel = 'Открытие Лондона'
        openTimeLabel = '07:00 UTC'
      } else if (utc < 720) {
        // До Нью-Йорка (12:00 UTC)
        targetTime = new Date(now)
        targetTime.setUTCHours(12, 0, 0, 0)
        eventLabel = 'Открытие Нью-Йорка'
        openTimeLabel = '12:00 UTC'
      } else if (utc < 1260) {
        // Рынок открыт (до закрытия Нью-Йорка 21:00 UTC = 1260 минут)
        setIsOpen(true)
        setNextEvent('Закрытие Нью-Йорка')
        setNextOpenTime('21:00 UTC')
        targetTime = new Date(now)
        targetTime.setUTCHours(21, 0, 0, 0)
        
        // Отправляем уведомление, что рынок открыт
        const today = now.toDateString()
        if (lastNotificationRef.current !== today) {
          sendNotification('🟢 Рынок открыт!', 'Торговая сессия активна. EUR/USD торгуется.')
          lastNotificationRef.current = today
        }
        
        return { isOpen: true, event: 'Закрытие рынка', localTime: localTimeStr }
      } else {
        // До следующего понедельника
        const daysUntilMonday = 7 - dayOfWeek
        targetTime = new Date(now)
        targetTime.setDate(targetTime.getDate() + daysUntilMonday)
        targetTime.setUTCHours(0, 0, 0, 0)
        eventLabel = 'Открытие недели'
        openTimeLabel = 'Пн 07:00 UTC'
      }
    } else {
      // Выходные — до понедельника 00:00 UTC
      const daysUntilMonday = 7 - dayOfWeek
      targetTime = new Date(now)
      targetTime.setDate(targetTime.getDate() + daysUntilMonday)
      targetTime.setUTCHours(0, 0, 0, 0)
      eventLabel = 'Открытие торговой недели'
      openTimeLabel = 'Пн 07:00 UTC'
    }
    
    const diff = targetTime - now
    
    if (diff <= 0) {
      setIsOpen(isWeekday)
      setNextEvent(isWeekday ? 'Рынок открыт' : 'Открытие недели')
      return { isOpen: isWeekday, event: isWeekday ? 'Рынок открыт' : 'Открытие недели', localTime: localTimeStr }
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    setIsOpen(false)
    setNextEvent(eventLabel)
    setNextOpenTime(openTimeLabel)
    
    setTimeLeft({ days, hours, minutes, seconds })
    
    // Отправляем уведомление, если до открытия менее 1 часа
    const totalMinutes = days * 24 * 60 + hours * 60 + minutes
    const nowStr = now.toDateString() + '_' + utcHour + '_' + utcMinute
    if (totalMinutes <= 60 && lastNotificationRef.current !== nowStr) {
      sendNotification('⏰ Скоро открытие!', `Рынок откроется через ${hours}ч ${minutes}мин`)
      lastNotificationRef.current = nowStr
    }
    
    return { days, hours, minutes, seconds, isOpen: false, event: eventLabel, localTime: localTimeStr }
  }, [])

  // Отправка уведомления через Telegram
  const sendNotification = (title, message) => {
    try {
      // Показываем нативное уведомление Telegram
      if (TelegramSDK?.showPopup) {
        TelegramSDK.showPopup({
          title: title,
          message: message,
          buttons: [{ type: 'ok', text: 'Понятно' }]
        })
      }
      
      // Или используем HapticFeedback для вибрации
      if (TelegramSDK?.HapticFeedback) {
        TelegramSDK.HapticFeedback.notificationOccurred('success')
      }
      
      // Показываем всплывающее уведомление в приложении
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 5000)
    } catch (error) {
      console.log('Уведомление:', title, message)
    }
  }

  useEffect(() => {
    // Обновляем каждую секунду
    const timer = setInterval(() => {
      calculateTimeLeft()
    }, 1000)
    
    // Первоначальный расчёт
    calculateTimeLeft()
    
    return () => clearInterval(timer)
  }, [calculateTimeLeft])

  // Обновление локального времени
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setLocalTime(now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      }))
    }
    
    updateTime()
    const timer = setInterval(updateTime, 1000)
    
    return () => clearInterval(timer)
  }, [])

  // Форматирование с ведущим нулём
  const pad = (num) => num.toString().padStart(2, '0')

  if (isOpen) {
    return (
      <div className="market-timer market-open">
        <div className="timer-icon">🟢</div>
        <div className="timer-content">
          <h3>Рынок открыт</h3>
          <p>Торговая сессия активна • До закрытия: {nextOpenTime}</p>
        </div>
        <div className="timer-pulse"></div>
        
        {/* Уведомление о закрытии */}
        <div className="close-warning">
          ⚠️ Закройте позиции до {nextOpenTime}
        </div>
      </div>
    )
  }

  return (
    <div className="market-timer market-closed">
      <div className="timer-icon">⏸️</div>
      <div className="timer-content">
        <h3>Рынок закрыт</h3>
        <p>Откроется в {nextOpenTime} ({nextEvent})</p>
      </div>
      
      {/* Обратный отсчёт */}
      <div className="timer-countdown">
        {timeLeft.days > 0 && (
          <>
            <div className="time-block">
              <span className="time-value">{pad(timeLeft.days)}</span>
              <span className="time-label">дн</span>
            </div>
            <span className="time-separator">:</span>
          </>
        )}
        <div className="time-block">
          <span className="time-value">{pad(timeLeft.hours)}</span>
          <span className="time-label">час</span>
        </div>
        <span className="time-separator">:</span>
        <div className="time-block">
          <span className="time-value">{pad(timeLeft.minutes)}</span>
          <span className="time-label">мин</span>
        </div>
        <span className="time-separator">:</span>
        <div className="time-block">
          <span className="time-value">{pad(timeLeft.seconds)}</span>
          <span className="time-label">сек</span>
        </div>
      </div>
      
      {/* Информационная панель */}
      <div className="timer-info">
        <div className="info-item">
          <span className="info-label">Ближайшая сессия:</span>
          <span className="info-value">{nextEvent} ({nextOpenTime})</span>
        </div>
        <div className="info-item">
          <span className="info-label">Пара:</span>
          <span className="info-value">EUR/USD</span>
        </div>
        <div className="info-item">
          <span className="info-label">Источник:</span>
          <span className="info-value">OANDA / TradingView</span>
        </div>
        <div className="info-item">
          <span className="info-label">Ваше время:</span>
          <span className="info-value">{localTime}</span>
        </div>
        <div className="info-item">
          <span className="info-label">UTC время:</span>
          <span className="info-value">{formatTimeUTC(new Date())}</span>
        </div>
      </div>
      
      {/* Кнопка для теста уведомлений */}
      <button 
        className="test-notif-btn"
        onClick={() => sendNotification('🔔 Тест', 'Уведомления работают!')}
      >
        🔔 Проверить уведомления
      </button>
    </div>
  )
}

export default MarketTimer
