/**
 * Фильтр "Тишина" — детектор консолидации и пробоев
 * Определяет периоды низкой волатильности и сигналы пробоя
 */

export function analyzeSilence(priceHistory, currentPrice) {
  if (!priceHistory || priceHistory.length < 20) {
    return { status: 'insufficient_data', consolidation: false, breakout: false }
  }

  const atr = calculateATR(priceHistory, 14)
  const volatility = calculateVolatility(priceHistory, 20)
  const consolidation = isConsolidation(priceHistory, atr, volatility)
  const breakout = detectBreakout(priceHistory, atr, currentPrice)
  
  return {
    status: consolidation ? 'consolidation' : (breakout ? 'breakout' : 'normal'),
    consolidation,
    breakout,
    volatility,
    atr,
    duration: consolidation ? calculateConsolidationDuration(priceHistory) : 0,
    signal: getSilenceSignal(consolidation, breakout, volatility)
  }
}

function calculateATR(data, period) {
  if (data.length < period + 1) return 0.0010
  
  let atrSum = 0
  
  for (let i = data.length - period; i < data.length; i++) {
    const high = data[i].price * 1.0003 // Симуляция high/low
    const low = data[i].price * 0.9997
    const prevClose = data[i - 1].price
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    
    atrSum += tr
  }
  
  return atrSum / period
}

function calculateVolatility(data, period) {
  if (data.length < period) return 0.0005
  
  const prices = data.slice(-period).map(d => d.price)
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
  
  return Math.sqrt(variance) / mean // Коэффициент вариации
}

function isConsolidation(data, atr, volatility) {
  // Консолидация = низкая волатильность + узкий диапазон
  const isLowVol = volatility < 0.0008
  const isNarrowRange = atr < 0.0006
  
  return isLowVol && isNarrowRange
}

function detectBreakout(data, atr, currentPrice) {
  if (data.length < 10) return false
  
  const recent = data.slice(-10)
  const highs = recent.map(d => d.price * 1.0003)
  const lows = recent.map(d => d.price * 0.9997)
  
  const resistance = Math.max(...highs)
  const support = Math.min(...lows)
  
  // Пробой выше сопротивления или ниже поддержки
  const breakoutUp = currentPrice > resistance + atr * 2
  const breakoutDown = currentPrice < support - atr * 2
  
  return breakoutUp || breakoutDown
}

function calculateConsolidationDuration(data) {
  // Считаем сколько баров подряд была низкая волатильность
  let duration = 0
  
  for (let i = data.length - 1; i >= Math.max(0, data.length - 30); i--) {
    const change = Math.abs(data[i].price - data[i - 1].price) / data[i - 1].price
    if (change < 0.001) {
      duration++
    } else {
      break
    }
  }
  
  return duration
}

function getSilenceSignal(consolidation, breakout, volatility) {
  if (breakout) {
    return 'BREAKOUT'
  }
  if (consolidation) {
    return 'WAIT'
  }
  return 'NORMAL'
}
