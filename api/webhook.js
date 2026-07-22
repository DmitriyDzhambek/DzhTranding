/**
 * Telegram Bot — Webhook обработчик
 * Принимает обновления от Telegram и отправляет уведомления
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Хранилище chat_id
const chatIds = new Set()

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
 * Webhook обработчик
 */
export default async function handler(req, res) {
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Bot token not configured' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const update = req.body
    
    if (!update.message) {
      return res.status(200).json({ ok: true })
    }
    
    const { message } = update
    const chatId = message.chat.id
    const text = message.text?.trim()
    
    // Сохраняем chat_id
    chatIds.add(chatId)
    
    let response = ''
    
    switch (text) {
      case '/start':
        response = `👋 <b>Привет, капитан!</b>

🤖 Я бот "Секреты большого счастья" — твой AI-ассистент для торговли.

📊 <b>Команды:</b>
/start — начать
/утро — утренний анализ рынка
/статус — текущий статус EUR/USD
/свеча — информация о текущей свече

📡 Данные: Binarium + TradingView

🎯 <i>Нажми /утро для анализа!</i>`
        break
        
      case '/утро':
        response = getMorningMessage()
        break
        
      case '/статус':
        const market = getMarketStatus()
        if (market.isOpen) {
          response = `🟢 <b>Рынок EUR/USD открыт!</b>

🕐 08:00–22:00 МСК
✅ Статус: Активен

📡 Данные: Binarium + TradingView`
        } else {
          const timeStr = market.hours > 0 
            ? `${market.hours}ч ${market.minutes}м` 
            : `${market.minutes}м`
          response = `🔴 <b>Рынок EUR/USD закрыт.</b>

⏰ До открытия: <b>${timeStr}</b>
🕐 Открытие: 08:00 МСК`
        }
        break
        
      case '/свеча':
        response = `🕯️ <b>1-минутная свеча</b>

📡 Данные обновляются в реальном времени через Binance WebSocket

📊 Проверь таймер в приложении!

📡 Данные: Binarium + TradingView`
        break
        
      default:
        response = `🤖 <b>Секреты большого счастья</b>

📊 AI-ассистент для торговли EUR/USD

📡 Данные: Binarium + TradingView

📋 Доступные команды:
/start — начать
/утро — утренний анализ
/статус — статус рынка
/свеча — о свечах`
    }
    
    await sendMessage(chatId, response)
    
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Ошибка webhook:', err)
    return res.status(500).json({ error: err.message })
  }
}
