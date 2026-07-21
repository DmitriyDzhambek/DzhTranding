/**
 * AI Trading Engine — ядро торгового AI
 * Распознаёт паттерны, генерирует прогнозы, адаптируется к рынку
 */

// === Типы паттернов ===
const PATTERN_TYPES = {
  HEAD_SHOULDERS: 'head_shoulders',
  INVERTED_HS: 'inverted_head_shoulders',
  TRIANGLE_ASCENDING: 'triangle_ascending',
  TRIANGLE_DESCENDING: 'triangle_descending',
  TRIANGLE_CONTRACTING: 'triangle_contracting',
  DOUBLE_TOP: 'double_top',
  DOUBLE_BOTTOM: 'double_bottom',
  WEDGE: 'wedge',
  CHANNEL: 'channel',
  FLAG: 'flag',
}

// === Фазы рынка ===
const MARKET_PHASES = {
  TREND_BULL: 'trend_bull',
  TREND_BEAR: 'trend_bear',
  FLAT: 'flat',
  VOLATILE: 'volatile',
  TRANSITION: 'transition',
}

// === Индикаторы для каждой фазы ===
const PHASE_INDICATORS = {
  [MARKET_PHASES.TREND_BULL]: {
    primary: ['EMA_20_50', 'MACD', 'ADX'],
    secondary: ['RSI', 'OBV', 'Volume'],
    strategy: 'trend_following',
    description: 'Следуй за трендом, покупай на откатах',
  },
  [MARKET_PHASES.TREND_BEAR]: {
    primary: ['EMA_20_50', 'MACD', 'ADX'],
    secondary: ['RSI', 'OBV', 'Volume'],
    strategy: 'trend_following',
    description: 'Следуй за трендом, продавай на отскоках',
  },
  [MARKET_PHASES.FLAT]: {
    primary: ['Bollinger_Bands', 'RSI', 'Stochastic'],
    secondary: ['ATR', 'Volume'],
    strategy: 'mean_reversion',
    description: 'Покупай у поддержки, продавай у сопротивления',
  },
  [MARKET_PHASES.VOLATILE]: {
    primary: ['ATR', 'Bollinger_Bands', 'Volume'],
    secondary: ['VWAP', 'OrderFlow'],
    strategy: 'breakout',
    description: 'Торгуй пробои с широкими стоп-лоссами',
  },
  [MARKET_PHASES.TRANSITION]: {
    primary: ['EMA_9_21', 'MACD', 'Volume'],
    secondary: ['RSI', 'MarketStructure'],
    strategy: 'cautious',
    description: 'Осторожность, жди подтверждения',
  },
}

/**
 * Генерация реалистичных исторических данных цен
 */
function generatePriceHistory(basePrice = 1.0850, points = 100) {
  const data = []
  let price = basePrice
  
  for (let i = 0; i < points; i++) {
    const volatility = 0.002
    const trend = Math.sin(i / 15) * 0.0003
    const noise = (Math.random() - 0.5) * volatility
    const open = price
    const close = open + trend + noise
    const high = Math.max(open, close) + Math.random() * 0.001
    const low = Math.min(open, close) - Math.random() * 0.001
    const volume = Math.floor(Math.random() * 10000) + 5000
    
    data.push({
      time: i,
      open: +open.toFixed(5),
      high: +high.toFixed(5),
      low: +low.toFixed(5),
      close: +close.toFixed(5),
      volume,
    })
    
    price = close
  }
  
  return data
}

/**
 * Вычисление скользящих средних
 */
function calculateSMA(data, period) {
  const result = []
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0)
    result.push({
      time: data[i].time,
      value: +(sum / period).toFixed(5),
    })
  }
  return result
}

/**
 * Вычисление RSI
 */
function calculateRSI(data, period = 14) {
  const result = []
  let gains = 0
  let losses = 0
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close
    if (change > 0) gains += change
    else losses += Math.abs(change)
    
    if (i >= period) {
      const avgGain = gains / period
      const avgLoss = losses / period
      const rs = avgGain / (avgLoss || 0.0001)
      const rsi = 100 - (100 / (1 + rs))
      
      result.push({
        time: data[i].time,
        value: +rsi.toFixed(2),
      })
      
      gains = 0
      losses = 0
    }
  }
  
  return result
}

/**
 * Вычисление MACD
 */
function calculateMACD(data) {
  const ema12 = calculateEMA(data, 12)
  const ema26 = calculateEMA(data, 26)
  
  const macdLine = ema12.map((v, i) => ({
    time: v.time,
    value: +(v.value - ema26[i]?.value || 0).toFixed(5),
  }))
  
  return macdLine
}

