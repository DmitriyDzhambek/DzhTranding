/**
 * MarketAvailability — проверка доступности EUR/USD (Forex)
 * График как на Binarium: Пн-Пт 08:00–22:00 МСК (UTC+3)
 */

/**
 * Точный обратный отсчёт до открытия/закрытия EUR/USD
 * Возвращает { hours, minutes, seconds, totalSeconds, isOpen, isClosingSoon }
 */
export function getTimeUntilMarketOpen() {
  const now = new Date()
  
  // Конвертируем UTC в МСК (UTC+3)
  const utcMs = now.getTime()
  const msc = new Date(utcMs + 3 * 3600000)
  
  // ВАЖНО: используем getDay() а не getUTCDay() — день по МСК
  const dayOfWeek = msc.getDay() // 0=Вс, 5=Пт, 6=Сб
  const hour = msc.getHours()
  const minute = msc.getMinutes()
  const second = msc.getSeconds()
  
  const currentSeconds = hour * 3600 + minute * 60 + second
  
  // Торговые часы: 08:00–22:00 МСК
  const OPEN_SEC = 8 * 3600   // 28800
  const CLOSE_SEC = 22 * 3600 // 79200
  
  let totalSeconds, isOpen
  
  switch (dayOfWeek) {
    case 0: // Воскресенье
      // До понедельника 08:00 МСК
      totalSeconds = (24 * 3600) + OPEN_SEC - currentSeconds
      isOpen = false
      break
      
    case 1: // Понедельник
    case 2: // Вторник
    case 3: // Среда
    case 4: // Четверг
      if (currentSeconds < OPEN_SEC) {
        // Ещё не открылся — до 08:00 МСК
        totalSeconds = OPEN_SEC - currentSeconds
        isOpen = false
      } else if (currentSeconds >= CLOSE_SEC) {
        // Уже закрылся — до 08:00 МСК следующего дня
        totalSeconds = (24 * 3600) + OPEN_SEC - currentSeconds
        isOpen = false
      } else {
        // Открыт — до 22:00 МСК
        totalSeconds = CLOSE_SEC - currentSeconds
        isOpen = true
      }
      break
      
    case 5: // Пятница
      if (currentSeconds < OPEN_SEC) {
        // Ещё не открылся — до 08:00 МСК
        totalSeconds = OPEN_SEC - currentSeconds
        isOpen = false
      } else if (currentSeconds >= CLOSE_SEC) {
        // Уже закрылся — до понедельника 08:00 МСК
        totalSeconds = (2 * 24 * 3600) + OPEN_SEC - currentSeconds
        isOpen = false
      } else {
        // Открыт — до 22:00 МСК
        totalSeconds = CLOSE_SEC - currentSeconds
        isOpen = true
      }
      break
      
    case 6: // Суббота
      // До воскресенья 08:00 МСК
      totalSeconds = (24 * 3600) + OPEN_SEC - currentSeconds
      isOpen = false
      break
      
    default:
      totalSeconds = 0
      isOpen = true
  }
  
  if (totalSeconds <= 0) {
    totalSeconds = 0
    isOpen = true
  }
  
  // "Скоро закроется" — менее 1 часа до закрытия
  const ONE_HOUR = 3600
  const isClosingSoon = isOpen && totalSeconds < ONE_HOUR
  
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isOpen,
    isClosingSoon
  }
}

/**
 * Форматирование обратного отсчёта в HH:MM:SS
 */
export function formatCountdown(countdown) {
  if (countdown.isOpen && !countdown.isClosingSoon) return 'Рынок открыт'
  
  const hh = String(countdown.hours).padStart(2, '0')
  const mm = String(countdown.minutes).padStart(2, '0')
  const ss = String(countdown.seconds).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * Форматирование обратного отсчёта в читаемом виде
 */
export function formatCountdownReadable(countdown) {
  if (countdown.isOpen && !countdown.isClosingSoon) return '🟢 Рынок открыт'
  
  if (countdown.isClosingSoon) {
    return `🟡 Закрытие через ${countdown.hours}ч ${countdown.minutes}м`
  }
  
  const { hours, minutes, totalSeconds } = countdown
  
  if (totalSeconds === 0) return '🟢 Рынок открывается!'
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return days === 1 
      ? '🟢 Рынок откроется завтра' 
      : `🟢 Открытие через ${days} дн.`
  }
  
  return `🔴 Открытие через ${hours}ч ${minutes}м`
}

/**
 * Получение текущей цены EUR/USD через TradingView API
 */
export async function getEURUSDPrice() {
  try {
    // Используем TradingView для получения реальной цены EUR/USD
    const response = await fetch('https://api.tradingview.io/v3/quote?symbols=FX:EURUSD')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Ошибка получения цены TradingView:', error)
    return null
  }
}

/**
 * Получение полной информации о рынке
 */
export async function getMarketStatus() {
  const forexOpen = isForexMarketOpen()
  const countdown = getTimeUntilMarketOpen()
  const countdownReadable = formatCountdownReadable(countdown)
  
  let status, statusIcon, statusColor, statusMessage, buttonText, buttonType
  
  if (!countdown.isOpen) {
    status = 'closed'
    statusIcon = '🔴'
    statusColor = '#f87171'
    statusMessage = 'EUR/USD закрыт'
    buttonText = countdownReadable
    buttonType = 'waiting'
  } else if (countdown.isClosingSoon) {
    status = 'closing'
    statusIcon = '🟡'
    statusColor = '#fbbf24'
    statusMessage = 'EUR/USD скоро закроется'
    buttonText = countdownReadable
    buttonType = 'closing'
  } else {
    status = 'open'
    statusIcon = '🟢'
    statusColor = '#34d399'
    statusMessage = 'EUR/USD открыт'
    buttonText = '🟢 Рынок открыт'
    buttonType = 'open'
  }
  
  return {
    status,
    statusIcon,
    statusColor,
    statusMessage,
    buttonText,
    buttonType,
    countdown,
    countdownFormatted: formatCountdown(countdown),
    forexOpen: forexOpen.open,
    timestamp: new Date().toLocaleString('ru-RU')
  }
}
