import { useState, useEffect, useRef } from 'react'
import './CandleTimer.css'

/**
 * CandleTimer — обратный отсчёт до закрытия текущей 1-минутной свечи
 * Синхронизирован с реальными свечами Binance (1m)
 * Неактивен когда рынок закрыт
 */
function CandleTimer() {
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [progress, setProgress] = useState(100)
  const [isMarketOpen, setIsMarketOpen] = useState(false)
  const wsRef = useRef(null)
  const lastCandleTimeRef = useRef(null)

  // Проверяем статус рынка каждую секунду
  useEffect(() => {
    const updateStatus = () => {
      import('../services/MarketAvailability').then(mod => {
        const cd = mod.getTimeUntilMarketOpen()
        setIsMarketOpen(cd.isOpen)
      })
    }
    
    updateStatus()
    const interval = setInterval(updateStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Подключаемся к Binance WebSocket для 1-минутных свечей
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/eurusdt@kline_1m')
    
    ws.onopen = () => {
      console.log('✅ CandleTimer: WebSocket подключён к Binance 1m')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const kline = data.k
        
        // t = true означает, что свеча закрылась
        if (kline.t !== undefined && kline.x) {
          // Свеча закрылась — новая начинается
          lastCandleTimeRef.current = kline.t
          const elapsed = Math.floor((Date.now() - kline.t) / 1000)
          const remaining = 60 - (elapsed % 60)
          setSecondsLeft(remaining)
          setProgress((remaining / 60) * 100)
        }
      } catch (err) {
        console.error('CandleTimer ошибка:', err)
      }
    }
    
    ws.onerror = (error) => {
      console.error('CandleTimer WebSocket ошибка:', error)
    }
    
    wsRef.current = ws
    
    // Обновляем каждую секунду
    const interval = setInterval(() => {
      if (lastCandleTimeRef.current) {
        const elapsed = Math.floor((Date.now() - lastCandleTimeRef.current) / 1000)
        const remaining = 60 - (elapsed % 60)
        setSecondsLeft(remaining)
        setProgress((remaining / 60) * 100)
      }
    }, 1000)
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      clearInterval(interval)
    }
  }, [])
  
  // Форматируем секунды в MM:SS
  const formatTime = () => {
    const mm = Math.floor(secondsLeft / 60)
    const ss = secondsLeft % 60
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }
  
  const hint = !isMarketOpen 
    ? '🔴 Рынок закрыт'
    : progress > 75 
      ? '⚡ Скоро смена' 
      : progress > 50 
        ? '📊 Ожидание' 
        : '🔄 Новая свеча'
  
  return (
    <div className={`candle-timer-widget ${!isMarketOpen ? 'inactive' : ''}`}>
      <div className="candle-timer-header">
        <span className="candle-icon">🕯️</span>
        <span className="candle-label">1 мин свеча</span>
      </div>
      
      <div className="candle-timer-value">
        <span className="candle-timer-number">{formatTime()}</span>
      </div>
      
      {/* Круговой прогресс */}
      <svg className="candle-progress-ring" viewBox="0 0 100 100">
        <circle
          className="candle-progress-bg"
          cx="50" cy="50" r="45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        <circle
          className="candle-progress-fill"
          cx="50" cy="50" r="45"
          fill="none"
          stroke={progress > 50 ? '#34d399' : progress > 20 ? '#fbbf24' : '#f87171'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      
      <div className="candle-timer-info">
        <span className="candle-trend-hint">{hint}</span>
      </div>
    </div>
  )
}

export default CandleTimer
