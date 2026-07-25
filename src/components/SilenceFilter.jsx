import { useState, useEffect } from 'react'
import './SilenceFilter.css'
import { analyzeSilence } from '../services/SilenceFilter'

function SilenceFilter({ priceHistory, currentPrice }) {
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
      const result = analyzeSilence(priceHistory, currentPrice)
      setAnalysis(result)
    } catch (error) {
      console.error('Ошибка анализа тишины:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'breakout': return '#34d399'
      case 'consolidation': return '#fbbf24'
      default: return '#8ecae6'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'breakout': return '🚀'
      case 'consolidation': return '😴'
      default: return '🌊'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'breakout': return 'Пробой!'
      case 'consolidation': return 'Консолидация'
      default: return 'Нормально'
    }
  }

  const getVolatilityLabel = (vol) => {
    if (vol < 0.0005) return '🧊 Очень низкая'
    if (vol < 0.001) return '❄️ Низкая'
    if (vol < 0.002) return '🌤️ Средняя'
    return '🔥 Высокая'
  }

  return (
    <div className="silence-filter-card">
      <div className="silence-header">
        <div className="silence-icon">🤫</div>
        <div className="silence-info">
          <h3>Фильтр "Тишина"</h3>
          <p>Вход после консолидации</p>
        </div>
        <div className="silence-status" style={{ background: analysis ? getStatusColor(analysis.status) : '#94a3b8' }}>
          {isLoading ? '⏳' : (analysis ? getStatusIcon(analysis.status) : '⚠️')}
        </div>
      </div>

      {isLoading ? (
        <div className="silence-loading">
          <div className="loading-spinner"></div>
          <p>Анализирую волатильность...</p>
        </div>
      ) : analysis ? (
        <>
          <div className="silence-indicator">
            <div className={`indicator-main ${analysis.status}`}>
              <span className="indicator-icon">{getStatusIcon(analysis.status)}</span>
              <span className="indicator-label">{getStatusLabel(analysis.status)}</span>
            </div>
          </div>

          <div className="silence-metrics">
            <div className="metric-row">
              <div className="metric-label">
                <span className="metric-icon">📊</span>
                <span>Волатильность</span>
              </div>
              <div className="metric-value">{getVolatilityLabel(analysis.volatility)}</div>
            </div>

            <div className="metric-row">
              <div className="metric-label">
                <span className="metric-icon">⏱️</span>
                <span>Длительность</span>
              </div>
              <div className="metric-value">
                {analysis.consolidation ? `${analysis.duration} баров` : '—'}
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">
                <span className="metric-icon">📏</span>
                <span>ATR (14)</span>
              </div>
              <div className="metric-value">{analysis.atr ? analysis.atr.toFixed(5) : '—'}</div>
            </div>
          </div>

          <div className="silence-recommendation">
            <div className="rec-icon">💡</div>
            <div className="rec-content">
              <div className="rec-title">Стратегия входа</div>
              <div className="rec-text">
                {analysis.status === 'consolidation' && (
                  <p>Рынок в фазе консолидации. Крупные игроки накапливают позиции. <strong>Ожидайте пробоя!</strong></p>
                )}
                {analysis.status === 'breakout' && (
                  <p>Обнаружен пробой зоны консолидации! <strong>Возможен вход в сторону пробоя.</strong></p>
                )}
                {analysis.status === 'normal' && (
                  <p>Рынок в нормальном режиме. Нет явных сигналов для ожидания.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default SilenceFilter
