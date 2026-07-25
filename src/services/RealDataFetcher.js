/**
 * Сервис для получения реальных рыночных данных
 * Использует Yahoo Finance API через CORS-прокси
 */

const CORS_PROXY = 'https://corsproxy.io?&url='
const YAHOO_API = 'https://query1.finance.yahoo.com/v8/finance/chart/'

/**
 * Получает реальные свечи (OHLCV) для валютной пары
 * @param {string} symbol - Символ (например, 'EURUSD=X')
 * @param {string} interval - Интервал ('1m', '5m', '15m' и т.д.)
 * @param {number} range - Диапазон ('1d', '5d', '1mo')
 */
export async function fetchRealCandles(symbol = 'EURUSD=X', interval = '1m', range = '1d') {
  const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_API}${symbol}?range=${range}&interval=${interval}&includePrePost=false`)}`

  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`)
    }

    const data = await response.json()
    
    // Парсим ответ Yahoo Finance
    const result = data.chart.result[0]
    const meta = result.meta
    const timestamps = result.timestamp
    const quotes = result.indicators.quote[0]

    // Формируем массив свечей
    const candles = []
    
    for (let i = 0; i < timestamps.length; i++) {
      candles.push({
        time: timestamps[i] * 1000, // Конвертируем в ms
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0
      })
    }

    return {
      candles,
      currentPrice: meta.regularMarketPrice,
      currency: meta.currency,
      symbol: meta.symbol,
      exchange: meta.exchangeName,
      timezone: meta.timezone
    }

  } catch (error) {
    console.error('Ошибка получения реальных данных:', error)
    throw error
  }
}

/**
 * Обновляет данные в реальном времени (WebSocket-like polling)
 */
export function startRealTimeUpdate(callback, interval = 30000) {
  // Обновляем каждые 30 секунд (Yahoo обновляет данные ~15-30 сек задержки)
  const update = async () => {
    try {
      const data = await fetchRealCandles()
      callback(data)
    } catch (error) {
      console.error('Ошибка обновления реальных данных:', error)
    }
  }

  update() // Первоначальная загрузка
  const timer = setInterval(update, interval)
  
  return () => clearInterval(timer)
}
