import { useState, useRef, useEffect } from 'react'
import './ChatScreen.css'
import { analyzeMarket, getCurrentPrice } from '../services/AIEngine'

function ChatScreen({ user }) {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: '🌺\n\nПривет! Я AI-ассистент "Секреты Большого Счастья".\n\nЯ анализирую EUR/USD в реальном времени и даю торговые сигналы.\n\nСпроси "Что по евро?" или выбери быстрое действие ниже!',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [countdown, setCountdown] = useState(120)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Таймер обратного отсчёта 2 минуты
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 120
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Форматирование ответа AI
  const formatAnalysisResponse = (analysis) => {
    if (!analysis) return '⏸️ <b>Сигнал: ПОДОЖДИ</b>\n\nСигналы противоречивые, рекомендуется подождать.'

    if (analysis.type === 'WAIT') {
      const consensusInfo = analysis.consensus 
        ? `\n\n⚠️ <b>Разногласие таймфреймов:</b>\n${analysis.consensus.timeframes.map(tf => `• ${tf.tf}: ${tf.type}`).join('\n')}\n\n${analysis.consensus.consensusReason}`
        : ''
      return `⏸️ <b>Сигнал: ПОДОЖДИ</b>\n\n${analysis.reason}${consensusInfo}\n\n⏱️ <b>Экспирация:</b> ${analysis.expiry?.minutes || '—'} мин\n\n📊 <b>Индикаторы:</b>\n• RSI: ${analysis.indicators?.rsi?.toFixed(2) || 'N/A'}\n• ATR: ${analysis.indicators?.atrPercent?.toFixed(4) || 'N/A'}%\n• Тренд: ${getTrendLabel(analysis.indicators?.trend)}`
    }

    const typeLabel = analysis.type === 'BUY' ? '📈 ПОКУПКА (BUY)' : '📉 ПРОДАЖА (SELL)'
    const typeEmoji = analysis.type === 'BUY' ? '🟢' : '🔴'
    const consensusInfo = analysis.consensus && analysis.consensus.consensusActive
      ? `\n\n✅ <b>Консенсус таймфреймов:</b>\n${analysis.consensus.timeframes.map(tf => `• ${tf.tf}: ${tf.type} (${tf.confidence}%)`).join('\n')}`
      : ''

    return `${typeEmoji} <b>${typeLabel}</b>

🎯 <b>Уверенность:</b> ${analysis.confidence}%

📊 <b>Уровни:</b>
• Вход: ${analysis.entry?.toFixed(5)}
• Stop Loss: ${analysis.sl?.toFixed(5)}
• Take Profit: ${analysis.tp?.toFixed(5)}

⏱️ <b>Экспирация:</b> ${analysis.expiry?.minutes || '—'} мин (оптимально)${consensusInfo}

📈 <b>Индикаторы:</b>
• RSI(14): ${analysis.indicators?.rsi?.toFixed(2)}
• ATR: ${analysis.indicators?.atrPercent?.toFixed(4)}%
• Тренд: ${getTrendLabel(analysis.indicators?.trend)}`
  }

  const getTrendLabel = (trend) => {
    if (trend === 'bullish') return '📈 Бычий'
    if (trend === 'bearish') return '📉 Медвежий'
    return '➡️ Нейтральный'
  }

  // Обработка запроса
  const processUserQuery = async (query) => {
    const lowerQuery = query.toLowerCase()

    const userMsg = {
      type: 'user',
      text: query,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(async () => {
      try {
        let botResponse = ''

        if (lowerQuery.includes('евро') || lowerQuery.includes('eur') || lowerQuery.includes('доллар') || lowerQuery.includes('торг') || lowerQuery.includes('сигнал') || lowerQuery.includes('анализ') || lowerQuery.includes('по евро')) {
          const [analysis, currentPrice] = await Promise.all([
            analyzeMarket(),
            getCurrentPrice()
          ])
          
          botResponse = formatAnalysisResponse(analysis)
          
          if (currentPrice) {
            botResponse += `\n\n💰 <b>Текущая цена:</b> ${currentPrice.toFixed(5)}`
            setLastUpdate(new Date())
            setCountdown(120)
          }
        } 
        else if (lowerQuery.includes('психол') || lowerQuery.includes('эмоц') || lowerQuery.includes('страх') || lowerQuery.includes('спокой') || lowerQuery.includes('совет') || lowerQuery.includes('прави')) {
          botResponse = getPsychologyAdvice(lowerQuery)
        }
        else if (lowerQuery.includes('помог') || lowerQuery.includes('что') || lowerQuery.includes('как') || lowerQuery.includes('help') || lowerQuery.includes('мож')) {
          botResponse = `Я могу помочь с:\n\n📊 <b>Анализ рынка</b> — "Что по евро?"\n📈 <b>Торговый сигнал</b> — "Дай сигнал"\n🧘 <b>Психология</b> — "Как контролировать эмоции?"\n\n💡 Просто напишите свой вопрос!`
        }
        else if (lowerQuery.includes('привет') || lowerQuery.includes('здрав') || lowerQuery.includes('хай')) {
          botResponse = `🌺 Привет! Рад тебя видеть!\n\nЯ могу проанализировать рынок EUR/USD и дать торговый сигнал. Спроси "Что по евро?" или "Дай сигнал"!\n\nИли спроси о психологии трейдинга 🧘`
        }
        else if (lowerQuery.includes('спасибо') || lowerQuery.includes('благодар')) {
          botResponse = `🌺 Всегда пожалуйста! Успешной торговли! Помни: спокойствие — ключ к успеху 🧘`
        }
        else {
          const analysis = await analyzeMarket()
          botResponse = formatAnalysisResponse(analysis)
        }

        setMessages(prev => [...prev, {
          type: 'bot',
          text: botResponse,
          timestamp: new Date(),
        }])
        setIsTyping(false)
      } catch (error) {
        console.error('Ошибка AI:', error)
        setMessages(prev => [...prev, {
          type: 'bot',
          text: '❌ Ошибка получения данных. Проверьте соединение.',
          timestamp: new Date(),
        }])
        setIsTyping(false)
      }
    }, 800 + Math.random() * 800)
  }

  const getPsychologyAdvice = (query) => {
    if (query.includes('страх')) {
      return '😰 <b>Страх — нормален.</b> Он показывает, что тебе не всё равно. Используй его: страх = проверка плана. Если план есть — действуй. Если плана нет — создай его. 📋'
    }
    if (query.includes('реванш') || query.includes('отыгр')) {
      return '🚫 <b>Никогда не отыгрывайся!</b> После убытка — перерыв минимум 30 минут. Рынок всегда будет ждать. Твой капитал — нет. 💎'
    }
    
    const advices = [
      '🧘 <b>Помни:</b> трейдинг — это марафон, а не спринт. Дыши глубоко. Каждый день — новый шанс. 🌺',
      '🌴 <b>Правило 5 минут:</b> перед каждой сделкой подожди 5 минут. Это снизит импульсивные решения на 80%.',
      '📝 <b>Торговый дневник:</b> записывай каждую сделку. Анализ ошибок — самый быстрый путь к росту!',
      '🎯 <b>Риск-менеджмент:</b> никогда не рискуй более 2% капитала в одной сделке.',
    ]
    
    return advices[Math.floor(Math.random() * advices.length)]
  }

  const sendMessage = () => {
    if (!input.trim()) return
    processUserQuery(input.trim())
  }

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-avatar">🌺</div>
        <div className="chat-header-info">
          <h3>AI Ассистент</h3>
          <div className="chat-status-row">
            <span className={`status-dot ${isTyping ? 'typing' : 'online'}`}></span>
            <span className="chat-status-text">{isTyping ? 'Думает...' : 'Онлайн'}</span>
          </div>
        </div>
        <div className="chat-timer">
          <span className="timer-icon">⏱️</span>
          <span className="timer-value">{formatCountdown(countdown)}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <div className="message-avatar">
              {msg.type === 'bot' ? '🌺' : '👤'}
            </div>
            <div className="message-content">
              <div 
                className="message-text"
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
              />
              <div className="message-time">
                {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message bot typing">
            <div className="message-avatar">🌺</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="quick-actions">
          <button className="quick-btn" onClick={() => processUserQuery('Что по евро?')}>
            <span className="quick-icon">📊</span>
            <span>Что по евро?</span>
          </button>
          <button className="quick-btn" onClick={() => processUserQuery('Дай сигнал')}>
            <span className="quick-icon">📈</span>
            <span>Дай сигнал</span>
          </button>
          <button className="quick-btn" onClick={() => processUserQuery('Как контролировать эмоции?')}>
            <span className="quick-icon">🧘</span>
            <span>Психология</span>
          </button>
          <button className="quick-btn" onClick={() => processUserQuery('Что ты умеешь?')}>
            <span className="quick-icon">❓</span>
            <span>Помощь</span>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <div className="input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Спроси меня о трейдинге..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            disabled={isTyping}
          />
          <button 
            className="send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
          >
            ➤
          </button>
        </div>
        <div className="input-hint">
          <span>Обновление через {formatCountdown(countdown)}</span>
          <span>•</span>
          <span>EUR/USD • 1 мин</span>
        </div>
      </div>
    </div>
  )
}

export default ChatScreen