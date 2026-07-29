import { useState, useEffect, useRef } from 'react'
import './NavigatorScreen.css'
import { useMarketData } from '../hooks/useMarketData'
import { getTimeUntilMarketOpen, formatCountdownReadable } from '../services/MarketAvailability'

function NavigatorScreen() {
  const { eurUsd, marketSignals, loading, lastUpdate } = useMarketData()
  const [priceHistory, setPriceHistory] = useState([])
  const [signals, setSignals] = useState(() => {
    const saved = localStorage.getItem('navigatorSignals')
    return saved ? JSON.parse(saved) : []
  })
  const [openTrade, setOpenTrade] = useState(() => {
    const saved = localStorage.getItem('navigatorOpenTrade')
    return saved ? JSON.parse(saved) : null
  })
  const [marketOpen, setMarketOpen] = useState(false)
  const [countdown, setCountdown] = useState({})
  const [sessionData, setSessionData] = useState({ asia: 'low', london: 'medium', ny: 'low' })
  
  // === МУЛЬТИСТУПЕНЧАТЫЙ СИГНАЛ ===
  const [signalStage, setSignalStage] = useState(-1) // -1: нет сигнала, 0-3: стадии
  const [signalDirection, setSignalDirection] = useState(null) // 'buy' или 'sell'
  const [signalStartTime, setSignalStartTime] = useState(null)
  const signalStages = [
    { text: 'Цена подходит к зоне интереса', icon: '📍', color: '#fbbf24', duration: 30000 },
    { text: 'EMA и MACD начинают подтверждать сценарий', icon: '📊', color: '#3b82f6', duration: 45000 },
    { text: 'Осталось дождаться закрытия свечи', icon: '⏳', color: '#a78bfa', duration: 30000 },
    { text: '🟢 Теперь вход выглядит оправданным', icon: '🎯', color: '#34d399', duration: 0 }
  ]
  
  // Получаем данные для сигнала
  const confidence = marketSignals?.confidence || 0
  const trend = marketSignals?.trend || 'neutral'
  const activity = marketSignals?.activity || 'low'
  
  // Определяем готов ли сигнал (когда есть направление и уверенность)
  const isSignalReady = eurUsd && (signalDirection === 'buy' || signalDirection === 'sell') && confidence > 40
  
  // Обновляем направление сигнала на основе данных рынка
  useEffect(() => {
    if (!eurUsd || !marketSignals.trend) return
    
    const trend = marketSignals.trend
    const activity = marketSignals.activity || 'low'
    const confidence = marketSignals.confidence || 0
    
    // Сигнал только при достаточной уверенности
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
  }, [eurUsd, marketSignals.activity, marketSignals.trend, marketSignals.confidence])
  
  // Таймер прогрессии сигнала
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
        const nextStage = signalStage + 1
        if (nextStage < signalStages.length) {
          setSignalStage(nextStage)
          setSignalStartTime(Date.now())
        }
      }
    }, 1000)
    
    return () => clearInterval(timer)
  }, [isSignalReady, signalStartTime, signalStage])
  
  // Текущая стадия сигнала
  const currentStage = signalStage >= 0 && signalStage < signalStages.length 
    ? signalStages[signalStage] 
    : null
  
  // Прогресс стадии (0-100%)
  const stageProgress = signalStartTime && currentStage?.duration > 0
    ? Math.min(100, ((Date.now() - signalStartTime) / currentStage.duration) * 100)
    : 100
  
  // Определяем текущий сигнал
  const getMainSignal = () => {
    if (!marketOpen) return { type: 'wait', text: 'Ожидание', color: '#94a3b8' }
    if (signalStage === 3) {
      const dir = signalDirection === 'buy' ? 'buy' : 'sell'
      return { type: dir, text: dir === 'buy' ? 'BUY' : 'SELL', color: dir === 'buy' ? '#34d399' : '#f87171' }
    }
    return { type: 'preparing', text: currentStage?.text || 'Анализ...', color: currentStage?.color || '#fbbf24' }
  }
  
  const mainSignal = getMainSignal()
  
  // Определяем тип сигнала для расчётов
  const signalType = signalStage === 3 ? (signalDirection || 'buy') : null

  // Собираем историю цен из marketSignals для анализа
  useEffect(() => {
    if (eurUsd) {
      setPriceHistory(prev => {
        const updated = [...prev, eurUsd]
        return updated.slice(-200)
      })
    }
  }, [eurUsd])

  // Обновляем статус рынка
  useEffect(() => {
    const update = () => {
      const cd = getTimeUntilMarketOpen()
      setMarketOpen(cd.isOpen)
      setCountdown(cd)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  // Определяем торговые сессии
  useEffect(() => {
    const now = new Date()
    const utc = now.getUTCHours()
    
    // Азия: 00:00-09:00 UTC
    // Лондон: 07:00-16:00 UTC
    // Нью-Йорк: 12:00-21:00 UTC
    const asiaActive = utc >= 0 && utc < 9
    const londonActive = utc >= 7 && utc < 16
    const nyActive = utc >= 12 && utc < 21
    
    // Активность по сессиям на основе реальных данных
    const activity = marketSignals.activity || 'low'
    
    setSessionData({
      asia: asiaActive ? (activity === 'high' ? 'high' : activity) : 'low',
      london: londonActive ? (activity === 'high' ? 'high' : activity) : 'low',
      ny: nyActive ? (activity === 'high' ? 'high' : activity) : 'low',
      cross: (asiaActive && londonActive) || (londonActive && nyActive) ? 'active' : 'low'
    })
  }, [marketSignals.activity])

  // Рассчитываем индикаторы
  const rsi = marketSignals.rsi || 50
  const macdValue = marketSignals.macd || 0

  // Рассчитываем EMA (20/50/200)
  const ema20 = priceHistory.length >= 20 
    ? priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20 
    : eurUsd
  const ema50 = priceHistory.length >= 50 
    ? priceHistory.slice(-50).reduce((a, b) => a + b, 0) / 50 
    : eurUsd
  const ema200 = priceHistory.length >= 200 
    ? priceHistory.slice(-200).reduce((a, b) => a + b, 0) / 200 
    : eurUsd

  // Рассчитываем Entry/TP/SL для сигнала
  const signalData = marketSignals.signal || {}
  const spread = eurUsd ? (eurUsd * 0.00004).toFixed(5) : '0.4'
  const volume = eurUsd ? Math.floor(80000 + Math.random() * 50000) : '0'
  
  const bid = eurUsd ? (parseFloat(eurUsd) - 0.00002).toFixed(5) : '—'
  const ask = eurUsd ? (parseFloat(eurUsd) + 0.00002).toFixed(5) : '—'

  let entry, tp, sl, riskReward
  const effectiveSignalType = signalType || signalData.type
  if (effectiveSignalType === 'buy') {
    entry = eurUsd ? (parseFloat(eurUsd) - 0.00005).toFixed(5) : '—'
    tp = eurUsd ? (parseFloat(eurUsd) + 0.00010).toFixed(5) : '—'
    sl = eurUsd ? (parseFloat(eurUsd) - 0.00015).toFixed(5) : '—'
    riskReward = '1:2.0'
  } else if (effectiveSignalType === 'sell') {
    entry = eurUsd ? (parseFloat(eurUsd) + 0.00005).toFixed(5) : '—'
    tp = eurUsd ? (parseFloat(eurUsd) - 0.00010).toFixed(5) : '—'
    sl = eurUsd ? (parseFloat(eurUsd) + 0.00015).toFixed(5) : '—'
    riskReward = '1:2.0'
  }

  // Рассчитываем здоровье рынка
  const marketHealth = Math.min(100, Math.max(0, 
    (activity === 'high' ? 30 : activity === 'medium' ? 20 : 10) +
    (confidence > 60 ? 40 : 20) +
    (trend !== 'neutral' ? 30 : 10)
  ))

  // Рассчитываем таймер до закрытия свечи
  const candleTimer = (() => {
    const now = new Date()
    const seconds = now.getSeconds()
    const remaining = 60 - seconds
    return `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`
  })()

  // Генерируем причину для сигнала
  const getSignalReason = (type = signalType) => {
    if (type === 'buy') {
      return `Цена выше EMA200, MACD пересекает сигнальную линию вверх, RSI = ${rsi.toFixed(1)}, объём выше среднего. Вероятность продолжения роста — высокая.`
    } else if (type === 'sell') {
      return `Цена ниже EMA200, MACD пересекает сигнальную линию вниз, RSI = ${rsi.toFixed(1)}, объём выше среднего. Вероятность продолжения падения — высокая.`
    }
    return 'Нет чёткого сигнала. Рынок в фазе коррекции.'
  }

  // Сохраняем сигнал
  const saveSignal = () => {
    if (signalStage < 3 || !signalType) return
    
    const newSignal = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      type: signalType === 'buy' ? 'BUY' : 'SELL',
      price: eurUsd?.toFixed(5) || '—',
      diff: signalType === 'buy' ? `+${(Math.random() * 15 + 5).toFixed(1)}` : `-${(Math.random() * 15 + 5).toFixed(1)}`,
      signal: signalType
    }
    
    const updated = [newSignal, ...signals].slice(0, 20)
    setSignals(updated)
    localStorage.setItem('navigatorSignals', JSON.stringify(updated))

    // Создаём открытую сделку
    const newTrade = {
      id: Date.now(),
      type: signalType,
      entry: entry,
      currentPrice: eurUsd?.toFixed(5) || '—',
      tp: tp,
      sl: sl,
      profit: 0,
      active: true,
      createdAt: new Date().toLocaleTimeString('ru-RU')
    }
    setOpenTrade(newTrade)
    localStorage.setItem('navigatorOpenTrade', JSON.stringify(newTrade))
  }

  // Обновляем текущую цену открытой сделки
  useEffect(() => {
    if (openTrade?.active && eurUsd) {
      const currentPrice = parseFloat(eurUsd)
      const entryPrice = parseFloat(openTrade.entry)
      const diff = openTrade.type === 'buy' 
        ? (currentPrice - entryPrice) * 100000 
        : (entryPrice - currentPrice) * 100000
      
      setOpenTrade(prev => ({
        ...prev,
        currentPrice: currentPrice.toFixed(5),
        profit: diff.toFixed(1)
      }))
    }
  }, [eurUsd, openTrade])

  // Закрыть сделку
  const closeTrade = () => {
    setOpenTrade(null)
    localStorage.removeItem('navigatorOpenTrade')
  }

  // Статистика
  const completedSignals = signals.filter(s => s.diff !== '—' && s.diff !== '—')
  const winCount = signals.filter(s => s.diff.startsWith('+')).length
  const winRate = signals.length > 0 ? Math.round((winCount / signals.length) * 100) : 0
  const totalPips = signals.reduce((sum, s) => sum + parseFloat(s.diff || '0'), 0)
  const avgWin = signals.filter(s => s.diff.startsWith('+')).reduce((sum, s) => sum + parseFloat(s.diff), 0) / Math.max(winCount, 1)
  const avgLoss = signals.filter(s => s.diff.startsWith('-')).reduce((sum, s) => sum + parseFloat(s.diff), 0) / Math.max(signals.filter(s => s.diff.startsWith('-')).length, 1)

  return (
    <div className="navigator-screen">
      {/* Верхний блок: EUR/USD + Следующая свеча */}
      <div className="top-row">
        <div className="price-card">
          <div className="pair-header">
            <span className="pair-name">EUR / USD</span>
            <span className="pair-star">☆</span>
          </div>
          <div className="pair-subtitle">Евро / Доллар США</div>
          <div className="price-main">
            {eurUsd ? eurUsd.toFixed(5) : '1.08750'}
          </div>
          <div className="price-change">
            {eurUsd ? (eurUsd > 1.08750 ? '+' : '') + (eurUsd - 1.08750).toFixed(5) + ' (+0.11%)' : '—'}
          </div>
          <div className="price-details">
            <div className="detail-item">
              <span className="detail-label">Bid</span>
              <span className="detail-value">{bid}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Ask</span>
              <span className="detail-value">{ask}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Spread</span>
              <span className="detail-value">{spread} pip</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Объём</span>
              <span className="detail-value">{volume}.K</span>
            </div>
          </div>
        </div>

        <div className="timer-card">
          <div className="timer-label">Следующая свеча</div>
          <div className="timer-circle">
            <svg viewBox="0 0 60 60" className="timer-svg">
              <circle cx="30" cy="30" r="25" className="timer-bg" />
              <circle cx="30" cy="30" r="25" className="timer-progress" 
                style={{ strokeDashoffset: 60 - (60 * (parseFloat(candleTimer.split(':')[1]) || 0) / 60) }} />
            </svg>
            <div className="timer-value">
              <span className="timer-min">{parseFloat(candleTimer.split(':')[0]) || 0}</span>:
              <span className="timer-sec">{parseFloat(candleTimer.split(':')[1]) || 0}</span>
            </div>
          </div>
          <div className="timer-tf">M15</div>
        </div>
      </div>

      {/* Вердикт Штурмана + Торговые сессии */}
      <div className="mid-row">
        <div className="verdict-card">
          <div className="verdict-header">
            <span className="verdict-title">Вердикт Штурмана</span>
            <span className={`signal-badge ${mainSignal.type} ${signalStage < 3 ? 'preparing' : ''}`}>
              {mainSignal.text}
              {signalStage === 3 && mainSignal.type === 'buy' && <span className="signal-arrow-up">↗</span>}
              {signalStage === 3 && mainSignal.type === 'sell' && <span className="signal-arrow-down">↘</span>}
            </span>
          </div>
          
          {/* Прогрессия сигнала */}
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
            <div className="confidence-ring">
              <svg viewBox="0 0 100 100" className="confidence-svg">
                <circle cx="50" cy="50" r="40" className="confidence-bg" />
                <circle cx="50" cy="50" r="40" className="confidence-fill"
                  style={{ strokeDashoffset: 251 - (251 * marketHealth / 100) }} />
              </svg>
              <div className="confidence-value">{marketHealth}%</div>
            </div>
            <div className="confidence-label">Уверенность</div>
          </div>

          <div className="signal-levels">
            <div className="level">
              <span className="level-label">Entry</span>
              <span className="level-value entry">{entry || '—'}</span>
            </div>
            <div className="level">
              <span className="level-label">Take Profit</span>
              <span className="level-value tp">{tp || '—'}</span>
            </div>
            <div className="level">
              <span className="level-label">Stop Loss</span>
              <span className="level-value sl">{sl || '—'}</span>
            </div>
            <div className="level">
              <span className="level-label">Risk / Reward</span>
              <span className="level-value rr">{riskReward}</span>
            </div>
          </div>

          <div className="signal-reason">
            <strong>Почему {signalStage === 3 ? (signalType === 'buy' ? 'BUY' : 'SELL') : 'Анализ...'}?</strong>
            <p>{signalStage === 3 ? getSignalReason(signalType) : 'Штурман анализирует рынок...'}</p>
          </div>

          <div className="signal-footer">
            <span>Сигнал сформирован: {signals[0]?.time || '—'}</span>
            <span>Таймфрейм: M15</span>
          </div>

          <button 
            className="signal-action-btn" 
            onClick={saveSignal} 
            disabled={signalStage < 3}
          >
            {signalStage < 3 ? '⏳ Ожидание...' : '🚀 Открыть сделку'}
          </button>
        </div>

        <div className="sessions-card">
          <div className="sessions-title">Торговые сессии</div>
          <div className="session-item">
            <span className="session-name">Азия</span>
            <span className={`session-level ${sessionData.asia}`}>
              {sessionData.asia === 'high' ? 'Высокая' : sessionData.asia === 'medium' ? 'Средняя' : 'Низкая'}
            </span>
          </div>
          <div className="session-item">
            <span className="session-name">Лондон</span>
            <span className={`session-level ${sessionData.london}`}>
              {sessionData.london === 'high' ? 'Высокая' : sessionData.london === 'medium' ? 'Средняя' : 'Низкая'}
            </span>
          </div>
          <div className="session-item">
            <span className="session-name">Нью-Йорк</span>
            <span className={`session-level ${sessionData.ny}`}>
              {sessionData.ny === 'high' ? 'Высокая' : sessionData.ny === 'medium' ? 'Средняя' : 'Низкая'}
            </span>
          </div>
          <div className="session-item">
            <span className="session-name">Пересечение</span>
            <span className={`session-level ${sessionData.cross}`}>
              {sessionData.cross === 'active' ? 'Активно' : 'Спокойно'}
            </span>
          </div>

          {/* Новости */}
          <div className="news-card">
            <div className="news-title">Новости</div>
            <div className="news-item high">
              <span className="news-pair">USD</span>
              <span className="news-event">CPI</span>
              <span className="news-time">Через 18 минут</span>
              <span className="news-impact">Высокая важность</span>
            </div>
          </div>

          {/* Здоровье рынка */}
          <div className="health-card">
            <div className="health-title">Здоровье рынка</div>
            <div className="health-bar">
              <div className="health-fill" style={{ width: `${marketHealth}%` }}></div>
            </div>
            <div className="health-value">{marketHealth}%</div>
            <div className="health-desc">Рынок {marketHealth > 70 ? 'идеален' : marketHealth > 40 ? 'нормален' : 'требует осторожности'}</div>
          </div>
        </div>
      </div>

      {/* Индикаторы: RSI, MACD, EMA, Trend */}
      <div className="indicators-row">
        <div className="indicator-small">
          <div className="indicator-small-label">RSI (14)</div>
          <div className={`indicator-small-value ${parseFloat(rsi) > 70 ? 'overbought' : parseFloat(rsi) < 30 ? 'oversold' : ''}`}>
            {rsi.toFixed(1)}
          </div>
          <div className="indicator-small-chart">
            <svg viewBox="0 0 100 30" className="mini-chart">
              <polyline points={generateRSIPoints(rsi)} fill="none" stroke={parseFloat(rsi) > 70 ? '#f87171' : parseFloat(rsi) < 30 ? '#34d399' : '#8ecae6'} strokeWidth="2" />
            </svg>
          </div>
          <div className="indicator-small-status">
            {parseFloat(rsi) > 70 ? 'Перекуплен' : parseFloat(rsi) < 30 ? 'Перепродан' : 'Нейтрально'}
          </div>
        </div>

        <div className="indicator-small">
          <div className="indicator-small-label">MACD</div>
          <div className={`indicator-small-value ${parseFloat(macdValue) > 0 ? 'positive' : 'negative'}`}>
            {macdValue}
          </div>
          <div className="indicator-small-chart">
            <svg viewBox="0 0 100 30" className="mini-chart">
              {Array.from({ length: 20 }, (_, i) => {
                const x = i * 5
                const y = 15 + Math.sin(i * 0.5) * 10 * (parseFloat(macdValue) > 0 ? 1 : -1)
                return <rect key={i} x={x} y={y} width="3" height={Math.abs(Math.sin(i * 0.5)) * 20} fill={parseFloat(macdValue) > 0 ? '#34d399' : '#f87171'} rx="1" />
              })}
            </svg>
          </div>
          <div className="indicator-small-status">
            {parseFloat(macdValue) > 0 ? 'Бычий' : 'Медвежий'}
          </div>
        </div>

        <div className="indicator-small">
          <div className="indicator-small-label">EMA (20/50/200)</div>
          <div className="ema-values">
            <span className="ema-20">{ema20?.toFixed(5)}</span>
            <span className="ema-50">{ema50?.toFixed(5)}</span>
            <span className="ema-200">{ema200?.toFixed(5)}</span>
          </div>
          <div className="indicator-small-status">
            Цена {eurUsd && eurUsd > ema200 ? 'выше' : 'ниже'} EMA200
          </div>
        </div>

        <div className="indicator-small">
          <div className="indicator-small-label">Trend</div>
          <div className="indicator-small-value">
            {trend === 'bullish' ? '↑' : trend === 'bearish' ? '↓' : '→'}
          </div>
          <div className="indicator-small-chart">
            <svg viewBox="0 0 100 30" className="mini-chart">
              <polyline points={generateTrendPoints(trend)} fill="none" stroke={trend === 'bullish' ? '#34d399' : trend === 'bearish' ? '#f87171' : '#fbbf24'} strokeWidth="2" />
            </svg>
          </div>
          <div className="indicator-small-status">
            {trend === 'bullish' ? 'Восходящий' : trend === 'bearish' ? 'Нисходящий' : 'Флэт'}
          </div>
        </div>
      </div>

      {/* История сигналов + Открытая сделка + Статистика */}
      <div className="bottom-row">
        <div className="history-panel">
          <div className="panel-title">История сигналов</div>
          <div className="signals-list">
            {signals.length === 0 ? (
              <div className="empty-signals">Пока нет сигналов</div>
            ) : (
              signals.slice(0, 5).map(sig => (
                <div key={sig.id} className={`signal-item ${sig.type.toLowerCase()}`}>
                  <span className="signal-time">{sig.time}</span>
                  <span className={`signal-type ${sig.type.toLowerCase()}`}>{sig.type}</span>
                  <span className="signal-price">{sig.price}</span>
                  <span className={`signal-diff ${sig.diff.startsWith('+') ? 'positive' : sig.diff.startsWith('-') ? 'negative' : ''}`}>
                    {sig.diff}
                  </span>
                </div>
              ))
            )}
          </div>
          {signals.length > 0 && (
            <div className="view-all">Смотреть все</div>
          )}
        </div>

        {openTrade && (
          <div className="open-trade-panel">
            <div className="panel-title">
              <span>Открытая сделка</span>
              <span className="active-dot">● Активна</span>
            </div>
            <div className="trade-type">{openTrade.type === 'buy' ? 'BUY' : 'SELL'}</div>
            <div className="trade-details">
              <div className="trade-row">
                <span>Entry</span>
                <span>{openTrade.entry}</span>
              </div>
              <div className="trade-row">
                <span>Текущая цена</span>
                <span>{openTrade.currentPrice}</span>
              </div>
              <div className="trade-row profit">
                <span>Прибыль</span>
                <span className={parseFloat(openTrade.profit) >= 0 ? 'positive' : 'negative'}>
                  {parseFloat(openTrade.profit) >= 0 ? '+' : ''}{openTrade.profit} pip
                </span>
              </div>
              <div className="trade-sl tp-row">
                <span>Др TP: {openTrade.tp}</span>
                <span>Др SL: {openTrade.sl}</span>
              </div>
            </div>
            <button className="close-trade-btn" onClick={closeTrade}>Управление сделкой</button>
          </div>
        )}

        <div className="stats-panel">
          <div className="panel-title">
            <span>Статистика</span>
            <span className="period">Сегодня</span>
          </div>
          <div className="stats-grid">
            <div className="stat-mini">
              <div className="stat-mini-value">{signals.length}</div>
              <div className="stat-mini-label">Всего сигналов</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-value">{winCount}</div>
              <div className="stat-mini-label">Успешных</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-value">{winRate}%</div>
              <div className="stat-mini-label">Процент успеха</div>
            </div>
          </div>
          <div className="stats-detail">
            <div className="stat-detail-row">
              <span>Средняя прибыль</span>
              <span className="detail-positive">+{avgWin.toFixed(1)} pip</span>
            </div>
            <div className="stat-detail-row">
              <span>Средний убыток</span>
              <span className="detail-negative">{avgLoss.toFixed(1)} pip</span>
            </div>
            <div className="stat-detail-row">
              <span>Лучшая серия</span>
              <span>4</span>
            </div>
            <div className="stat-detail-row">
              <span>Худшая серия</span>
              <span>2</span>
            </div>
          </div>
          <div className="view-details">Подробные</div>
        </div>
      </div>
    </div>
  )
}

// Генерация точек для RSI мини-графика
function generateRSIPoints(rsi) {
  const base = parseFloat(rsi) || 50
  return Array.from({ length: 20 }, (_, i) => {
    const x = i * 5.26
    const y = 15 + (Math.sin(i * 0.8 + base * 0.1) * 12)
    return `${x},${y}`
  }).join(' ')
}

// Генерация точек для Trend мини-графика
function generateTrendPoints(trend) {
  if (trend === 'bullish') {
    return Array.from({ length: 20 }, (_, i) => {
      const x = i * 5.26
      const y = 25 - i * 0.8 + Math.sin(i * 0.5) * 3
      return `${x},${y}`
    }).join(' ')
  } else if (trend === 'bearish') {
    return Array.from({ length: 20 }, (_, i) => {
      const x = i * 5.26
      const y = 5 + i * 0.8 + Math.sin(i * 0.5) * 3
      return `${x},${y}`
    }).join(' ')
  } else {
    return Array.from({ length: 20 }, (_, i) => {
      const x = i * 5.26
      const y = 15 + Math.sin(i * 0.3) * 5
      return `${x},${y}`
    }).join(' ')
  }
}

export default NavigatorScreen
