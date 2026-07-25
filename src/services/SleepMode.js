/**
 * SleepMode — режим сна бота
 * Если коррекция/флэт длится > 15 минут, бот переходит в фоновый режим
 * Не беспокоит пользователя, но при появлении сигнала — просыпается
 */

const STORAGE_KEY = 'sleepModeState'
const SLEEP_THRESHOLD_MINUTES = 15

/**
 * Состояние режима сна
 * {
 *   active: boolean,
 *   reason: string,
 *   startedAt: number | null,
 *   lastSignalAt: number | null,
 *   correctionStart: number | null,
 *   totalSleepTime: number
 * }
 */

export function getSleepModeState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Ошибка загрузки SleepMode:', e)
  }
  return getDefaultState()
}

export function getDefaultState() {
  return {
    active: false,
    reason: '',
    startedAt: null,
    lastSignalAt: null,
    correctionStart: null,
    totalSleepTime: 0
  }
}

export function setSleepModeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Ошибка сохранения SleepMode:', e)
  }
}

/**
 * Проверка: нужно ли включать режим сна
 * @param {Array} priceHistory — массив цен (последние N свечей)
 * @param {string} marketState — 'bull', 'bear', 'flat'
 * @returns {object} { shouldSleep: boolean, reason: string }
 */
export function checkSleepMode(priceHistory, marketState) {
  const state = getSleepModeState()
  
  // Если уже спит — не проверяем
  if (state.active) {
    return { shouldSleep: false, reason: 'already_sleeping' }
  }
  
  if (!priceHistory || priceHistory.length < 20) {
    return { shouldSleep: false, reason: 'not_enough_data' }
  }
  
  // Проверяем флэт/коррекцию — цена колеблется в узком диапазоне
  const last30 = priceHistory.slice(-30)
  const prices = last30.map(p => p.price || p)
  
  if (prices.length < 20) {
    return { shouldSleep: false, reason: 'not_enough_data' }
  }
  
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  const rangePercent = ((max - min) / avg) * 100
  
  // Если диапазон < 0.1% — это флэт/коррекция
  const isFlat = rangePercent < 0.1 && marketState === 'flat'
  
  // Проверяем время последнего сигнала
  const timeSinceLastSignal = state.lastSignalAt 
    ? Date.now() - state.lastSignalAt 
    : Infinity
  
  const minutesSinceLastSignal = timeSinceLastSignal / (1000 * 60)
  
  if (isFlat && minutesSinceLastSignal > SLEEP_THRESHOLD_MINUTES) {
    // Включаем режим сна
    const newState = {
      ...state,
      active: true,
      reason: 'correction',
      startedAt: Date.now(),
      correctionStart: Date.now(),
      totalSleepTime: state.totalSleepTime + minutesSinceLastSignal
    }
    setSleepModeState(newState)
    return { shouldSleep: true, reason: 'correction', newState }
  }
  
  return { shouldSleep: false, reason: 'normal' }
}

/**
 * Пробуждение бота — при появлении нового сигнала
 * @param {string} signalType — 'buy', 'sell', 'wait'
 * @returns {object} новое состояние
 */
export function wakeUp(signalType) {
  const state = getSleepModeState()
  
  if (!state.active) return state
  
  const newState = {
    ...state,
    active: false,
    reason: '',
    lastSignalAt: Date.now(),
    correctionStart: null,
    totalSleepTime: state.totalSleepTime
  }
  
  setSleepModeState(newState)
  return newState
}

/**
 * Принудительное включение режима сна (пользователь)
 */
export function enableSleepMode(reason = 'manual') {
  const state = getSleepModeState()
  const newState = {
    ...state,
    active: true,
    reason: reason,
    startedAt: Date.now(),
    correctionStart: Date.now(),
    totalSleepTime: state.totalSleepTime
  }
  setSleepModeState(newState)
  return newState
}

/**
 * Принудительное выключение режима сна (пользователь)
 */
export function disableSleepMode() {
  const state = getSleepModeState()
  const newState = {
    ...state,
    active: false,
    reason: '',
    startedAt: null,
    correctionStart: null,
    totalSleepTime: state.totalSleepTime
  }
  setSleepModeState(newState)
  return newState
}

/**
 * Получение информации о режиме сна для UI
 */
export function getSleepModeInfo() {
  const state = getSleepModeState()
  
  if (!state.active) {
    return {
      active: false,
      message: 'Бот активен',
      icon: '🟢',
      color: '#34d399'
    }
  }
  
  const startedAt = state.startedAt || Date.now()
  const minutesSleeping = Math.floor((Date.now() - startedAt) / (1000 * 60))
  
  let message = ''
  let icon = '😴'
  let color = '#8ecae6'
  
  if (state.reason === 'correction') {
    message = `Коррекция — бот отдыхает (${minutesSleeping} мин)`
    icon = '🌊'
    color = '#8ecae6'
  } else if (state.reason === 'manual') {
    message = `Режим сна — бот не беспокоит (${minutesSleeping} мин)`
    icon = '🌙'
    color = '#a78bfa'
  }
  
  return {
    active: true,
    message,
    icon,
    color,
    minutesSleeping,
    reason: state.reason
  }
}

/**
 * Проверка: можно ли отправлять сигнал (не спит ли бот)
 */
export function canSendSignal() {
  const state = getSleepModeState()
  return !state.active
}
