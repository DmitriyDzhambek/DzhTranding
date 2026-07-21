/**
 * REAL AI Trading Engine — РЕАЛЬНЫЙ технический анализ
 * Использует реальные данные с рынка Forex
 */

const API_BASE = 'https://api.frankfurter.app'

/**
 * Получение текущей цены EUR/USD
 */
export async function getCurrentPrice() {
  try {
    const response = await fetch(`${API_BASE}/latest?from=EUR&to=USD`)
    const data = await response.json()
    return parseFloat(data.rates.USD)
  } catch (error) {
    console.error('Ошибка получения цены:', error)
    return null
  }
}

/**
 * Получение исторических данных для анализа
 */
export async function getHistoricalData(days = 30) {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)
    
    const from = formatDate(startDate)
    const to = formatDate(endDate)
    
    const response = await fetch(
      `${API_BASE}/${from}..${to}?from=EUR&to=USD`
    )
    const data = await response.json()
    
    return data.rates.map((rate, index) => ({
      date: Object.keys(data.rates)[index],
      price: parseFloat(rate.USD)
    }))
  } catch (error) {
    console.error('Ошибка получения исторических данных:', error)
    return []
  }
}

/**
 * Расчёт Simple Moving Average (SMA)
 */
function calculateSMA(data, period) {
  if (data.length < period) return null
  
  const sma = []
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, price) => acc + price, 0)
    sma.push(sum / period)
  }
  
  return sma
}

/**
 * Расчёт RSI (Relative Strength Index)
 */
function calculateRSI(data, period = 14) {
  if (data.length < period + 1) return null
  
  const changes = []
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1])
  }
  
  const gains = changes.map(c => c > 0 ? c : 0)
  const losses = changes.map(c => c < 0 ? Math.abs(c) : 0)
  
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
  
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
  }
  
  if (avgLoss === 0) return 100
  
  const rs = avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))
  
  return parseFloat(rsi.toFixed(2))
}

/**
 * Расчёт MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(data) {
  if (data.length < 26) return null
  
  const ema12 = calculateEMA(data, 12)
  const ema26 = calculateEMA(data, 26)
  
  if (!ema12 || !ema26) return null
  
  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1]
  const signalLine = calculateSignalLine(data, 9)
  
  const histogram = macdLine - signalLine
  
  return {
    macd: parseFloat(macdLine.toFixed(5)),
    signal: parseFloat(signalLine.toFixed(5)),
    histogram: parseFloat(histogram.toFixed(5))
  }
}

/**
 * Расчёт EMA (Exponential Moving Average)
 */
function calculateEMA(data, period) {
  const multiplier = 2 / (period + 1)
  const ema = [data.slice(0, period).reduce((a, b) => a + b, 0) / period]
  
  for (let i = period; i < data.length; i++) {
    ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1])
  }
  
  return ema
}

/**
 * Расчёт Signal Line для MACD
 */
function calculateSignalLine(data, period) {
  const ema12 = calculateEMA(data, 12)
  const ema26 = calculateEMA(data, 26)
  
  if (!ema12 || !ema26) return 0
  
  const macdValues = ema12.map((value, i) => value - ema26[i])
  
  const multiplier = 2 / (period + 1)
  const signal = [macdValues.slice(0, period).reduce((a, b) => a + b, 0) / period]
  
  for (let i = period; i < macdValues.length; i++) {
    signal.push((macdValues[i] - signal[signal.length - 1]) * multiplier + signal[signal.length - 1])
  }
  
  return signal[signal.length - 1]
}

/**
 * Расчёт Bollinger Bands
 */
function calculateBollingerBands(data, period = 20, stdDev = 2) {
  if (data.length < period) return null
  
  const sma = calculateSMA(data, period)
  if (!sma || sma.length === 0) return null
  
  const lastSMA = sma[sma.length - 1]
  
  const slice = data.slice(-period)
  const variance = slice.reduce((acc, price) => acc + Math.pow(price - lastSMA, 2), 0) / period
  const standardDeviation = Math.sqrt(variance)
  
  return {
    upper: parseFloat((lastSMA + stdDev * standardDeviation).toFixed(5)),
    middle: parseFloat(lastSMA.toFixed(5)),
    lower: parseFloat((lastSMA - stdDev * standardDeviation).toFixed(5))
  }
}

/**
 * Определение тренда
 */
function determineTrend(data) {
  if (data.length < 20) return 'unknown'
  
  const sma5 = calculateSMA(data, 5)
  const sma20 = calculateSMA(data, 20)
  
  if (!sma5 || !sma20 || sma5.length === 0 || sma20.length === 0) return 'unknown'
  
  const currentSMA5 = sma5[sma5.length - 1]
  const currentSMA20 = sma20[sma20.length - 1]
  const currentPrice = data[data.length - 1]
  
  if (currentSMA5 > currentSMA20 && currentPrice > currentSMA5) return 'bullish'
  if (currentSMA5 < currentSMA20 && currentPrice < currentSMA5) return 'bearish'
  
  return 'neutral'
}

/**
 * Расчёт волатильности
 */
function calculateVolatility(data) {
  if (data.length < 2) return 0.001
  
  const changes = []
  for (let i = 1; i < data.length; i++) {
    changes.push(Math.abs(data[i] - data[i - 1]))
  }
  
  return changes.reduce((a, b) => a + b, 0) / changes.length
}

/**
 * РЕАЛЬНЫЙ AI анализ рынка
 */
