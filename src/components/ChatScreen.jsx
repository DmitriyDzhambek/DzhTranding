import { useState, useRef, useEffect } from 'react'
import './ChatScreen.css'
import { twoStepConfirmation, getHistoricalData } from '../services/AIEngine'

function ChatScreen({ user }) {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: '🌺\n\nПривет! Я AI-ассистент "Секреты Большого Счастья".\n\n🔒 ДВОЙНАЯ ПРОВЕРКА перед каждым сигналом:\n• Алгоритм А — тренд и индикаторы\n• Алгоритм Б — объём и микроструктура\n\nСигнал выдаётся только когда оба алгоритма согласны. Точность ~85-90%.\n\nСпроси "Дай сигнал" или выбери быстрое действие ниже!',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [cooldownUntil, setCooldownUntil] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    if (!cooldownUntil) return
    const timer = setInterval(() => {
      if (Date.now() >= cooldownUntil) setCooldownUntil(null)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownUntil])

  const getCooldownSeconds = () => {
    if (!cooldownUntil) return 0
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
  }

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getTrendLabel = (trend) => {
    if (trend === 'bullish') return '📈 Бычий'
    if (trend === 'bearish') return '📉 Медвежий'
    return '➡️ Нейтральный'
  }

  const formatTwoStepResponse = (result) => {
    if (!result) return '⏸️ <b>Сигнал: ПОДОЖДИ</b>\n\nНедостаточно данных.'

    if (result.signal === 'WAIT') {
      const algoAInfo = result.algorithmA 
        ? `\n\n📊 <b>Алгоритм А (Тренд и индикаторы):</b>\n• Сигнал: ${result.algorithmA.signal}\n• Уверенность: ${result.algorithmA.confidence}%\n• RSI: ${result.algorithmA.details?.rsi?.toFixed(2) || 'N/A'}\n• Тренд: ${getTrendLabel(result.algorithmA.details?.trend)}`
        : ''
      const algoBInfo = result.algorithmB 
        ? `\n\n📊 <b>Алгоритм Б (Объём и микроструктура):</b>\n• Сигнал: ${result.algorithmB.signal}\n• Уверенность: ${result.algorithmB.confidence}%\n• Импульс: ${result.algorithmB.details?.momentum?.toFixed(5) || 'N/A'}\n• Объём: ${result.algorithmB.details?.volumeRatio?.toFixed(2) || 'N/A'}x`
        : ''
      
      return `⏸️ <b>Сигнал: ПОДОЖДИ</b>

${result.reason}

${algoAInfo}${algoBInfo}`
    }

    const typeLabel = result.signal === 'BUY' ? '📈 ПОКУПКА (BUY)' : '📉 ПРОДАЖА (SELL)'
    const typeEmoji = result.signal === 'BUY' ? '🟢' : '🔴'
    const algoAInfo = result.algorithmA 
      ? `\n\n✅ <b>Алгоритм А (Тренд и индикаторы):</b>\n• Сигнал: ${result.algorithmA.signal}\n• Уверенность: ${result.algorithmA.confidence}%\n• RSI: ${result.algorithmA.details?.rsi?.toFixed(2) || 'N/A'}\n• Тренд: ${getTrendLabel(result.algorithmA.details?.trend)}`
      : ''
    const algoBInfo = result.algorithmB 
      ? `\n\n✅ <b>Алгоритм Б (Объём и микроструктура):</b>\n• Сигнал: ${result.algorithmB.signal}\n• Уверенность: ${result.algorithmB.confidence}%\n• Импульс: ${result.algorithmB.details?.momentum?.toFixed(5) || 'N/A'}\n• Объём: ${result.algorithmB.details?.volumeRatio?.toFixed(2) || 'N/A'}x`
      : ''

    return `${typeEmoji} <b>${typeLabel}</b>

✅ <b>ПОДТВЕРЖДЕНО 2 МЕТОДАМИ</b>

🎯 <b>Уверенность:</b> ${result.confidence}%

${algoAInfo}${algoBInfo}

💡 <b>Рекомендация:</b> Оба алгоритма подтверждают сигнал. Высокая точность ~85-90%.

⚠️ <b>Помни:</b> Всегда используй риск-менеджмент!`
  }

  const processUserQuery = async (query) => {
    const lowerQuery = query.toLowerCase()

    const userMsg = { type: 'user', text: query, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(async () => {
      try {
        let botResponse = ''

        if (lowerQuery.includes('евро') || lowerQuery.includes('eur') || lowerQuery.includes('доллар') || lowerQuery.includes('торг') || lowerQuery.includes('сигнал') || lowerQuery.includes('анализ') || lowerQuery.includes('по евро')) {
          const historicalData = await getHistoricalData(30)
          
          if (!historicalData || historicalData.length < 20) {
            botResponse = '⏸️ <b>Недостаточно данных</b>\n\nПодождите несколько секунд...'
          } else {
            const prices = historicalData.map(d => d.price)
            const currentPrice = prices[prices.length - 1]
            const result = twoStepConfirmation(prices)
            
            if (result.cooldownUntil) setCooldownUntil(result.cooldownUntil)
            botResponse = formatTwoStepResponse(result)
            
            if (currentPrice) {
              botResponse += `\n\n💰 <b>Текущая цена:</b> ${currentPrice.toFixed(5)}`
              setLastUpdate(new Date())
            }
          }
        } 
        else if (lowerQuery.includes('психол') || lowerQuery.includes('эмоц') || lowerQuery.includes('страх') || lowerQuery.includes('спокой') || lowerQuery.includes('совет') || lowerQuery.includes('прави')) {
          botResponse = getPsychologyAdvice(lowerQuery)
        }
        else if (lowerQuery.includes('помог') || lowerQuery.includes('что') || lowerQuery.includes('как') || lowerQuery.includes('help') || lowerQuery.includes('мож')) {
          botResponse = `Я могу помочь с:\n\n🔒 <b>Торговый сигнал</b> — "Дай сигнал" (двойная проверка)\n📊 <b>Анализ рынка</b> — "Что по евро?"\n🧘 <b>Психология</b> — "Как контролировать эмоции?"\n\n💡 Двойная проверка: оба алгоритма должны согласиться для сигнала.`
        }
        else if (lowerQuery.includes('привет') || lowerQuery.includes('здрав') || lowerQuery.includes('хай')) {
          botResponse = `🌺 Привет! Рад тебя видеть!\n\n🔒 <b>Двойная проверка сигнала:</b>\n• Алгоритм А — тренд и индикаторы\n• Алгоритм Б — объём и микроструктура\n\nСигнал выдаётся только когда оба согласны (~85-90% точность).\n\nСпроси "Дай сигнал" или "Что по евро?"!`
        }
        else if (lowerQuery.includes('спасибо') || lowerQuery.includes('благодар')) {
          botResponse = `🌺 Всегда пожалуйста! Успешной торговли! 🧘`
        }
        else {
          const historicalData = await getHistoricalData(30)
          if (!historicalData || historicalData.length < 20) {
            botResponse = '⏸️ <b>Недостаточно данных</b>'
          } else {
            const prices = historicalData.map(d => d.price)
            const result = twoStepConfirmation(prices)
            if (result.cooldownUntil) setCooldownUntil(result.cooldownUntil)
            botResponse = formatTwoStepResponse(result)
          }
        }

        setMessages(prev => [...prev, { type: 'bot', text: botResponse, timestamp: new Date() }])
        setIsTyping(false)
      } catch (error) {
        console.error('Ошибка AI:', error)
        setMessages(prev => [...prev, { type: 'bot', text: '❌ Ошибка получения данных.', timestamp: new Date() }])
        setIsTyping(false)
      }
    }, 800 + Math.random() * 800)
  }

  const getPsychologyAdvice = (query) => {
    if (query.includes('страх')) return '😰 <b>Страх — нормален.</b> Используй его: страх = проверка плана. Если план есть — действуй. 📋'
    if (query.includes('реванш') || query.includes('отыгр')) return '🚫 <b>Никогда не отыгрывайся!</b> После убытка — перерыв минимум 30 минут. 💎'
    
    const advices = [
      '🧘 <b>Помни:</b> трейдинг — это марафон. Дыши глубоко. 🌺',
      '🌴 <b>Правило 5 минут:</b> перед каждой сделкой подожди 5 минут.',
      '📝 <b>Торговый дневник:</b> записывай каждую сделку.',
      '🎯 <b>Риск-менеджмент:</b> не рискуй более 2% капитала.',
    ]
    return advices[Math.floor(Math.random() * advices.length)]
  }

  const sendMessage = () => {
    if (!input.trim()) return
    processUserQuery(input.trim())
  }

  const cooldownSeconds = getCooldownSeconds()

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-avatar">🌺</div>
        <div className="chat-header-info">
          <h3>AI Ассистент</h3>
          <div className="chat-status-row">
            <span className={`status-dot ${isTyping ? 'typing' : 'online'}`}></span>
            <span className="chat-status-text">{isTyping ? 'Думает...' : 'Онлайн'}</span>
          </div>
        </div>
        {cooldownSeconds > 0 && (
          <div className="chat-timer">
            <span className="timer-icon">⏳</span>
            <span className="timer-value">{formatCountdown(cooldownSeconds)}</span>
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <div className="message-avatar">{msg.type === 'bot' ? '🌺' : '👤'}</div>
            <div className="message-content">
              <div className="message-text" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
              <div className="message-time">{msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message bot typing">
            <div className="message-avatar">🌺</div>
            <div className="message-content">
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="quick-actions">
          <button className="quick-btn" onClick={() => processUserQuery('Дай сигнал')}>
            <span className="quick-icon">🔒</span><span>Дай сигнал</span>
          </button>
          <button className="quick-btn" onClick={() => processUserQuery('Что по евро?')}>
            <span className="quick-icon">📊</span><span>Что по евро?</span>
          </button>
          <button className="quick-btn" onClick={() => processUserQuery('Как контролировать эмоции?')}>
            <span className="quick-icon">🧘</span><span>Психология</span>
          </button>
          <button className="quick-btn" onClick={() => processUserQuery('Что ты умеешь?')}>
            <span className="quick-icon">❓</span><span>Помощь</span>
          </button>
        </div>
      )}

      <div className="chat-input-area">
        <div className="input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Спроси меня о трейдинге..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            disabled={isTyping}
          />
          <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || isTyping}>➤</button>
        </div>
        <div className="input-hint">
          <span>🔒 Двойная проверка</span>
          <span>•</span>
          <span>EUR/USD • Реальные данные</span>
        </div>
      </div>
    </div>
  )
}

export default ChatScreen