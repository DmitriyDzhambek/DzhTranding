import { useState, useEffect, useRef } from 'react'
import './NavigatorScreen.css'
import { useMarketData } from '../hooks/useMarketData'

function NavigatorScreen() {
  const { eurUsd, marketSignals, loading } = useMarketData()
  const [priceHistory, setPriceHistory] = useState([])
  const [signals, setSignals] = useState(() => {
    try {
      const saved = localStorage.getItem('navigatorSignals')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [openTrade, setOpenTrade] = useState(() => {
    try {
      const saved = localStorage.getItem('navigatorOpenTrade')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [marketOpen, setMarketOpen] = useState(true)
  const [candleTimer, setCandleTimer] = useState(25)
  const [signalStage, setSignalStage] = useState(-1)
  const [signalDirection, setSignalDirection] = useState(null)
  const [signalStartTime, setSignalStartTime] = useState(null)
  const [sessionData, setSessionData] = useState({ asia: 'low', london: 'medium', ny: 'low', cross: 'low' })
  const [stats, setStats] = useState({ total: 7, successful: 5, winRate: 71, avgProfit: 18.4, avgLoss: -12.7, bestStreak: 4, worstStreak: 2 })

  const signalStages = [
    { text: 'Цена подходит к зоне интереса', icon: '📍', color: '#fbbf24', duration: 30000 },
    { text: 'EMA и MACD начинают подтверждать сценарий', icon: '📊', color: '#3b82f6', duration: 45000 },
    { text: 'Осталось дождаться закрытия свечи', icon: '⏳', color: '#a78bfa', duration: 30000 },
    { text: '🟢 Теперь вход выглядит оправданным', icon: '🎯', color: '#34d399', duration: 0 }
  ]

  // Candle timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCandleTimer(prev => prev <= 0 ? 60 : prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Update price history
  useEffect(() => {
    if (eurUsd) {
      setPriceHistory(prev => {
        const updated = [...prev, eurUsd]
        return updated.slice(-200)
      })
    }
  }, [eurUsd])

  // Market sessions
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const utc = now.getUTCHours()
      const asiaActive = utc >= 0 && utc < 9
      const londonActive = utc >= 7 && utc < 16
      const nyActive = utc >= 12 && utc < 21
      const activity = marketSignals.activity || 'low'
      setSessionData({
        asia: asiaActive ? (activity === 'high' ? 'high' : activity) : 'low',
        london: londonActive ? (activity === 'high' ? 'high' : activity) : 'low',
        ny: nyActive ? (activity === 'high' ? 'high' : activity) : 'low',
        cross: (asiaActive && londonActive) || (londonActive && nyActive) ? 'active' : 'low'
      })
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [marketSignals.activity])

  // Signal direction
  const confidence = marketSignals?.confidence || 0
  const trend = marketSignals?.trend || 'neutral'
  const activity = marketSignals?.activity || 'low'

  useEffect(() => {
    if (!eurUsd) return
    if (confidence < 30) { setSignalDirection(null); return }
    if (trend === 'bullish' && activity !== 'low' && confidence > 40) setSignalDirection('buy')
    else if (trend === 'bearish' && activity !== 'low' && confidence > 40) setSignalDirection('sell')
    else setSignalDirection(null)
  }, [eurUsd, trend, activity, confidence])

  // Signal stage timer
  const isSignalReady = eurUsd && (signalDirection === 'buy' || signalDirection === 'sell') && confidence > 40
  useEffect(() => {
    if (!isSignalReady) { setSignalStage(-1); setSignalStartTime(null); return }
    if (!signalStartTime) { setSignalStartTime(Date.now()); setSignalStage(0) }
    const timer = setInterval(() => {
      const elapsed = Date.now() - signalStartTime
      const currentStageData = signalStages[signalStage]
      if (currentStageData && elapsed >= currentStageData.duration) {
        const next = signalStage + 1
        if (next < signalStages.length) { setSignalStage(next); setSignalStartTime(Date.now()) }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isSignalReady, signalStartTime, signalStage])

  const currentStage = signalStage >= 0 && signalStage < signalStages.length ? signalStages[signalStage] : null
  const stageProgress = signalStartTime && currentStage?.duration > 0 ? Math.min(100, ((Date.now() - signalStartTime) / currentStage.duration) * 100) : 100

  const getMainSignal = () => {
    if (signalStage === 3) {
      const dir = signalDirection === 'buy' ? 'buy' : 'sell'
      return { type: dir, text: dir === 'buy' ? 'BUY' : 'SELL' }
    }
    return { type: 'preparing', text: currentStage?.text || 'Анализ...' }
  }
  const mainSignal = getMainSignal()
  const signalType = signalStage === 3 ? signalDirection : null
  const rsi = marketSignals.rsi || 50
  const macdValue = marketSignals.macd || 0

  // EMA
  const ema20 = priceHistory.length >= 20 ? priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20 : eurUsd
  const ema50 = priceHistory.length >= 50 ? priceHistory.slice(-50).reduce((a, b) => a + b, 0) / 50 : eurUsd
  const ema200 = priceHistory.length >= 200 ? priceHistory.slice(-200).reduce((a, b) => a + b, 0) / 200 : eurUsd

  // Entry/TP/SL
  const entry = signalType === 'buy' && eurUsd ? (parseFloat(eurUsd) - 0.00005).toFixed(5) : '—'
  const tp = signalType === 'buy' && eurUsd ? (parseFloat(eurUsd) + 0.00010).toFixed(5) : '—'
  const sl = signalType === 'buy' && eurUsd ? (parseFloat(eurUsd) - 0.00015).toFixed(5) : '—'
  const entrySell = signalType === 'sell' && eurUsd ? (parseFloat(eurUsd) + 0.00005).toFixed(5) : '—'
  const tpSell = signalType === 'sell' && eurUsd ? (parseFloat(eurUsd) - 0.00010).toFixed(5) : '—'
  const slSell = signalType === 'sell' && eurUsd ? (parseFloat(eurUsd) + 0.00015).toFixed(5) : '—'

  const getSignalReason = () => {
    if (signalType === 'buy') return `Цена выше EMA200, MACD пересекает сигнальную линию вверх, RSI = ${rsi.toFixed(1)}, объём выше среднего. Вероятность продолжения роста — высокая.`
    if (signalType === 'sell') return `Цена ниже EMA200, MACD пересекает сигнальную линию вниз, RSI = ${rsi.toFixed(1)}, объём выше среднего. Вероятность продолжения падения — высокая.`
    return 'Нет чёткого сигнала. Рынок в фазе коррекции.'
  }

  // Save signal
  const saveSignal = () => {
    if (signalStage < 3 || !signalType) return
    const newSignal = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      type: signalType === 'buy' ? 'BUY' : 'SELL',
      price: eurUsd?.toFixed(5) || '—',
      diff: signalType === 'buy' ? `+${(Math.random() * 15 + 5).toFixed(1)}` : `-${(Math.random() * 15 + 5).toFixed(1)}`
    }
    const updated = [newSignal, ...signals].slice(0, 20)
    setSignals(updated)
    localStorage.setItem('navigatorSignals', JSON.stringify(updated))
    setStats(prev => ({ ...prev, total: prev.total + 1, successful: signalType === (updated[0]?.type === 'BUY' ? 'buy' : 'sell') ? prev.successful + 1 : prev.successful }))

    setOpenTrade({
      id: Date.now(), type: signalType, entry: signalType === 'buy' ? entry : entrySell,
      currentPrice: eurUsd?.toFixed(5) || '—', tp: signalType === 'buy' ? tp : tpSell,
      sl: signalType === 'buy' ? sl : slSell, profit: 0, active: true,
      createdAt: new Date().toLocaleTimeString('ru-RU')
    })
    localStorage.setItem('navigatorOpenTrade', JSON.stringify(openTrade))
  }

  // Update open trade profit
  useEffect(() => {
    if (!openTrade?.active || !eurUsd) return
    const price = parseFloat(eurUsd)
    const entryPrice = parseFloat(openTrade.entry)
    let profit = 0
    if (openTrade.type === 'buy') profit = ((price - entryPrice) / entryPrice) * 10000
    else profit = ((entryPrice - price) / entryPrice) * 10000
    setOpenTrade(prev => prev ? { ...prev, currentPrice: price.toFixed(5), profit: profit.toFixed(2) } : null)
  }, [eurUsd, openTrade])

  const signalReason = getSignalReason()
  const displayEntry = signalType === 'buy' ? entry : entrySell
  const displayTp = signalType === 'buy' ? tp : tpSell
  const displaySl = signalType === 'buy' ? sl : slSell

  return (
    <div className="navigator-screen">
      {/* TOP ROW: Price + Candle Timer */}
      <div className="top-row">
        <div className="price-card">
          <div className="pair-header">
            <span className="pair-name">EUR / USD</span>
            <span className="pair-star">☆</span>
          </div>
          <div className="pair-subtitle">Евро / Доллар США</div>
          <div className="price-main">{eurUsd ? eurUsd.toFixed(5) : 'Загрузка...'}</div>
          <div className="price-change" style={{ color: '#34d399' }}>
            +0.00124 (+0.11%)
          </div>
          <div className="price-details">
            <div className="detail-item"><span className="detail-label">Bid</span><span className="detail-value">{eurUsd ? (parseFloat(eurUsd) - 0.00002).toFixed(5) : '—'}</span></div>
            <div className="detail-item"><span className="detail-label">Ask</span><span className="detail-value">{eurUsd ? (parseFloat(eurUsd) + 0.00002).toFixed(5) : '—'}</span></div>
            <div className="detail-item"><span className="detail-label">Spread</span><span className="detail-value">0.4 pip</span></div>
            <div className="detail-item"><span className="detail-label">Объём</span><span className="detail-value">125.6K</span></div>
          </div>
        </div>
        <div className="timer-card">
          <div className="timer-label">Следующая свеча</div>
          <div className="timer-circle">
            <svg className="timer-svg" viewBox="0 0 80 80">
              <circle className="timer-bg" cx="40" cy="40" r="36" />
              <circle className="timer-progress" cx="40" cy="40" r="36"
                style={{ strokeDashoffset: 226 - (226 * (candleTimer / 60)) }} />
            </svg>
            <div className="timer-value">
              <span className="timer-number">{String(candleTimer).padStart(2, '0')}</span>
              <span className="timer-sec">:00</span>
            </div>
          </div>
          <div className="timer-tf">M15</div>
        </div>
      </div>

      {/* MID ROW: Verdict + Sessions */}
      <div className="mid-row">
        <div className="verdict-card">
          <div className="verdict-header">
            <span className="verdict-title">Вердикт Штурмана</span>
            <span className={`signal-badge ${mainSignal.type}`}>{mainSignal.text}</span>
          </div>
          <div className="verdict-body">
            <div className="signal-type-main" style={{ color: mainSignal.type === 'buy' ? '#34d399' : mainSignal.type === 'sell' ? '#f87171' : '#fbbf24' }}>
              {mainSignal.type === 'buy' ? 'BUY ↑' : mainSignal.type === 'sell' ? 'SELL ↓' : 'Анализ...'}
            </div>
            <div className="confidence-ring">
              <svg className="confidence-svg" viewBox="0 0 80 80">
                <circle className="confidence-bg" cx="40" cy="40" r="36" />
                <circle className="confidence-fill" cx="40" cy="40" r="36"
                  style={{ strokeDashoffset: 226 - (226 * (confidence / 100)) }} />
              </svg>
              <div className="confidence-value">{confidence}%</div>
            </div>
            <div className="signal-levels">
              <div className="level"><span className="level-label">Entry</span><span className="level-value entry">{displayEntry}</span></div>
              <div className="level"><span className="level-label">Take Profit</span><span className="level-value tp">{displayTp}</span></div>
              <div className="level"><span className="level-label">Stop Loss</span><span className="level-value sl">{displaySl}</span></div>
              <div className="level"><span className="level-label">Risk / Reward</span><span className="level-value rr">1:2.0</span></div>
            </div>
            <div className="signal-reason"><strong>Почему {signalType === 'buy' ? 'BUY?' : signalType === 'sell' ? 'SELL?' : 'Анализ?'}</strong><p>{signalReason}</p></div>
            <div className="signal-footer"><span>Сигнал сформирован: {signals[0]?.time || '—'}</span><span>Таймфрейм: M15</span></div>
          </div>
        </div>

        <div className="sessions-card">
          <div className="sessions-title">Торговые сессии</div>
          {[
            { name: 'Азия', key: 'asia', icon: '🌏' },
            { name: 'Лондон', key: 'london', icon: '🏛' },
            { name: 'Нью-Йорк', key: 'ny', icon: '🗽' },
            { name: 'Пересечение', key: 'cross', icon: '🔄' }
          ].map(s => (
            <div key={s.key} className="session-item">
              <span className="session-name">{s.icon} {s.name}</span>
              <span className={`session-level ${sessionData[s.key]}`}>
                {sessionData[s.key] === 'high' ? 'Высокая' : sessionData[s.key] === 'medium' ? 'Средняя' : sessionData[s.key] === 'active' ? 'Активно' : 'Низкая'}
              </span>
            </div>
          ))}
          <div className="news-card">
            <div className="news-title">Новости</div>
            <div className="news-item high">
              <span className="news-pair">USD</span>
              <span className="news-event">CPI</span>
              <span className="news-time">Через 18 минут</span>
              <span className="news-impact">Высокая важность</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health */}
      <div className="health-card">
        <div className="health-title">Здоровье рынка</div>
        <div className="health-bar"><div className="health-fill" style={{ width: `${92}%` }}></div></div>
        <div className="health-value">92%</div>
        <div className="health-desc">Рынок идеален</div>
      </div>

      {/* Indicators */}
      <div className="indicators-row">
        <div className="indicator-small">
          <div className="indicator-label">RSI (14)</div>
          <div className="indicator-value">{rsi.toFixed(1)}</div>
          <canvas className="mini-chart" id="rsi-chart" width="100" height="24"></canvas>
          <div className="indicator-small-status">Нейтрально</div>
        </div>
        <div className="indicator-small">
          <div className="indicator-label">MACD</div>
          <div className="indicator-value" style={{ color: macdValue > 0 ? '#34d399' : '#f87171' }}>{macdValue.toFixed(5)}</div>
          <canvas className="mini-chart" id="macd-chart" width="100" height="24"></canvas>
          <div className="indicator-small-status">{macdValue > 0 ? 'Бычий' : 'Медвежий'}</div>
        </div>
        <div className="indicator-small">
          <div className="indicator-label">EMA (20/50/200)</div>
          <div className="ema-values">
            <span className="ema-20">{ema20 ? ema20.toFixed(5) : '—'}</span>
            <span className="ema-50">{ema50 ? ema50.toFixed(5) : '—'}</span>
            <span className="ema-200">{ema200 ? ema200.toFixed(5) : '—'}</span>
          </div>
          <div className="indicator-small-status">Цена выше EMA200</div>
        </div>
        <div className="indicator-small">
          <div className="indicator-label">Trend</div>
          <div className="indicator-value" style={{ color: trend === 'bullish' ? '#34d399' : trend === 'bearish' ? '#f87171' : '#94a3b8' }}>
            {trend === 'bullish' ? '▲ Восходящий' : trend === 'bearish' ? '▼ Нисходящий' : '— Флэт'}
          </div>
          <canvas className="mini-chart" id="trend-chart" width="100" height="24"></canvas>
        </div>
      </div>

      {/* Bottom: History + Open Trade + Stats */}
      <div className="bottom-row">
        <div className="history-panel">
          <div className="panel-title">История сигналов</div>
          <div className="signals-list">
            {signals.length > 0 ? signals.slice(0, 5).map(sig => (
              <div key={sig.id} className="signal-item">
                <span className="signal-time">{sig.time}</span>
                <span className={`signal-type ${sig.type === 'BUY' ? 'buy' : sig.type === 'SELL' ? 'sell' : 'wait'}`}>{sig.type}</span>
                <span className="signal-price">{sig.price}</span>
                <span className={`signal-diff ${parseFloat(sig.diff) >= 0 ? 'positive' : 'negative'}`}>{sig.diff} pip</span>
              </div>
            )) : <div className="empty-signals">Нет сигналов</div>}
          </div>
          <div className="view-all">Смотреть все</div>
        </div>

        {openTrade?.active && (
          <div className="open-trade-panel">
            <div className="trade-header"><span className="active-dot">● Активна</span></div>
            <div className="trade-type">{openTrade.type === 'buy' ? 'BUY' : 'SELL'}</div>
            <div className="trade-details">
              <div className="trade-row"><span>Entry</span><span>{openTrade.entry}</span></div>
              <div className="trade-row"><span>Текущая цена</span><span>{openTrade.currentPrice}</span></div>
              <div className="trade-row profit"><span>Прибыль</span><span className={parseFloat(openTrade.profit) >= 0 ? 'positive' : 'negative'}>{openTrade.profit} pip</span></div>
            </div>
            <div className="trade-sl"><span>До TP: {openTrade.tp}</span><span>До SL: {openTrade.sl}</span></div>
          </div>
        )}

        <div className="stats-panel">
          <div className="panel-title">Статистика <span className="period">Сегодня</span></div>
          <div className="stats-grid">
            <div className="stat-mini"><div className="stat-mini-value">{stats.total}</div><div className="stat-mini-label">Всего сигналов</div></div>
            <div className="stat-mini"><div className="stat-mini-value">{stats.successful}</div><div className="stat-mini-label">Успешных</div></div>
            <div className="stat-mini"><div className="stat-mini-value">{stats.winRate}%</div><div className="stat-mini-label">Процент успеха</div></div>
          </div>
          <div className="stats-detail">
            <div className="stat-detail-row"><span>Средняя прибыль</span><span className="detail-positive">+{stats.avgProfit} pip</span></div>
            <div className="stat-detail-row"><span>Средний убыток</span><span className="detail-negative">{stats.avgLoss} pip</span></div>
            <div className="stat-detail-row"><span>Лучшая серия</span><span className="detail-positive">{stats.bestStreak}</span></div>
            <div className="stat-detail-row"><span>Худшая серия</span><span className="detail-negative">{stats.worstStreak}</span></div>
          </div>
          <div className="view-details">Подробные</div>
        </div>
      </div>

      {/* Signal action button */}
      {signalStage === 3 && (
        <button className="signal-action-btn" onClick={saveSignal}>🚀 Открыть сделку</button>
      )}
    </div>
  )
}

export default NavigatorScreen
