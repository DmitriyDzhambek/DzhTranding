/**
 * REAL AI Trading Engine — РЕАЛЬНЫЙ технический анализ
 * Использует реальные данные с Binance (EURUSDT)
 * WebSocket для real-time, REST API для исторических свечей
 */

/**
 * Получение исторических свечей с Binance (реальные данные каждую минуту)
 * Возвращает массив цен закрытия
 */
export async function getHistoricalData(days = 1) {
  try {
    // Получаем 1-минутные свечи с Binance
    const limit = Math.min(days * 24 * 60, 1000) // макс 1000 свечей
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=EURUSDT&interval=1m&limit=${limit}`
    )
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const klines = await response.json()
    
    // Binance klines: [openTime, open, high, low, close, volume, ...]
    const prices = klines.map(kline => parseFloat(kline[4])) // close price
    
    if (prices.length < 20) {
      console.warn(`Мало данных: ${prices.length} свечей`)
      return []
    }
    
    return prices.map((price, i) => ({
      date: new Date(klines[i][0]).toISOString(),
      price
    }))
  } catch (error) {
    console.error('Ошибка получения исторических данных с Binance:', error)
    return []
  }
}

/**
 * Получение текущей цены EUR/USD с Binance (real-time)
 */
export async function getCurrentPrice() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT')
    const data = await response.json()
    return parseFloat(data.price)
  } catch (error) {
    console.error('Ошибка получения цены Binance:', error)
    return null
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
 * Расчёт волатильности (среднее абсолютное изменение)
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
 * Расчёт ATR (Average True Range) — средний диапазон движения цены
 * Ключевой индикатор для определения оптимального времени экспирации
 */
function calculateATR(data, period = 14) {
  if (data.length < period + 1) return null
  
  // Для дневных данных используем range между точками
  const ranges = []
  for (let i = 1; i <= data.length; i++) {
    ranges.push(Math.abs(data[data.length - i] - data[data.length - i - 1]))
  }
  
  if (ranges.length < period) return null
  
  const atr = ranges.slice(0, period).reduce((a, b) => a + b, 0) / period
  return parseFloat(atr.toFixed(6))
}

/**
 * Расчёт оптимального времени экспирации на основе ATR
 * 
 * Логика: экспирация должна быть достаточна для достижения Take Profit,
 * но не слишком длинна, чтобы не потерять предсказуемость.
 * 
 * Формула: экспирация = (TP_distance / ATR) * avg_candle_time
 * 
 * Для бинарных опционов:
 * - Низкая волатильность (ATR < 0.0003) → дольше 5-10 мин
 * - Средняя волатильность (ATR 0.0003-0.0006) → 3-5 мин  
 * - Высокая волатильность (ATR > 0.0006) → 1-3 мин
 */
function calculateOptimalExpiry(atr, volatility, trend, currentPrice) {
  if (!atr || atr === 0) return { minutes: 5, reason: 'Недостаточно данных для расчёта' }
  
  // Используем реальную текущую цену
  const price = currentPrice || 1.14130
  
  // ATR в процентах от цены
  const atrPercent = (atr / price) * 100
  
  // Среднее движение за свечу (для 1-минутных данных ~1 мин)
  const avgCandleTime = 1 // минута
  
  // Сколько свечей нужно для достижения TP (примерно 2x ATR)
  const candlesToTP = 2
  
  // Базовое время экспирации
  let baseMinutes = Math.round(candlesToTP * atrPercent * 1000)
  
  // Корректировка по тренду
  if (trend === 'bullish' || trend === 'bearish') {
    baseMinutes = Math.round(baseMinutes * 0.8) // тренд ускоряет
  }
  
  // Ограничения: от 1 до 15 минут
  baseMinutes = Math.max(1, Math.min(15, baseMinutes))
  
  // Определяем уровень волатильности
  let volatilityLevel, volatilityReason
  if (atrPercent < 0.02) {
    volatilityLevel = 'Низкая'
    volatilityReason = 'рынок спокойный, нужно больше времени'
  } else if (atrPercent < 0.04) {
    volatilityLevel = 'Средняя'
    volatilityReason = 'нормальная активность рынка'
  } else {
    volatilityLevel = 'Высокая'
    volatilityReason = 'высокая волатильность, быстрое движение'
  }
  
  // Рекомендуемые таймфреймы для бинарных опционов
  const recommendedExpiries = [1, 2, 3, 5, 10, 15]
  let bestExpiry = recommendedExpiries.find(e => e >= baseMinutes) || 15
  
  // Формируем описание
  let reason = `ATR: ${atrPercent.toFixed(3)}% (${volatilityLevel} волатильность). ${volatilityReason}.`
  
  return {
    minutes: bestExpiry,
    atr: atr,
    atrPercent: parseFloat(atrPercent.toFixed(4)),
    volatilityLevel,
    reason,
    candlesToTP,
    recommendedExpiries
  }
}

/**
 * Анализ одного таймфрейма
 * periodMultiplier — множитель для периодов индикаторов:
 *   1 = короткий (1 мин), 3 = средний (3 мин), 5 = длинный (5 мин)
 */
function analyzeTimeframe(prices, periodMultiplier) {
  const rsiPeriod = Math.max(7, Math.round(14 * periodMultiplier / 5))
  const smaShort = Math.max(3, Math.round(5 * periodMultiplier / 5))
  const smaLong = Math.max(10, Math.round(20 * periodMultiplier / 5))
  
  const rsi = calculateRSI(prices, rsiPeriod)
  const trend = determineTrendCustom(prices, smaShort, smaLong)
  const volatility = calculateVolatility(prices)
  
  let buyScore = 0
  let sellScore = 0
  
  // RSI
  if (rsi !== null) {
    if (rsi < 30) buyScore += 2
    else if (rsi > 70) sellScore += 2
    else if (rsi < 40) buyScore += 1
    else if (rsi > 60) sellScore += 1
  }
  
  // Тренд
  if (trend === 'bullish') buyScore += 2
  else if (trend === 'bearish') sellScore += 2
  
  // Bollinger Bands
  const bollinger = calculateBollingerBands(prices, smaLong, 2)
  const currentPrice = prices[prices.length - 1]
  if (bollinger) {
    if (currentPrice <= bollinger.lower) buyScore += 1
    else if (currentPrice >= bollinger.upper) sellScore += 1
  }
  
  // Определяем сигнал таймфрейма
  let tfType = 'WAIT'
  let tfConfidence = 50
  
  if (buyScore >= 3 && buyScore > sellScore) {
    tfType = 'BUY'
    tfConfidence = Math.min(90, 55 + buyScore * 9)
  } else if (sellScore >= 3 && sellScore > buyScore) {
    tfType = 'SELL'
    tfConfidence = Math.min(90, 55 + sellScore * 9)
  } else if (buyScore > sellScore && buyScore >= 2) {
    tfType = 'BUY'
    tfConfidence = 50 + buyScore * 7
  } else if (sellScore > buyScore && sellScore >= 2) {
    tfType = 'SELL'
    tfConfidence = 50 + sellScore * 7
  }
  
  return {
    type: tfType,
    confidence: Math.round(tfConfidence),
    buyScore,
    sellScore,
    rsi,
    trend,
    bollinger,
    volatility
  }
}

/**
 * Кастомное определение тренда с настраиваемыми периодами SMA
 */
function determineTrendCustom(data, shortPeriod, longPeriod) {
  if (data.length < longPeriod) return 'unknown'
  
  const smaShort = calculateSMA(data, shortPeriod)
  const smaLong = calculateSMA(data, longPeriod)
  
  if (!smaShort || !smaLong || smaShort.length === 0 || smaLong.length === 0) return 'unknown'
  
  const currentSMAShort = smaShort[smaShort.length - 1]
  const currentSMALong = smaLong[smaLong.length - 1]
  const currentPrice = data[data.length - 1]
  
  if (currentSMAShort > currentSMALong && currentPrice > currentSMAShort) return 'bullish'
  if (currentSMAShort < currentSMALong && currentPrice < currentSMAShort) return 'bearish'
  
  return 'neutral'
}

/**
 * Мульти-таймфреймовый консенсус
 * Анализирует 3 таймфрейма: 1 мин, 3 мин, 5 мин
 * Сигнал только когда все 3 совпадают
 */
function analyzeMultiTimeframeConsensus(prices) {
  // Анализируем каждый таймфрейм независимо
  const tf1 = analyzeTimeframe(prices, 1)  // 1 минута
  const tf3 = analyzeTimeframe(prices, 3)  // 3 минуты
  const tf5 = analyzeTimeframe(prices, 5)  // 5 минут
  
  const timeframes = [
    { tf: '1 мин', ...tf1 },
    { tf: '3 мин', ...tf3 },
    { tf: '5 мин', ...tf5 }
  ]
  
  // Считаем голоса
  const buyCount = timeframes.filter(t => t.type === 'BUY').length
  const sellCount = timeframes.filter(t => t.type === 'SELL').length
  const waitCount = timeframes.filter(t => t.type === 'WAIT').length
  
  // Консенсус: все 3 должны совпадать
  let consensusType = 'WAIT'
  let consensusReason = ''
  let consensusActive = false
  
  if (buyCount === 3) {
    consensusType = 'BUY'
    consensusReason = 'Консенсус: все 3 таймфрейма показывают BUY'
    consensusActive = true
  } else if (sellCount === 3) {
    consensusType = 'SELL'
    consensusReason = 'Консенсус: все 3 таймфрейма показывают SELL'
    consensusActive = true
  } else if (waitCount >= 2) {
    consensusType = 'WAIT'
    consensusReason = 'Большинство таймфреймов в ожидании'
  } else {
    // Разногласие — хотя бы один расходится
    const disagreements = timeframes.filter(t => t.type !== consensusType)
    const disagreeLabels = disagreements.map(d => `${d.tf}=${d.type}`).join(', ')
    consensusType = 'WAIT'
    consensusReason = `Разногласие: ${disagreeLabels}. Ждите выравнивания.`
  }
  
  // Средняя уверенность по всем таймфреймам
  const avgConfidence = Math.round(
    timeframes.reduce((sum, t) => sum + t.confidence, 0) / timeframes.length
  )
  
  // Бонус к уверенности за полный консенсус
  const finalConfidence = consensusActive
    ? Math.min(98, avgConfidence + 10)
    : Math.max(20, avgConfidence - 15)
  
  return {
    consensusType,
    consensusActive,
    consensusReason,
    confidence: finalConfidence,
    timeframes,
    buyCount,
    sellCount,
    waitCount
  }
}

/**
 * Алгоритм А: Анализ тренда и индикаторов
 * RSI, MACD, Bollinger Bands, SMA тренд
 */
function algorithmA_TrendAndIndicators(prices) {
  const rsi = calculateRSI(prices, 14)
  const macd = calculateMACD(prices)
  const bollinger = calculateBollingerBands(prices, 20, 2)
  const trend = determineTrend(prices)
  const currentPrice = prices[prices.length - 1]

  let buyScore = 0
  let sellScore = 0

  // RSI
  if (rsi !== null) {
    if (rsi < 30) buyScore += 3
    else if (rsi > 70) sellScore += 3
    else if (rsi < 40) buyScore += 1
    else if (rsi > 60) sellScore += 1
  }

  // MACD
  if (macd) {
    if (macd.histogram > 0) buyScore += 2
    else if (macd.histogram < 0) sellScore += 2
  }

  // Bollinger Bands
  if (bollinger) {
    if (currentPrice <= bollinger.lower) buyScore += 2
    else if (currentPrice >= bollinger.upper) sellScore += 2
  }

  // SMA Тренд
  if (trend === 'bullish') buyScore += 2
  else if (trend === 'bearish') sellScore += 2

  // Определяем сигнал
  let signal = 'WAIT'
  let confidence = 50

  if (buyScore >= 5 && buyScore > sellScore) {
    signal = 'BUY'
    confidence = Math.min(95, 60 + buyScore * 5)
  } else if (sellScore >= 5 && sellScore > buyScore) {
    signal = 'SELL'
    confidence = Math.min(95, 60 + sellScore * 5)
  } else if (buyScore >= 3 && buyScore > sellScore) {
    signal = 'BUY'
    confidence = 50 + buyScore * 5
  } else if (sellScore >= 3 && sellScore > buyScore) {
    signal = 'SELL'
    confidence = 50 + sellScore * 5
  }

  return {
    algorithm: 'A',
    name: 'Анализ тренда и индикаторов',
    signal,
    confidence,
    buyScore,
    sellScore,
    details: { rsi, macd, bollinger, trend, currentPrice }
  }
}

/**
 * Алгоритм Б: Анализ объёма и микроструктуры
 * Volume profile, price action, candlestick pattern, order flow
 */
function algorithmB_VolumeAndMicrostructure(prices) {
  const currentPrice = prices[prices.length - 1]
  const prevPrice = prices[prices.length - 2]
  const prev2Price = prices[prices.length - 3]
  const prev3Price = prices[prices.length - 4]
  const prev4Price = prices[prices.length - 5]

  // 1. Price momentum (скорость изменения цены)
  const momentum = currentPrice - prevPrice
  const momentum2 = prevPrice - prev2Price
  const momentum3 = prev2Price - prev3Price

  // 2. Volume proxy (объём через изменение цены — чем больше движение, тем выше "объём")
  const priceChanges = []
  for (let i = 1; i < Math.min(prices.length, 20); i++) {
    priceChanges.push(Math.abs(prices[i] - prices[i - 1]))
  }
  const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length
  const currentChange = Math.abs(currentPrice - prevPrice)
  const volumeRatio = avgChange > 0 ? currentChange / avgChange : 1

  // 3. Candlestick pattern detection
  let patternScore = 0
  // Hammer / Bullish engulfment
  if (momentum > 0 && momentum > avgChange * 1.5) patternScore += 1
  // Shooting star / Bearish engulfment
  if (momentum < 0 && Math.abs(momentum) > avgChange * 1.5) patternScore -= 1

  // 4. Order flow (последовательность движений)
  let consecutiveUp = 0
  let consecutiveDown = 0
  for (let i = prices.length - 1; i >= Math.max(0, prices.length - 10); i--) {
    if (i > 0 && prices[i] > prices[i - 1]) consecutiveUp++
    else if (i > 0 && prices[i] < prices[i - 1]) consecutiveDown++
    else break
  }

  // 5. Support/Resistance proximity (близость к уровням)
  const recentHigh = Math.max(...prices.slice(-20))
  const recentLow = Math.min(...prices.slice(-20))
  const priceRange = recentHigh - recentLow
  const pricePosition = priceRange > 0 ? (currentPrice - recentLow) / priceRange : 0.5

  // 6. Microstructure divergence (расхождение между импульсами)
  let divergence = false
  if (momentum > 0 && momentum2 < 0 && momentum3 < 0) divergence = true
  if (momentum < 0 && momentum2 > 0 && momentum3 > 0) divergence = true

  // === Суммируем баллы ===
  let buyScore = 0
  let sellScore = 0

  // Momentum
  if (momentum > avgChange * 0.5) buyScore += 2
  else if (momentum < -avgChange * 0.5) sellScore += 2

  // Volume confirmation (высокий объём подтверждает тренд)
  if (volumeRatio > 1.5 && momentum > 0) buyScore += 2
  else if (volumeRatio > 1.5 && momentum < 0) sellScore += 2
  else if (volumeRatio < 0.5) {
    // Низкий объём — не уверен
    buyScore += 0
    sellScore += 0
  }

  // Pattern
  patternScore > 0 ? buyScore += 1 : patternScore < 0 ? sellScore += 1 : null

  // Order flow (последовательность)
  if (consecutiveUp >= 3) buyScore += 2
  if (consecutiveDown >= 3) sellScore += 2

  // Support/Resistance
  if (pricePosition < 0.15) buyScore += 2
  else if (pricePosition > 0.85) sellScore += 2

  // Divergence (расхождение — сигнал разворота)
  if (divergence && momentum > 0) sellScore += 1
  if (divergence && momentum < 0) buyScore += 1

  // Определяем сигнал
  let signal = 'WAIT'
  let confidence = 50

  if (buyScore >= 5 && buyScore > sellScore) {
    signal = 'BUY'
    confidence = Math.min(95, 55 + buyScore * 6)
  } else if (sellScore >= 5 && sellScore > buyScore) {
    signal = 'SELL'
    confidence = Math.min(95, 55 + sellScore * 6)
  } else if (buyScore >= 3 && buyScore > sellScore) {
    signal = 'BUY'
    confidence = 45 + buyScore * 5
  } else if (sellScore >= 3 && sellScore > buyScore) {
    signal = 'SELL'
    confidence = 45 + sellScore * 5
  }

  return {
    algorithm: 'B',
    name: 'Анализ объёма и микроструктуры',
    signal,
    confidence,
    buyScore,
    sellScore,
    details: {
      momentum,
      volumeRatio,
      patternScore,
      consecutiveUp,
      consecutiveDown,
      pricePosition,
      divergence,
      recentHigh,
      recentLow,
      currentPrice
    }
  }
}

/**
 * ДВОЙНАЯ ПРОВЕРКА (TWO-STEP CONFIRMATION)
 * Оба алгоритма должны согласиться для выдачи сигнала
 */
export function twoStepConfirmation(prices) {
  const algoA = algorithmA_TrendAndIndicators(prices)
  const algoB = algorithmB_VolumeAndMicrostructure(prices)

  const bothAgree = (algoA.signal === algoB.signal) && 
                    (algoA.signal === 'BUY' || algoA.signal === 'SELL')
  
  const bothWait = algoA.signal === 'WAIT' && algoB.signal === 'WAIT'

  let result = {
    algorithmA: algoA,
    algorithmB: algoB,
    confirmed: false,
    confirmationMethod: null,
    cooldownUntil: null
  }

  if (bothAgree) {
    result.confirmed = true
    result.confirmationMethod = 'Два алгоритма подтверждают сигнал'
    result.signal = algoA.signal
    result.confidence = Math.round((algoA.confidence + algoB.confidence) / 2)
    result.reason = `✅ Подтверждено 2 методами: ${algoA.name} (${algoA.signal}) + ${algoB.name} (${algoB.signal})`
  } else if (bothWait) {
    result.confirmed = false
    result.confirmationMethod = null
    result.signal = 'WAIT'
    result.confidence = Math.round((algoA.confidence + algoB.confidence) / 2)
    result.reason = '⏸️ Оба алгоритма рекомендуют подождать'
  } else {
    // Расхождение — блокируем сигнал
    result.confirmed = false
    result.confirmationMethod = 'Расхождение алгоритмов'
    result.signal = 'WAIT'
    result.confidence = Math.min(algoA.confidence, algoB.confidence)
    result.reason = '⚠️ Условия неясны, жди 3 минуты'
    result.cooldownUntil = Date.now() + 3 * 60 * 1000 // 3 минуты
    result.reason += ` (Алгоритм А: ${algoA.signal}, Алгоритм Б: ${algoB.signal})`
  }

  return result
}

/**
 * АНАЛИЗ РЫНКА С ГОРЫМИ ДАННЫМИ (из WebSocket)
 * Использует реальные цены напрямую без API запросов
 */
export function analyzeMarketWithPrices(prices, currentPrice) {
  if (!prices || prices.length < 20) {
    return {
      type: 'WAIT',
      confidence: 0,
      reason: 'Недостаточно данных для анализа',
      price: currentPrice,
      indicators: null
    }
  }
  
  // Если currentPrice не передан — берём последнюю цену из массива
  const price = currentPrice || prices[prices.length - 1]
  
  // Расчёт базовых индикаторов для отображения
  const rsi = calculateRSI(prices, 14)
  const macd = calculateMACD(prices)
  const bollinger = calculateBollingerBands(prices, 20, 2)
  const trend = determineTrend(prices)
  const volatility = calculateVolatility(prices)
  
  // === МУЛЬТИ-ТАЙМФРЕЙМОВЫЙ КОНСЕНСУС ===
  const consensus = analyzeMultiTimeframeConsensus(prices)
  
  // Если нет консенсуса — WAIT
  if (!consensus.consensusActive) {
    // Расчёт ATR для экспирации даже при WAIT
    const atr = calculateATR(prices, 14)
    const expiry = calculateOptimalExpiry(atr, volatility, 'neutral', price)
    
    return {
      type: 'WAIT',
      confidence: consensus.confidence,
      reason: consensus.consensusReason,
      price,
      entry: null,
      sl: null,
      tp: null,
      indicators: {
        rsi,
        macd,
        bollinger,
        trend,
        volatility,
        atr: atr,
        atrPercent: expiry.atrPercent
      },
      expiry,
      consensus,
      timestamp: new Date().toLocaleString('ru-RU')
    }
  }
  
  // Если есть консенсус — используем основной анализ
  let signalType = consensus.consensusType
  let signalConfidence = consensus.confidence
  let signalReason = consensus.consensusReason
  
  if (signalType === 'BUY') {
    signalReason = generateBuyReason(rsi, macd, bollinger, trend, price) + ' ' + signalReason
  } else if (signalType === 'SELL') {
    signalReason = generateSellReason(rsi, macd, bollinger, trend, price) + ' ' + signalReason
  }
  
  // Расчёт уровней
  const entry = price
  const sl = signalType === 'BUY' 
    ? parseFloat((entry - volatility * 1.5).toFixed(5))
    : parseFloat((entry + volatility * 1.5).toFixed(5))
  const tp = signalType === 'BUY'
    ? parseFloat((entry + volatility * 2.5).toFixed(5))
    : parseFloat((entry - volatility * 2.5).toFixed(5))
  
  // Расчёт ATR и оптимальной экспирации
  const atr = calculateATR(prices, 14)
  const expiry = calculateOptimalExpiry(atr, volatility, trend, price)
  
  return {
    type: signalType,
    confidence: signalConfidence,
    reason: signalReason,
    price,
    entry,
    sl,
    tp,
    indicators: {
      rsi,
      macd,
      bollinger,
      trend,
      volatility,
      atr: atr,
      atrPercent: expiry.atrPercent
    },
    expiry,
    consensus,
    timestamp: new Date().toLocaleString('ru-RU')
  }
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
    
    // Расчёт базовых индикаторов для отображения
    const rsi = calculateRSI(prices, 14)
    const macd = calculateMACD(prices)
    const bollinger = calculateBollingerBands(prices, 20, 2)
    const trend = determineTrend(prices)
    const volatility = calculateVolatility(prices)
    
    // === МУЛЬТИ-ТАЙМФРЕЙМОВЫЙ КОНСЕНСУС ===
    const consensus = analyzeMultiTimeframeConsensus(prices)
    
    // Если нет консенсуса — WAIT
    if (!consensus.consensusActive) {
      // Расчёт ATR для экспирации даже при WAIT
      const atr = calculateATR(prices, 14)
      const expiry = calculateOptimalExpiry(atr, volatility, 'neutral', currentPrice)
      
      return {
        type: 'WAIT',
        confidence: consensus.confidence,
        reason: consensus.consensusReason,
        price: currentPrice,
        entry: null,
        sl: null,
        tp: null,
        indicators: {
          rsi,
          macd,
          bollinger,
          trend,
          volatility,
          atr: atr,
          atrPercent: expiry.atrPercent
        },
        expiry,
        consensus,
        timestamp: new Date().toLocaleString('ru-RU')
      }
    }
    
    // Если есть консенсус — используем основной анализ
    let signalType = consensus.consensusType
    let signalConfidence = consensus.confidence
    let signalReason = consensus.consensusReason
    
    if (signalType === 'BUY') {
      signalReason = generateBuyReason(rsi, macd, bollinger, trend, currentPrice) + ' ' + signalReason
    } else if (signalType === 'SELL') {
      signalReason = generateSellReason(rsi, macd, bollinger, trend, currentPrice) + ' ' + signalReason
    }
    
    // Расчёт уровней
    const entry = currentPrice
    const sl = signalType === 'BUY' 
      ? parseFloat((entry - volatility * 1.5).toFixed(5))
      : parseFloat((entry + volatility * 1.5).toFixed(5))
    const tp = signalType === 'BUY'
      ? parseFloat((entry + volatility * 2.5).toFixed(5))
      : parseFloat((entry - volatility * 2.5).toFixed(5))
    
    // Расчёт ATR и оптимальной экспирации
    const atr = calculateATR(prices, 14)
    const expiry = calculateOptimalExpiry(atr, volatility, trend, currentPrice)
    
    return {
      type: signalType,
      confidence: signalConfidence,
      reason: signalReason,
      price: currentPrice,
      entry,
      sl,
      tp,
      indicators: {
        rsi,
        macd,
        bollinger,
        trend,
        volatility,
        atr: atr,
        atrPercent: expiry.atrPercent
      },
      expiry,
      consensus,
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
 * Расчёт общей уверенности рынка (Market Confidence Score)
 * Усреднённый показатель на основе RSI, MACD, Bollinger Bands и тренда
 * Возвращает процент от 0 до 100
 * 
 * >70% — сигналы сильные, можно входить (зелёный)
 * 50-70% — средние, риск есть (жёлтый)
 * <50% — сигналов нет или противоречивы, жди (красный)
 */
export function calculateMarketConfidence(prices) {
  if (!prices || prices.length < 20) return { score: 0, level: 'low', reason: 'Недостаточно данных' }
  
  let totalScore = 0
  let maxScore = 0
  const indicators = []
  
  // 1. RSI (макс 25 баллов)
  const rsi = calculateRSI(prices, 14)
  if (rsi !== null) {
    maxScore += 25
    if (rsi < 30) {
      totalScore += 25 // Сильный сигнал на покупку
      indicators.push({ name: 'RSI', value: rsi.toFixed(1), signal: 'buy', weight: 25 })
    } else if (rsi > 70) {
      totalScore += 25 // Сильный сигнал на продажу
      indicators.push({ name: 'RSI', value: rsi.toFixed(1), signal: 'sell', weight: 25 })
    } else if (rsi < 45) {
      totalScore += 15 // Умеренный сигнал
      indicators.push({ name: 'RSI', value: rsi.toFixed(1), signal: 'buy', weight: 15 })
    } else if (rsi > 55) {
      totalScore += 15
      indicators.push({ name: 'RSI', value: rsi.toFixed(1), signal: 'sell', weight: 15 })
    } else {
      totalScore += 5 // Нейтральный
      indicators.push({ name: 'RSI', value: rsi.toFixed(1), signal: 'neutral', weight: 5 })
    }
  }
  
  // 2. MACD (макс 25 баллов)
  const macd = calculateMACD(prices)
  if (macd) {
    maxScore += 25
    if (macd.histogram > 0.0001) {
      totalScore += 25
      indicators.push({ name: 'MACD', value: macd.histogram.toFixed(5), signal: 'buy', weight: 25 })
    } else if (macd.histogram < -0.0001) {
      totalScore += 25
      indicators.push({ name: 'MACD', value: macd.histogram.toFixed(5), signal: 'sell', weight: 25 })
    } else if (Math.abs(macd.histogram) < 0.00005) {
      totalScore += 15
      indicators.push({ name: 'MACD', value: macd.histogram.toFixed(5), signal: 'neutral', weight: 15 })
    } else {
      totalScore += 10
      indicators.push({ name: 'MACD', value: macd.histogram.toFixed(5), signal: 'neutral', weight: 10 })
    }
  }
  
  // 3. Bollinger Bands (макс 25 баллов)
  const bollinger = calculateBollingerBands(prices, 20, 2)
  const currentPrice = prices[prices.length - 1]
  if (bollinger) {
    maxScore += 25
    const bandWidth = bollinger.upper - bollinger.lower
    const pricePosition = (currentPrice - bollinger.lower) / bandWidth
    
    if (pricePosition < 0.15) {
      totalScore += 25 // У нижней полосы — сильный сигнал покупки
      indicators.push({ name: 'BB', value: pricePosition.toFixed(2), signal: 'buy', weight: 25 })
    } else if (pricePosition > 0.85) {
      totalScore += 25 // У верхней полосы — сильный сигнал продажи
      indicators.push({ name: 'BB', value: pricePosition.toFixed(2), signal: 'sell', weight: 25 })
    } else if (pricePosition < 0.35) {
      totalScore += 15
      indicators.push({ name: 'BB', value: pricePosition.toFixed(2), signal: 'buy', weight: 15 })
    } else if (pricePosition > 0.65) {
      totalScore += 15
      indicators.push({ name: 'BB', value: pricePosition.toFixed(2), signal: 'sell', weight: 15 })
    } else {
      totalScore += 5 // В середине — нейтрально
      indicators.push({ name: 'BB', value: pricePosition.toFixed(2), signal: 'neutral', weight: 5 })
    }
  }
  
  // 4. Тренд SMA (макс 25 баллов)
  maxScore += 25
  const trend = determineTrend(prices)
  if (trend === 'bullish') {
    totalScore += 25
    indicators.push({ name: 'Тренд', value: 'Бычий', signal: 'buy', weight: 25 })
  } else if (trend === 'bearish') {
    totalScore += 25
    indicators.push({ name: 'Тренд', value: 'Медвежий', signal: 'sell', weight: 25 })
  } else {
    totalScore += 5
    indicators.push({ name: 'Тренд', value: 'Нейтральный', signal: 'neutral', weight: 5 })
  }
  
  // Рассчитываем процент
  const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  
  // Определяем уровень
  let level, color, emoji
  if (score >= 70) {
    level = 'high'
    color = '#34d399'
    emoji = '🟢'
  } else if (score >= 50) {
    level = 'medium'
    color = '#fbbf24'
    emoji = '🟡'
  } else {
    level = 'low'
    color = '#f87171'
    emoji = '🔴'
  }
  
  // Формируем причину
  let reason = ''
  if (score >= 70) {
    const strongSignals = indicators.filter(i => i.weight >= 20)
    reason = strongSignals.length > 0 
      ? `${strongSignals.length} индикатора показывают сильный сигнал`
      : 'Индикаторы показывают уверенный тренд'
  } else if (score >= 50) {
    reason = 'Некоторые индикаторы противоречивы'
  } else {
    reason = 'Индикаторы не дают чёткого сигнала'
  }
  
  return {
    score,
    level,
    color,
    emoji,
    reason,
    indicators,
    maxScore
  }
}

/**
 * Форматирование даты
 */
function formatDate(date) {
  return date.toISOString().split('T')[0]
}
