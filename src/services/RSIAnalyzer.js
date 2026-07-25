/**
 * Анализатор RSI и дивергенций
 * Определяет экстремальные значения и расхождения с ценой
 */

export function analyzeRSI(priceHistory, currentPrice) {
  if (!priceHistory || priceHistory.length < 30) {
    return { rsi: 50, divergence: 'none', status: 'insufficient_data' }
  }

  const rsi = calculateRSI(priceHistory, 14)
  const divergence = detectDivergence(priceHistory, rsi)
  
  return {
    rsi,
    divergence,
    status: getRSIStatus(rsi),
    signal: getRSISignal(rsi, divergence),
    priceHistory: priceHistory.slice(-30) // Последние 30 для визуализации
  }
}

function calculateRSI(data, period) {
  if (data.length < period + 1) return 50
  
  let gains = 0
  let losses = 0
  
  // Первые изменения
  for (let i = 1; i <= period; i++) {
    const change = data[i].price - data[i - 1].price
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }
  
  let avgGain = gains / period
  let avgLoss = losses / period
  
  // Остальные бары (сглаженные)
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].price - data[i - 1].price
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function detectDivergence(priceHistory, rsiValues) {
  if (priceHistory.length < 20) return 'none'
  
  // Берём последние 10 баров
  const recent = priceHistory.slice(-10)
  const recentRSI = rsiValues.slice(-10)
  
  // Находим локальные максимумы и минимумы
  const priceHighs = findLocalExtremes(recent, 'high')
  const rsiHighs = findLocalExtremes(recentRSI, 'high')
  
  const priceLows = findLocalExtremes(recent, 'low')
  const rsiLows = findLocalExtremes(recentRSI, 'low')
  
  // Бычья дивергенция: цена делает更低低点, RSI делает更低低点 выше
  if (priceLows.length >= 2 && rsiLows.length >= 2) {
    const priceLower = priceLows[priceLows.length - 1].value < priceLows[0].value
    const rsiHigher = rsiLows[rsiLows.length - 1].value > rsiLows[0].value
    
    if (priceLower && rsiHigher) return 'bullish'
  }
  
  // Медвежья дивергенция: цена делает выше highs, RSI делает ниже highs
  if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
    const priceHigher = priceHighs[priceHighs.length - 1].value > priceHighs[0].value
    const rsiLower = rsiHighs[rsiHighs.length - 1].value < rsiHighs[0].value
    
    if (priceHigher && rsiLower) return 'bearish'
  }
  
  return 'none'
}

function findLocalExtremes(data, type) {
  const extremes = []
  const window = 3
  
  for (let i = window; i < data.length - window; i++) {
    const isExtreme = type === 'high'
      ? data[i].price > data[i - window].price && data[i].price > data[i + window].price
      : data[i].price < data[i - window].price && data[i].price < data[i + window].price
    
    if (isExtreme) {
      extremes.push({ index: i, value: data[i].price })
    }
  }
  
  return extremes
}

function getRSIStatus(rsi) {
  if (rsi > 70) return 'overbought'
  if (rsi < 30) return 'oversold'
  return 'neutral'
}

function getRSISignal(rsi, divergence) {
  if (divergence === 'bullish') return 'BUY'
  if (divergence === 'bearish') return 'SELL'
  if (rsi > 75) return 'SELL'
  if (rsi < 25) return 'BUY'
  return 'HOLD'
}
