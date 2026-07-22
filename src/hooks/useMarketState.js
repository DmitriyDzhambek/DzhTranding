import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Хук для определения состояния рынка с REAL-TIME данными
 * Использует Binance WebSocket для EURUSDT (прокси EUR/USD)
 * Обновление каждую секунду (точное)
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
  const lastTickRef = useRef(0)

  // Определяем состояние рынка на основе истории цен
  const determineMarketState = useCallback((prices) => {
    if (prices.length < 10) return 'flat'
    
    const recent = prices.slice(-10)
    const first = recent[0]
    const last = recent[recent.length - 1]
    const changePercent = ((last - first) / first) * 100
    
    // Добавляем анализ волатильности
    const returns = []
    for (let i = 1; i < recent.length; i++) {
      returns.push((recent[i] - recent[i-1]) / recent[i-1])
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    
    if (changePercent > 0.03 && volatility > 0.0001) return 'bull'
    if (changePercent < -0.03 && volatility > 0.0001) return 'bear'
    return 'flat'
  }, [])

  // Подключение к WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/eurusdt@ticker')
      
      ws.onopen = () => {
        console.log('✅ WebSocket подключён к Binance')
        setLoading(false)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const currentPrice = parseFloat(data.c) // current price
          const priceChangePercent = parseFloat(data.P) // price change percent 24h
          
          // Обновляем только если данные изменились (каждую секунду)
          const now = Date.now()
          if (now - lastTickRef.current >= 1000) {
            lastTickRef.current = now
            
            // Сохраняем историю для анализа
            priceHistoryRef.current.push(currentPrice)
            if (priceHistoryRef.current.length > 100) {
              priceHistoryRef.current = priceHistoryRef.current.slice(-100)
            }
            
            // Определяем состояние
            const state = determineMarketState(priceHistoryRef.current)
            
            setPrice(currentPrice.toFixed(5))
            setChange(priceChangePercent)
            setMarketState(state)
            setLastUpdate(new Date())
          }
        } catch (err) {
          console.error('Ошибка парсинга WebSocket:', err)
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket ошибка:', error)
      }
      
      ws.onclose = () => {
        console.log('WebSocket отключён, переподключение через 5с...')
        wsRef.current = null
        
        // Переподключение
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, 5000)
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Ошибка создания WebSocket:', error)
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket()
      }, 5000)
    }
  }, [determineMarketState])

  // Инициализация
  useEffect(() => {
    // Первоначальная загрузка через HTTP
    const fetchInitialPrice = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/EUR')
        const data = await response.json()
        
        if (data && data.rates && data.rates.USD) {
          const initialPrice = data.rates.USD
          priceHistoryRef.current = [initialPrice]
          setPrice(initialPrice.toFixed(5))
          setLastUpdate(new Date())
        }
      } catch (error) {
        console.error('Ошибка начальной загрузки:', error)
      }
    }
    
    fetchInitialPrice()
    
    // Подключаем WebSocket
    connectWebSocket()
    
    // Очистка
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connectWebSocket])

  return {
    marketState,
    price: price || '1.0850',
    change: change.toFixed(2),
    isUp: change > 0,
    loading,
    lastUpdate,
    priceHistory: priceHistoryRef.current
  }
}

/**
 * Хук для подключения к реальному API (Binance, Alpha Vantage и т.д.)
 */
export function useRealMarketData(apiKey, symbol = 'EURUSD') {
  const [marketState, setMarketState] = useState('flat')
  const [price, setPrice] = useState(null)
  const [change, setChange] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
        const data = await response.json()
        
        const priceNum = parseFloat(data.lastPrice)
        const changeNum = parseFloat(data.priceChangePercent)
        
        setPrice(priceNum.toFixed(5))
        setChange(changeNum)
        
        if (changeNum > 0.5) {
          setMarketState('bull')
        } else if (changeNum < -0.5) {
          setMarketState('bear')
        } else {
          setMarketState('flat')
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Ошибка получения данных:', error)
        setLoading(false)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 30000)
    return () => clearInterval(interval)
  }, [apiKey, symbol])

  return { marketState, price, loading }
}

/**
 * Хук для визуального индикатора состояния рынка
 */
export function useMarketIndicator(marketState) {
  const getIndicator = () => {
    switch (marketState) {
      case 'bull':
        return { icon: '📈', label: 'Бычий', color: '#34d399' }
      case 'bear':
        return { icon: '📉', label: 'Медвежий', color: '#f87171' }
      default:
        return { icon: '🌊', label: 'Спокойный', color: '#8ecae6' }
    }
  }

  return getIndicator(marketState)
}