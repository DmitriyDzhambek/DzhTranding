/**
 * MarketAvailability — проверка доступности Московской биржи (IMOEX)
 * Торгует: Пн-Пт, 10:00–19:00 МСК (UTC+3)
 */

/**
 * Получение текущего времени МСК (UTC+3)
 */
function getMSCTime() {
  const now = new Date()
  // Получаем UTC время и добавляем 3 часа
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 3 * 3600000)
}

/**
 * Проверка: сейчас торговый день Московской биржи
 */
export function isMoscowExchangeOpen() {
  const msc = getMSCTime()
  const dayOfWeek = msc.getUTCDay() // 0=Вс, 6=Сб
  const hour = msc.getUTCHours()
  const minute = msc.getUTCMinutes()
  
  // Выходные — закрыто
  if (dayOfWeek === 0 || dayOfWeek === 6) return { open: false, reason: 'weekend' }
  
  // Торговые часы: 10:00–19:00 МСК
  const currentTime = hour * 60 + minute
  const openTime = 10 * 60   // 10:00
  const closeTime = 19 * 60  // 19:00
  
  if (currentTime < openTime) return { open: false, reason: 'before-open', minutesUntilOpen: openTime - currentTime }
  if (currentTime >= closeTime) return { open: false, reason: 'after-close', minutesUntilOpen: (openTime + 24 * 60) - currentTime }
  
  return { open: true, reason: 'trading' }
}

/**
 * Точный обратный отсчёт до открытия/закрытия Московской биржи
 * Возвращает { hours, minutes, seconds, totalSeconds, isOpen }
 */
export function getTimeUntilMarketOpen() {
  const msc = getMSCTime()
  const dayOfWeek = msc.getUTCDay()
  const hour = msc.getUTCHours()
  const minute = msc.getUTCMinutes()
  const second = msc.getUTCSeconds()
  
  const currentSeconds = hour * 3600 + minute * 60 + second
  
  let totalSeconds, isOpen
  
  // === СУББОТА ===
  if (dayOfWeek === 6) {
    // До понедельника 10:00 МСК
    totalSeconds = (6 * 24 * 3600) + (10 * 3600) - currentSeconds
    isOpen = false
  }
  // === ВОСКРЕСЕНЬЕ ===
  else if (dayOfWeek === 0) {
    // До понедельника 10:00 МСК
    totalSeconds = (24 * 3600) + (10 * 3600) - currentSeconds
    isOpen = false
  }
  // === ПОНЕДЕЛЬНИК — ЧЕТВЕРГ ===
  else if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    if (currentSeconds < 10 * 3600) {
      // Ещё не открылась — до 10:00 МСК
      totalSeconds = 10 * 3600 - currentSeconds
      isOpen = false
    } else if (currentSeconds >= 19 * 3600) {
      // Уже закрылась — до 10:00 МСК следующего дня
      totalSeconds = (24 * 3600) + (10 * 3600) - currentSeconds
      isOpen = false
    } else {
      // Открыта — до 19:00 МСК
      totalSeconds = 19 * 3600 - currentSeconds
      isOpen = true
    }
  }
  // === ПЯТНИЦА ===
  else if (dayOfWeek === 5) {
    if (currentSeconds < 10 * 3600) {
      // Ещё не открылась — до 10:00 МСК
      totalSeconds = 10 * 3600 - currentSeconds
      isOpen = false
    } else if (currentSeconds >= 19 * 3600) {
      // Уже закрылась — до понедельника 10:00 МСК
      totalSeconds = (3 * 24 * 3600) + (10 * 3600) - currentSeconds
      isOpen = false
    } else {
      // Открыта — до 19:00 МСК
      totalSeconds = 19 * 3600 - currentSeconds
      isOpen = true
    }
  }
  
  if (totalSeconds <= 0) {
    totalSeconds = 0
    isOpen = true
  }
  
  // Определяем "скоро закроется" — менее 1 часа до закрытия
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
