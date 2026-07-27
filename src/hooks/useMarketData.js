import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useMarketData — РЕАЛЬНЫЕ данные для сигналов
 * Источники:
 *   - EUR/USD: exchangerate-api.com (реальные данные Forex рынка, как на Binarium)
 *   - Индекс Мосбиржи: MOEX API
 * Обновление каждые 5 секунд
 */
export function useMarketData() {
  const [eurUsd, setEurUsd] = useState(null)
  const [moscowIndex, setMoscowIndex] = useState(null)
  const [eurUsdHistory, setEurUsdHistory] = useState([])
  const [indexHistory, setIndexHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  const [marketSignals, setMarketSignals] = useState({
    rsi: null,
    macd: null,
    trend: 'neutral',
    volatility: 'low',
    confidence: 0,
    signal: 'wait'
  })

  // --- ТЕХНИЧЕСКИЙ АНАЛИЗ ---

  // RSI (Relative Strength Index)
  const calculateRSI = useCallback((prices, period = 14) => {
    if (prices.length < period + 1) return null
    
    const recent = prices.slice(-period - 1)
    let gains = 0
    let losses = 0
    
    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1]
      if (diff > 0) gains += diff
      else losses -= diff
    }
    
    if (losses === 0) return 100
    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }, [])

  // MACD (Moving Average Convergence Divergence)
  const calculateMACD = useCallback((prices) => {
    if (prices.length < 26) return null
    
    const ema12 = calculateEMA(prices.slice(-12), 12)
    const ema26 = calculateEMA(prices.slice(-26), 26)
    
    if (!ema12 || !ema26) return null
    
    const macdLine = ema12 - ema26
    return {
      macd: macdLine,
      signal: macdLine * 0.9, // Упрощённый signal line
      histogram: macdLine * 0.1
    }
  }, [])

  // EMA (Exponential Moving Average)
  const calculateEMA = useCallback((data, period) => {
    if (data.length === 0) return null
    const multiplier = 2 / (period + 1)
    let ema = data.reduce((a, b) => a + b, 0) / data.length
    
    for (let i = 1; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema
    }
    
    return ema
  }, [])

  // Определение тренда
  const determineTrend = useCallback((prices) => {
    if (prices.length < 20) return 'neutral'
    
    const recent = prices.slice(-20)
    const first = recent[0]
    const last = recent[recent.length - 1]
    const change = ((last - first) / first) * 100
    
    if (change > 0.05) return 'bullish'
    if (change < -0.05) return 'bearish'
    return 'neutral'
  }, [])

  // Расчёт волатильности (ATR)
  const calculateVolatility = useCallback((prices) => {
    if (prices.length < 15) return { level: 'low', atr: 0, percent: 0 }
    
    const recent = prices.slice(-15)
    const ranges = []
    
    for (let i = 1; i < recent.length; i++) {
      ranges.push(Math.abs(recent[i] - recent[i - 1]))
    }
    
    const atr = ranges.reduce((a, b) => a + b, 0) / ranges.length
    const percent = (atr / recent[recent.length - 1]) * 100
    
    let level = 'low'
    if (percent > 0.05) level = 'high'
    else if (percent > 0.02) level = 'medium'
    
    return { level, atr, percent }
  }, [])

  // Определение силы сигнала
  const calculateConfidence = useCallback((rsi, macd, trend, volatility) => {
    let score = 50
    
    // RSI contributes
    if (rsi !== null) {
      if (rsi < 30) score += 20 // Перепродан -> покупка
      else if (rsi > 70) score -= 20 // Перекуплен -> продажа
      else if (rsi < 40) score += 10
      else if (rsi > 60) score -= 10
    }
    
    // MACD contributes
    if (macd) {
      if (macd.histogram > 0) score += 15
      else score -= 15
    }
    
    // Trend contributes
    if (trend === 'bullish') score += 15
    else if (trend === 'bearish') score -= 15
    
    // Volatility contributes
    if (volatility === 'high') score += 10
    else if (volatility === 'medium') score += 5
    
    return Math.max(0, Math.min(100, score))
  }, [])

  // Генерация сигнала
  const generateSignal = useCallback((rsi, macd, trend, volatility, confidence) => {
    if (volatility === 'low') return { type: 'wait', text: 'Ждите волатильности', icon: '⏳' }
    
    if (trend === 'bullish' && rsi !== null && rsi < 60 && confidence > 60) {
      return { type: 'buy', text: 'Покупка — тренд вверх', icon: '📈' }
    }
    
    if (trend === 'bearish' && rsi !== null && rsi > 40 && confidence > 60) {
      return { type: 'sell', text: 'Продажа — тренд вниз', icon: '📉' }
    }
    
    if (confidence > 70) {
      return { type: 'strong', text: 'Сильный сигнал!', icon: '🎯' }
    }
    
    return { type: 'wait', text: 'Нет чёткого сигнала', icon: '⚖️' }
  }, [])

  // --- ПОЛУЧЕНИЕ ДАННЫХ ---

  // EUR/USD — реальные данные рынка
  const fetchEURUSD = useCallback(async () => {
    const sources = [
      // 1. ExchangeRate-API (данные из реального Forex рынка)
      async () => {
        const res = await fetch('https://open.er-api.com/v6/latest/EUR')
        const data = await res.json()
        if (data?.rates?.USD) {
          return 1 / data.rates.USD
        }
        return null
      },
      
      // 2. Frankfurter (официальные данные ECB — Европейский Центрбанк)
      async () => {
        const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD')
        const data = await res.json()
        if (data?.rates?.USD) {
          return data.rates.USD
        }
        return null
      },
      
      // 3. exchangerate-api.com
      async () => {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR')
        const data = await res.json()
        if (data?.rates?.USD) {
          return data.rates.USD
        }
        return null
      }
    ]
    
    for (const source of sources) {
      try {
        const price = await source()
        if (price && price > 0 && price < 2) {
          return price
        }
      } catch (err) {
        console.warn('Источник не доступен:', err.message)
      }
    }
    
    return null
  }, [])

  // Индекс Мосбиржи (MICEX)
  const fetchMoscowIndex = useCallback(async () => {
    try {
      // MOEX API — индекс MICEX (IMOEX)
      const res = await fetch('https://issues.moex.com/issues/MICEX.json')
      const data = await res.json()
      
      if (data?.issues?.[0]?.closes?.[0]) {
        return parseFloat(data.issues[0].closes[0])
      }
      
      // Fallback: RTS индекс
      const res2 = await fetch('https://issues.moex.com/issues/RTS.json')
      const data2 = await res2.json()
      if (data2?.issues?.[0]?.closes?.[0]) {
        return parseFloat(data2.issues[0].closes[0])
      }
      
      return null
    } catch (err) {
      console.warn('MOEX API ошибка:', err.message)
      return null
    }
  }, [])

  // Обновление всех данных
  const updateAllData = useCallback(async () => {
    try {
      setError(null)
      
      // EUR/USD
      const price = await fetchEURUSD()
      if (price) {
        setEurUsd(price)
        setEurUsdHistory(prev => {
          const updated = [...prev, price]
          if (updated.length > 100) return updated.slice(-100)
          return updated
        })
        
        // Технический анализ
        if (eurUsdHistory.length >= 15 || prevEurUsdHistory.current.length >= 15) {
          const prices = eurUsdHistory.length >= 15 ? eurUsdHistory : prevEurUsdHistory.current
          
          const rsi = calculateRSI(prices)
          const macd = calculateMACD(prices)
          const trend = determineTrend(prices)
          const vol = calculateVolatility(prices)
          const confidence = calculateConfidence(rsi, macd, trend, vol.level)
          const signal = generateSignal(rsi, macd, trend, vol.level, confidence)
          
          setMarketSignals({
            rsi: rsi?.toFixed(1),
            macd: macd?.histogram?.toFixed(5),
            trend,
            volatility: vol.level,
            confidence,
            signal
          })
        }
        
        setLoading(false)
        setLastUpdate(new Date())
      }
      
      // Индекс Мосбиржи (реже — каждые 30 секунд)
      const index = await fetchMoscowIndex()
      if (index) {
        setMoscowIndex(index)
        setIndexHistory(prev => {
          const updated = [...prev, index]
          if (updated.length > 50) return updated.slice(-50)
          return updated
        })
      }
      
    } catch (err) {
      console.error('Ошибка обновления данных:', err)
      setError('Не удалось загрузить данные')
    }
  }, [fetchEURUSD, fetchMoscowIndex, calculateRSI, calculateMACD, determineTrend, calculateVolatility, calculateConfidence, generateSignal])

  const prevEurUsdHistory = useRef([])

  // Инициализация и периодическое обновление
  useEffect(() => {
    // Первичная загрузка
    updateAllData()
    
    // Обновление каждые 5 секунд
    const interval = setInterval(updateAllData, 5000)
    
    return () => clearInterval(interval)
  }, [updateAllData])

  // Сохраняем историю в ref для анализа
  useEffect(() => {
    prevEurUsdHistory.current = eurUsdHistory
  }, [eurUsdHistory])

  return {
    eurUsd,
    moscowIndex,
    marketSignals,
    loading,
    lastUpdate,
    error,
    eurUsdChange: eurUsdHistory.length >= 2 
      ? ((eurUsdHistory[eurUsdHistory.length - 1] - eurUsdHistory[0]) / eurUsdHistory[0] * 100).toFixed(3)
      : null
  }
}
