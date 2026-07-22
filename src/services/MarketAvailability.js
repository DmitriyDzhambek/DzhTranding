/**
 * MarketAvailability — проверка доступности EUR/USD в реальном времени
 * Forex торгует: Sunday 22:00 UTC → Friday 22:00 UTC
 */

/**
 * Проверка: сейчас торговый день Forex (включая часы)
 * Forex: Вс 22:00 UTC — Пт 22:00 UTC
 */
export function isForexMarketOpen() {
  const now = new Date()
  
  // Получаем UTC время
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()
  const utcSeconds = now.getUTCSeconds()
  const dayOfWeek = now.getUTCDay() // 0=Вс, 5=Пт, 6=Сб
  
  // Суббота — рынок закрыт
  if (dayOfWeek === 6) return { open: false, reason: 'saturday' }
  
  // Воскресенье — рынок открывается в 22:00 UTC
  if (dayOfWeek === 0) {
    const utcTotalMinutes = utcHour * 60 + utcMinute
    if (utcTotalMinutes < 22 * 60) {
      return { open: false, reason: 'sunday-before-open' }
    }
    return { open: true, reason: 'sunday-after-open' }
  }
  
  // Понедельник — Четверг — рынок открыт
  if (dayOfWeek >= 1 && dayOfWeek <= 4) return { open: true, reason: 'weekday' }
  
  // Пятница — рынок закрывается в 22:00 UTC
  if (dayOfWeek === 5) {
    const utcTotalMinutes = utcHour * 60 + utcMinute
    if (utcTotalMinutes >= 22 * 60) {
      return { open: false, reason: 'friday-after-close' }
    }
    return { open: true, reason: 'friday-before-close' }
  }
  
  return { open: false, reason: 'unknown' }
}

/**
 * Точный обратный отсчёт до открытия/закрытия рынка Forex (EUR/USD)
 * Возвращает { hours, minutes, seconds, totalSeconds, isOpen, isClosingSoon }
 */
export function getTimeUntilMarketOpen() {
  const now = new Date()
  
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()
  const utcSecond = now.getUTCSeconds()
  const dayOfWeek = now.getUTCDay() // 0=Вс, 5=Пт, 6=Сб
  
  const currentUtcSeconds = utcHour * 3600 + utcMinute * 60 + utcSecond
  
  let totalSeconds, isOpen
  
  // === СУББОТА — до воскресенья 22:00 UTC ===
  if (dayOfWeek === 6) {
    const secondsUntilOpen = (22 * 3600) - currentUtcSeconds + (6 * 24 * 3600)
    totalSeconds = secondsUntilOpen
    isOpen = false
  }
  // === ВОСКРЕСЕНЬЕ ===
  else if (dayOfWeek === 0) {
    if (currentUtcSeconds < 22 * 3600) {
      // Ещё не открылся — до 22:00 UTC сегодня
      totalSeconds = (22 * 3600) - currentUtcSeconds
      isOpen = false
    } else {
      // Уже открылся — до пятницы 22:00 UTC
      totalSeconds = (4 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
      isOpen = true
    }
  }
  // === ПОНЕДЕЛЬНИК ===
  else if (dayOfWeek === 1) {
    totalSeconds = (4 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
    isOpen = true
  }
  // === ВТОРНИК ===
  else if (dayOfWeek === 2) {
    totalSeconds = (3 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
    isOpen = true
  }
  // === СРЕДА ===
  else if (dayOfWeek === 3) {
    totalSeconds = (2 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
    isOpen = true
  }
  // === ЧЕТВЕРГ ===
  else if (dayOfWeek === 4) {
    totalSeconds = (24 * 3600) + (22 * 3600) - currentUtcSeconds
    isOpen = true
  }
  // === ПЯТНИЦА ===
  else if (dayOfWeek === 5) {
    if (currentUtcSeconds < 22 * 3600) {
      // Ещё не закрылся — до 22:00 UTC сегодня
      totalSeconds = (22 * 3600) - currentUtcSeconds
      isOpen = true
    } else {
      // Уже закрылся — до воскресенья 22:00 UTC
      totalSeconds = (2 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
      isOpen = false
    }
  }
  
  // Если totalSeconds <= 0 — рынок открыт
  if (totalSeconds <= 0) {
    totalSeconds = 0
    isOpen = true
  }
  
  // Определяем "скоро закроется" — менее 2 часов до закрытия
  const TWO_HOURS = 2 * 3600
  const isClosingSoon = isOpen && totalSeconds < TWO_HOURS
  
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
