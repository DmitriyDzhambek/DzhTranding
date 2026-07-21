import TelegramSDK from '@twa-dev/sdk'

/**
 * VoiceAI — голосовой AI ассистент
 * Распознавание речи + синтез речи + AI анализ
 */
class VoiceAI {
  constructor(options = {}) {
    this.onSpeechResult = options.onSpeechResult || (() => {})
    this.onStatusChange = options.onStatusChange || (() => {})
    
    this.recognition = null
    this.synthesis = window.speechSynthesis
    this.isListening = false
    this.isSpeaking = false
    this.language = options.language || 'ru-RU'
    
    this.initRecognition()
  }
  
  /**
   * Инициализация Web Speech API
   */
  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition не поддерживается в этом браузере')
      return
    }
    
    this.recognition = new SpeechRecognition()
    this.recognition.continuous = false
    this.recognition.interimResults = true
    this.recognition.lang = this.language
    
    this.recognition.onstart = () => {
      this.isListening = true
      this.onStatusChange('listening')
    }
    
    this.recognition.onresult = (event) => {
      let transcript = ''
      let isFinal = false
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
        if (event.results[i].isFinal) {
          isFinal = true
        }
      }
      
      if (transcript) {
        this.onSpeechResult(transcript, isFinal)
      }
      
      if (isFinal) {
        this.stopListening()
      }
    }
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      this.isListening = false
      this.onStatusChange('error', event.error)
    }
    
    this.recognition.onend = () => {
      this.isListening = false
      if (this.isListening) {
        // Если всё ещё должны слушать — перезапускаем
        try {
          this.recognition.start()
        } catch (e) {
          this.onStatusChange('stopped')
        }
      } else {
        this.onStatusChange('stopped')
      }
    }
  }
  
  /**
   * Начать слушать голос
   */
  startListening() {
    if (!this.recognition) {
      alert('Голосовой ввод не поддерживается в вашем браузере')
      return false
    }
    
    try {
      this.recognition.start()
      return true
    } catch (e) {
      console.error('Ошибка запуска распознавания:', e)
      return false
    }
  }
  
  /**
   * Остановить слушание
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }
  
  /**
   * Говорить текст (Text-to-Speech)
   */
  speak(text, options = {}) {
    if (!this.synthesis) {
      console.warn('Speech Synthesis не поддерживается')
      return
    }
    
    // Останавливаем текущую речь
    this.synthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = this.language
    utterance.rate = options.rate || 0.9 // Чуть медленнее для спокойствия
    utterance.pitch = options.pitch || 1
    utterance.volume = options.volume || 0.8
    
    // Пытаемся найти русский голос
    const voices = this.synthesis.getVoices()
    const russianVoice = voices.find(v => v.lang.startsWith('ru'))
    if (russianVoice) {
      utterance.voice = russianVoice
    }
    
    utterance.onstart = () => {
      this.isSpeaking = true
      this.onStatusChange('speaking')
    }
    
    utterance.onend = () => {
      this.isSpeaking = false
      this.onStatusChange('idle')
    }
    
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e)
      this.isSpeaking = false
      this.onStatusChange('error', e.error)
    }
    
    this.synthesis.speak(utterance)
  }
  
  /**
   * Остановить речь
   */
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel()
      this.isSpeaking = false
      this.onStatusChange('stopped')
    }
  }
  
  /**
   * Проверить поддержку голосовых технологий
   */
  static isSupported() {
    return !!(
      (window.SpeechRecognition || window.webkitSpeechRecognition) &&
      window.speechSynthesis
    )
  }
  
  /**
   * Получить список доступных голосов
   */
  static getAvailableVoices() {
    if (!window.speechSynthesis) return []
    return window.speechSynthesis.getVoices()
  }
  
  /**
   * Уничтожить инстанс
   */
  destroy() {
    this.stopListening()
    this.stopSpeaking()
    this.recognition = null
  }
}

/**
 * Анализ голосового запроса
 */
