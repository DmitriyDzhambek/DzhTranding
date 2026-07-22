/**
 * Vercel Serverless Function — Telegram Bot уведомления
 * Отправляет "Доброе утро, капитан!" когда рынок открывается
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const chatId = process.env.TELEGRAM_CHAT_ID
  
  if (!chatId) {
    return res.status(500).json({ error: 'TELEGRAM_CHAT_ID not configured' })
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' })
  }

  try {
    // Получаем статус рынка
    const marketStatus = await getMarketStatus()
    
    // Формируем сообщение
    let message = ''
    
    if (marketStatus.isOpen) {
      message = `🌅 <b>Доброе утро, капитан!</b>

📊 Рынок EUR/USD открыт!

🕐 Время открытия: 08:00 МСК
📈 Текущий статус: <b>Активен</b>

🤖 Бот "Секреты большого счастья" готов к анализу!

📡 Данные: Binarium + TradingView

⏰ Проверь таймер свечи в правом верхнем углу и получи сигнал от AI!

#торговля #EURUSD #утро`
    } else {
      const hoursLeft = marketStatus.hours
      const minutesLeft = marketStatus.minutes
      
      message = `⏰ <b>Рынок откроется через:</b>

${hoursLeft > 0 ? `${hoursLeft}ч ` : ''}${minutesLeft}м

🕐 Открытие: 08:00 МСК

🤖 Бот уже готов! Когда рынок откроется — получишь сигнал.

📡 Данные: Binarium + TradingView

#EURUSD #ожидание`
    }

    // Отправляем сообщение в Telegram
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    const data = await response.json()
    
    if (data.ok) {
      return res.status(200).json({ success: true, message: 'Уведомление отправлено' })
    } else {
      return res.status(500).json({ error: data.description })
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Получение статуса рынка
 */
async function getMarketStatus() {
  const now = new Date()
  
  // Конвертируем UTC в МСК (UTC+3)
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
    case 0: // Воскресенье
      hours = 24 - hour
      minutes = 60 - minute
      isOpen = false
      break
    case 1:
    case 2:
    case 3:
    case 4:
      if (currentSeconds < OPEN_SEC) {
        hours = 8 - hour - 1
        minutes = 60 - minute
        isOpen = false
      } else if (currentSeconds >= CLOSE_SEC) {
        hours = 24 - hour + 8
        minutes = 60 - minute
        isOpen = false
      } else {
        isOpen = true
      }
      break
    case 5: // Пятница
      if (currentSeconds < OPEN_SEC) {
        hours = 8 - hour - 1
        minutes = 60 - minute
        isOpen = false
      } else if (currentSeconds >= CLOSE_SEC) {
        hours = (2 * 24) - hour + 8
        minutes = 60 - minute
        isOpen = false
      } else {
        isOpen = true
      }
      break
    case 6: // Суббота
      hours = 24 - hour
      minutes = 60 - minute
      isOpen = false
      break
    default:
      isOpen = true
  }
  
  return { isOpen, hours, minutes }
}
