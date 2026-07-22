/**
 * Telegram Bot — серверная часть
 * Отправляет уведомления о рынке и приветственные сообщения
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Хранилище chat_id (в продакшене — база данных)
const chatIds = new Set()

/**
 * Получение статуса рынка EUR/USD
 */
function getMarketStatus() {
  const now = new Date()
  const utcMs = now.getTime()
  const msc = new Date(utcMs + 3 * 3600000) // МСК UTC+3
  
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
      break
    case 1: case 2: case 3: case 4: // Пн-Чт
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
    case 5: // Пятница
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
    case 6: // Суббота
      hours = 24 - hour
      minutes = 60 - minute
      break
  }
  
  return { isOpen, hours, minutes }
}

/**
 * Отправка сообщения в Telegram
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
 * Формирование утреннего сообщения
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
    
    return `⏰ <b>Рынок откроется через:</b>

<b>${timeStr}</b>

🕐 Открытие: 08:00 МСК

🤖 Бот уже готов! Когда рынок откроется — получишь сигнал.

📡 Данные: Binarium + TradingView

🎯 <i>Подготовься к торговле!</i>

#EURUSD #ожидание`
  }
}

/**
 * Vercel Serverless Function
 * POST /api/bot — отправить уведомление
 * GET /api/bot — получить статус
 */
export default async function handler(req, res) {
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Bot token not configured' })
  }

  if (req.method === 'POST') {
    const { chatId, type } = req.body
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId required' })
    }
    
    chatIds.add(chatId)
    
    let message = ''
    switch (type) {
      case 'morning':
        message = getMorningMessage()
        break
      case 'market_open':
        message = `🟢 <b>Рынок EUR/USD открыт!</b>

📊 Время: ${new Date().toLocaleString('ru-RU')}

🤖 Бот готов к анализу!

📡 Данные: Binarium + TradingView

<i>Получи сигнал прямо сейчас!</i>`
        break
      case 'market_close':
        message = `🔴 <b>Рынок EUR/USD закрыт.</b>

📊 Время: ${new Date().toLocaleString('ru-RU')}

🤖 До следующего открытия — готовься!

📡 Данные: Binarium + TradingView`
        break
      default:
        message = getMorningMessage()
    }
    
    const result = await sendMessage(chatId, message)
    
    return res.status(200).json({ 
      success: result.ok, 
      result 
    })
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Telegram Bot API',
      chatIds: chatIds.size,
      market: getMarketStatus()
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
