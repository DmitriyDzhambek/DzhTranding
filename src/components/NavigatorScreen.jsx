import { useState, useEffect } from 'react'
import './NavigatorScreen.css'
import { useMarketData } from '../hooks/useMarketData'

function NavigatorScreen() {
  const { eurUsd, marketSignals, loading } = useMarketData()
  const [signals, setSignals] = useState(() => {
    try {
      const saved = localStorage.getItem('navigatorSignals')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [priceHistory, setPriceHistory] = useState([])
  const [signalStage, setSignalStage] = useState(-1)
  const [signalDirection, setSignalDirection] = useState(null)
  const [signalStartTime, setSignalStartTime] = useState(null)
  
  // Обновляем историю цен
  useEffect(() => {
    if (eurUsd) {
      setPriceHistory(prev => {
        const updated = [...prev, eurUsd]
        return updated.slice(-200)
      })
    }
  }, [eurUsd])
  
  const signalStages = [
    { text: 'Цена подходит к зоне интереса', icon: '📍', color: '#fbbf24', duration: 30000 },
    { text: 'EMA и MACD начинают подтверждать сценарий', icon: '📊', color: '#3b82f6', duration: 45000 },
    { text: 'Осталось дождаться закрытия свечи', icon: '⏳', color: '#a78bfa', duration: 30000 },
    { text: '🟢 Теперь вход выглядит оправданным', icon: '🎯', color: '#34d399', duration: 0 }
  ]
  
  const confidence = marketSignals?.confidence || 0
  const trend = marketSignals?.trend || 'neutral'
  const activity = marketSignals?.activity || 'low'
  const isSignalReady = eurUsd && (signalDirection === 'buy' || signalDirection === 'sell') && confidence > 40
  
  // Определяем направление
  useEffect(() => {
    if (!eurUsd) return
    if (confidence < 30) {
      setSignalDirection(null)
      return
    }
    if (trend === 'bullish' && activity !== 'low' && confidence > 40) {
      setSignalDirection('buy')
    } else if (trend === 'bearish' && activity !== 'low' && confidence > 40) {
      setSignalDirection('sell')
    } else {
      setSignalDirection(null)
    }
  }, [eurUsd, trend, activity, confidence])
  
  // Таймер стадии
  useEffect(() => {
    if (!isSignalReady) {
      setSignalStage(-1)
      setSignalStartTime(null)
      return
    }
    if (!signalStartTime) {
      setSignalStartTime(Date.now())
      setSignalStage(0)
    }
    const timer = setInterval(() => {
      const elapsed = Date.now() - signalStartTime
      const currentStageData = signalStages[signalStage]
      if (currentStageData && elapsed >= currentStageData.duration) {
        const next = signalStage + 1
        if (next < signalStages.length) {
          setSignalStage(next)
          setSignalStartTime(Date.now())
        }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isSignalReady, signalStartTime, signalStage])
  
  const currentStage = signalStage >= 0 && signalStage < signalStages.length ? signalStages[signalStage] : null
  const stageProgress = signalStartTime && currentStage?.duration > 0 ? Math.min(100, ((Date.now() - signalStartTime) / currentStage.duration) * 100) : 100
  
  const getMainSignal = () => {
    if (signalStage === 3) {
      const dir = signalDirection === 'buy' ? 'buy' : 'sell'
      return { type: dir, text: dir === 'buy' ? 'BUY' : 'SELL', color: dir === 'buy' ? '#34d399' : '#f87171' }
    }
    return { type: 'preparing', text: currentStage?.text || 'Анализ...', color: currentStage?.color || '#fbbf24' }
  }
  
  const mainSignal = getMainSignal()
  const signalType = signalStage === 3 ? signalDirection : null
  const rsi = marketSignals.rsi || 50
  
  // Сохраняем сигнал
  const saveSignal = () => {
    if (signalStage < 3 || !signalType) return
    const newSignal = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      type: signalType === 'buy' ? 'BUY' : 'SELL',
      price: eurUsd?.toFixed(5) || '—'
    }
    const updated = [newSignal, ...signals].slice(0, 20)
    setSignals(updated)
    localStorage.setItem('navigatorSignals', JSON.stringify(updated))
  }
  
  // === RENDER ===
  return (
    <div className="navigator-screen">
      {/* Карточка цены */}
      <div className="price-card">
        <div className="price-header">
          <span className="price-pair">EUR/USD</span>
          <span className="price-source">Binance Live</span>
        </div>
        <div className="price-main">
          {eurUsd ? eurUsd.toFixed(5) : 'Загрузка...'}
        </div>
        <div className="price-meta">
          <span className="price-change">
            {marketSignals.signal?.text || 'Ожидание данных'}
          </span>
        </div>
      </div>
      
      {/* Индикаторы */}
      <div className="indicators-row">
        <div className="indicator-small">
          <div className="indicator-label">RSI</div>
          <div className="indicator-value">{rsi.toFixed(1)}</div>
        </div>
        <div className="indicator-small">
          <div className="indicator-label">Тренд</div>
          <div className="indicator-value" style={{ color: trend === 'bullish' ? '#34d399' : trend === 'bearish' ? '#f87171' : '#94a3b8' }}>
            {trend === 'bullish' ? '▲' : trend === 'bearish' ? '▼' : '—'}
          </div>
        </div>
        <div className="indicator-small">
          <div className="indicator-label">Уверенность</div>
          <div className="indicator-value">{confidence}%</div>
        </div>
      </div>
      
      {/* Вердикт Штурмана */}
      <div className="verdict-card">
        <div className="verdict-header">
          <span className="verdict-title">Вердикт Штурмана</span>
          <span className={`signal-badge ${mainSignal.type} ${signalStage < 3 ? 'preparing' : ''}`}>
            {mainSignal.text}
          </span>
        </div>
        
        {signalStage >= 0 && signalStage < 3 && (
          <div className="signal-progress">
            <div className="progress-icon" style={{ color: currentStage?.color }}>{currentStage?.icon}</div>
            <div className="progress-text" style={{ color: currentStage?.color }}>{currentStage?.text}</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${stageProgress}%` }}></div>
            </div>
            <div className="progress-stages">
              {signalStages.map((stage, idx) => (
                <div 
                  key={idx} 
                  className={`progress-stage-dot ${idx < signalStage ? 'completed' : ''} ${idx === signalStage ? 'active' : ''}`}
                  style={{ backgroundColor: idx <= signalStage ? stage.color : 'rgba(255,255,255,0.1)' }}
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="verdict-body">
          <div className="signal-info-row">
            <span>Свеча:</span>
            <span>M15</span>
          </div>
          <div className="signal-info-row">
            <span>Фаза:</span>
            <span>{activity}</span>
          </div>
        </div>
        
        <button 
          className="signal-action-btn" 
          onClick={saveSignal} 
          disabled={signalStage < 3}
        >
          {signalStage < 3 ? '⏳ Ожидание...' : '🚀 Открыть сделку'}
        </button>
      </div>
      
      {/* История сигналов */}
      {signals.length > 0 && (
        <div className="signals-panel">
          <div className="panel-title">Последние сигналы</div>
          <div className="signals-list">
            {signals.slice(0, 5).map(sig => (
              <div key={sig.id} className="signal-item">
                <span className="signal-time">{sig.time}</span>
                <span className={`signal-type ${sig.type === 'BUY' ? 'buy' : 'sell'}`}>{sig.type}</span>
                <span className="signal-price">{sig.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NavigatorScreen
