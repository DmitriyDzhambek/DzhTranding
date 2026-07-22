import { useState, useEffect, useRef } from 'react'
import './BottleMessage.css'

/**
 * BottleMessage — бутылка с посланием
 * Пользователь оставляет сообщение себе через месяц
 * Поддержка текста и голосовых сообщений
 * Возможность ставить цель, редактировать и удалять
 */
function BottleMessage() {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [goal, setGoal] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [playingId, setPlayingId] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Загрузка сообщений из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bottleMessages')
    if (saved) {
      setMessages(JSON.parse(saved))
    }
  }, [])

  // Сохранение в localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('bottleMessages', JSON.stringify(messages))
    }
  }, [messages])

  // Сохранить сообщение
  const saveMessage = () => {
    if (!text.trim() && !audioBlob) return
    
    const now = new Date()
    const openDate = new Date(now)
    openDate.setMonth(openDate.getMonth() + 1)
    
    const newMessage = {
      id: Date.now(),
      text: text.trim(),
      goal: goal.trim(),
      audio: audioBlob ? URL.createObjectURL(audioBlob) : null,
      createdAt: now.toISOString(),
      openAt: openDate.toISOString(),
      opened: false
    }
    
    setMessages(prev => [newMessage, ...prev])
    setText('')
    setGoal('')
    setAudioBlob(null)
  }

  // Редактировать сообщение
  const editMessage = (id) => {
    const msg = messages.find(m => m.id === id)
    if (msg) {
      setText(msg.text)
      setGoal(msg.goal || '')
      setEditingId(id)
    }
  }

  // Сохранить редактирование
  const saveEdit = () => {
    if (!text.trim()) return
    
    setMessages(prev => prev.map(msg => 
      msg.id === editingId 
        ? { ...msg, text: text.trim(), goal: goal.trim() }
        : msg
    ))
    setText('')
    setGoal('')
    setEditingId(null)
  }

  // Удалить сообщение
  const deleteMessage = (id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
    if (editingId === id) {
      setText('')
      setGoal('')
      setEditingId(null)
    }
  }

  // Открыть бутылку (если пришло время)
  const openBottle = (id) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, opened: true } : msg
    ))
  }

  // Запись голоса
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Ошибка записи:', err)
      alert('Не удалось получить доступ к микрофону')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Воспроизвести аудио
  const playAudio = (id, audioUrl) => {
    if (playingId === id) {
      setPlayingId(null)
      return
    }
    
    const audio = new Audio(audioUrl)
    setPlayingId(id)
    audio.play()
    audio.onended = () => setPlayingId(null)
  }

  // Проверить, какие бутылки пора открыть
  const checkOpenedBottles = () => {
    const now = new Date()
    const needsUpdate = messages.some(msg => !msg.opened && new Date(msg.openAt) <= now)
    
    if (needsUpdate) {
      setMessages(prev => prev.map(msg =>
        !msg.opened && new Date(msg.openAt) <= now
          ? { ...msg, opened: true }
          : msg
      ))
    }
  }

  useEffect(() => {
    checkOpenedBottles()
  }, [messages])

  // Форматирование даты
  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Сколько дней осталось
  const daysUntilOpen = (openAt) => {
    const now = new Date()
    const open = new Date(openAt)
    const diff = Math.ceil((open - now) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  return (
    <div className="bottle-message-card">
      <div className="bottle-header">
        <span className="bottle-icon">🍾</span>
        <h3>Бутылка с посланием</h3>
      </div>

      {/* Форма создания/редактирования */}
      <div className="bottle-form">
        <input
          type="text"
          className="bottle-input"
          placeholder="🎯 Ваша цель..."
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          maxLength={100}
        />
        
        <textarea
          className="bottle-input"
          placeholder="✉️ Напишите сообщение себе через месяц..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
        />

        {/* Кнопки записи голоса */}
        <div className="bottle-actions">
          <button
            className={`bottle-btn bottle-btn-voice ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? '⏹️ Остановить запись' : '🎤 Записать голос'}
          </button>

          {audioBlob && (
            <span style={{ color: '#34d399', fontSize: '13px' }}>
              ✅ Голос записан
            </span>
          )}
        </div>

        {/* Кнопки сохранения */}
        <div className="bottle-actions">
          {editingId ? (
            <>
              <button className="bottle-btn bottle-btn-primary" onClick={saveEdit}>
                💾 Сохранить изменения
              </button>
              <button className="bottle-btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => {
                setText('')
                setGoal('')
                setEditingId(null)
              }}>
                ❌ Отмена
              </button>
            </>
          ) : (
            <button className="bottle-btn bottle-btn-primary" onClick={saveMessage}>
              🍾 Отправить в бутылку
            </button>
          )}
        </div>
      </div>

      {/* Список сообщений */}
      {messages.length > 0 ? (
        <div className="bottle-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`bottle-message-item ${msg.opened ? 'opened' : ''}`}>
              <div className="bottle-message-top">
                <span className="bottle-message-date">
                  📅 {formatDate(msg.createdAt)} в {formatTime(msg.createdAt)}
                </span>
                <span className="bottle-message-status">
                  {msg.opened ? '✅ Открыта' : `⏳ Через ${daysUntilOpen(msg.openAt)} дн.`}
                </span>
              </div>

              {msg.goal && (
                <div className="bottle-message-goal">🎯 {msg.goal}</div>
              )}

              {msg.text && (
                <div className="bottle-message-content">{msg.text}</div>
              )}

              {msg.audio && (
                <div className="bottle-message-voice">
                  <span className="voice-icon">🎵</span>
                  <button
                    className="voice-play-btn"
                    onClick={() => playAudio(msg.id, msg.audio)}
                  >
                    {playingId === msg.id ? '⏸️ Пауза' : '▶️ Прослушать'}
                  </button>
                </div>
              )}

              {!msg.opened && (
                <button
                  className="bottle-btn bottle-btn-primary"
                  style={{ marginTop: '8px', width: '100%' }}
                  onClick={() => openBottle(msg.id)}
                >
                  🍾 Открыть бутылку
                </button>
              )}

              <div className="bottle-message-actions">
                <button className="bottle-btn bottle-btn-edit" onClick={() => editMessage(msg.id)}>
                  ✏️ Редактировать
                </button>
                <button className="bottle-btn bottle-btn-delete" onClick={() => deleteMessage(msg.id)}>
                  🗑️ Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bottle-empty">
          <div className="bottle-empty-icon">🍾</div>
          <p>Пока нет посланий. Напишите что-нибудь себе в будущее!</p>
        </div>
      )}
    </div>
  )
}

export default BottleMessage