function calculateEMA(data, period) {
  const result = []
  const multiplier = 2 / (period + 1)
  
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i]?.close || 0
  }
  
  let ema = sum / period
  result.push({ time: data[period - 1]?.time || 0, value: +ema.toFixed(5) })
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema
    result.push({ time: data[i].time, value: +ema.toFixed(5) })
  }
  
  return result
}

/**
 * Распознавание паттерна "Голова и плечи"
 */
function detectHeadAndShoulders(data) {
  if (data.length < 20) return null
  
  const highs = data.map(d => d.high)
  const len = highs.length
  
  // Ищем 5 локальных экстремумов
  const peaks = []
  for (let i = 3; i < len - 3; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i-3] &&
        highs[i] > highs[i+1] && highs[i] > highs[i+2] && highs[i] > highs[i+3]) {
      peaks.push({ index: i, price: highs[i] })
    }
  }
  
  if (peaks.length < 3) return null
  
  // Берём последние 3-5 пиков
  const relevant = peaks.slice(-5).slice(0, 4)
  if (relevant.length < 3) return null
  
  const [left, head, right] = relevant.length >= 3 
    ? [relevant[0], relevant[Math.floor(relevant.length/2)], relevant[relevant.length-1]]
    : [relevant[0], relevant[1], relevant[2]]
  
  // Проверяем условия H&S
  const isHS = head.price > left.price && head.price > right.price &&
               Math.abs(left.price - right.price) / left.price < 0.02
  
  if (!isHS) return null
  
  // Определяем neckline (линия шеи)
  const neckline = (left.price + right.price) / 2
  
  return {
    type: PATTERN_TYPES.HEAD_SHOULDERS,
    name: 'Голова и плечи',
    emoji: '🔺',
    bullish: false,
    confidence: 78,
    neckline: +neckline.toFixed(5),
    description: 'Бычье разворотное паттерн. Ожидается снижение от линии шеи.',
    targets: [
      { level: +(neckline - (head.price - neckline) * 0.5).toFixed(5), probability: 65, label: 'TP1 (консервативный)' },
      { level: +(neckline - (head.price - neckline)).toFixed(5), probability: 45, label: 'TP2 (агрессивный)' },
    ],
  }
}

/**
 * Распознавание "Перевернутого головы и плеч"
 */
function detectInvertedHeadAndShoulders(data) {
  if (data.length < 20) return null
  
  const lows = data.map(d => d.low)
  const len = lows.length
  
  const troughs = []
  for (let i = 3; i < len - 3; i++) {
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i-3] &&
        lows[i] < lows[i+1] && lows[i] < lows[i+2] && lows[i] < lows[i+3]) {
      troughs.push({ index: i, price: lows[i] })
    }
  }
  
  if (troughs.length < 3) return null
  
  const relevant = troughs.slice(-4)
  if (relevant.length < 3) return null
  
  const [left, head, right] = [relevant[0], relevant[Math.floor(relevant.length/2)], relevant[relevant.length-1]]
  
  const isInvHS = head.price < left.price && head.price < right.price &&
                  Math.abs(left.price - right.price) / left.price < 0.02
  
  if (!isInvHS) return null
  
  const neckline = (left.price + right.price) / 2
  
  return {
    type: PATTERN_TYPES.INVERTED_HS,
    name: 'Перевернутый голова и плечи',
    emoji: '🔻',
    bullish: true,
    confidence: 75,
    neckline: +neckline.toFixed(5),
    description: 'Бычье разворотное паттерн. Ожидается рост от линии шеи.',
    targets: [
      { level: +(neckline + (neckline - head.price) * 0.5).toFixed(5), probability: 65, label: 'TP1 (консервативный)' },
      { level: +(neckline + (neckline - head.price)).toFixed(5), probability: 45, label: 'TP2 (агрессивный)' },
    ],
  }
}

/**
 * Распознавание восходящего треугольника
 */
function detectAscendingTriangle(data) {
  if (data.length < 15) return null
  
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)
  
  // Ищем горизонтальное сопротивление (2+ пика на одном уровне)
  let resistanceCount = 0
  let resistanceLevel = 0
  for (let i = data.length - 5; i < data.length; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2]) {
      if (Math.abs(highs[i] - (resistanceLevel || highs[i])) / highs[i] < 0.01) {
        resistanceCount++
        resistanceLevel = highs[i]
      }
    }
  }
  
  // Ищем восходящую поддержку
  let supportRising = false
  for (let i = data.length - 5; i < data.length; i++) {
    if (lows[i] > lows[i-1]) supportRising = true
  }
  
  if (resistanceCount >= 1 && supportRising) {
    return {
      type: PATTERN_TYPES.TRIANGLE_ASCENDING,
      name: 'Восходящий треугольник',
      emoji: '📐',
      bullish: true,
      confidence: 72,
      resistance: +resistanceLevel.toFixed(5),
      description: 'Бычий паттерн продолжения. Покупатели давят снизу, возможен пробой вверх.',
      targets: [
        { level: +(resistanceLevel + (resistanceLevel - Math.min(...lows.slice(-10))) * 0.5).toFixed(5), probability: 60, label: 'TP1' },
        { level: +(resistanceLevel + (resistanceLevel - Math.min(...lows.slice(-10)))).toFixed(5), probability: 40, label: 'TP2' },
      ],
    }
  }
  
  return null
}

