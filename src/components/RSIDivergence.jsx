import { useState, useEffect } from 'react'
import './RSIDivergence.css'
import { analyzeRSI } from '../services/RSIAnalyzer'

function RSIDivergence({ priceHistory, currentPrice }) {
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadAnalysis()
    const interval = setInterval(loadAnalysis, 60000)
    return () => clearInterval(interval)
  }, [priceHistory, currentPrice])

  const loadAnalysis = async () => {
    setIsLoading(true)
    try {
      const result = analyzeRSI(priceHistory, currentPrice)
      setAnalysis(result)
    } catch (error) {
      console.error('Ошибка анализа RSI:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRSIColor = (rsi) => {
    if (rsi > 70) return '#f87171'
    if (rsi < 30) return '#34d399'
    return '#8ecae6'
  }

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'BUY': return '#34d399'
      case 'SELL': return '#f87171'
      default: return '#fbbf24'
    }
  }

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'BUY': return '📈'
      case 'SELL': return '📉'
      default: return '⏸️'
    }
  }

  const getDivergenceLabel = (div) => {
    switch (div) {
      case 'bullish': return '🐂 Бычья дивергенция'
      case 'bearish': return '🐻 Медвежья дивергенция'
      default: return '❌ Дивергенций нет'
    }
  }

  const getRSILabel = (status) => {
    switch (status) {
      case 'overbought': return '⚡ Перекупленность'
      case 'oversold': return '💰 Перепроданность'
      default: return '➖ Нейтральная зона'
    }
  }

  return (
    <div className="rsi-divergence-card">
      <div className="rsi-header">
        <div className="rsi-icon">📊</div>
        <div className="rsi-info">
          <h3>RSI + Дивергенции</h3>
          <p>Экстремумы и расхождения с ценой</p>
        </div>
        <div className="rsi-signal-badge" style={{ background: analysis ? getSignalColor(analysis.signal) : '#94a3b8' }}>
          {analysis ? getSignalIcon(analysis.signal) : '⏳'}
        </div>
      </div>

      {isLoading ? (
        <div className="rsi-loading">
          <div className="loading-spinner"></div>
          <p>Рассчитываю индикаторы...</p>
        </div>
      ) : analysis ? (
        <>
          <div className="rsi-meter">
            <div className="rsi-value" style={{ color: getRSIColor(analysis.rsi) }}>
              {analysis.rsi.toFixed(1)}
            </div>
            <div className="rsi-bar">
              <div className="rsi-bar-segment overbought"></div>
              <div className="rsi-bar-segment neutral"></div>
              <div className="rsi-bar-segment oversold"></div>
              <div className="rsi-indicator" style={{ left: `${analysis.rsi}%` }}></div>
            </div>
            <div className="rsi-labels">
              <span>0</span>
              <span>30</span>
              <span>70</span>
              <span>100</span>
            </div>
          </div>

          <div className="rsi-status-cards">
            <div className="rsi-status-card">
              <div className="status-icon">🎯</div>
              <div className="status-info">
                <div className="status-label">Состояние RSI</div>
                <div className="status-value">{getRSILabel(analysis.status)}</div>
              </div>
            </div>

            <div className="rsi-status-card">
              <div className="status-icon">🔍</div>
              <div className="status-info">
                <div className="status-label">Дивергенция</div>
                <div className="status-value">{getDivergenceLabel(analysis.divergence)}</div>
              </div>
            </div>
          </div>

          <div className="rsi-recommendation">
            <div className="rec-header">
              <span className="rec-icon">{getSignalIcon(analysis.signal)}</span>
              <span className="rec-text">Рекомендация AI</span>
            </div>
            <div className="rec-body">
              {analysis.signal === 'BUY' && (
                <p>RSI показывает перепроданность или бычью дивергенцию. Возможный сигнал для покупки.</p>
              )}
              {analysis.signal === 'SELL' && (
                <p>RSI показывает перекупленность или медвежью дивергенцию. Возможный сигнал для продажи.</p>
              )}
              {analysis.signal === 'HOLD' && (
                <p>RSI в нейтральной зоне, дивергенций нет. Рекомендуется воздержаться от входа.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default RSIDivergence
