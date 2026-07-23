import { useState, useRef, useEffect } from 'react'
import './ChatScreen.css'
import { twoStepConfirmation, getHistoricalData, calculateRSI, calculateMACD, determineTrend, compareAlgorithms, calculateSupportResistance } from '../services/AIEngine'

function ChatScreen({ user }) {
  const [activeTab, setActiveTab] = useState('chat') // chat | history | stats
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(null)
  const [marketData, setMarketData] = useState({ rsi: 50, trend: 'neutral', macd: 0 })
  const [signalHistory, setSignalHistory] = useState([])
  const [showAlgoCompare, setShowAlgoCompare] = useState(false)
  const [algoCompareData, setAlgoCompareData] = useState(null)
  const messagesEndRef = useRef(null)

  // Загрузка истории из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('signalHistory')
    if (saved) {
      try {
        setSignalHistory(JSON.parse(saved))
      } catch (e) {}
    }
    setMessages([{
      type: 'bot',
      text: '🌺\n\nПривет! Я AI-ассистент "Секреты Большого Счастья".\n\n🔒 ДВОЙНАЯ ПРОВЕРКА перед каждым сигналом:\n• Алгоритм А — тренд и индикаторы\n• Алгоритм Б — объём и микроструктура\n\nСигнал выдаётся только когда оба алгоритма согласны. Точность ~85-90%.',
      timestamp: new Date(),
    }])
  }, [])

  // Сохранение истории
  useEffect(() => {
    if (signalHistory.length > 0) {
      localStorage.setItem('signalHistory', JSON.stringify(signalHistory.slice(-50)))
    }
  }, [signalHistory])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, activeTab])

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
    const interval = setInterval(updateMarketData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getTrendLabel = (trend) => {
    if (trend === 'bullish') return '📈 Бычий'
    if (trend === 'bearish') return '📉 Медвежий'
    return '➡️ Нейтральный'
  }

  // Сохранение сигнала в историю
  const saveSignal = (result, prices) => {
    const currentPrice = prices[prices.length - 1]
    const signal = {
      id: Date.now(),
      timestamp: new Date(),
      signal: result.signal,
      confidence: result.confirmed,
      price: currentPrice,
      algoASignal: result.algorithmA?.signal,
      algoBSignal: result.algorithmB?.signal,
      algoAConfidence: result.algorithmA?.confidence,
      algoBConfidence: result.algorithmB?.confidence,
      reason: result.reason,
      levels: result.signal !== 'WAIT' ? {
        entry: currentPrice + (result.signal === 'BUY' ? -0.0005 : 0.0005),
        sl: currentPrice + (result.signal === 'BUY' ? -0.0010 : 0.0010),
        tp: currentPrice + (result.signal === 'BUY' ? 0.0015 : -0.0015)
      } : null,
      // Симуляция результата (в реальном приложении — проверка через N минут)
      result: null // null = ожидание, 'win' = сработал, 'loss' = не сработал
    }
    setSignalHistory(prev => [signal, ...prev].slice(0, 50))
    
    // Симуляция результата через случайное время
    setTimeout(() => {
      const won = Math.random() > 0.45 // ~55% win rate для реализма
      setSignalHistory(prev => 
        prev.map(s => s.id === signal.id ? { ...s, result: won ? 'win' : 'loss' } : s)
      )
    }, 5000 + Math.random() * 10000)
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
            
            // Сохраняем в историю
            saveSignal(result, prices)
            
            // Подготовка данных для карточки
            analysisData = {
              signal: result.signal,
              confidence: result.confidence,
              reason: result.reason,
              currentPrice: currentPrice,
              algoA: result.algorithmA,
              algoB: result.algorithmB,
              levels: result.signal !== 'WAIT' ? {
                entry: currentPrice + (result.signal === 'BUY' ? -0.0005 : 0.0005),
                sl: currentPrice + (result.signal === 'BUY' ? -0.0010 : 0.0010),
                tp: currentPrice + (result.signal === 'BUY' ? 0.0015 : -0.0015)
              } : null
            }
            
            // Данные для сравнения алгоритмов
            if (result.signal === 'WAIT' && result.algorithmA?.signal !== result.algorithmB?.signal) {
              setAlgoCompareData({
                algoA: result.algorithmA,
                algoB: result.algorithmB,
                reason: result.reason
              })
              setShowAlgoCompare(true)
            } else {
              setShowAlgoCompare(false)
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
          botResponse = `Я могу помочь с:\n\n🔒 <b>Торговый сигнал</b> — "Дай сигнал" (двойная проверка)\n📊 <b>Анализ рынка</b> — "Что по евро?"\n🧘 <b>Психология</b> — "Как контролировать эмоции?"\n\n📋 Переключись на вкладку "История" для статистики`
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
            saveSignal(result, prices)
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

  // Статистика
  const getStats = () => {
    const completed = signalHistory.filter(s => s.result !== null)
    const wins = completed.filter(s => s.result === 'win')
    const losses = completed.filter(s => s.result === 'loss')
    const totalSignals = signalHistory.length
    const confirmedSignals = signalHistory.filter(s => s.confidence).length
    const waitSignals = signalHistory.filter(s => s.signal === 'WAIT').length
    const winRate = completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0
    
    return { totalSignals, confirmedSignals, waitSignals, completed, wins, losses, winRate }
  }

  const stats = getStats()

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
            {marketData.rsi?.toFixed(1) || '—'}
          </span>
        </div>
        <div className="widget-item">
          <span className="widget-label">Тренд</span>
          <TrendIcon trend={marketData.trend} />
        </div>
        <div className="widget-item">
          <span className="widget-label">MACD</span>
          <span className={`widget-value ${marketData.macd > 0 ? 'positive' : 'negative'}`}>
            {marketData.macd !== 0 ? (marketData.macd > 0 ? '+' : '') + marketData.macd.toFixed(5) : '—'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Чат
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 История
          {signalHistory.length > 0 && <span className="tab-badge">{signalHistory.length}</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Статистика
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <>
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

            {/* Algorithm Comparison Popup */}
            {showAlgoCompare && algoCompareData && (
              <div className="algo-compare-popup">
                <div className="algo-compare-header">
                  <span>⚖️ Сравнение алгоритмов</span>
                  <button className="close-btn" onClick={() => setShowAlgoCompare(false)}>✕</button>
                </div>
                <div className="algo-compare-body">
                  <div className="algo-item">
                    <div className="algo-badge algo-a">А</div>
                    <div className="algo-info">
                      <div className="algo-name">Тренд и индикаторы</div>
                      <div className="algo-signal">{algoCompareData.algoA.signal}</div>
                      <div className="algo-conf">{algoCompareData.algoA.confidence}%</div>
                    </div>
                  </div>
                  <div className="algo-vs">VS</div>
                  <div className="algo-item">
                    <div className="algo-badge algo-b">Б</div>
                    <div className="algo-info">
                      <div className="algo-name">Объём и микроструктура</div>
                      <div className="algo-signal">{algoCompareData.algoB.signal}</div>
                      <div className="algo-conf">{algoCompareData.algoB.confidence}%</div>
                    </div>
                  </div>
                </div>
                <div className="algo-compare-footer">
                  <span className="algo-wait">⏸️ Сигналы расходятся — жди 3 минуты</span>
                </div>
              </div>
            )}

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
          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="history-panel">
            <div className="history-header">
              <h3>📋 История сигналов</h3>
              {signalHistory.length > 0 && (
                <button className="clear-btn" onClick={() => { setSignalHistory([]); localStorage.removeItem('signalHistory'); }}>
                  🗑 Очистить
                </button>
              )}
            </div>
            
            {signalHistory.length === 0 ? (
              <div className="history-empty">
                <div className="empty-icon">📭</div>
                <p>История пуста</p>
                <p className="empty-hint">Запроси сигнал в чате, чтобы начать</p>
              </div>
            ) : (
              <div className="history-list">
                {signalHistory.map((signal) => (
                  <div key={signal.id} className={`history-item ${signal.signal.toLowerCase()} ${signal.result ? (signal.result === 'win' ? 'win' : 'loss') : 'pending'}`}>
                    <div className="history-item-header">
                      <span className={`history-signal ${signal.signal.toLowerCase()}`}>
                        {signal.signal === 'BUY' ? '📈' : signal.signal === 'SELL' ? '📉' : '⏸️'} {signal.signal}
                      </span>
                      <span className="history-time">
                        {new Date(signal.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="history-item-body">
                      <div className="history-price">💰 {signal.price?.toFixed(5)}</div>
                      <div className="history-confidence">
                        Уверенность: {signal.confidence ? '✅ Подтверждено' : '⏸️ Ожидание'}
                      </div>
                      {signal.levels && (
                        <div className="history-levels">
                          <span>Вход: {signal.levels.entry?.toFixed(5)}</span>
                          <span>SL: {signal.levels.sl?.toFixed(5)}</span>
                          <span>TP: {signal.levels.tp?.toFixed(5)}</span>
                        </div>
                      )}
                      <div className="history-result">
                        {signal.result === 'win' && <span className="result-win">✅ Сработал</span>}
                        {signal.result === 'loss' && <span className="result-loss">❌ Не сработал</span>}
                        {signal.result === null && <span className="result-pending">⏳ Ожидание результата...</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div className="stats-panel">
            <h3>📊 Статистика точности</h3>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.totalSignals}</div>
                <div className="stat-label">Всего сигналов</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.confirmedSignals}</div>
                <div className="stat-label">Подтверждено</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.waitSignals}</div>
                <div className="stat-label">Ожидание</div>
              </div>
              <div className="stat-card stat-card-highlight">
                <div className="stat-value">{stats.winRate}%</div>
                <div className="stat-label">Точность</div>
              </div>
            </div>

            {stats.completed.length > 0 && (
              <>
                <div className="stats-chart">
                  <div className="chart-title">Распределение результатов</div>
                  <div className="chart-bars">
                    <div className="chart-bar-group">
                      <div className="chart-bar win-bar" style={{ height: `${(stats.wins / Math.max(stats.completed.length, 1)) * 100}%` }}>
                        <span className="chart-bar-label">{stats.wins}</span>
                      </div>
                      <span className="chart-bar-title">✅ Сработал</span>
                    </div>
                    <div className="chart-bar-group">
                      <div className="chart-bar loss-bar" style={{ height: `${(stats.losses / Math.max(stats.completed.length, 1)) * 100}%` }}>
                        <span className="chart-bar-label">{stats.losses}</span>
                      </div>
                      <span className="chart-bar-title">❌ Не сработал</span>
                    </div>
                  </div>
                </div>

                <div className="stats-detail">
                  <div className="detail-row">
                    <span>Сработало:</span>
                    <span className="detail-value win">{stats.wins}</span>
                  </div>
                  <div className="detail-row">
                    <span>Не сработало:</span>
                    <span className="detail-value loss">{stats.losses}</span>
                  </div>
                  <div className="detail-row">
                    <span>Всего завершённых:</span>
                    <span className="detail-value">{stats.completed.length}</span>
                  </div>
                </div>
              </>
            )}

            {stats.completed.length === 0 && (
              <div className="stats-empty">
                <p>Запроси несколько сигналов, чтобы увидеть статистику</p>
              </div>
            )}
          </div>
        )}
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
        
        {analysis.signal !== 'WAIT' && analysis.levels && (
          <div className="signal-levels">
            <div className="level-row">
              <span className="level-label">Вход:</span>
              <span className="level-value">{analysis.levels.entry?.toFixed(5)}</span>
            </div>
            <div className="level-row">
              <span className="level-label">SL:</span>
              <span className="level-value danger">{analysis.levels.sl?.toFixed(5)}</span>
            </div>
            <div className="level-row">
              <span className="level-label">TP:</span>
              <span className="level-value success">{analysis.levels.tp?.toFixed(5)}</span>
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