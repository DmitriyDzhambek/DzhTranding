/**
 * Cron Job — утреннее уведомление
 * Запускается каждый день в 07:30 МСК (04:30 UTC)
 * Отправляет "Доброе утро, капитан!" всем подписчикам
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * Получение статуса рынка EUR/USD
 */
function getMarketStatus() {
  const now = new Date()
  const utcMs = now.getTime()
  const msc = new Date(utcMs + 3 * 3600000)
  
  const dayOfWeek = msc.getDay()
  const hour = msc.getHours()
  const minute = msc.getMinutes()
  const currentSeconds = hour * 3600 + minute * 60
  
  const OPEN_SEC = 8 * 3600
  const CLOSE_SEC = 22 * 3600
  
  let isOpen = false
  let hours = 0
  let minutes = 0
  
  switch (dayOfWeek) {
    case 0:
      hours = 24 - hour
      minutes = 60 - minute
      break
    case 1: case 2: case 3: case 4:
      if (currentSeconds < OPEN_SEC) {
        hours = 8 - hour - 1
        minutes = 60 - minute
      } else if (currentSeconds >= CLOSE_SEC) {
        hours = 24 - hour + 8
        minutes = 60 - minute
      } else {
        isOpen = true
      }
      break
    case 5:
      if (currentSeconds < OPEN_SEC) {
        hours = 8 - hour - 1
        minutes = 60 - minute
      } else if (currentSeconds >= CLOSE_SEC) {
        hours = (2 * 24) - hour + 8
        minutes = 60 - minute
      } else {
        isOpen = true
      }
      break
    case 6:
      hours = 24 - hour
      minutes = 60 - minute
      break
  }
  
  return { isOpen, hours, minutes }
}

/**
 * Отправка сообщения
 */
async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    })
    return await res.json()
  } catch (err) {
    console.error('Ошибка отправки:', err)
    return { ok: false }
  }
}

/**
 * Утреннее сообщение
 */
function getMorningMessage() {
  const market = getMarketStatus()
  
  if (market.isOpen) {
    return `🌅 <b>Доброе утро, капитан!</b>

📊 <b>Рынок EUR/USD открыт!</b>

🕐 Открытие: 08:00 МСК
✅ Статус: <b>Активен</b>

🤖 Бот "Секреты большого счастья" готов к анализу!

📡 Данные: Binarium + TradingView

⏰ Проверь таймер свечи в приложении и получи сигнал от AI!

🎯 <i>Удачной торговли!</i>

#торговля #EURUSD #утро`
  } else {
    const timeStr = market.hours > 0 
      ? `${market.hours}ч ${market.minutes}м` 
      : `${market.minutes}м`
    
    return `⏰ <b>Доброе утро, капитан!</b>

📊 Рынок откроется через: <b>${timeStr}</b>

🕐 Открытие: 08:00 МСК

🤖 Бот уже готов! Когда рынок откроется — получишь сигнал.

📡 Данные: Binarium + TradingView

🎯 <i>Подготовься к торговле!</i>

#EURUSD #ожидание`
  }
}

/**
 * Vercel Cron Job
 * Запускается по расписанию
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Bot token not configured' })
  }

  // В продакшене — загружаем chatIds из базы данных
  // Для демо — отправляем на тестовый chatId
  const chatIds = [process.env.TELEGRAM_CHAT_ID].filter(Boolean)
  
  if (chatIds.length === 0) {
    return res.status(200).json({ message: 'No subscribers' })
  }

  const message = getMorningMessage()
  const results = []
  
  for (const chatId of chatIds) {
    const result = await sendMessage(chatId, message)
    results.push({ chatId, success: result.ok })
  }

  return res.status(200).json({ 
    message: 'Cron executed',
    results,
    timestamp: new Date().toISOString()
  })
}
