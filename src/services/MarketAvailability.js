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
 * Возвращает { hours, minutes, seconds, totalSeconds, nextOpen, nextClose }
 */
export function getTimeUntilMarketOpen() {
  const now = new Date()
  
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()
  const utcSecond = now.getUTCSeconds()
  const dayOfWeek = now.getUTCDay() // 0=Вс, 5=Пт, 6=Сб
  
  const currentUtcSeconds = utcHour * 3600 + utcMinute * 60 + utcSecond
  
  // === СУББОТА — до воскресенья 22:00 UTC ===
  if (dayOfWeek === 6) {
    const secondsUntilOpen = (22 * 3600) - currentUtcSeconds + (6 * 24 * 3600)
    return formatCountdownData(secondsUntilOpen, false)
  }
  
  // === ВОСКРЕСЕНЬЕ — до 22:00 UTC ===
  if (dayOfWeek === 0) {
    if (currentUtcSeconds < 22 * 3600) {
      // Ещё не открылся
      const secondsUntilOpen = (22 * 3600) - currentUtcSeconds
      return formatCountdownData(secondsUntilOpen, false)
    }
    // Уже открылся — до пятницы 22:00 UTC
    const secondsUntilClose = (4 * 7 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
    return formatCountdownData(secondsUntilClose, true, true)
  }
  
  // === ПОНЕДЕЛЬНИК — до пятницы 22:00 UTC ===
  if (dayOfWeek === 1) {
    const secondsUntilClose = (4 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
    return formatCountdownData(secondsUntilClose, true)
  }
  
  // === ВТОРНИК ===
  if (dayOfWeek === 2) {
    const secondsUntilClose = (3 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
    return formatCountdownData(secondsUntilClose, true)
  }
  
  // === СРЕДА ===
  if (dayOfWeek === 3) {
    const secondsUntilClose = (2 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
    return formatCountdownData(secondsUntilClose, true)
  }
  
  // === ЧЕТВЕРГ ===
  if (dayOfWeek === 4) {
    const secondsUntilClose = (24 * 3600) + (22 * 3600) - currentUtcSeconds
    return formatCountdownData(secondsUntilClose, true)
  }
  
  // === ПЯТНИЦА ===
  if (dayOfWeek === 5) {
    if (currentUtcSeconds < 22 * 3600) {
      // Ещё не закрылся
      const secondsUntilClose = (22 * 3600) - currentUtcSeconds
      return formatCountdownData(secondsUntilClose, true, false, true)
    }
    // Уже закрылся — до воскресенья 22:00 UTC
    const secondsUntilOpen = (2 * 24 * 3600) + (22 * 3600) - currentUtcSeconds
    return formatCountdownData(secondsUntilOpen, false)
  }
  
  return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isOpen: true }
}

/**
 * Форматирование данных обратного отсчёта
 */
function formatCountdownData(totalSeconds, isOpen, isCloseWarning, isClosingSoon) {
  if (totalSeconds <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isOpen: true,
      isClosingSoon: false
    }
  }
  
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isOpen,
    isClosingSoon: isCloseWarning || isClosingSoon || false
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