export async function analyzeMarket() {
  try {
    // Получаем исторические данные
    const historicalData = await getHistoricalData(30)
    
    if (!historicalData || historicalData.length < 20) {
      return {
        type: 'WAIT',
        confidence: 0,
        reason: 'Недостаточно данных для анализа',
        price: null,
        indicators: null
      }
    }
    
    const prices = historicalData.map(d => d.price)
    const currentPrice = prices[prices.length - 1]
    
    // Расчёт индикаторов
    const rsi = calculateRSI(prices, 14)
    const macd = calculateMACD(prices)
    const bollinger = calculateBollingerBands(prices, 20, 2)
    const trend = determineTrend(prices)
    const volatility = calculateVolatility(prices)
    
    // Оценка сигнала на основе всех индикаторов
    let buyScore = 0
    let sellScore = 0
    
    // RSI анализ
    if (rsi !== null) {
      if (rsi < 30) {
        buyScore += 2 // Пере проданность
      } else if (rsi > 70) {
        sellScore += 2 // Перекупленность
      } else if (rsi < 40) {
        buyScore += 1
      } else if (rsi > 60) {
        sellScore += 1
      }
    }
    
    // MACD анализ
    if (macd) {
      if (macd.histogram > 0 && macd.macd > macd.signal) {
        buyScore += 2
      } else if (macd.histogram < 0 && macd.macd < macd.signal) {
        sellScore += 2
      }
    }
    
    // Bollinger Bands анализ
    if (bollinger) {
      if (currentPrice <= bollinger.lower) {
        buyScore += 2
      } else if (currentPrice >= bollinger.upper) {
        sellScore += 2
      }
    }
    
    // Тренд
    if (trend === 'bullish') {
      buyScore += 1
    } else if (trend === 'bearish') {
      sellScore += 1
    }
    
    // Определение типа сигнала
    let type, confidence, reason
    
    const totalScore = buyScore + sellScore
    if (totalScore === 0) {
      type = 'WAIT'
      confidence = 50
      reason = 'Нет чётких сигналов от индикаторов'
    } else if (buyScore > sellScore && buyScore >= 3) {
      type = 'BUY'
      confidence = Math.min(95, 60 + buyScore * 8)
      reason = generateBuyReason(rsi, macd, bollinger, trend, currentPrice)
    } else if (sellScore > buyScore && sellScore >= 3) {
      type = 'SELL'
      confidence = Math.min(95, 60 + sellScore * 8)
      reason = generateSellReason(rsi, macd, bollinger, trend, currentPrice)
    } else {
      type = 'WAIT'
      confidence = Math.min(65, 40 + (Math.max(buyScore, sellScore)) * 5)
      reason = 'Сигналы противоречивые, рекомендуется подождать'
    }
    
    // Расчёт уровней
    const entry = currentPrice
    const sl = type === 'BUY' 
      ? parseFloat((entry - volatility * 1.5).toFixed(5))
      : parseFloat((entry + volatility * 1.5).toFixed(5))
    const tp = type === 'BUY'
      ? parseFloat((entry + volatility * 2.5).toFixed(5))
      : parseFloat((entry - volatility * 2.5).toFixed(5))
    
    return {
      type,
      confidence: Math.round(confidence),
      reason,
      price: currentPrice,
      entry,
      sl,
      tp,
      indicators: {
        rsi,
        macd,
        bollinger,
        trend,
        volatility
      },
      timestamp: new Date().toLocaleString('ru-RU')
    }
  } catch (error) {
    console.error('Ошибка анализа рынка:', error)
    return {
      type: 'WAIT',
      confidence: 0,
      reason: 'Ошибка получения данных с рынка. Проверьте соединение.',
      price: null,
      indicators: null
    }
  }
}

/**
 * Генерация причины для BUY
 */
function generateBuyReason(rsi, macd, bollinger, trend, price) {
  const reasons = []
  
  if (rsi !== null && rsi < 30) {
    reasons.push('RSI в зоне пере проданности (< 30)')
  } else if (rsi !== null && rsi < 40) {
    reasons.push('RSI показывает потенциал роста')
  }
  
  if (macd && macd.histogram > 0) {
    reasons.push('MACD пересёк сигнал вверх')
  }
  
  if (bollinger && price <= bollinger.lower) {
    reasons.push('Цена у нижней полосы Боллинджера')
  }
  
  if (trend === 'bullish') {
    reasons.push('Тренд бычий (SMA 5 > SMA 20)')
  }
  
  return reasons.length > 0 
    ? reasons.join('. ') + '.' 
    : 'Технические индикаторы показывают потенциал роста.'
}

/**
 * Генерация причины для SELL
 */
function generateSellReason(rsi, macd, bollinger, trend, price) {
  const reasons = []
  
  if (rsi !== null && rsi > 70) {
    reasons.push('RSI в зоне перекупленности (> 70)')
  } else if (rsi !== null && rsi > 60) {
    reasons.push('RSI показывает потенциал снижения')
  }
  
  if (macd && macd.histogram < 0) {
    reasons.push('MACD пересёк сигнал вниз')
  }
  
  if (bollinger && price >= bollinger.upper) {
    reasons.push('Цена у верхней полосы Боллинджера')
  }
  
  if (trend === 'bearish') {
    reasons.push('Тренд медвежий (SMA 5 < SMA 20)')
  }
  
  return reasons.length > 0 
    ? reasons.join('. ') + '.' 
    : 'Технические индикаторы показывают потенциал снижения.'
}

/**
 * Форматирование даты
 */
function formatDate(date) {
  return date.toISOString().split('T')[0]
}
