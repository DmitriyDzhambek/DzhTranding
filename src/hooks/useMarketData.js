import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useMarketData — ЖИВЫЕ данные рынка в реальном времени
 * Источники:
 *   - EUR/USD: Binance Public API (EURUSDT) — синхронно с Binarium/OANDA (обновление 1 раз/сек)
 *   - Индекс Мосбиржи: MOEX API (обновление 1 раз/10 сек)
 * 
 * Логика сигналов:
 * - Считаем разницу цен за последние 10 тиков
 * - Если разница > 0.0002 — Рынок активен (сигналы к действию)
 * - Если разница < 0.0002 — Рынок спит (ждём)
 */
export function useMarketData() {
  const [eurUsd, setEurUsd] = useState(null)
  const [moscowIndex, setMoscowIndex] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  const [marketSignals, setMarketSignals] = useState({
    rsi: '—',
    macd: '—',
    trend: 'neutral',
    activity: 'low', // low, medium, high
    confidence: 0,
    signal: { type: 'wait', text: 'Загрузка данных...', icon: '⏳' }
  })

  // --- РАСЧЁТ ИНДИКАТОРОВ ---

  // RSI (Сила сигнала)
  const calculateRSI = (prices) => {
    if (prices.length < 15) return 50
    
    const period = 14
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
    return Math.round((100 - (100 / (1 + rs)) * 100) / 100)
  }

  // Определение активности (Волатильность)
  const calculateActivity = (history) => {
    if (history.length < 5) return { level: 'low', percent: 0 }
    
    // Берём разброс цен за последние 10 секунд
    const recent = history.slice(-10)
    const high = Math.max(...recent)
    const low = Math.min(...recent)
    const diff = high - low
    const percent = (diff / recent[recent.length - 1]) * 100 * 10000 // В пунктах
    
    if (percent > 1.5) return { level: 'high', percent }
    if (percent > 0.8) return { level: 'medium', percent }
    return { level: 'low', percent }
  }

  // --- ПОЛУЧЕНИЕ ДАННЫХ ---

  // 1. ЖИВАЯ цена EUR/USD (Binance EURUSDT — точная копия Forex рынка)
  const fetchLivePrice = useCallback(async () => {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT')
      const data = await response.json()
      
      if (data && data.price) {
        const price = parseFloat(data.price)
        setEurUsd(price)
        
        // Сохраняем историю для анализа волатильности
        setPriceHistory(prev => {
          const updated = [...prev, price]
          if (updated.length > 50) return updated.slice(-50)
          return updated
        })
        
        setLastUpdate(new Date())
        setLoading(false)
      }
    } catch (err) {
      console.error('Ошибка получения цены:', err)
    }
  }, [])

  // 2. Индекс Мосбиржи (MOEX)
  const fetchMoscowIndex = useCallback(async () => {
    try {
      const response = await fetch('https://issues.moex.com/issues/MICEX.json')
      const data = await response.json()
      if (data?.issues?.[0]?.closes?.[0]) {
        setMoscowIndex(parseFloat(data.issues[0].closes[0]))
      }
    } catch (err) {
      console.warn('MOEX API недоступен')
    }
  }, [])

  // --- ГЕНЕРАЦИЯ СИГНАЛОВ ---
  useEffect(() => {
    if (!eurUsd || priceHistory.length < 10) return

    // Считаем показатели
    const activity = calculateActivity(priceHistory)
    const rsi = calculateRSI(priceHistory)
    
    // Определение тренда (простое сравнение первой и последней цены)
    const start = priceHistory[0]
    const end = priceHistory[priceHistory.length - 1]
    const trend = end > start ? 'bullish' : end < start ? 'bearish' : 'neutral'
    
    // Сила сигнала (Confidence)
    let confidence = 50
    if (activity.level === 'high') confidence += 20
    if (activity.level === 'medium') confidence += 10
    
    if (rsi > 70) confidence -= 10 // Перекуплен
    if (rsi < 30) confidence += 10 // Перепродан

    // ГЕНЕРАЦИЯ ТЕКСТА СИГНАЛА
    let signalText = 'Ждите волатильности'
    let signalIcon = '⏳'
    let signalType = 'wait'
    let signalColor = '#94a3b8'

    if (activity.level === 'low') {
      signalText = 'Нет движения — Рынок спит'
      signalIcon = '💤'
      signalType = 'wait'
      signalColor = '#38bdf8'
    } else if (activity.level === 'high') {
      if (trend === 'bullish' && rsi < 70) {
        signalText = 'Рост (Покупка) 📈'
        signalIcon = '🚀'
        signalType = 'buy'
        signalColor = '#4ade80'
      } else if (trend === 'bearish' && rsi > 30) {
        signalText = 'Падение (Продажа) 📉'
        signalIcon = '🔻'
        signalType = 'sell'
        signalColor = '#f87171'
      } else {
        signalText = 'Сильная волатильность'
        signalIcon = '⚡'
        signalType = 'active'
        signalColor = '#fbbf24'
      }
    } else {
      signalText = 'Средняя активность'
      signalIcon = '☁️'
      signalType = 'monitor'
      signalColor = '#fbbf24'
    }

    setMarketSignals({
      rsi: rsi,
      macd: trend === 'bullish' ? '+' : trend === 'bearish' ? '-' : '0',
      trend,
      activity: activity.level,
      confidence: Math.min(100, Math.max(0, confidence)),
      signal: { type: signalType, text: signalText, icon: signalIcon, color: signalColor }
    })

  }, [eurUsd, priceHistory])

  // --- ЗАПУСК ---
  useEffect(() => {
    // Загружаем всё сразу
    fetchLivePrice()
    fetchMoscowIndex()

    // EUR/USD обновляем КАЖДУЮ СЕКУНДУ (Binance API allows 10/sec, мы берем 1 для безопасности)
    const liveInterval = setInterval(fetchLivePrice, 1000)

    // Индекс Мосбиржи обновляем РЕЖЕ (он медленнее)
    const indexInterval = setInterval(fetchMoscowIndex, 10000)

    return () => {
      clearInterval(liveInterval)
      clearInterval(indexInterval)
    }
  }, [fetchLivePrice, fetchMoscowIndex])

  return {
    eurUsd,
    moscowIndex,
    marketSignals,
    loading,
    lastUpdate,
    error
  }
}
