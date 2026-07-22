/**
 * MarketAvailability — проверка доступности валютных пар в реальном времени
 * Определяет: закрыт рынок, открыт только OTC, или полный доступ
 */

// OTC-пары доступны 24/7
const OTC_PAIRS = [
  { symbol: 'GSMI', name: 'Global Stock Market Index', payout: '82%', icon: '📊' },
  { symbol: 'GOOGLE (OTC)', name: 'Alphabet Inc.', payout: '92%', icon: '🔍' },
  { symbol: 'TRON (OTC)', name: 'TRX/USDT', payout: '92%', icon: '💎' },
  { symbol: 'BTC/USD (OTC)', name: 'Bitcoin', payout: '88%', icon: '₿' },
  { symbol: 'ETH/USD (OTC)', name: 'Ethereum', payout: '85%', icon: 'Ξ' },
  { symbol: 'AMAZON (OTC)', name: 'Amazon.com Inc.', payout: '90%', icon: '📦' },
  { symbol: 'APPLE (OTC)', name: 'Apple Inc.', payout: '90%', icon: '🍎' },
  { symbol: 'TSLA (OTC)', name: 'Tesla Inc.', payout: '87%', icon: '🚗' },
]

// Основные валютные пары
const MAJOR_PAIRS = [
  { symbol: 'EUR/USD', name: 'Евро/Доллар', market: 'forex' },
  { symbol: 'GBP/USD', name: 'Фунт/Доллар', market: 'forex' },
  { symbol: 'USD/JPY', name: 'Доллар/Йена', market: 'forex' },
  { symbol: 'AUD/USD', name: 'Австр.Доллар/Доллар', market: 'forex' },
  { symbol: 'USD/CAD', name: 'Доллар/Канад.Доллар', market: 'forex' },
  { symbol: 'NZD/USD', name: 'Н.Зел.Доллар/Доллар', market: 'forex' },
  { symbol: 'USD/CHF', name: 'Доллар/Шв.Франк', market: 'forex' },
]

/**
 * Проверка: сейчас торговый день (Пн-Пт, 00:00-23:59 UTC)
 * Forex торгует 24/5, но основные сессии:
 *   Лондон: 07:00-16:00 UTC
 *   Нью-Йорк: 12:00-21:00 UTC
 *   Токио: 00:00-09:00 UTC
 *   Сидней: 22:00-07:00 UTC
 */
export function isForexMarketOpen() {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()
  const utc = utcHour * 60 + utcMinute
  const dayOfWeek = now.getUTCDay() // 0=Вс, 6=Сб
  
  // Выходные — рынок закрыт
  if (dayOfWeek === 0 || dayOfWeek === 6) return { open: false, reason: 'weekend' }
  
  // Forex торгует 24/5 — всегда открыт в будни
  return { open: true, reason: 'weekday' }
}

/**
 * Расчёт времени до открытия/закрытия ближайшей сессии
 */
export function getNextSessionInfo() {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()
  const utc = utcHour * 60 + utcMinute
  const dayOfWeek = now.getUTCDay()
  
  const sessions = [
    { name: 'Сидней', start: 22 * 60, end: 7 * 60, nextDay: false },
    { name: 'Токио', start: 0 * 60, end: 9 * 60, nextDay: false },
    { name: 'Лондон', start: 7 * 60, end: 16 * 60, nextDay: false },
    { name: 'Нью-Йорк', start: 12 * 60, end: 21 * 60, nextDay: false },
  ]
  
  // Если выходные
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (7 - dayOfWeek)
    const mondayOpen = new Date(now)
    mondayOpen.setDate(mondayOpen.getDate() + daysUntilMonday)
    mondayOpen.setUTCHours(0, 0, 0, 0)
    
    const diff = mondayOpen - now
    return {
      isWeekend: true,
      daysUntilOpen: daysUntilMonday,
      nextOpen: 'Пн 00:00 UTC',
      diff
    }
  }
  
  // Ищем следующую сессию
  for (const session of sessions) {
    let start = session.start
    let end = session.end
    
    // Если сессия переходит через полночь
    if (end < start) {
      if (utc >= start || utc < end) {
        return {
          isWeekend: false,
          currentSession: session.name,
          closesAt: formatTimeUTC(end),
          diff: utc >= start ? (end - utc) * 60 * 1000 : (start - utc + (24 * 60)) * 60 * 1000
        }
      }
    } else {
      if (utc >= start && utc < end) {
        return {
          isWeekend: false,
          currentSession: session.name,
          closesAt: formatTimeUTC(end),
          diff: (end - utc) * 60 * 1000
        }
      }
    }
  }
  
  // Рынок закрыт (между сессиями — маловероятно для forex)
  return {
    isWeekend: false,
    nextSession: 'Сидней',
    nextOpen: '22:00 UTC',
    diff: (22 * 60 - utc) * 60 * 1000
  }
}

