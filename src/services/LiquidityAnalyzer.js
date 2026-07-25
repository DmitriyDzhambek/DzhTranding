/**
 * Анализатор кластеров ликвидности
 * Определяет зоны, где крупные игроки размещают стоп-ордера
 */

export function analyzeLiquidity(priceHistory, currentPrice) {
  if (!priceHistory || priceHistory.length < 20) {
    return { clusters: [], status: 'insufficient_data' }
  }

  const clusters = findLiquidityClusters(priceHistory, currentPrice)
  const nearestCluster = findNearestCluster(clusters, currentPrice)
  
  return {
    clusters,
    nearestCluster,
    status: clusters.length > 0 ? 'active' : 'no_clusters',
    totalClusters: clusters.length
  }
}

function findLiquidityClusters(priceHistory, currentPrice) {
  const clusters = []
  const lookback = 50 // Смотрим последние 50 баров
  
  // Ищем зоны сильных откатов (где были стоп-хенты)
  for (let i = 2; i < Math.min(priceHistory.length, lookback); i++) {
    const prev = priceHistory[i - 2]
    const curr = priceHistory[i]
    const next = priceHistory[i + 1]
    
    // Ищем резкие развороты (признак стоп-хента)
    const isReversal = (
      (prev.price < curr.price && next.price < curr.price && curr.price > prev.price * 1.002) ||
      (prev.price > curr.price && next.price > curr.price && curr.price < prev.price * 0.998)
    )
    
    if (isReversal) {
      const clusterZone = curr.price * 0.0005 // Зона ±5 пипсов
      clusters.push({
        price: curr.price,
        strength: calculateClusterStrength(priceHistory, curr.price, clusterZone),
        type: curr.price > prev.price ? 'buy_stop' : 'sell_stop',
        distance: Math.abs(curr.price - currentPrice),
        isNear: Math.abs(curr.price - currentPrice) < 0.0020
      })
    }
  }
  
  // Сортируем по силе
  return clusters.sort((a, b) => b.strength - a.strength).slice(0, 5)
}

function calculateClusterStrength(priceHistory, clusterPrice, zone) {
  let touches = 0
  const tolerance = zone
  
  for (const bar of priceHistory) {
    if (Math.abs(bar.price - clusterPrice) < tolerance) {
      touches++
    }
  }
  
  return Math.min(touches / 5, 1) // Нормализуем 0-1
}

function findNearestCluster(clusters, currentPrice) {
  if (clusters.length === 0) return null
  
  let nearest = clusters[0]
  for (const cluster of clusters) {
    if (Math.abs(cluster.price - currentPrice) < Math.abs(nearest.price - currentPrice)) {
      nearest = cluster
    }
  }
  
  return nearest
}
