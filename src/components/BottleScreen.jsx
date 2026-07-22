import { useState, useEffect } from 'react'
import './BottleScreen.css'

/**
 * BottleScreen — бутылка с посланием себе в будущее
 * Текстовые сообщения с целью на месяц вперёд
 */
function BottleScreen() {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [goal, setGoal] = useState('')
  const [editingId, setEditingId] = useState(null)

  // Загрузка из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bottleMessages')
    if (saved) {
      const parsed = JSON.parse(saved)
      setMessages(parsed)
      // Проверяем, какие бутылки пора открыть
      const now = new Date()
      const updated = parsed.map(msg => {
        if (!msg.opened && new Date(msg.openAt) <= now) {
          return { ...msg, opened: true }
        }
        return msg
      })
      if (updated !== parsed) {
        setMessages(updated)
        localStorage.setItem('bottleMessages', JSON.stringify(updated))
      }
    }
  }, [])

  // Сохранение
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('bottleMessages', JSON.stringify(messages))
    }
  }, [messages])

  // Сохранить сообщение
  const saveMessage = () => {
    if (!text.trim()) return
    
    const now = new Date()
    const openDate = new Date(now)
    openDate.setMonth(openDate.getMonth() + 1)
    
    if (editingId) {
      // Редактирование
      setMessages(prev => prev.map(msg =>
        msg.id === editingId
          ? { ...msg, text: text.trim(), goal: goal.trim() }
          : msg
      ))
      setEditingId(null)
    } else {
      // Новое сообщение
      const newMessage = {
        id: Date.now(),
        text: text.trim(),
        goal: goal.trim(),
        createdAt: now.toISOString(),
        openAt: openDate.toISOString(),
        opened: false
      }
      setMessages(prev => [newMessage, ...prev])
    }
    
    setText('')
    setGoal('')
  }

  // Редактировать
  const editMessage = (id) => {
    const msg = messages.find(m => m.id === id)
    if (msg) {
      setText(msg.text)
      setGoal(msg.goal || '')
      setEditingId(id)
    }
  }

  // Удалить
  const deleteMessage = (id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
    if (editingId === id) {
      setText('')
      setGoal('')
      setEditingId(null)
    }
  }

  // Отмена редактирования
  const cancelEdit = () => {
    setText('')
    setGoal('')
    setEditingId(null)
  }

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

  // Дней до открытия
  const daysUntilOpen = (openAt) => {
    const now = new Date()
    const open = new Date(openAt)
    const diff = Math.ceil((open - now) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  return (
    <div className="bottle-screen">
      <div className="bottle-screen-header">
        <h2>🍾 Бутылка с посланием</h2>
        <p>Напишите себе сообщение через месяц</p>
      </div>

      {/* Форма */}
      <div className="bottle-card">
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
            className="bottle-input bottle-textarea"
            placeholder="✉️ Напишите сообщение себе в будущее..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            {editingId ? (
              <>
                <button className="bottle-btn bottle-btn-primary" onClick={saveMessage}>
                  💾 Сохранить
                </button>
                <button className="bottle-btn bottle-btn-cancel" onClick={cancelEdit}>
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
                <span className={`bottle-message-status ${msg.opened ? 'opened' : 'pending'}`}>
                  {msg.opened ? '✅ Открыта' : `⏳ Через ${daysUntilOpen(msg.openAt)} дн.`}
                </span>
              </div>

              {msg.goal && (
                <div className="bottle-message-goal">🎯 {msg.goal}</div>
              )}

              {msg.text && (
                <div className="bottle-message-content">{msg.text}</div>
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

export default BottleScreen
