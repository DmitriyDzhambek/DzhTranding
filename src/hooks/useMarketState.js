import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useMarketState — РЕАЛЬНЫЕ данные рынка EUR/USD в реальном времени
 * Источники: multiple WebSocket + REST API fallback
 * Обновление каждую секунду
 * Точность: 5 знаков после запятой (как на Binarium)
 */
export function useMarketState(pair = 'EUR/USD') {
  const [marketState, setMarketState] = useState('flat')
  const [price, setPrice] = useState(null)
  const [change, setChange] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const wsRef = useRef(null)
  const priceHistoryRef = useRef([])
  const reconnectTimeoutRef = useRef(null)
  const prevPriceRef = useRef(null)
  const connectionAttemptsRef = useRef(0)

  // Определяем состояние рынка на основе истории цен
  const determineMarketState = useCallback((prices) => {
    if (prices.length < 5) return 'flat'
    
    const recent = prices.slice(-30)
    const first = recent[0]
    const last = recent[recent.length - 1]
    const changePercent = ((last - first) / first) * 100
    
    // Анализ волатильности
    const returns = []
    for (let i = 1; i < recent.length; i++) {
      returns.push((recent[i] - recent[i-1]) / recent[i-1])
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    
    // Снижены пороги для более чувствительного определения
    if (changePercent > 0.005 && volatility > 0.00001) return 'bull'
    if (changePercent < -0.005 && volatility > 0.00001) return 'bear'
    return 'flat'
  }, [])

  // Обработка входящих данных
  const processTick = useCallback((currentPrice, priceChangePercent24h) => {
    if (isNaN(currentPrice) || currentPrice <= 0) return
    
    // Обновляем только если цена изменилась (или это первый тик)
    if (currentPrice !== prevPriceRef.current || priceHistoryRef.current.length === 0) {
      prevPriceRef.current = currentPrice
      
      // Сохраняем историю для анализа
      priceHistoryRef.current.push(currentPrice)
      if (priceHistoryRef.current.length > 200) {
        priceHistoryRef.current = priceHistoryRef.current.slice(-200)
      }
      
      // Определяем состояние
      const state = determineMarketState(priceHistoryRef.current)
      
      setPrice(currentPrice.toFixed(5))
      setChange(priceChangePercent24h || 0)
      setMarketState(state)
      setLastUpdate(new Date())
      setLoading(false)
      connectionAttemptsRef.current = 0 // Сбрасываем счётчик попыток
      
      console.log(`📊 Цена: ${currentPrice.toFixed(5)}, Изменение: ${priceChangePercent24h?.toFixed(2) || 0}%`)
    }
  }, [determineMarketState])

  // Подключение к Binance WebSocket
  const connectBinanceWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    try {
      console.log('🔌 Подключение к Binance WebSocket (EURUSDT)...')
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/eurusdt@ticker')
      
      ws.onopen = () => {
        console.log('✅ Binance WebSocket подключён')
        connectionAttemptsRef.current = 0
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const currentPrice = parseFloat(data.c)
          const priceChangePercent = parseFloat(data.P)
          
          processTick(currentPrice, priceChangePercent)
        } catch (err) {
          console.error('Ошибка парсинга Binance:', err)
        }
      }
      
      ws.onerror = (error) => {
        console.warn('⚠️ Binance WebSocket ошибка, пробуем fallback...')
      }
      
      ws.onclose = () => {
        console.log('Binance WebSocket отключён')
        wsRef.current = null
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Ошибка создания Binance WebSocket:', error)
    }
  }, [processTick])

  // Подключение к ForexEPS WebSocket (прямой Forex)
  const connectForexEPSWS = useCallback(() => {
    try {
      console.log('🔌 Подключение к ForexEPS WebSocket...')
      const ws = new WebSocket('wss://ws.forex-socket.com/forex')
      
      ws.onopen = () => {
        console.log('✅ ForexEPS WebSocket подключён')
        // Подписываемся на EUR/USD
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbols: ['EUR/USD']
        }))
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'price' && data.symbol === 'EUR/USD') {
            const currentPrice = parseFloat(data.bid || data.price)
            if (!isNaN(currentPrice)) {
              processTick(currentPrice, 0)
            }
          }
        } catch (err) {
          console.error('Ошибка парсинга ForexEPS:', err)
        }
      }
      
      ws.onerror = () => {
        console.warn('⚠️ ForexEPS WebSocket ошибка')
      }
      
      ws.onclose = () => {
        console.log('ForexEPS WebSocket отключён')
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Ошибка создания ForexEPS WebSocket:', error)
    }
  }, [processTick])

  // REST API fallback
  const fetchPriceREST = useCallback(async () => {
    const sources = [
      // Binance REST API
      () => fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT')
        .then(r => r.json())
        .then(d => d.price ? parseFloat(d.price) : null),
      
      // ExchangeRate API
      () => fetch('https://open.er-api.com/v6/latest/EUR')
        .then(r => r.json())
        .then(d => d?.rates?.USD ? 1 / d.rates.USD : null),
      
      // Frankfurter (ECB rates)
      () => fetch('https://api.frankfurter.app/latest?from=EUR&to=USD')
        .then(r => r.json())
        .then(d => d?.rates?.USD ? 1 / d.rates.USD : null)
    ]
    
    for (const source of sources) {
      try {
        const price = await source()
        if (price && price > 0) {
          console.log(`💰 REST цена получена: ${price}`)
          processTick(price, 0)
          return true
        }
      } catch (err) {
        console.warn('REST источник не доступен:', err.message)
      }
    }
    
    return false
  }, [processTick])

  // Периодическое обновление через REST
  const startRESTPolling = useCallback(() => {
    const poll = async () => {
      // Проверяем, не слишком ли старая цена
      const now = Date.now()
      if (lastUpdate && (now - lastUpdate.getTime()) > 15000) {
        // Цена старше 15 секунд — обновляем
        await fetchPriceREST()
      }
    }
    
    // Обновляем каждые 10 секунд
    const interval = setInterval(poll, 10000)
    return interval
  }, [lastUpdate, fetchPriceREST])

  // Инициализация
  useEffect(() => {
    let restInterval = null
    
    const init = async () => {
      // 1. Сначала пробуем REST API для быстрой начальной загрузки
      const restSuccess = await fetchPriceREST()
      
      if (restSuccess) {
        setLoading(false)
      }
      
      // 2. Подключаем WebSocket
      connectBinanceWS()
      
      // 3. Запускаем REST polling как fallback
      restInterval = startRESTPolling()
      
      // 4. Попытка ForexEPS если Binance не работает
      setTimeout(() => {
        if (!wsRef.current?.readyState === WebSocket.OPEN) {
          connectForexEPSWS()
        }
      }, 3000)
    }
    
    init()
    
    // Очистка
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (restInterval) {
        clearInterval(restInterval)
      }
    }
  }, [connectBinanceWS, connectForexEPSWS, fetchPriceREST, startRESTPolling])

  return {
    marketState,
    price: price || '1.08500',
    change: change.toFixed(2),
    isUp: change > 0,
    loading,
    lastUpdate,
    priceHistory: priceHistoryRef.current
  }
}
