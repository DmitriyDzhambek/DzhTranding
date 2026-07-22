import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Хук для определения состояния рынка
 * Возвращает: 'flat' | 'bull' | 'bear'
 * Использует реальные данные с open.er-api.com
 */
export function useMarketState(pair = 'EUR/USD') {
  const [marketState, setMarketState] = useState('flat')
  const [price, setPrice] = useState(null)
  const [change, setChange] = useState(0)
  const [loading, setLoading] = useState(true)
  const prevPriceRef = useRef(null)

  // Получение реальной цены EUR/USD
  const fetchRealPrice = useCallback(async () => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/EUR')
      const data = await response.json()
      
      if (data && data.rates && data.rates.USD) {
        const currentPrice = data.rates.USD
        
        if (prevPriceRef.current) {
          const changePercent = ((currentPrice - prevPriceRef.current) / prevPriceRef.current) * 100
          setChange(changePercent)
          
          if (changePercent > 0.05) {
            setMarketState('bull')
          } else if (changePercent < -0.05) {
            setMarketState('bear')
          } else {
            setMarketState('flat')
          }
        }
        
        prevPriceRef.current = currentPrice
        setPrice(currentPrice.toFixed(5))
        setLoading(false)
      }
    } catch (error) {
      console.error('Ошибка получения цены:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Первоначальная загрузка
    fetchRealPrice()
    
    // Обновление каждые 60 секунд (лимит бесплатного API)
    const interval = setInterval(fetchRealPrice, 60000)
    return () => clearInterval(interval)
  }, [fetchRealPrice])

  return {
    marketState,
    price: price || '1.0850',
    change: change.toFixed(3),
    isUp: change > 0,
    loading,
  }
}

/**
 * Хук для подключения к реальному API (Binance, Alpha Vantage и т.д.)
 * В продакшене замени симуляцию на реальные данные
 */
export function useRealMarketData(apiKey, symbol = 'EURUSD') {
  const [marketState, setMarketState] = useState('flat')
  const [price, setPrice] = useState(null)
  const [change, setChange] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        // Пример для Binance
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
    const interval = setInterval(fetchPrice, 30000) // каждые 30 секунд
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
