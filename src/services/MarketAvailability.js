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
  const sessionInfo = getNextSessionInfo()
  
  let status, statusIcon, statusColor, statusMessage, buttonText, buttonType
  
  if (forexOpen.reason === 'weekend') {
    status = 'closed'
    statusIcon = '🔴'
    statusColor = '#f87171'
    statusMessage = 'EUR/USD закрыт'
    buttonText = sessionInfo.daysUntilOpen === 1 
      ? '🟢 Рынок откроется завтра' 
      : `🟢 Открытие через ${sessionInfo.daysUntilOpen} дн.`
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
    forexOpen: forexOpen.open,
    sessionInfo,
    timestamp: new Date().toLocaleString('ru-RU')
  }
}
