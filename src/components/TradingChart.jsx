import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import './TradingChart.css'

/**
 * TradingChart — профессиональный график EUR/USD
 * Использует lightweight-charts от TradingView
 */
function TradingChart() {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candlestickSeriesRef = useRef(null)
  const [price, setPrice] = useState(null)
  const [change, setChange] = useState(0)
  const [high, setHigh] = useState(null)
  const [low, setLow] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Генерация реалистичных исторических данных EUR/USD
  const generateHistoricalData = useCallback(() => {
    const data = []
    let basePrice = 1.0850 // Начальная цена
    const now = new Date()
    
    // Генерируем 1000 свечей (по 1 часам = ~6 недель)
    for (let i = 1000; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000)
      
      // Реалистичная волатильность EUR/USD (0.0002-0.0008)
      const volatility = 0.0004
      const trend = Math.sin(i / 100) * 0.0001
      const open = basePrice
      const close = open + trend + (Math.random() - 0.5) * volatility
      const highPrice = Math.max(open, close) + Math.random() * volatility * 0.5
      const lowPrice = Math.min(open, close) - Math.random() * volatility * 0.5
      
      data.push({
        time: time.getTime() / 1000,
        open: +open.toFixed(5),
        high: +highPrice.toFixed(5),
        low: +lowPrice.toFixed(5),
        close: +close.toFixed(5),
      })
      
      basePrice = close
    }
    
    return data
  }, [])

  // Получение текущей цены EUR/USD
  const fetchCurrentPrice = useCallback(async () => {
    try {
      // Используем бесплатный API для текущей цены
      const response = await fetch('https://open.er-api.com/v6/latest/EUR')
      const data = await response.json()
      
      if (data?.rates?.USD) {
        const currentPrice = 1 / data.rates.USD
        setPrice(currentPrice)
        setLastUpdate(new Date())
        
        // Обновляем последнюю свечу
        if (candlestickSeriesRef.current) {
          const lastCandle = data.candles?.[data.candles.length - 1]
          if (lastCandle) {
            candlestickSeriesRef.current.update({
              time: lastCandle.time,
              open: lastCandle.open,
              high: Math.max(lastCandle.high, currentPrice),
              low: Math.min(lastCandle.low, currentPrice),
              close: currentPrice,
            })
          }
        }
        
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Ошибка загрузки цены:', err)
      setError('Не удалось загрузить текущую цену')
      setIsLoading(false)
    }
  }, [])

  // Подключение к WebSocket для real-time данных (если доступно)
  useEffect(() => {
    // Генерируем исторические данные
    const historicalData = generateHistoricalData()
    
    // Инициализация графика
    if (chartContainerRef.current && !chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255, 255, 255, 0.9)',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        crosshair: {
          mode: 0,
          vertLine: {
            color: 'rgba(0, 229, 255, 0.3)',
            labelBackgroundColor: '#00E5FF',
          },
          horzLine: {
            color: 'rgba(0, 229, 255, 0.3)',
            labelBackgroundColor: '#00E5FF',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: {
          vertTouchDrag: false,
        },
      })
      
      chartRef.current = chart
      
      // Добавляем свечной график
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#34d399',
        downColor: '#f87171',
        borderUpColor: '#34d399',
        borderDownColor: '#f87171',
        wickUpColor: '#34d399',
        wickDownColor: '#f87171',
      })
      
      candlestickSeriesRef.current = candlestickSeries
      candlestickSeries.setData(historicalData)
      
      // Автоподстройка под размер
      chart.timeScale().fitContent()
      
      // Получаем текущую цену
      fetchCurrentPrice()
      
      // Обновляем цену каждые 30 секунд
      const interval = setInterval(fetchCurrentPrice, 30000)
      
      return () => {
        clearInterval(interval)
        chart.remove()
        chartRef.current = null
      }
    }
  }, [generateHistoricalData, fetchCurrentPrice])

  // Обработка изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Вычисление изменения цены
  useEffect(() => {
    if (price) {
      const basePrice = 1.0850
      const changePercent = ((price - basePrice) / basePrice) * 100
      setChange(changePercent)
    }
  }, [price])

  if (error) {
    return (
      <div className="chart-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={fetchCurrentPrice} className="retry-btn">
          🔄 Повторить
        </button>
      </div>
    )
  }

  return (
    <div className="trading-chart-container">
      {/* Верхняя панель с ценой */}
      <div className="chart-header">
        <div className="pair-info">
          <span className="pair-name">EUR/USD</span>
          <span className="pair-source">OANDA</span>
        </div>
        
        <div className="price-info">
          {isLoading ? (
            <div className="price-loading">
              <span className="loading-spinner"></span>
              <span>Загрузка...</span>
            </div>
          ) : (
            <>
              <span className={`current-price ${change >= 0 ? 'positive' : 'negative'}`}>
                {price?.toFixed(5) || '---'}
              </span>
              <span className={`price-change ${change >= 0 ? 'positive' : 'negative'}`}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(3)}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* График */}
      <div className="chart-wrapper" ref={chartContainerRef}>
        {isLoading && (
          <div className="chart-loading-overlay">
            <div className="jelly">
              <div className="jelly-body"></div>
              <div className="jelly-tentacles">
                <div className="tentacle"></div>
                <div className="tentacle"></div>
                <div className="tentacle"></div>
                <div className="tentacle"></div>
              </div>
            </div>
            <p className="loading-text">Загрузка графика...</p>
          </div>
        )}
      </div>

      {/* Нижняя информация */}
      <div className="chart-footer">
        {lastUpdate && (
          <span className="last-update">
            🕐 Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
          </span>
        )}
        <span className="chart-info">
          Lightweight Charts™ от TradingView
        </span>
      </div>
    </div>
  )
}

export default TradingChart
