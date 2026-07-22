import { useState, useRef, useEffect } from 'react'
import TelegramSDK from '@twa-dev/sdk'
import './ChatScreen.css'
import { analyzeMarket, getCurrentPrice } from '../services/AIEngine'

function ChatScreen({ user }) {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: '🌺 Привет! Я AI-ассистент "Секреты Большого Счастья". Я могу:\n\n📊 Анализировать EUR/USD в реальном времени\n📈 Показывать сигналы BUY/SELL\n🎯 Уровни Stop Loss и Take Profit\n🧘 Давать советы по психологии\n\nПросто спросите "Что по евро?" или нажмите кнопку!',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Формируем красивый ответ из данных AIEngine
  const formatAnalysisResponse = (analysis) => {
    if (!analysis || analysis.type === 'WAIT') {
      return `⏸️ <b>Сигнал: ПОДОЖДИ</b>\n\n${analysis.reason}\n\n💡 Индикаторы:\n• RSI: ${analysis.indicators?.rsi?.toFixed(2) || 'N/A'}\n• Тренд: ${getTrendLabel(analysis.indicators?.trend)}\n\n📊 Текущая цена: ${analysis.price?.toFixed(5) || 'N/A'}`
    }

    const typeLabel = analysis.type === 'BUY' ? '📈 ПОКУПКА (BUY)' : '📉 ПРОДАЖА (SELL)'
    const typeEmoji = analysis.type === 'BUY' ? '🟢' : '🔴'

    let response = `${typeEmoji} <b>${typeLabel}</b>\n\n`
    response += `🎯 <b>Уверенность:</b> ${analysis.confidence}%\n\n`
    response += `📊 <b>Уровни:</b>\n`
    response += `• Вход: ${analysis.entry?.toFixed(5)}\n`
    response += `• Stop Loss: ${analysis.sl?.toFixed(5)}\n`
    response += `• Take Profit: ${analysis.tp?.toFixed(5)}\n\n`

    if (analysis.indicators) {
      response += `📈 <b>Индикаторы:</b>\n`
      response += `• RSI(14): ${analysis.indicators.rsi?.toFixed(2)}\n`
      if (analysis.indicators.macd) {
        response += `• MACD: ${analysis.indicators.macd.macd.toFixed(5)} / Signal: ${analysis.indicators.macd.signal.toFixed(5)}\n`
      }
      if (analysis.indicators.bollinger) {
        response += `• Bollinger: ${analysis.indicators.bollinger.lower.toFixed(5)} - ${analysis.indicators.bollinger.upper.toFixed(5)}\n`
      }
      response += `• Тренд: ${getTrendLabel(analysis.indicators.trend)}\n`
    }

    response += `\n💡 ${analysis.reason}\n\n🕐 ${analysis.timestamp}`

    return response
  }

  const getTrendLabel = (trend) => {
    switch (trend) {
      case 'bullish': return '📈 Бычий'
      case 'bearish': return '📉 Медвежий'
      default: return '➡️ Нейтральный'
    }
  }

  // Обработка запроса пользователя
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

    // Имитация "мышления" AI
    setTimeout(async () => {
      try {
        let botResponse = ''

        if (lowerQuery.includes('евро') || lowerQuery.includes('eur') || lowerQuery.includes('доллар') || lowerQuery.includes('торг') || lowerQuery.includes('сигнал') || lowerQuery.includes('анализ') || lowerQuery.includes('по евро')) {
          // Анализ рынка EUR/USD
          const analysis = await analyzeMarket()
          const currentPrice = await getCurrentPrice()
          
          botResponse = formatAnalysisResponse(analysis)
          
          if (currentPrice) {
            botResponse += `\n\n💰 <b>Текущая цена EUR/USD:</b> ${currentPrice.toFixed(5)}`
          }
        } 
        else if (lowerQuery.includes('психол') || lowerQuery.includes('эмоц') || lowerQuery.includes('страх') || lowerQuery.includes('спокой') || lowerQuery.includes('совет') || lowerQuery.includes('прави')) {
          botResponse = getPsychologyAdvice(lowerQuery)
        }
        else if (lowerQuery.includes('помог') || lowerQuery.includes('что') || lowerQuery.includes('как') || lowerQuery.includes('help') || lowerQuery.includes('мож')) {
          botResponse = `Я могу помочь с:\n\n📊 <b>Анализ рынка</b> — спросите "Что по евро?" или "Анализирую EUR/USD"\n📈 <b>Торговые сигналы</b> — "Дай сигнал" или "Торговый сигнал"\n🧘 <b>Психология</b> — "Как контролировать эмоции?" или "Совет по психологии"\n\n💡 Просто напишите свой вопрос!`
        }
        else if (lowerQuery.includes('привет') || lowerQuery.includes('здрав') || lowerQuery.includes('хай') || lowerQuery.includes('hello')) {
          botResponse = `🌺 Привет! Рад тебя видеть!\n\nЯ могу проанализировать рынок EUR/USD и дать торговый сигнал. Спроси "Что по евро?" или "Дай сигнал"!\n\nИли спроси меня о психологии трейдинга 🧘`
        }
        else if (lowerQuery.includes('спасибо') || lowerQuery.includes('благодар')) {
          botResponse = `🌺 Всегда пожалуйста! Успешной торговли! Помни: спокойствие — ключ к успеху 🧘`
        }
        else {
          // По умолчанию — анализ рынка
          const analysis = await analyzeMarket()
          botResponse = formatAnalysisResponse(analysis)
        }

        const botMsg = {
          type: 'bot',
          text: botResponse,
          timestamp: new Date(),
        }

        setMessages(prev => [...prev, botMsg])
        setIsTyping(false)
      } catch (error) {
        console.error('Ошибка AI:', error)
        setMessages(prev => [...prev, {
          type: 'bot',
          text: '❌ Ошибка получения данных. Проверьте соединение и попробуйте снова.',
          timestamp: new Date(),
        }])
        setIsTyping(false)
      }
    }, 1000 + Math.random() * 1000)
  }

  const getPsychologyAdvice = (query) => {
    const advices = [
      '🧘 <b>Помни:</b> трейдинг — это марафон, а не спринт. Дыши глубоко. Не гонись за потерянным. Каждый день — новый шанс. 🌺',
      '🌴 <b>Правило 5 минут:</b> перед каждой сделкой подожди 5 минут. Если всё ещё хочешь войти — входи. Это снизит импульсивные решения на 80%.',
      '📝 <b>Торговый дневник:</b> записывай каждую сделку. Анализ ошибок — самый быстрый путь к росту. Через месяц ты удивишься прогрессу!',
      '🎯 <b>Риск-менеджмент:</b> никогда не рискуй более 2% капитала в одной сделке. Сохранение капитала важнее прибыли.',
      '🧘 <b>Медитация трейдера:</b> 5 минут утром перед графиком. Спроси себя: "Я торгую по плану или из эмоций?"',
      '💪 <b>Принятие убытков:</b> убыток — это стоимость бизнеса, а не личная неудача. Даже лучшие трейдеры имеют 40-50% прибыльных сделок.',
    ]
    
    // Выбираем совет на основе запроса
    if (query.includes('страх')) {
      return '😰 <b>Страх — нормален.</b> Он показывает, что тебе не всё равно. Используй его: страх = проверка плана. Если план есть — действуй. Если плана нет — создай его. 📋'
    }
    if (query.includes('реванш') || query.includes('отыгр')) {
      return '🚫 <b>Никогда не отыгрывайся!</b> Это главное правило. После убытка — перерыв минимум 30 минут. Рынок всегда будет ждать. Твой капитал — нет. 💎'
    }
    
    return advices[Math.floor(Math.random() * advices.length)]
  }

  // Отправка текстового сообщения
  const sendMessage = () => {
    if (!input.trim()) return
    processUserQuery(input.trim())
  }

  // Получение быстрого анализа
  const getQuickAnalysis = () => {
    setIsTyping(true)
    processUserQuery('Что по евро?')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="container chat-container animate-fadeIn">
      {/* Заголовок */}
      <div className="chat-header">
        <div className="chat-avatar">🌺</div>
        <div className="chat-header-info">
          <h3>AI Ассистент</h3>
          <p className="chat-status">
            <span className="status-dot"></span>
            {isTyping ? 'Думает...' : 'Онлайн'}
          </p>
        </div>
      </div>

      {/* Сообщения */}
      <div className="chat-messages scrollbar-hide">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.type}`}>
            <div 
              className="message-text"
              dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
            />
            <div className="message-time">
              {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="chat-message bot typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Быстрые действия */}
      {messages.length <= 2 && (
        <div className="quick-actions">
          <button 
            className="quick-action-btn"
            onClick={getQuickAnalysis}
          >
            📊 Что по евро?
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => { setIsTyping(true); processUserQuery('Дай сигнал'); }}
          >
            📈 Дай сигнал
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => { setIsTyping(true); processUserQuery('Как контролировать эмоции?'); }}
          >
            🧘 Психология
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => { setIsTyping(true); processUserQuery('Что ты умеешь?'); }}
          >
            ❓ Помощь
          </button>
        </div>
      )}

      {/* Ввод */}
      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder="Спроси меня о трейдинге..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isTyping}
        />
        <button 
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || isTyping}
        >
          ➤
        </button>
      </div>
    </div>
  )
}

export default ChatScreen
