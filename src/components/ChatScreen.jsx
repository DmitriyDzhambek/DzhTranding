import { useState, useRef, useEffect } from 'react'
import './ChatScreen.css'
import { twoStepConfirmation, getHistoricalData, calculateRSI, calculateMACD, determineTrend } from '../services/AIEngine'

function ChatScreen({ user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(null)
  const [marketData, setMarketData] = useState({ rsi: 50, trend: 'neutral', macd: 0 })
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Initial greeting
    setMessages([{
      type: 'bot',
      text: '🌺\n\nПривет! Я AI-ассистент "Секреты Большого Счастья".\n\n🔒 ДВОЙНАЯ ПРОВЕРКА перед каждым сигналом:\n• Алгоритм А — тренд и индикаторы\n• Алгоритм Б — объём и микроструктура\n\nСигнал выдаётся только когда оба алгоритма согласны. Точность ~85-90%.',
      timestamp: new Date(),
    }])
  }, [])

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getCooldownSeconds = () => {
    if (!cooldownUntil) return 0
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
  }

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const updateMarketData = async () => {
    try {
      const data = await getHistoricalData(1)
      if (data && data.length > 20) {
        const prices = data.map(d => d.price)
        const macdData = calculateMACD(prices)
        setMarketData({
          rsi: calculateRSI(prices, 14),
          trend: determineTrend(prices),
          macd: macdData ? macdData.histogram : 0
        })
      }
    } catch (e) {
      console.error('Market data error', e)
    }
  }

  useEffect(() => {
    updateMarketData()
    const interval = setInterval(updateMarketData, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const getTrendLabel = (trend) => {
    if (trend === 'bullish') return '📈 Бычий'
    if (trend === 'bearish') return '📉 Медвежий'
    return '➡️ Нейтральный'
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
        let analysisData = null

        if (lowerQuery.includes('евро') || lowerQuery.includes('eur') || lowerQuery.includes('доллар') || lowerQuery.includes('торг') || lowerQuery.includes('сигнал') || lowerQuery.includes('анализ') || lowerQuery.includes('по евро')) {
          const historicalData = await getHistoricalData(30)
          
          if (!historicalData || historicalData.length < 20) {
            botResponse = '⏸️ <b>Недостаточно данных</b>\n\nПодождите несколько секунд...'
          } else {
            const prices = historicalData.map(d => d.price)
            const currentPrice = prices[prices.length - 1]
            const result = twoStepConfirmation(prices)
            
            if (result.cooldownUntil) setCooldownUntil(result.cooldownUntil)
            
            // Prepare analysis data for UI cards
            analysisData = {
              signal: result.signal,
              confidence: result.confidence,
              reason: result.reason,
              currentPrice: currentPrice,
              algoA: result.algorithmA,
              algoB: result.algorithmB,
              levels: {
                entry: currentPrice + (result.signal === 'BUY' ? -0.0005 : 0.0005),
                sl: currentPrice + (result.signal === 'BUY' ? -0.0010 : 0.0010),
                tp: currentPrice + (result.signal === 'BUY' ? 0.0015 : -0.0015)
              }
            }
            
            if (result.signal === 'WAIT') {
              botResponse = result.reason
            } else {
              botResponse = `✅ <b>ПОДТВЕРЖДЕНО 2 МЕТОДАМИ</b>\nУверенность: ${result.confidence}%`
            }
          }
        } 
        else if (lowerQuery.includes('психол') || lowerQuery.includes('эмоц') || lowerQuery.includes('страх') || lowerQuery.includes('спокой') || lowerQuery.includes('совет') || lowerQuery.includes('прави')) {
          botResponse = getPsychologyAdvice(lowerQuery)
        }
        else if (lowerQuery.includes('помог') || lowerQuery.includes('что') || lowerQuery.includes('как') || lowerQuery.includes('help') || lowerQuery.includes('мож')) {
          botResponse = `Я могу помочь с:\n\n🔒 <b>Торговый сигнал</b> — "Дай сигнал" (двойная проверка)\n📊 <b>Анализ рынка</b> — "Что по евро?"\n🧘 <b>Психология</b> — "Как контролировать эмоции?"`
        }
        else if (lowerQuery.includes('привет') || lowerQuery.includes('здрав') || lowerQuery.includes('хай')) {
          botResponse = `🌺 Привет! Рад тебя видеть!\n\n🔒 <b>Двойная проверка сигнала:</b>\n• Алгоритм А — тренд и индикаторы\n• Алгоритм Б — объём и микроструктура\n\nСигнал выдаётся только когда оба согласны (~85-90% точность).\n\nСпроси "Дай сигнал" или "Что по евро?!`
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
            botResponse = result.reason
          }
        }

        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: botResponse, 
          timestamp: new Date(),
          analysis: analysisData
        }])
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

  const TrendIcon = ({ trend }) => {
    if (trend === 'bullish') return <span className="trend-icon bullish">📈</span>
    if (trend === 'bearish') return <span className="trend-icon bearish">📉</span>
    return <span className="trend-icon neutral">➡️</span>
  }

  return (
    <div className="chat-container">
      {/* Header with Widgets */}
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

      {/* Live Widgets Bar */}
      <div className="widgets-bar">
        <div className="widget-item">
          <span className="widget-label">RSI</span>
          <span className={`widget-value ${marketData.rsi > 70 ? 'overbought' : marketData.rsi < 30 ? 'oversold' : ''}`}>
            {marketData.rsi.toFixed(1)}
          </span>
        </div>
        <div className="widget-item">
          <span className="widget-label">Тренд</span>
          <TrendIcon trend={marketData.trend} />
        </div>
        <div className="widget-item">
          <span className="widget-label">MACD</span>
          <span className={`widget-value ${marketData.macd > 0 ? 'positive' : 'negative'}`}>
            {marketData.macd > 0 ? '+' : ''}{marketData.macd.toFixed(5)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <div className="message-avatar">{msg.type === 'bot' ? '🌺' : '👤'}</div>
            <div className="message-content">
              {msg.analysis ? (
                <SignalCard analysis={msg.analysis} />
              ) : (
                <>
                  <div className="message-text" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>' ) }} />
                  <div className="message-time">{msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                </>
              )}
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

      {/* Quick Actions */}
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

      {/* Input */}
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

// Signal Card Component
function SignalCard({ analysis }) {
  const isBuy = analysis.signal === 'BUY'
  const isSell = analysis.signal === 'SELL'
  const isWait = analysis.signal === 'WAIT'
  
  const cardClass = isBuy ? 'card-buy' : isSell ? 'card-sell' : 'card-wait'
  const emoji = isBuy ? '📈' : isSell ? '📉' : '⏸️'
  const label = isBuy ? 'BUY' : isSell ? 'SELL' : 'WAIT'
  
  return (
    <div className={`signal-card ${cardClass}`}>
      <div className="signal-header">
        <div className="signal-emoji">{emoji}</div>
        <div className="signal-info">
          <h4 className="signal-label">{label}</h4>
          <div className="signal-confidence">
            <div className="confidence-bar-bg">
              <div className="confidence-bar-fill" style={{ width: `${analysis.confidence}%` }}></div>
            </div>
            <span className="confidence-text">{analysis.confidence}%</span>
          </div>
        </div>
        {analysis.signal !== 'WAIT' && (
          <div className="signal-verified">✅</div>
        )}
      </div>
      
      <div className="signal-body">
        <div className="signal-price">
          <span className="price-label">Цена:</span>
          <span className="price-value">{analysis.currentPrice?.toFixed(5)}</span>
        </div>
        
        {analysis.signal !== 'WAIT' && (
          <div className="signal-levels">
            <div className="level-row">
              <span className="level-label">Вход:</span>
              <span className="level-value">{analysis.levels?.entry?.toFixed(5)}</span>
            </div>
            <div className="level-row">
              <span className="level-label">SL:</span>
              <span className="level-value danger">{analysis.levels?.sl?.toFixed(5)}</span>
            </div>
            <div className="level-row">
              <span className="level-label">TP:</span>
              <span className="level-value success">{analysis.levels?.tp?.toFixed(5)}</span>
            </div>
          </div>
        )}
        
        <div className="signal-reason">
          {analysis.reason}
        </div>
      </div>
    </div>
  )
}

export default ChatScreen