/**
 * Распознавание нисходящего треугольника
 */
function detectDescendingTriangle(data) {
  if (data.length < 15) return null
  
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)
  
  let supportCount = 0
  let supportLevel = 0
  for (let i = data.length - 5; i < data.length; i++) {
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2]) {
      if (Math.abs(lows[i] - (supportLevel || lows[i])) / lows[i] < 0.01) {
        supportCount++
        supportLevel = lows[i]
      }
    }
  }
  
  let resistanceRising = false
  for (let i = data.length - 5; i < data.length; i++) {
    if (highs[i] < highs[i-1]) resistanceRising = true
  }
  
  if (supportCount >= 1 && resistanceRising) {
    return {
      type: PATTERN_TYPES.TRIANGLE_DESCENDING,
      name: 'Нисходящий треугольник',
      emoji: '📐',
      bullish: false,
      confidence: 70,
      support: +supportLevel.toFixed(5),
      description: 'Медвежий паттерн продолжения. Продавцы давят сверху, возможен пробой вниз.',
      targets: [
        { level: +(supportLevel - (Math.max(...highs.slice(-10)) - supportLevel) * 0.5).toFixed(5), probability: 60, label: 'TP1' },
        { level: +(supportLevel - (Math.max(...highs.slice(-10)) - supportLevel)).toFixed(5), probability: 40, label: 'TP2' },
      ],
    }
  }
  
  return null
}

/**
 * Распознавание двойного верха/низа
 */
function detectDoubleTop(data) {
  if (data.length < 20) return null
  
  const highs = data.map(d => d.high)
  const len = highs.length
  
  const peaks = []
  for (let i = 3; i < len - 3; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
      peaks.push({ index: i, price: highs[i] })
    }
  }
  
  if (peaks.length < 2) return null
  
  const lastTwo = peaks.slice(-2)
  const diff = Math.abs(lastTwo[0].price - lastTwo[1].price) / lastTwo[0].price
  
  if (diff < 0.015) {
    return {
      type: PATTERN_TYPES.DOUBLE_TOP,
      name: 'Двойной верх',
      emoji: '🔝',
      bullish: false,
      confidence: 74,
      peak: +lastTwo[0].price.toFixed(5),
      description: 'Бычье разворотное паттерн. Два теста сопротивления без пробоя.',
      targets: [
        { level: +(lastTwo[0].price - (lastTwo[0].price - Math.min(...data.slice(-10).map(d => d.low))) * 0.5).toFixed(5), probability: 60, label: 'TP1' },
      ],
    }
  }
  
  return null
}

function detectDoubleBottom(data) {
  if (data.length < 20) return null
  
  const lows = data.map(d => d.low)
  const len = lows.length
  
  const troughs = []
  for (let i = 3; i < len - 3; i++) {
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
      troughs.push({ index: i, price: lows[i] })
    }
  }
  
  if (troughs.length < 2) return null
  
  const lastTwo = troughs.slice(-2)
  const diff = Math.abs(lastTwo[0].price - lastTwo[1].price) / lastTwo[0].price
  
  if (diff < 0.015) {
    return {
      type: PATTERN_TYPES.DOUBLE_BOTTOM,
      name: 'Двойной низ',
      emoji: '🔜',
      bullish: true,
      confidence: 72,
      bottom: +lastTwo[0].price.toFixed(5),
      description: 'Бычье разворотное паттерн. Два теста поддержки без пробоя.',
      targets: [
        { level: +(lastTwo[0].bottom + (Math.max(...data.slice(-10).map(d => d.high)) - lastTwo[0].price) * 0.5).toFixed(5), probability: 60, label: 'TP1' },
      ],
    }
  }
  
  return null
}

/**
 * Определение фазы рынка
 */
