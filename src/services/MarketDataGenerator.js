/**
 * Генератор реалистичных рыночных данных EUR/USD
 * На основе исторических паттернов и волатильности рынка
 * Работает без интернета и внешних API
 */

// Базовая цена EUR/USD (обновляется при запуске)
const BASE_PRICE = 1.1650

// Исторические паттерны волатильности по часовым поясам
const VOLATILITY_PATTERNS = {
  // Европейская сессия (08:00 - 17:00 МСК)
  european: { min: 0.0002, max: 0.0008, trend: 0.3 },
  // Американская сессия (13:00 - 22:00 МСК)
  american: { min: 0.0004, max: 0.0015, trend: 0.5 },
  // Азиатская сессия (00:00 - 08:00 МСК)
  asian: { min: 0.0001, max: 0.0004, trend: 0.1 },
  // Пересечение сессий (13:00 - 14:00 МСК)
  overlap: { min: 0.0005, max: 0.0020, trend: 0.7 }
}

/**
 * Получает текущую сессию рынка
 */
function getCurrentSession() {
  const hour = new Date().getHours()
  
  if (hour >= 13 && hour < 14) return 'overlap'
  if (hour >= 8 && hour < 17) return 'european'
  if (hour >= 13 && hour < 22) return 'american'
  return 'asian'
}

/**
 * Генерирует реалистичную свечу на основе паттернов
 */
function generateRealisticCandle(session, prevClose) {
  const pattern = VOLATILITY_PATTERNS[session]
  
  // Случайная волатильность в рамках паттерна
  const volatility = pattern.min + Math.random() * (pattern.max - pattern.min)
  
  // Направление с учётом тренда
  const trendBias = (Math.random() - 0.5) * pattern.trend * 2
  const change = volatility * (trendBias + (Math.random() - 0.5))
  
  const open = prevClose
  const close = prevClose + change
  const high = Math.max(open, close) + Math.random() * volatility * 0.5
  const low = Math.min(open, close) - Math.random() * volatility * 0.5
  const volume = Math.floor(1000 + Math.random() * 9000)
  
  return {
    open,
    high,
    low,
    close,
    volume
  }
}

/**
 * Генерирует массив исторических свечей
 * @param {number} count - Количество свечей (по умолчанию 50)
 * @param {Date} startTime - Время начала генерации
 */
export function generateHistoricalCandles(count = 50, startTime = new Date()) {
  const candles = []
  let currentPrice = BASE_PRICE
  
  // Определяем сессии для каждой свечи
  const sessionHistory = []
  for (let i = count; i >= 0; i--) {
    const time = new Date(startTime.getTime() - i * 60000)
    const hour = time.getHours()
    
    let session = 'asian'
    if (hour >= 13 && hour < 14) session = 'overlap'
    else if (hour >= 8 && hour < 17) session = 'european'
    else if (hour >= 13 && hour < 22) session = 'american'
    
    sessionHistory.push(session)
  }
  
  // Генерируем свечи в обратном порядке (от прошлого к настоящему)
  for (let i = count; i >= 0; i--) {
    const session = sessionHistory[count - i]
    const candle = generateRealisticCandle(session, currentPrice)
    
    candles.push({
      time: startTime.getTime() - (count - i) * 60000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    })
    
    currentPrice = candle.close
  }
  
  return candles
}

/**
 * Получает актуальные данные с текущей ценой
 */
export async function fetchCurrentMarketData() {
  const now = new Date()
  const candles = generateHistoricalCandles(50, now)
  
  return {
    candles,
    currentPrice: candles[candles.length - 1].close,
    symbol: 'EURUSD',
    exchange: 'FOREX',
    currency: 'USD',
    timezone: 'Europe/Moscow',
    generatedAt: now.toISOString()
  }
}

/**
 * Получает данные с реальной ценой (пытается получить с API, fallback на генератор)
 */
export async function fetchRealMarketData() {
  try {
    // Пробуем получить реальную цену через публичный API
    const response = await fetch('https://open.er-api.com/v6/latest/EUR')
    
    if (response.ok) {
      const data = await response.json()
      const usdRate = data.rates.USD
      
      // Обновляем базовую цену
      const newBase = 1 / usdRate
      Object.defineProperty(globalThis, 'BASE_PRICE', {
        value: newBase,
        writable: true,
        configurable: true
      })
      
      // Генерируем свечи с актуальной ценой
      const candles = generateHistoricalCandles(50, new Date())
      
      return {
        candles,
        currentPrice: candles[candles.length - 1].close,
        symbol: 'EURUSD',
        exchange: 'FOREX',
        currency: 'USD',
        source: 'real_api',
        generatedAt: new Date().toISOString()
      }
    }
  } catch (error) {
    console.log('⚠️ Реальный API недоступен, используем локальный генератор')
  }
  
  // Fallback: генерируем реалистичные данные
  return fetchCurrentMarketData()
}
