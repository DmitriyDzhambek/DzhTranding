import { useState, useRef, useEffect } from 'react'
import TelegramSDK from '@twa-dev/sdk'
import './ChatScreen.css'
import { analyzeMarket } from '../services/AIEngine'
import { VoiceAI, analyzeVoiceQuery, generateVoiceResponse } from '../services/VoiceAI'

function ChatScreen({ user }) {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: '🌺 Привет! Я AI-ассистент "Секреты Большого Счастья". Я могу:\n\n🎙️ Говорить со мной голосом\n📊 Анализировать паттерны\n🎯 Показывать 3 уровня тейк-профит\n🔄 Адаптироваться к фазе рынка\n\nПросто спросите "Что по евро?" или нажмите микрофон!',
      timestamp: new Date(),
      isAnalysis: false,
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const messagesEndRef = useRef(null)
  const voiceAIRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Инициализация Voice AI
  useEffect(() => {
    if (VoiceAI.isSupported()) {
      voiceAIRef.current = new VoiceAI({
        language: 'ru-RU',
        onSpeechResult: (transcript, isFinal) => {
          if (isFinal && transcript.trim()) {
            processUserQuery(transcript.trim())
          }
        },
        onStatusChange: (status) => {
          setIsListening(status === 'listening')
        },
      })
    }

    return () => {
      voiceAIRef.current?.destroy()
    }
  }, [])

  // Анализ рынка
  const performMarketAnalysis = (pair = 'EURUSD') => {
    const result = analyzeMarket(pair)
    setAnalysisData(result)
    return result
  }

  // Обработка запроса пользователя
  const processUserQuery = (query) => {
    const userMsg = {
      type: 'user',
      text: query,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Анализируем запрос
    const { intent, detectedPair } = analyzeVoiceQuery(query)
    
    // Запускаем анализ рынка
    const pairMap = {
      'eurusd': 'EURUSD',
      'gbpusd': 'GBPUSD',
      'usdjpy': 'USDJPY',
      'btcusd': 'BTCUSD',
      'ethusd': 'ETHUSD',
    }
    
    const marketPair = detectedPair ? pairMap[detectedPair.toLowerCase()] : 'EURUSD'
    const analysis = performMarketAnalysis(marketPair)

    // Имитация "мышления" AI
    setTimeout(() => {
      let botResponse = null

      // Генерируем ответ с анализом
      const textResponse = generateVoiceResponse(query, analysis)
      
      // Создаём rich message с паттернами
      const analysisMessage = {
        type: 'bot',
        text: textResponse,
        timestamp: new Date(),
        isAnalysis: true,
        analysis: analysis,
      }

      setMessages(prev => [...prev, analysisMessage])
      setIsTyping(false)

      // Озвучиваем ответ
      if (voiceAIRef.current) {
        voiceAIRef.current.speak(textResponse)
      }
    }, 1500 + Math.random() * 1000)
  }

  // Отправка текстового сообщения
  const sendMessage = () => {
    if (!input.trim()) return
    processUserQuery(input.trim())
  }

  // Переключение голосового ввода
  const toggleVoiceInput = () => {
    if (isListening) {
      voiceAIRef.current?.stopListening()
    } else {
      voiceAIRef.current?.startListening()
    }
  }

  // Получение быстрого анализа
  const getQuickAnalysis = (pair) => {
    setIsTyping(true)
    processUserQuery(`Анализирую ${pair}...`)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Рендер rich message с анализом
  const renderAnalysisCard = (msg) => {
    if (!msg.analysis) return null
    
    const { phase, patterns, indicators, signal } = msg.analysis
    const phaseLabels = {
      'trend_bull': '📈 Бычий тренд',
      'trend_bear': '📉 Медвежий тренд',
      'flat': '🌊 Спокойный флэт',
      'volatile': '⚡ Высокая волатильность',
      'transition': '🔄 Переходная фаза',
    }

    return (
      <div className="analysis-card">
        {/* Фаза рынка */}
        <div className="analysis-phase">
          <div className="phase-badge">
            {phaseLabels[phase] || phase}
          </div>
          <div className="phase-indicators">
            {msg.analysis.phaseInfo?.primary?.map((ind, i) => (
              <span key={i} className="indicator-tag">
                {ind.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Паттерны */}
        {patterns.length > 0 && (
          <div className="analysis-patterns">
            <h4>🔍 Распознанные паттерны</h4>
            {patterns.map((pattern, i) => (
              <div key={i} className="pattern-item">
                <div className="pattern-header">
                  <span className="pattern-emoji">{pattern.emoji}</span>
                  <span className="pattern-name">{pattern.name}</span>
                  <span className="pattern-confidence">{pattern.confidence}%</span>
                </div>
                <p className="pattern-desc">{pattern.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Индикаторы */}
        <div className="analysis-indicators">
          <h4>📊 Ключевые индикаторы</h4>
          <div className="indicators-grid">
            <div className="indicator-item">
              <span className="indicator-label">RSI</span>
              <span className={`indicator-value ${indicators.rsi > 70 ? 'overbought' : indicators.rsi < 30 ? 'oversold' : ''}`}>
                {indicators.rsi}
              </span>
            </div>
            <div className="indicator-item">
              <span className="indicator-label">MACD</span>
              <span className={`indicator-value ${indicators.macd > 0 ? 'positive' : 'negative'}`}>
                {indicators.macd.toFixed(5)}
              </span>
            </div>
            <div className="indicator-item">
              <span className="indicator-label">Тренд</span>
              <span className="indicator-value">{indicators.trend.toFixed(5)}</span>
            </div>
          </div>
        </div>

        {/* Сигнал */}
        <div className={`analysis-signal signal-${signal.type.toLowerCase()}`}>
          <div className="signal-header">
            <span className="signal-icon">
              {signal.type === 'BUY' ? '📈' : signal.type === 'SELL' ? '📉' : '⏸️'}
            </span>
            <span className="signal-type">
              {signal.type === 'BUY' ? 'ПОКУПКА' : signal.type === 'SELL' ? 'ПРОДАЖА' : 'ПОДОЖДИ'}
            </span>
            <span className="signal-strength">{signal.strength}%</span>
          </div>
          <div className="signal-price">Цена: {signal.currentPrice}</div>
        </div>

        {/* Цели TP */}
        <div className="analysis-targets">
          <h4>🎯 Уровни тейк-профит</h4>
          {signal.targets.map((target, i) => (
            <div key={i} className="target-item">
              <div className="target-level">
                <span className="target-label">{target.label}</span>
                <span className="target-value">{target.level}</span>
              </div>
              <div className="target-probability">
                <div className="probability-bar">
                  <div 
                    className="probability-fill" 
                    style={{ width: `${target.probability}%` }}
                  ></div>
                </div>
                <span className="probability-text">{target.probability}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container chat-container animate-fadeIn">
      {/* Заголовок */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar">🌺</div>
          <div>
            <h3>AI Ассистент</h3>
            <p className="chat-status">
              <span className="status-dot"></span>
              {isTyping ? 'Думает...' : 'Онлайн'}
            </p>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="chat-messages scrollbar-hide">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.type} ${msg.isAnalysis ? 'with-analysis' : ''}`}>
            <div className="message-text">{msg.text}</div>
            <div className="message-time">
              {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </div>
            
            {/* Rich analysis card */}
            {msg.isAnalysis && renderAnalysisCard(msg)}
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
            onClick={() => getQuickAnalysis('EURUSD')}
          >
            📊 Что по евро?
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => getQuickAnalysis('BTCUSD')}
          >
            ₿ Биткоин
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => getQuickAnalysis('GBPUSD')}
          >
            🇬🇧 Фунт
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => { setInput('Как контролировать эмоции?'); }}
          >
            🧘 Психология
          </button>
        </div>
      )}

      {/* Ввод */}
      <div className="chat-input-container">
        <button 
          className={`voice-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleVoiceInput}
          title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
        >
          {isListening ? '🔴' : '🎙️'}
        </button>
        
        <input
          type="text"
          className="chat-input"
          placeholder={isListening ? 'Слушаю...' : 'Спроси меня о трейдинге...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isListening}
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