function analyzeVoiceQuery(query) {
  const lower = query.toLowerCase().trim()
  
  // Ключевые слова
  const keywords = {
    signal: ['сигнал', 'торг', 'куп', 'прод', 'buy', 'sell'],
    pattern: ['паттерн', 'паттернов', 'figure', 'figure'],
    pair: ['пара', 'парах', 'eur', 'gbp', 'btc', 'джпи'],
    strategy: ['страт', 'совет', 'прави', 'strategy'],
    psychology: ['психол', 'эмоц', 'страх', 'спокой', 'mind'],
    help: ['помог', 'что', 'как', 'why', 'help'],
  }
  
  // Определяем намерение
  let intent = 'unknown'
  let intentConfidence = 0
  
  for (const [key, words] of Object.entries(keywords)) {
    const matches = words.filter(w => lower.includes(w))
    if (matches.length > intentConfidence) {
      intent = key
      intentConfidence = matches.length
    }
  }
  
  // Извлекаем пару из запроса
  const pairs = {
    'eurusd': ['евро', 'евро/доллар', 'eur', 'евро'],
    'gbpusd': ['фунт', 'стерлинг', 'gbp', 'англич'],
    'usdjpy': ['иена', 'джейпи', 'jpy', 'япон'],
    'btcusd': ['биткоин', 'бит', 'btc', 'битка'],
    'ethusd': ['эфириум', 'эфи', 'eth'],
  }
  
  let detectedPair = null
  for (const [pair, words] of Object.entries(pairs)) {
    if (words.some(w => lower.includes(w))) {
      detectedPair = pair.toUpperCase()
      break
    }
  }
  
  return { intent, intentConfidence, detectedPair }
}

/**
 * Генерация ответа на голосовой запрос
 */
function generateVoiceResponse(query, aiAnalysis) {
  const { intent, detectedPair } = analyzeVoiceQuery(query)
  
  const responses = {
    signal: detectedPair
      ? `Сигнал по ${detectedPair}. ${aiAnalysis?.signal?.type === 'BUY' ? 'Рекомендую покупку' : aiAnalysis?.signal?.type === 'SELL' ? 'Рекомендую продажу' : 'Рынок в ожидании'}. Сила сигнала ${aiAnalysis?.signal?.strength || 50} процентов.`
      : `Какой вас интересует актив? Я могу дать сигнал по евро, фунту, йене, биткоину или эфириуму.`,
    
    pattern: aiAnalysis?.patterns?.length > 0
      ? `Я обнаружил ${aiAnalysis.patterns.length} паттернов. ${aiAnalysis.patterns[0].emoji} ${aiAnalysis.patterns[0].name}. ${aiAnalysis.patterns[0].description}`
      : `На текущем графике я не вижу ярких классических паттернов. Рынок в фазе ${aiAnalysis?.phase === 'trend_bull' ? 'восходящего тренда' : aiAnalysis?.phase === 'trend_bear' ? 'нисходящего тренда' : 'боковика'}.`,
    
    strategy: `Текущая фаза рынка: ${aiAnalysis?.phaseInfo?.description || 'определяется'}. Рекомендуемые индикаторы: ${aiAnalysis?.phaseInfo?.primary?.join(', ') || 'RSI, MACD'}.`,
    
    psychology: `Помни: трейдинг — это марафон, а не спринт. Дыши глубоко. Не гонись за потерянным. Каждый день — новый шанс. 🧘`,
    
    help: `Я могу помочь с: торговыми сигналами, распознаванием паттернов, стратегиями и психологией торговли. Просто спросите!`,
    
    default: `Спасибо за вопрос. Я анализирую рынок прямо сейчас. Рынок в фазе ${aiAnalysis?.phase === 'trend_bull' ? 'бычьего тренда' : aiAnalysis?.phase === 'trend_bear' ? 'медвежьего тренда' : 'спокойного флэта'}.`,
  }
  
  return responses[intent] || responses.default
}

export { VoiceAI, analyzeVoiceQuery, generateVoiceResponse }
