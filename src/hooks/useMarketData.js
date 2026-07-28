import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useMarketData — ЖИВОЙ поток данных (WebSocket)
 * 
 * Почему это идеально для трейдинга:
 * 1. Скорость: Данные летят мгновенно (без задержек HTTP запросов).
 * 2. Источник: Binance EURUSDT (Глобальный индикатор Forex).
 *    Курс Евро к USDT на Binance — это прямой индикатор для Binarium.
 * 3. Логика:
 *    - Активность: считаем разброс цен за последние 30 секунд.
 *    - Тренд: считаем направление за последние 5 минут.
 */
export function useMarketData() {
  const [eurUsd, setEurUsd] = useState(null)
  
  // Храним историю цен для анализа
  const priceHistoryRef = useRef([])
  const [priceHistory, setPriceHistory] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [source, setSource] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [marketSignals, setMarketSignals] = useState({
    rsi: '—',
    macd: '—',
    trend: 'neutral',
    activity: 'low', // low, medium, high
    confidence: 0,
    signal: { type: 'wait', text: 'Подключение к рынку...', icon: '📡' }
  })

  // --- ЛОГИКА АНАЛИЗА (МАТЕМАТИКА УСПЕХА) ---

  // 1. Расчет активности (Волатильность)
  // Сравниваем текущую цену с ценой 30 секунд назад
  const calculateActivity = (currentPrice, history) => {
    if (history.length < 30) return { level: 'low', pips: 0 }
    
    // Берем цену 30 тиков назад (примерно 30 секунд)
    const price30SecAgo = history[history.length - 30]
    const diff = Math.abs(currentPrice - price30SecAgo)
    
    // Переводим в пункты (pips)
    const pips = diff * 10000
    
    // Если цена сдвинулась больше чем на 3 пункта за 30 секунд — рынок жив!
    if (pips > 4.0) return { level: 'high', pips }
    if (pips > 1.5) return { level: 'medium', pips }
    
    return { level: 'low', pips }
  }

  // 2. Расчет тренда
  // Сравниваем среднюю цену 5 минут назад с текущей
  const calculateTrend = (currentPrice, history) => {
    if (history.length < 300) return 'neutral' // 5 минут данных
    
    const price5MinAgo = history[history.length - 300]
    
    if (currentPrice > price5MinAgo + 0.0005) return 'bullish'
    if (currentPrice < price5MinAgo - 0.0005) return 'bearish'
    return 'neutral'
  }

  // 3. Расчет RSI (Сила движения)
  const calculateRSI = (history) => {
    if (history.length < 15) return 50
    const period = 14
    const recent = history.slice(-period - 1)
    
    let gains = 0
    let losses = 0
    
    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1]
      if (diff > 0) gains += diff
      else losses -= diff
    }
    
    if (losses === 0) return 100
    const rs = (gains / period) / (losses / period)
    return Math.round((100 - (100 / (1 + rs))) * 100) / 100
  }

  // --- ГЕНЕРАТОР СИГНАЛОВ (Мозг Штурмана) ---
  const analyzeAndSignal = useCallback((currentPrice) => {
    const history = priceHistoryRef.current
    
    if (history.length < 30) return // Ждем накопления данных

    // Считаем показатели
    const activity = calculateActivity(currentPrice, history)
    const trend = calculateTrend(currentPrice, history)
    const rsi = calculateRSI(history)
    
    // Оценка уверенности
    let confidence = 50
    if (activity.level === 'high') confidence += 20
    if (activity.level === 'medium') confidence += 10
    
    if (rsi > 70) confidence -= 10 // Рынок перегрет
    if (rsi < 30) confidence += 10 // Рынок перепродан

    // ГЕНЕРАЦИЯ ТЕКСТА
    let signalText = 'Ждем данные...'
    let signalIcon = '⏳'
    let signalType = 'wait'
    let signalColor = '#94a3b8'

    // ЛОГИКА ПРИНЯТИЯ РЕШЕНИЯ
    if (activity.level === 'low') {
      // Рынок мертв, сигналов быть не может
      signalText = `Нет движения (${activity.pips.toFixed(1)} пипсов)`
      signalIcon = '💤'
      signalType = 'wait'
      signalColor = '#38bdf8'
    } else if (activity.level === 'high') {
      // Рынок активен — ищем направление
      if (trend === 'bullish' && rsi < 70) {
        signalText = `Тренд ВВЕРХ (+${activity.pips.toFixed(1)} пипсов)`
        signalIcon = '🚀'
        signalType = 'buy'
        signalColor = '#4ade80'
      } else if (trend === 'bearish' && rsi > 30) {
        signalText = `Тренд ВНИЗ (-${activity.pips.toFixed(1)} пипсов)`
        signalIcon = '📉'
        signalType = 'sell'
        signalColor = '#f87171'
      } else {
        signalText = 'Высокая волатильность!'
        signalIcon = '⚡'
        signalType = 'active'
        signalColor = '#fbbf24'
      }
    } else {
      // Средняя активность
      signalText = 'Средняя активность'
      signalIcon = '☁️'
      signalType = 'monitor'
      signalColor = '#fbbf24'
    }

    setMarketSignals({
      rsi: rsi,
      macd: trend === 'bullish' ? '▲ Рост' : trend === 'bearish' ? '▼ Падение' : '— Флэт',
      trend,
      activity: activity.level,
      confidence: Math.min(100, Math.max(0, confidence)),
      signal: { type: signalType, text: signalText, icon: signalIcon, color: signalColor }
    })

  }, [])

  // --- ПОДКЛЮЧЕНИЕ К РЫНКУ ---
  useEffect(() => {
    let ws = null
    let reconnectTimer = null
    let fallbackTimer = null
    let watchdogTimer = null
    let stopped = false
    let attempt = 0
    let lastTickAt = 0

    // Единая точка приёма цены (из WebSocket или из резервного HTTP)
    const pushPrice = (price, source) => {
      if (!Number.isFinite(price) || price <= 0) return

      lastTickAt = Date.now()
      setEurUsd(price)
      setConnected(true)
      setSource(source)

      // Храним последние 10 минут тиков
      priceHistoryRef.current.push(price)
      if (priceHistoryRef.current.length > 600) {
        priceHistoryRef.current = priceHistoryRef.current.slice(-600)
      }
      setPriceHistory([...priceHistoryRef.current])

      setLastUpdate(new Date())
      setLoading(false)
      analyzeAndSignal(price)
    }

    // РЕЗЕРВНЫЙ ИСТОЧНИК: Coinbase spot EUR/USD.
    // Нужен там, где Binance недоступен (гео-блокировка, корпоративные сети).
    const pollFallback = async () => {
      if (stopped) return
      try {
        const res = await fetch('https://api.coinbase.com/v2/prices/EUR-USD/spot', {
          cache: 'no-store'
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        pushPrice(parseFloat(json?.data?.amount), 'coinbase')
      } catch (err) {
        console.log('[v0] Резервный источник недоступен:', err.message)
        setConnected(false)
      }
    }

    const startFallback = () => {
      if (stopped || fallbackTimer) return
      console.log('[v0] Переключаемся на резервный источник цен')
      pollFallback()
      fallbackTimer = setInterval(pollFallback, 3000)
    }

    const stopFallback = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer)
        fallbackTimer = null
      }
    }

    const connect = () => {
      if (stopped) return

      // WebSocket для EUR/USD (Самый быстрый способ)
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/eurusdt@ticker')
      } catch {
        startFallback()
        return
      }

      ws.onopen = () => {
        attempt = 0
        console.log('[v0] Прямое подключение к рынку (Binance Live Feed)')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          stopFallback()
          pushPrice(parseFloat(data.c), 'binance')
        } catch (err) {
          console.error('Ошибка потока:', err)
        }
      }

      ws.onerror = () => {
        startFallback()
      }

      // Плавное переподключение вместо перезагрузки страницы
      ws.onclose = () => {
        if (stopped) return
        startFallback()
        attempt += 1
        const delay = Math.min(60000, 3000 * attempt)
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    // Если за 8 секунд не пришло ни одного тика — включаем резерв
    watchdogTimer = setInterval(() => {
      if (stopped) return
      if (Date.now() - lastTickAt > 8000) {
        setConnected(false)
        startFallback()
      }
    }, 8000)

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (watchdogTimer) clearInterval(watchdogTimer)
      stopFallback()
      if (ws) ws.close()
    }
  }, [analyzeAndSignal])

  return {
    eurUsd,
    currentPrice: eurUsd,
    priceHistory,
    marketSignals,
    loading,
    connected,
    source,
    lastUpdate
  }
}
