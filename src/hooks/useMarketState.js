import { useState, useEffect, useCallback } from 'react'

/**
 * Хук для определения состояния рынка
 * Возвращает: 'flat' | 'bull' | 'bear'
 */
export function useMarketState(pair = 'EUR/USD') {
  const [marketState, setMarketState] = useState('flat')
  const [price, setPrice] = useState(1.0850)
  const [change, setChange] = useState(0)

  // Симуляция изменения цены в реальном времени
  const simulatePrice = useCallback(() => {
    setPrice(prev => {
      const volatility = 0.0005
      const randomChange = (Math.random() - 0.5) * volatility
      
      // Добавляем тренд с течением времени
      const time = Date.now() / 60000 // минуты
      const trend = Math.sin(time / 30) * 0.0002 // медленный цикл
      
      const newPrice = Math.max(1.0500, Math.min(1.1200, prev + randomChange + trend))
      
      // Определяем состояние рынка
      const changePercent = ((newPrice - 1.0850) / 1.0850) * 100
      setChange(changePercent)
      
      if (changePercent > 0.1) {
        setMarketState('bull') // Бычий
      } else if (changePercent < -0.1) {
        setMarketState('bear') // Медвежий
      } else {
        setMarketState('flat') // Спокойный
      }
      
      return newPrice
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(simulatePrice, 3000)
    return () => clearInterval(interval)
  }, [simulatePrice])

  return {
    marketState,
    price: price.toFixed(5),
    change: change.toFixed(3),
    isUp: change > 0,
  }
}

/**
 * Хук для подключения к реальному API (Binance, Alpha Vantage и т.д.)
 * В продакшене замени симуляцию на реальные данные
 */
export function useRealMarketData(apiKey, symbol = 'EURUSD') {
  const [marketState, setMarketState] = useState('flat')
  const [price, setPrice] = useState(null)
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
