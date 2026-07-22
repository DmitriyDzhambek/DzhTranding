/**
 * MarketAvailability — проверка доступности EUR/USD в реальном времени
 */

/**
 * Проверка: сейчас торговый день (Пн-Пт)
 * Forex торгует 24/5
 */
export function isForexMarketOpen() {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Вс, 6=Сб
  
  // Выходные — рынок закрыт
  if (dayOfWeek === 0 || dayOfWeek === 6) return { open: false, reason: 'weekend' }
  
  // Будний день — рынок открыт
  return { open: true, reason: 'weekday' }
}

/**
 * Точный обратный отсчёт до открытия рынка Forex (EUR/USD)
 * Возвращает { hours, minutes, seconds, totalSeconds }
 */
export function getTimeUntilMarketOpen() {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  
  // Если рынок открыт — возвращаем 0
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isOpen: true }
  }
  
  // Определяем ближайший понедельник 00:00 UTC
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (7 - dayOfWeek)
  const mondayOpen = new Date(now)
  mondayOpen.setDate(mondayOpen.getDate() + daysUntilMonday)
  mondayOpen.setUTCHours(0, 0, 0, 0)
  
  const diff = mondayOpen - now
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  return { hours, minutes, seconds, totalSeconds, isOpen: false }
}

/**
 * Форматирование обратного отсчёта в HH:MM:SS
 */
export function formatCountdown(countdown) {
  if (countdown.isOpen) return 'Рынок открыт'
  
  const hh = String(countdown.hours).padStart(2, '0')
  const mm = String(countdown.minutes).padStart(2, '0')
  const ss = String(countdown.seconds).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * Форматирование обратного отсчёта в читаемом виде
 */
export function formatCountdownReadable(countdown) {
  if (countdown.isOpen) return '🟢 Рынок открыт'
  
  const { hours, minutes, totalSeconds } = countdown
  
  if (totalSeconds === 0) return '🟢 Рынок открывается!'
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return days === 1 
      ? '🟢 Рынок откроется завтра' 
      : `🟢 Открытие через ${days} дн.`
  }
  
  return `🟢 Открытие через ${hours}ч ${minutes}м`
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
      hoursUntilOpen: Math.floor(diff / (1000 * 60 * 60)),
      minutesUntilOpen: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      diff
    }
  }
  
  // Будний день — рынок открыт
  return {
    isWeekend: false,
    open: true
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
