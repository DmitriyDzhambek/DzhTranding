import { useState, useEffect } from 'react'
import './DailyScenarios.css'
import { analyzeMarketWithPrices } from '../services/AIEngine'

/**
 * DailyScenarios — три лучших сценария на день
 * BUY / SELL / ЖДАТЬ с готовым планом действий
 */
function DailyScenarios({ priceHistory, currentPrice }) {
  const [scenarios, setScenarios] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadScenarios = () => {
      if (!priceHistory || priceHistory.length < 20) {
        setIsLoading(false)
        return
      }

      try {
        const analysis = analyzeMarketWithPrices(priceHistory, currentPrice)
        const generated = generateScenarios(analysis)
        setScenarios(generated)
      } catch (error) {
        console.error('Ошибка генерации сценариев:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadScenarios()
    const interval = setInterval(loadScenarios, 60000) // Обновление каждую минуту
    return () => clearInterval(interval)
  }, [priceHistory, currentPrice])

  if (isLoading) {
    return (
      <div className="daily-scenarios-card loading">
        <div className="scenarios-header">
          <span className="scenarios-icon">📋</span>
          <h3>Сценарии на день</h3>
        </div>
        <div className="scenarios-loading">
          <div className="loading-spinner"></div>
          <span>Анализируем рынок...</span>
        </div>
      </div>
    )
  }

  if (!scenarios) {
    return (
      <div className="daily-scenarios-card empty">
        <div className="scenarios-header">
          <span className="scenarios-icon">📋</span>
          <h3>Сценарии на день</h3>
        </div>
        <p className="empty-message">Недостаточно данных для анализа</p>
      </div>
    )
  }

  return (
    <div className="daily-scenarios-card">
      <div className="scenarios-header">
        <span className="scenarios-icon">📋</span>
        <h3>Сценарии на день</h3>
        <span className="scenarios-time">
          Обновлено: {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="scenarios-list">
        {/* Сценарий 1 — Основной */}
        <div className={`scenario-item primary ${scenarios.primary.signal.toLowerCase()}`}>
          <div className="scenario-badge">
            <span className="badge-number">1</span>
            <span className="badge-label">Основной</span>
          </div>
          <div className="scenario-content">
            <div className="scenario-signal">
              <span className={`signal-icon ${scenarios.primary.signal.toLowerCase()}`}>
                {scenarios.primary.signal === 'BUY' ? '📈' : scenarios.primary.signal === 'SELL' ? '📉' : '⏸️'}
              </span>
              <span className="signal-text">{scenarios.primary.signal}</span>
              <span className="signal-confidence">{scenarios.primary.confidence}%</span>
            </div>
            <p className="scenario-reason">{scenarios.primary.reason}</p>
            {scenarios.primary.entry && (
              <div className="scenario-levels">
                <span className="level">Вход: {scenarios.primary.entry}</span>
                {scenarios.primary.sl && <span className="level sl">SL: {scenarios.primary.sl}</span>}
                {scenarios.primary.tp && <span className="level tp">TP: {scenarios.primary.tp}</span>}
              </div>
            )}
            <div className="scenario-action">
              <span className="action-hint">{scenarios.primary.action}</span>
            </div>
          </div>
        </div>

        {/* Сценарий 2 — Альтернативный */}
        <div className={`scenario-item alternative ${scenarios.alternative.signal.toLowerCase()}`}>
          <div className="scenario-badge">
            <span className="badge-number">2</span>
            <span className="badge-label">Альтернативный</span>
          </div>
          <div className="scenario-content">
            <div className="scenario-signal">
              <span className={`signal-icon ${scenarios.alternative.signal.toLowerCase()}`}>
                {scenarios.alternative.signal === 'BUY' ? '📈' : scenarios.alternative.signal === 'SELL' ? '📉' : '⏸️'}
              </span>
              <span className="signal-text">{scenarios.alternative.signal}</span>
              <span className="signal-confidence">{scenarios.alternative.confidence}%</span>
            </div>
            <p className="scenario-reason">{scenarios.alternative.reason}</p>
            {scenarios.alternative.entry && (
              <div className="scenario-levels">
                <span className="level">Вход: {scenarios.alternative.entry}</span>
                {scenarios.alternative.sl && <span className="level sl">SL: {scenarios.alternative.sl}</span>}
                {scenarios.alternative.tp && <span className="level tp">TP: {scenarios.alternative.tp}</span>}
              </div>
            )}
            <div className="scenario-action">
              <span className="action-hint">{scenarios.alternative.action}</span>
            </div>
          </div>
        </div>

        {/* Сценарий 3 — Консервативный */}
        <div className={`scenario-item conservative ${scenarios.conservative.signal.toLowerCase()}`}>
          <div className="scenario-badge">
            <span className="badge-number">3</span>
            <span className="badge-label">Консервативный</span>
          </div>
          <div className="scenario-content">
            <div className="scenario-signal">
              <span className={`signal-icon ${scenarios.conservative.signal.toLowerCase()}`}>
                {scenarios.conservative.signal === 'BUY' ? '📈' : scenarios.conservative.signal === 'SELL' ? '📉' : '⏸️'}
              </span>
              <span className="signal-text">{scenarios.conservative.signal}</span>
              <span className="signal-confidence">{scenarios.conservative.confidence}%</span>
            </div>
            <p className="scenario-reason">{scenarios.conservative.reason}</p>
            <div className="scenario-action">
              <span className="action-hint">{scenarios.conservative.action}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Индикаторы */}
      {scenarios.indicators && (
        <div className="scenarios-indicators">
          <h4>📊 Ключевые индикаторы</h4>
          <div className="indicators-grid">
            {scenarios.indicators.rsi !== null && (
              <div className={`indicator-item ${scenarios.indicators.rsi < 30 ? 'oversold' : scenarios.indicators.rsi > 70 ? 'overbought' : 'neutral'}`}>
                <span className="indicator-label">RSI (14)</span>
                <span className="indicator-value">{scenarios.indicators.rsi.toFixed(1)}</span>
              </div>
            )}
            {scenarios.indicators.volatility && (
              <div className="indicator-item">
                <span className="indicator-label">Волатильность</span>
                <span className="indicator-value">{scenarios.indicators.volatility.toFixed(5)}</span>
              </div>
            )}
            {scenarios.indicators.trend && (
              <div className={`indicator-item ${scenarios.indicators.trend}`}>
                <span className="indicator-label">Тренд</span>
                <span className="indicator-value">
                  {scenarios.indicators.trend === 'bullish' ? '📈 Бычий' : scenarios.indicators.trend === 'bearish' ? '📉 Медвежий' : '➡️ Флэт'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Генерация трёх сценариев на основе анализа
 */
function generateScenarios(analysis) {
  const price = analysis.price || '1.14130'
  const { rsi, macd, bollinger, trend, volatility } = analysis.indicators || {}
  
  // === СЦЕНАРИЙ 1: Основной (на основе консенсуса) ===
  let primarySignal, primaryReason, primaryAction, primaryEntry, primarySL, primaryTP, primaryConfidence
  
  if (analysis.type === 'BUY') {
    primarySignal = 'BUY'
    primaryConfidence = analysis.confidence
    primaryReason = analysis.reason || 'Многотаймфреймовый консенсус указывает на рост'
    primaryEntry = price
    primarySL = parseFloat((parseFloat(price) - volatility * 1.5).toFixed(5))
    primaryTP = parseFloat((parseFloat(price) + volatility * 2.5).toFixed(5))
    primaryAction = 'Входим в BUY с ограниченным риском. TP на расстоянии 2.5x волатильности.'
  } else if (analysis.type === 'SELL') {
    primarySignal = 'SELL'
    primaryConfidence = analysis.confidence
    primaryReason = analysis.reason || 'Многотаймфреймовый консенсус указывает на падение'
    primaryEntry = price
    primarySL = parseFloat((parseFloat(price) + volatility * 1.5).toFixed(5))
    primaryTP = parseFloat((parseFloat(price) - volatility * 2.5).toFixed(5))
    primaryAction = 'Входим в SELL с ограниченным риском. TP на расстоянии 2.5x волатильности.'
  } else {
    primarySignal = 'ЖДАТЬ'
    primaryConfidence = 85
    primaryReason = 'Нет чёткого сигнала. Рынок в фазе неопределённости.'
    primaryAction = 'Не входим в сделку. Ждём подтверждения тренда.'
  }

  // === СЦЕНАРИЙ 2: Альтернативный (противоположный с фильтром) ===
  let alternativeSignal, alternativeReason, alternativeAction, alternativeEntry, alternativeSL, alternativeTP, alternativeConfidence
  
  if (analysis.type === 'BUY') {
    alternativeSignal = 'SELL'
    alternativeConfidence = Math.max(20, 100 - analysis.confidence - 15)
    alternativeReason = 'Возможна коррекция. RSI может указывать на перекупленность.'
    alternativeEntry = price
    alternativeSL = parseFloat((parseFloat(price) + volatility * 2).toFixed(5))
    alternativeTP = parseFloat((parseFloat(price) - volatility * 3).toFixed(5))
    alternativeAction = 'Только при подтверждении RSI > 70 или пробоя поддержки.'
  } else if (analysis.type === 'SELL') {
    alternativeSignal = 'BUY'
    alternativeConfidence = Math.max(20, 100 - analysis.confidence - 15)
    alternativeReason = 'Возможен отскок. RSI может указывать на перепроданность.'
    alternativeEntry = price
    alternativeSL = parseFloat((parseFloat(price) - volatility * 2).toFixed(5))
    alternativeTP = parseFloat((parseFloat(price) + volatility * 3).toFixed(5))
    alternativeAction = 'Только при подтверждении RSI < 30 или пробоя сопротивления.'
  } else {
    alternativeSignal = 'ЖДАТЬ'
    alternativeConfidence = 75
    alternativeReason = 'Рынок консолидируется. Ждём пробоя диапазона.'
    alternativeAction = 'Следим за пробоем границ диапазона.'
  }

  // === СЦЕНАРИЙ 3: Консервативный (максимальная осторожность) ===
  let conservativeSignal, conservativeReason, conservativeAction, conservativeConfidence
  
  if (rsi !== null && rsi < 30) {
    conservativeSignal = 'BUY'
    conservativeConfidence = 60
    conservativeReason = 'RSI в зоне перепроданности — возможен отскок вверх.'
    conservativeAction = 'Минимальный лот. Строгий стоп-лосс. Только краткосрочная сделка.'
  } else if (rsi !== null && rsi > 70) {
    conservativeSignal = 'SELL'
    conservativeConfidence = 60
    conservativeReason = 'RSI в зоне перекупленности — возможен отскок вниз.'
    conservativeAction = 'Минимальный лот. Строгий стоп-лосс. Только краткосрочная сделка.'
  } else if (volatility > 0.0008) {
    conservativeSignal = 'ЖДАТЬ'
    conservativeConfidence = 90
    conservativeReason = 'Высокая волатильность — повышенный риск.'
    conservativeAction = 'Ждём стабилизации рынка. Не входим в сделку.'
  } else {
    conservativeSignal = 'ЖДАТЬ'
    conservativeConfidence = 80
    conservativeReason = 'Нет чёткого сигнала. Рынок в фазе неопределённости.'
    conservativeAction = 'Сохраняем капитал. Ждём подтверждения тренда.'
  }

  return {
    primary: {
      signal: primarySignal,
      confidence: primaryConfidence,
      reason: primaryReason,
      entry: primaryEntry,
      sl: primarySL,
      tp: primaryTP,
      action: primaryAction
    },
    alternative: {
      signal: alternativeSignal,
      confidence: alternativeConfidence,
      reason: alternativeReason,
      entry: alternativeEntry,
      sl: alternativeSL,
      tp: alternativeTP,
      action: alternativeAction
    },
    conservative: {
      signal: conservativeSignal,
      confidence: conservativeConfidence,
      reason: conservativeReason,
      action: conservativeAction
    },
    indicators: {
      rsi,
      macd,
      bollinger,
      trend,
      volatility
    }
  }
}

export default DailyScenarios
