/**
 * Стратегия "SCALPER'S DREAM" — Снайперский вход
 * Боллинджер + RSI + Объём
 */

export function analyzeScalpersDream(candles) {
  if (!candles || candles.length < 30) {
    return { signal: 'HOLD', confidence: 0, details: 'Недостаточно данных' }
  }

  const recent = candles.slice(-20)
  const bb = calculateBollingerBands(recent, 20, 2)
  const rsi = calculateRSI(recent, 14)
  const volume = analyzeVolume(recent)
  
  const buySignal = checkBuySignal(recent, bb, rsi, volume)
  const sellSignal = checkSellSignal(recent, bb, rsi, volume)
  
  // Определяем сильный сигнал
  let signal = 'HOLD'
  let confidence = 0
  let details = []
  
  if (buySignal.strong) {
    signal = 'BUY'
    confidence = buySignal.confidence
    details = buySignal.details
  } else if (sellSignal.strong) {
    signal = 'SELL'
    confidence = sellSignal.confidence
    details = sellSignal.details
  }
  
  return {
    signal,
    confidence,
    details,
    bb,
    rsi,
    volume,
    latestCandle: recent[recent.length - 1]
  }
}

function calculateBollingerBands(data, period, multiplier) {
  if (data.length < period) {
    return { upper: 0, middle: 0, lower: 0, width: 0, bandwhisper: 0 }
  }
  
  const slice = data.slice(-period)
  const prices = slice.map(c => c.close)
  const mean = prices.reduce((a, b) => a + b, 0) / period
  
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period
  const stdDev = Math.sqrt(variance)
  
  return {
    upper: mean + (stdDev * multiplier),
    middle: mean,
    lower: mean - (stdDev * multiplier),
    width: (mean - (stdDev * multiplier)) / mean * 100, // Ширина в %
    stdDev
  }
}

function calculateRSI(data, period) {
  if (data.length < period + 1) return 50
  
  let gains = 0
  let losses = 0
  
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }
  
  let avgGain = gains / period
  let avgLoss = losses / period
  
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function analyzeVolume(data) {
  if (data.length < 10) return { current: 0, avg: 0, ratio: 0, increasing: false }
  
  const recent = data.slice(-10)
  const current = recent[recent.length - 1].volume
  const avg = recent.slice(0, -1).reduce((sum, c) => sum + c.volume, 0) / (recent.length - 1)
  
  return {
    current,
    avg,
    ratio: current / avg,
    increasing: current > avg * 1.2
  }
}

function checkBuySignal(candles, bb, rsi, volume) {
  const latest = candles[candles.length - 1]
  const prev = candles[candles.length - 2]
  
  let confidence = 0
  let details = []
  
  // 1. Цена касается нижней полосы Боллинджера
  if (latest.close <= bb.upper * 1.001 && latest.close >= bb.lower) {
    confidence += 30
    details.push('✅ Цена у нижней полосы Боллинджера')
  }
  
  // 2. RSI < 30 (перепроданность)
  if (rsi < 30) {
    confidence += 25
    details.push(`✅ RSI перепродан (${rsi.toFixed(1)})`)
  } else if (rsi < 35) {
    confidence += 15
    details.push(`⚠️ RSI близок к зоне перепроданности (${rsi.toFixed(1)})`)
  }
  
  // 3. Объём растёт
  if (volume.increasing && volume.ratio > 1.3) {
    confidence += 20
    details.push(`✅ Объём растёт (${(volume.ratio * 100).toFixed(0)}% от среднего)`)
  } else if (volume.ratio > 1.0) {
    confidence += 10
    details.push(`📊 Объём выше среднего`)
  }
  
  // 4. Свеча закрывается выше сопротивления (пробой)
  const resistance = findResistance(candles)
  if (latest.close > prev.close && latest.close > resistance) {
    confidence += 25
    details.push('✅ Пробой сопротивления подтверждён')
  }
  
  // Сужение полос Боллинджера (подготовка к движению)
  if (bb.width < 0.5) {
    confidence += 10
    details.push('📉 Боллинджер сужается (ожидание пробоя)')
  }
  
  return {
    strong: confidence >= 70,
    confidence: Math.min(confidence, 100),
    details
  }
}

function checkSellSignal(candles, bb, rsi, volume) {
  const latest = candles[candles.length - 1]
  const prev = candles[candles.length - 2]
  
  let confidence = 0
  let details = []
  
  // 1. Цена касается верхней полосы
  if (latest.close >= bb.lower * 0.999 && latest.close <= bb.upper) {
    confidence += 30
    details.push('✅ Цена у верхней полосы Боллинджера')
  }
  
  // 2. RSI > 70 (перекупленность)
  if (rsi > 70) {
    confidence += 25
    details.push(`✅ RSI перекуплен (${rsi.toFixed(1)})`)
  } else if (rsi > 65) {
    confidence += 15
    details.push(`⚠️ RSI близок к зоне перекупленности (${rsi.toFixed(1)})`)
  }
  
  // 3. Объём растёт
  if (volume.increasing && volume.ratio > 1.3) {
    confidence += 20
    details.push(`✅ Объём растёт (${(volume.ratio * 100).toFixed(0)}% от среднего)`)
  } else if (volume.ratio > 1.0) {
    confidence += 10
    details.push(`📊 Объём выше среднего`)
  }
  
  // 4. Пробой поддержки
  const support = findSupport(candles)
  if (latest.close < prev.close && latest.close < support) {
    confidence += 25
    details.push('✅ Пробой поддержки подтверждён')
  }
  
  // Сужение полос
  if (bb.width < 0.5) {
    confidence += 10
    details.push('📉 Боллинджер сужается (ожидание пробоя)')
  }
  
  return {
    strong: confidence >= 70,
    confidence: Math.min(confidence, 100),
    details
  }
}

function findResistance(candles) {
  if (candles.length < 10) return candles[candles.length - 1].close
  
  const recent = candles.slice(-10)
  return Math.max(...recent.map(c => c.high))
}

function findSupport(candles) {
  if (candles.length < 10) return candles[candles.length - 1].close
  
  const recent = candles.slice(-10)
  return Math.min(...recent.map(c => c.low))
}