function formatTimeUTC(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} UTC`
}

/**
 * Проверка доступности OTC-пар через Binance API
 */
export async function checkOTCAvailability() {
  const available = []
  const unavailable = []
  
  // Проверяем BTC и ETH через Binance
  const symbols = ['BTCUSDT', 'ETHUSDT']
  
  for (const symbol of symbols) {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
      const data = await response.json()
      
      if (data && data.lastPrice) {
        available.push({
          symbol: symbol === 'BTCUSDT' ? 'BTC/USD (OTC)' : 'ETH/USD (OTC)',
          name: symbol === 'BTCUSDT' ? 'Bitcoin' : 'Ethereum',
          payout: '88%',
          icon: symbol === 'BTCUSDT' ? '₿' : 'Ξ',
          price: parseFloat(data.lastPrice).toFixed(2),
          change: parseFloat(data.priceChangePercent).toFixed(2),
          volume: parseFloat(data.volume).toFixed(0)
        })
      } else {
        unavailable.push(symbol)
      }
    } catch (error) {
      unavailable.push(symbol)
    }
  }
  
  // GSMI, GOOGLE, TRON, AMAZON, APPLE, TSLA — OTC всегда доступны
  // Добавляем их с дефолтными данными
  const otcDefaults = OTC_PAIRS.filter(p => 
    !['BTC/USD (OTC)', 'ETH/USD (OTC)'].includes(p.symbol)
  )
  
  return {
    available: [...otcDefaults, ...available],
    unavailable,
    total: otcDefaults.length + available.length
  }
}

/**
 * Получение полной информации о рынке
 */
export async function getMarketStatus() {
  const forexOpen = isForexMarketOpen()
  const sessionInfo = getNextSessionInfo()
  const otcStatus = await checkOTCAvailability()
  
  let status, statusIcon, statusColor, statusMessage
  
  if (forexOpen.reason === 'weekend') {
    status = 'closed'
    statusIcon = '🔴'
    statusColor = '#f87171'
    statusMessage = `Рынок закрыт — ${sessionInfo.daysUntilOpen === 1 ? 'завтра' : `через ${sessionInfo.daysUntilOpen} дн.`} открытие`
  } else if (otcStatus.available.length > 0) {
    status = 'otc-only'
    statusIcon = '🟡'
    statusColor = '#fbbf24'
    statusMessage = `Forex закрыт • OTC доступны: ${otcStatus.total} пар`
  } else {
    status = 'open'
    statusIcon = '🟢'
    statusColor = '#34d399'
    statusMessage = `Рынок открыт • ${sessionInfo.currentSession || 'все сессии'}`
  }
  
  return {
    status,
    statusIcon,
    statusColor,
    statusMessage,
    forexOpen: forexOpen.open,
    sessionInfo,
    otcPairs: otcStatus.available,
    majorPairs: MAJOR_PAIRS,
    timestamp: new Date().toLocaleString('ru-RU')
  }
}
