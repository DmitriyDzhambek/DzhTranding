import { useState, useRef, useCallback } from 'react'
import './TouchTrigger.css'
import { analyzeMarket, getCurrentPrice } from '../services/AIEngine'

function TouchTrigger({ onWeatherUpdate }) {
  const [isDragging, setIsDragging] = useState(false)
  const [direction, setDirection] = useState(null) // 'up' or 'down'
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [matchScore, setMatchScore] = useState(0)
  const [color, setColor] = useState('neutral')
  const [hapticFeedback, setHapticFeedback] = useState(false)
  
  const startY = useRef(0)
  const currentY = useRef(0)
  const containerRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (isLoading || result) return
    startY.current = e.touches ? e.touches[0].clientY : e.clientY
    setIsDragging(true)
  }, [isLoading, result])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || isLoading) return
    currentY.current = e.touches ? e.touches[0].clientY : e.clientY
    const diff = startY.current - currentY.current
    
    if (Math.abs(diff) > 20) {
      setDirection(diff > 0 ? 'up' : 'down')
    }
  }, [isDragging, isLoading])

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging || isLoading || !direction) {
      setIsDragging(false)
      setDirection(null)
      return
    }

    setIsDragging(false)
    setIsLoading(true)
    setResult(null)
    setMatchScore(0)
    setColor('neutral')

    try {
      const [analysis, currentPrice] = await Promise.all([
        analyzeMarket(),
        getCurrentPrice()
      ])

      // Определяем рекомендацию бота
      let botRecommendation = 'wait'
      if (analysis.type === 'BUY') botRecommendation = 'buy'
      if (analysis.type === 'SELL') botRecommendation = 'sell'

      // Сравниваем выбор пользователя с рекомендацией
      const userChoice = direction === 'up' ? 'buy' : 'sell'
      const isMatch = userChoice === botRecommendation
      
      // Рассчитываем процент совпадения
      let score = 0
      if (isMatch) {
        score = analysis.confidence
        setColor('success')
      } else {
        score = 100 - analysis.confidence
        setColor('danger')
      }

      setMatchScore(Math.round(score))
      
      setResult({
        userChoice,
        botRecommendation,
        isMatch,
        confidence: analysis.confidence,
        price: currentPrice?.toFixed(5),
        timestamp: analysis.timestamp,
        type: analysis.type,
        entry: analysis.entry?.toFixed(5),
        sl: analysis.sl?.toFixed(5),
        tp: analysis.tp?.toFixed(5),
        reason: analysis.reason,
        indicators: analysis.indicators,
        expiry: analysis.expiry
      })

      // Вибрация
      setHapticFeedback(true)
      setTimeout(() => setHapticFeedback(false), 300)

      // Логирование
      if (isMatch && onWeatherUpdate) {
        onWeatherUpdate('profit')
      } else if (!isMatch && onWeatherUpdate) {
        onWeatherUpdate('loss')
      }
    } catch (error) {
      console.error('Ошибка анализа:', error)
      setResult({ error: 'Ошибка получения данных' })
    } finally {
      setIsLoading(false)
    }
  }, [isDragging, isLoading, direction, onWeatherUpdate])

  const reset = () => {
    setResult(null)
    setDirection(null)
    setColor('neutral')
    setMatchScore(0)
  }

  const getChoiceLabel = (choice) => {
    if (choice === 'buy') return '📈 ПОКУПКА'
    if (choice === 'sell') return '📉 ПРОДАЖА'
    return '⏸️ ОЖИДАНИЕ'
  }

  const getMatchLabel = (score) => {
    if (score >= 80) return '🎯 Отличное совпадение!'
    if (score >= 60) return '✅ Хороший выбор'
    if (score >= 40) return '⚠️ Средний выбор'
    return '❌ Не совпало'
  }

  return (
    <div className="touch-trigger-container">
      <div className="touch-header">
        <h2>🎯 Вход по касанию</h2>
        <p>Проведи вверх для покупки или вниз для продажи</p>
      </div>

      {!result && !isLoading && (
        <div 
          className="touch-area"
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={() => {
            setIsDragging(false)
            setDirection(null)
          }}
        >
          <div className="touch-arrows">
            <div className={`arrow up ${direction === 'up' ? 'active' : ''}`}>
              <span className="arrow-icon">↑</span>
              <span className="arrow-label">BUY</span>
            </div>
            <div className="touch-center">
              <div className="center-circle">
                <span className="center-icon">👆</span>
              </div>
            </div>
            <div className={`arrow down ${direction === 'down' ? 'active' : ''}`}>
              <span className="arrow-icon">↓</span>
              <span className="arrow-label">SELL</span>
            </div>
          </div>

          {isDragging && (
            <div className={`touch-indicator ${direction}`}>
              <div className="indicator-bar">
                <div className="indicator-fill" style={{ 
                  height: direction === 'up' ? '100%' : '0%',
                  width: direction === 'down' ? '100%' : '0%'
                }}></div>
              </div>
            </div>
          )}

          <div className="touch-hint">
            <span>📱 Проведи пальцем</span>
            <span>🖱️ Или перетащи мышкой</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="touch-loading">
          <div className="loading-spinner"></div>
          <p>AI анализирует рынок...</p>
          <div className="loading-steps">
            <span className="step active">📊 Сбор данных</span>
            <span className="step">📈 Расчет индикаторов</span>
            <span className="step">🎯 Сравнение с твоим выбором</span>
          </div>
        </div>
      )}

      {result && !result.error && (
        <div className="touch-result">
          <div className={`result-header ${color}`}>
            <div className="match-circle">
              <span className="match-score">{matchScore}%</span>
              <span className="match-label">совпадение</span>
            </div>
            <p className="match-text">{getMatchLabel(matchScore)}</p>
          </div>

          <div className="result-comparison">
            <div className="comparison-item">
              <span className="comparison-label">Твой выбор:</span>
              <span className={`comparison-value ${result.userChoice}`}>
                {getChoiceLabel(result.userChoice)}
              </span>
            </div>
            <div className="comparison-item">
              <span className="comparison-label">Рекомендация AI:</span>
              <span className={`comparison-value ${result.botRecommendation === 'buy' ? 'buy' : result.botRecommendation === 'sell' ? 'sell' : 'wait'}`}>
                {getChoiceLabel(result.botRecommendation)}
              </span>
            </div>
          </div>

          <div className="result-details">
            <div className="detail-row">
              <span className="detail-label">💰 Текущая цена:</span>
              <span className="detail-value">{result.price}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">📊 Уверенность AI:</span>
              <span className="detail-value">{result.confidence}%</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">🎯 Вход:</span>
              <span className="detail-value">{result.entry}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">🛑 Stop Loss:</span>
              <span className="detail-value">{result.sl}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">🎁 Take Profit:</span>
              <span className="detail-value">{result.tp}</span>
            </div>
          </div>

          {/* Мульти-таймфреймовый консенсус */}
          {result.consensus && (
            <div className={`consensus-card ${result.consensus.consensusActive ? 'active' : 'warning'}`}>
              <div className="consensus-header">
                <span className="consensus-icon">
                  {result.consensus.consensusActive ? '✅' : '⚠️'}
                </span>
                <span className="consensus-title">
                  {result.consensus.consensusActive ? 'Консенсус достигнут' : 'Разногласие таймфреймов'}
                </span>
              </div>
              
              <div className="consensus-reason">
                {result.consensus.consensusReason}
              </div>

              <div className="timeframes-grid">
                {result.consensus.timeframes.map((tf, index) => {
                  const isBuy = tf.type === 'BUY'
                  const isSell = tf.type === 'SELL'
                  const isWait = tf.type === 'WAIT'
                  const isActive = result.consensus.consensusActive && 
                    ((result.consensus.consensusType === 'BUY' && isBuy) ||
                     (result.consensus.consensusType === 'SELL' && isSell))
                  const isDisagree = result.consensus.consensusActive && 
                    ((result.consensus.consensusType === 'BUY' && !isBuy) ||
                     (result.consensus.consensusType === 'SELL' && !isSell))
                  
                  return (
                    <div 
                      key={index} 
                      className={`timeframe-item ${
                        isActive ? 'active' : 
                        isDisagree ? 'disagree' : 
                        isWait ? 'wait' : ''
                      }`}
                    >
                      <div className="candle-icon">
                        {isBuy ? '🕯️' : isSell ? '🕯️' : '⏸️'}
                      </div>
                      <div className="timeframe-label">{tf.tf}</div>
                      <div className={`timeframe-signal ${isBuy ? 'buy' : isSell ? 'sell' : 'wait'}`}>
                        {tf.type}
                      </div>
                      <div className="timeframe-check">
                        {isActive ? (
                          <span className="check-mark">✓</span>
                        ) : isDisagree ? (
                          <span className="cross-mark">✗</span>
                        ) : (
                          <span className="wait-mark">—</span>
                        )}
                      </div>
                      <div className="timeframe-confidence">
                        {tf.confidence}%
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="consensus-votes">
                <div className="vote buy">
                  <span>📈</span>
                  <span>{result.consensus.buyCount}/3</span>
                </div>
                <div className="vote separator">|</div>
                <div className="vote sell">
                  <span>📉</span>
                  <span>{result.consensus.sellCount}/3</span>
                </div>
              </div>
            </div>
          )}

          {/* Экспирация */}
          {result.expiry && (
            <div className="expiry-card">
              <div className="expiry-header">
                <span className="expiry-icon">⏱️</span>
                <span className="expiry-title">Оптимальная экспирация</span>
              </div>
              <div className="expiry-value">
                <span className="expiry-minutes">{result.expiry.minutes}</span>
                <span className="expiry-unit">мин</span>
              </div>
              <div className="expiry-badge">
                {result.expiry.volatilityLevel} волатильность
              </div>
              <p className="expiry-reason">{result.expiry.reason}</p>
            </div>
          )}

          <div className="result-reason">
            <strong>💡 Анализ:</strong>
            <p>{result.reason}</p>
          </div>

          <button className="reset-btn" onClick={reset}>
            🔄 Попробовать снова
          </button>
        </div>
      )}

      {result?.error && (
        <div className="touch-error">
          <p>{result.error}</p>
          <button className="reset-btn" onClick={reset}>
            Попробовать снова
          </button>
        </div>
      )}

      {hapticFeedback && (
        <div className="haptic-feedback">
          <div className="haptic-pulse"></div>
        </div>
      )}
    </div>
  )
}

export default TouchTrigger