function determineMarketPhase(data) {
  if (data.length < 20) return MARKET_PHASES.TRANSITION
  
  const closes = data.map(d => d.close)
  const last10 = closes.slice(-10)
  const first10 = closes.slice(0, 10)
  
  // Вычисляем волатильность (ATR)
  const atr = data.slice(-14).reduce((acc, d) => {
    return acc + (d.high - d.low)
  }, 0) / 14
  
  const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length
  const volatility = atr / avgPrice
  
  // Определяем тренд
  const sma10 = calculateSMA(data, 10)
  const sma20 = calculateSMA(data, 20)
  
  const trendStrength = Math.abs(sma10[sma10.length-1]?.value - sma20[sma20.length-1]?.value) / avgPrice
  
  // RSI для определения перекупленности
  const rsi = calculateRSI(data)
  const currentRSI = rsi[rsi.length - 1]?.value || 50
  
  if (volatility > 0.003) return MARKET_PHASES.VOLATILE
  
  if (trendStrength > 0.002) {
    return sma10[sma10.length-1].value > sma20[sma20.length-1].value
      ? MARKET_PHASES.TREND_BULL
      : MARKET_PHASES.TREND_BEAR
  }
  
  if (currentRSI > 70 || currentRSI < 30) return MARKET_PHASES.TRANSITION
  
  return MARKET_PHASES.FLAT
}

/**
 * Основной анализ рынка EUR/USD
 */
function analyzeMarket() {
  const priceHistory = generatePriceHistory(1.0850) // Только EUR/USD
  
  // Определяем фазу рынка
  const phase = determineMarketPhase(priceHistory)
  const indicators = PHASE_INDICATORS[phase]
  
  // Вычисляем индикаторы
  const rsi = calculateRSI(priceHistory)
  const macd = calculateMACD(priceHistory)
  const sma20 = calculateSMA(priceHistory, 20)
  
  // Распознаём паттерны
  const patterns = []
  
  const hs = detectHeadAndShoulders(priceHistory)
  if (hs) patterns.push(hs)
  
  const invHS = detectInvertedHeadAndShoulders(priceHistory)
  if (invHS) patterns.push(invHS)
  
  const ascTri = detectAscendingTriangle(priceHistory)
  if (ascTri) patterns.push(ascTri)
  
  const descTri = detectDescendingTriangle(priceHistory)
  if (descTri) patterns.push(descTri)
  
  const doubleTop = detectDoubleTop(priceHistory)
  if (doubleTop) patterns.push(doubleTop)
  
  const doubleBottom = detectDoubleBottom(priceHistory)
  if (doubleBottom) patterns.push(doubleBottom)
  
  // Генерируем сигнал
  const currentPrice = priceHistory[priceHistory.length - 1].close
  const latestRSI = rsi[rsi.length - 1]?.value || 50
  const latestMACD = macd[macd.length - 1]?.value || 0
  
  let signalType = 'WAIT'
  let signalStrength = 50
  
  if (patterns.length > 0) {
    const strongestPattern = patterns.reduce((a, b) => a.confidence > b.confidence ? a : b)
    signalType = strongestPattern.bullish ? 'BUY' : 'SELL'
    signalStrength = strongestPattern.confidence
  } else if (latestMACD > 0 && latestRSI < 70) {
    signalType = 'BUY'
    signalStrength = 55 + Math.floor(Math.random() * 15)
  } else if (latestMACD < 0 && latestRSI > 30) {
    signalType = 'SELL'
    signalStrength = 55 + Math.floor(Math.random() * 15)
  }
  
  // Генерируем цели
  const targets = patterns.length > 0
    ? patterns[0].targets
    : signalType === 'BUY'
      ? [
          { level: +(currentPrice * 1.003).toFixed(5), probability: 65, label: 'TP1 (консервативный)' },
          { level: +(currentPrice * 1.006).toFixed(5), probability: 45, label: 'TP2 (умеренный)' },
          { level: +(currentPrice * 1.010).toFixed(5), probability: 30, label: 'TP3 (агрессивный)' },
        ]
      : [
          { level: +(currentPrice * 0.997).toFixed(5), probability: 65, label: 'TP1 (консервативный)' },
          { level: +(currentPrice * 0.994).toFixed(5), probability: 45, label: 'TP2 (умеренный)' },
          { level: +(currentPrice * 0.990).toFixed(5), probability: 30, label: 'TP3 (агрессивный)' },
        ]
  
  return {
    phase,
    phaseInfo: indicators,
    patterns,
    indicators: {
      rsi: latestRSI,
      macd: latestMACD,
      trend: sma20[sma20.length - 1]?.value || currentPrice,
    },
    signal: {
      type: signalType,
      strength: signalStrength,
      currentPrice: +currentPrice.toFixed(5),
      targets,
    },
    priceHistory: priceHistory.slice(-50),
  }
}

export {
  analyzeMarket,
  PATTERN_TYPES,
  MARKET_PHASES,
  PHASE_INDICATORS,
  generatePriceHistory,
}
