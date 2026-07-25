import { useState, useEffect } from 'react'
import './LiquidityClusters.css'
import { analyzeLiquidity } from '../services/LiquidityAnalyzer'

function LiquidityClusters({ priceHistory, currentPrice }) {
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
      const result = analyzeLiquidity(priceHistory, currentPrice)
      setAnalysis(result)
    } catch (error) {
      console.error('Ошибка анализа ликвидности:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34d399'
      case 'no_clusters': return '#fbbf24'
      default: return '#94a3b8'
    }
  }

  const getClusterTypeIcon = (type) => {
    return type === 'buy_stop' ? '🟢' : '🔴'
  }

  const getClusterTypeLabel = (type) => {
    return type === 'buy_stop' ? 'Стоп-лорды покупателей' : 'Стоп-лорды продавцов'
  }

  return (
    <div className="liquidity-clusters-card">
      <div className="clusters-header">
        <div className="clusters-icon">🎯</div>
        <div className="clusters-info">
          <h3>Кластеры ликвидности</h3>
          <p>Зоны стоп-ордеров крупных игроков</p>
        </div>
        <div className="clusters-status" style={{ background: analysis ? getStatusColor(analysis.status) : '#94a3b8' }}>
          {isLoading ? '⏳' : (analysis?.status === 'active' ? '✅' : '⚠️')}
        </div>
      </div>

      {isLoading ? (
        <div className="clusters-loading">
          <div className="loading-spinner"></div>
          <p>Анализирую зоны...</p>
        </div>
      ) : analysis?.clusters && analysis.clusters.length > 0 ? (
        <div className="clusters-list">
          {analysis.clusters.map((cluster, index) => (
            <div key={index} className={`cluster-item ${cluster.isNear ? 'near' : ''}`}>
              <div className="cluster-type-icon">{getClusterTypeIcon(cluster.type)}</div>
              <div className="cluster-details">
                <div className="cluster-price">{cluster.price.toFixed(5)}</div>
                <div className="cluster-label">{getClusterTypeLabel(cluster.type)}</div>
              </div>
              <div className="cluster-meta">
                <div className="cluster-strength">
                  <div className="strength-bar">
                    <div className="strength-fill" style={{ width: `${cluster.strength * 100}%` }}></div>
                  </div>
                  <span>{Math.round(cluster.strength * 100)}%</span>
                </div>
                {cluster.isNear && (
                  <div className="cluster-near-badge">БЛИЗКО</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="clusters-empty">
          <div className="empty-icon">🔍</div>
          <p>Кластеры не обнаружены</p>
          <small>Рынок в фазе накопления</small>
        </div>
      )}

      {analysis?.nearestCluster && (
        <div className="clusters-summary">
          <div className="summary-row">
            <span>Ближайший кластер:</span>
            <strong>{analysis.nearestCluster.price.toFixed(5)}</strong>
          </div>
          <div className="summary-row">
            <span>Расстояние:</span>
            <strong>{(analysis.nearestCluster.distance * 10000).toFixed(1)} пипсов</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiquidityClusters
