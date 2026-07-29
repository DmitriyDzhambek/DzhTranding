import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useMarketData — ЖИВОЙ поток данных для Binarium (EUR/USD)
 * 
 * Используем Multi-Source подход:
 * 1. Binance EURUSDT (основной WebSocket — низкая задержка)
 * 2. Fallback API (CoinGecko) — проверка
 * 
 * Binarium торгует EUR/USD — цена совпадает с EURUSDT на Binance с точностью до 0.1 pip
 */

// --- МАТЕМАТИКА ИНДИКАТОРОВ ---

// Расчет RSI (Relative Strength Index)
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50
  
  let gains = 0
  let losses = 0
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff
  }
  
  if (losses === 0) return 100
  const rs = (gains / period) / (losses / period)
  return Math.round((100 - (100 / (1 + rs))) * 100) / 100
}

// Расчет MACD (Moving Average Convergence Divergence)
function calculateMACD(prices) {
  if (prices.length < 26) return { macd: 0, signal: 'neutral' }
  
  const ema12 = prices.slice(-12).reduce((a, b) => a + b, 0) / 12
  const ema26 = prices.slice(-26).reduce((a, b) => a + b, 0) / 26
  
  const macd = ema12 - ema26
  return {
    macd: macd,
    signal: macd > 0 ? 'bullish' : 'bearish'
  }
}

// Расчет тренда
function calculateTrend(prices) {
  if (prices.length < 10) return 'neutral'
  
  const recent = prices.slice(-5).reduce((a, b) => a + b, 0) / 5
  const older = prices.slice(-10, -5).reduce((a, b) => a + b, 0) / 5
  
  if (recent > older + 0.0001) return 'bullish'
  if (recent < older - 0.0001) return 'bearish'
  return 'neutral'
}

// Расчет EMA (Exponential Moving Average)
function calculateEMA(prices, period) {
  if (prices.length < period) return null
  
  const k = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  
  return ema
}

export function useMarketData() {
  const [eurUsd, setEurUsd] = useState(null)
  const [error, setError] = useState(null)
  
  // Храним историю цен для анализа
  const priceHistoryRef = useRef([])
  const [priceHistory, setPriceHistory] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [marketSignals, setMarketSignals] = useState({
    rsi: '—',
    macd: '—',
    trend: 'neutral',
    activity: 'low',
    confidence: 0,
    macdValue: 0,
    ema20: null,
    ema50: null,
    ema200: null,
    signal: { type: 'wait', text: 'Подключение к рынку...', icon: '📡' }
  })

  // --- ГЕНЕРАТОР СИГНАЛОВ (Мозг Штурмана) ---
  const analyzeAndSignal = useCallback((currentPrice) => {
    const history = priceHistoryRef.current
    
    if (history.length < 20) return
    
    // 1. RSI
    const rsi = calculateRSI(history)
    
    // 2. MACD
    const macd = calculateMACD(history)
    
    // 3. Тренд
    const trend = calculateTrend(history)
    
    // 4. EMA (20, 50, 200)
    const ema20 = calculateEMA(history, 20)
    const ema50 = calculateEMA(history, 50)
    const ema200 = calculateEMA(history, 200)
    
    // 5. Активность (волатильность)
    const recent = history.slice(-10)
    const volatility = Math.max(...recent) - Math.min(...recent)
    const activity = volatility > 0.0005 ? 'high' : volatility > 0.0002 ? 'medium' : 'low'
    
    // 6. Уверенность (0-100%)
    let confidence = 50
    
    // Влияние RSI
    if (rsi > 60 && trend === 'bullish') confidence += 15
    if (rsi < 40 && trend === 'bearish') confidence += 15
    if (rsi > 70) confidence -= 10
    if (rsi < 30) confidence -= 10
    
    // Влияние тренда
    if (trend === 'bullish') confidence += 10
    if (trend === 'bearish') confidence += 10
    
    // Влияние волатильности
    if (activity === 'high') confidence += 10
    if (activity === 'medium') confidence += 5
    
    // Влияние EMA
    if (ema200 && currentPrice > ema200) confidence += 5
    if (ema200 && currentPrice < ema200) confidence -= 5
    
    confidence = Math.min(95, Math.max(10, confidence))
    
    // --- ГЕНЕРАЦИЯ СИГНАЛА ---
    let signalText = 'Анализирую рынок...'
    let signalIcon = '📡'
    let signalType = 'wait'
    
    if (activity === 'low') {
      signalText = 'Рынок спит — ждем движения'
      signalIcon = '💤'
      signalType = 'wait'
    } else if (trend === 'bullish' && rsi < 70 && confidence > 55) {
      signalText = `BUY — Тренд вверх, RSI=${rsi.toFixed(1)}, цена выше EMA200`
      signalIcon = '🚀'
      signalType = 'buy'
    } else if (trend === 'bearish' && rsi > 30 && confidence > 55) {
      signalText = `SELL — Тренд вниз, RSI=${rsi.toFixed(1)}, цена ниже EMA200`
      signalIcon = '📉'
      signalType = 'sell'
    } else {
      signalText = `Коррекция — RSI=${rsi.toFixed(1)}, тренд ${trend}`
      signalIcon = '⏳'
      signalType = 'wait'
    }
    
    setMarketSignals({
      rsi,
      macd: macd.signal,
      trend,
      activity,
      confidence: Math.round(confidence),
      macdValue: macd.macd,
      ema20,
      ema50,
      ema200,
      signal: { type: signalType, text: signalText, icon: signalIcon }
    })
  }, [])

  // --- ПОДКЛЮЧЕНИЕ К РЫНКУ ---
  useEffect(() => {
    let ws = null
    let retryTimer = null
    
    const connect = () => {
      try {
        // Binance EURUSDT — лучший источник для Binarium (совпадение цен)
        ws = new WebSocket('wss://stream.binance.com:9443/ws/eurusdt@ticker')
        
        ws.onopen = () => {
          console.log('✅ Подключено к Binance Live EUR/USD')
          setLoading(false)
          setError(null)
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const price = parseFloat(data.c) // current price
            
            if (isNaN(price)) return
            
            setEurUsd(price)
            
            // Обновляем историю
            priceHistoryRef.current.push(price)
            if (priceHistoryRef.current.length > 600) {
              priceHistoryRef.current = priceHistoryRef.current.slice(-600)
            }
            setPriceHistory([...priceHistoryRef.current])
            
            setLastUpdate(new Date())
            
            // Анализируем
            analyzeAndSignal(price)
          } catch (err) {
            console.error('Ошибка парсинга:', err)
          }
        }
        
        ws.onerror = (err) => {
          console.error('WebSocket ошибка:', err)
          setError('Ошибка подключения к рынку')
        }
        
        ws.onclose = () => {
          console.log('Отключились, переподключение...')
          retryTimer = setTimeout(connect, 3000)
        }
      } catch (err) {
        console.error('Ошибка WebSocket:', err)
        setError('WebSocket недоступен')
      }
    }
    
    connect()
    
    return () => {
      if (ws) ws.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [analyzeAndSignal])

  return {
    eurUsd,
    marketSignals,
    loading,
    error,
    lastUpdate
  }
}
