/**
 * Сервис управления рисками (Risk Manager)
 * Рассчитывает безопасный лот и параметры входа
 */

/**
 * Рассчитывает безопасный лот на основе баланса и риска
 * @param {number} balance - Баланс счета
 * @param {number} riskPercent - Процент риска (1-2%)
 * @param {number} entryPrice - Цена входа
 * @param {number} stopLossPrice - Цена стоп-лосса (расстояние ~50 пипсов)
 * @returns {object} Данные для блока безопасности
 */
export function calculateRisk(balance, riskPercent, entryPrice, stopLossDistance = 0.0050) {
  // Ошибка в деньгах
  const riskAmount = balance * (riskPercent / 100)
  
  // Стоимость пипса для 1 лота (EURUSD)
  const pipValue = 10 // Для стандартного лота
  
  // Расстояние до стопа в пипсах
  const slPips = stopLossDistance / 0.0001
  
  // Безопасный лот
  const safeLot = riskAmount / (slPips * pipValue)
  
  // Округляем до 2 знаков
  const roundedLot = Math.round(safeLot * 100) / 100
  
  return {
    riskAmount: riskAmount.toFixed(2),
    safeLot: roundedLot.toFixed(2),
    slPips: slPips.toFixed(0),
    riskPercent,
    balance
  }
}

/**
 * Проверяет новостной фон (упрощенная версия)
 * В реальности нужно подключать Economic Calendar API
 */
export function checkNewsFilter() {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  
  // Проверка на выходные
  if (day === 0 || day === 6) {
    return {
      status: 'closed',
      message: '📅 Рынок выходного дня',
      isSafe: false
    }
  }
  
  // Критические новости обычно выходят в:
  // 10:30 МСК - Данные по занятости США (NFP, CPI)
  // 15:00 МСК - Решения ФРС
  
  const isNearNews = (hour === 10 && now.getMinutes() > 20) || // 10:30
                     (hour === 14 && now.getMinutes() > 20) || // 14:30
                     (hour === 15) // 15:00
  
  if (isNearNews) {
    return {
      status: 'warning',
      message: '⚠️ Скоро важные новости! Рекомендуется подождать',
      isSafe: false
    }
  }
  
  // Проверяем торговые часы (свободное время)
  const isQuietTime = (hour >= 9 && hour < 10) || // Утро
                      (hour > 11 && hour < 14) || // Обед
                      (hour > 16 && hour < 18) // Вечер
  
  return {
    status: isQuietTime ? 'safe' : 'neutral',
    message: isQuietTime ? '✅ Фон чистый, можно входить' : '📊 Обычный фон, входите осторожно',
    isSafe: isQuietTime
  }
}

/**
 * Получает итоговую рекомендацию
 */
export function getSafetyRecommendation(riskData, newsData) {
  if (!riskData || !newsData) {
    return {
      canEnter: false,
      message: '⏳ Загрузка данных безопасности...'
    }
  }
  
  if (!newsData.isSafe) {
    return {
      canEnter: false,
      message: `⚠️ ${newsData.message}`
    }
  }
  
  return {
    canEnter: true,
    message: '✅ Все условия безопасны для входа!'
  }
}
