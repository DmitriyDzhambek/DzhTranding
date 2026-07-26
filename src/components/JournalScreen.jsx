import { useState, useEffect } from 'react'
import './JournalScreen.css'

function JournalScreen() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('traderJournal')
    return saved ? JSON.parse(saved) : []
  })
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    date: new Date().toLocaleString('ru-RU'),
    time: new Date().toLocaleTimeString('ru-RU'),
    trades: '',
    wins: '',
    losses: '',
    profit: '',
    loss: '',
    notes: ''
  })

  // Сохранение в localStorage
  useEffect(() => {
    localStorage.setItem('traderJournal', JSON.stringify(entries))
  }, [entries])

  // Обработка изменения полей
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Создание новой записи
  const handleAdd = () => {
    if (!formData.trades || !formData.profit) return
    
    const newEntry = {
      id: Date.now(),
      ...formData,
      createdAt: new Date().toISOString()
    }
    
    setEntries([newEntry, ...entries])
    resetForm()
  }

  // Редактирование записи
  const handleEdit = (entry) => {
    setEditingId(entry.id)
    setFormData({
      date: entry.date,
      time: entry.time,
      trades: entry.trades,
      wins: entry.wins,
      losses: entry.losses,
      profit: entry.profit,
      loss: entry.loss,
      notes: entry.notes || ''
    })
  }

  // Сохранение редактирования
  const handleSaveEdit = () => {
    if (!editingId) return
    
    const updated = entries.map(entry => 
      entry.id === editingId ? { ...entry, ...formData } : entry
    )
    
    setEntries(updated)
    resetForm()
  }

  // Удаление записи
  const handleDelete = (id) => {
    if (window.confirm('Удалить эту запись?')) {
      setEntries(entries.filter(e => e.id !== id))
      if (editingId === id) resetForm()
    }
  }

  // Сброс формы
  const resetForm = () => {
    setFormData({
      date: new Date().toLocaleString('ru-RU'),
      time: new Date().toLocaleTimeString('ru-RU'),
      trades: '',
      wins: '',
      losses: '',
      profit: '',
      loss: '',
      notes: ''
    })
    setEditingId(null)
  }

  // Статистика
  const totalTrades = entries.reduce((sum, e) => sum + parseInt(e.trades || 0), 0)
  const totalWins = entries.reduce((sum, e) => sum + parseInt(e.wins || 0), 0)
  const totalProfit = entries.reduce((sum, e) => sum + parseFloat(e.profit || 0), 0)
  const totalLoss = entries.reduce((sum, e) => sum + parseFloat(e.loss || 0), 0)
  const netProfit = totalProfit - totalLoss

  return (
    <div className="journal-screen">
      <header className="journal-header">
        <h1>📖 Дневник Трейдера</h1>
        <p>Записывай каждую сделку — расти с каждой ошибкой</p>
      </header>

      {/* Статистика */}
      <section className="journal-stats">
        <div className="stat-card">
          <div className="stat-value">{totalTrades}</div>
          <div className="stat-label">Всего сделок</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#34d399' }}>{totalWins}</div>
          <div className="stat-label">Плюс</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f87171' }}>{totalLoss}</div>
          <div className="stat-label">Минус</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: netProfit >= 0 ? '#34d399' : '#f87171' }}>
            ${Math.abs(netProfit).toFixed(2)}
          </div>
          <div className="stat-label">{netProfit >= 0 ? 'Профит' : 'Убыток'}</div>
        </div>
      </section>

      {/* Форма записи */}
      <section className="journal-form">
        <h2>{editingId ? '✏️ Редактирование' : '📝 Новая запись'}</h2>
        
        <div className="form-row">
          <div className="form-group">
            <label>📅 Дата</label>
            <input
              type="text"
              name="date"
              value={formData.date}
              onChange={handleChange}
              placeholder="26.07.2025"
            />
          </div>
          <div className="form-group">
            <label>🕐 Время</label>
            <input
              type="text"
              name="time"
              value={formData.time}
              onChange={handleChange}
              placeholder="14:30"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>📊 Сделок всего</label>
            <input
              type="number"
              name="trades"
              value={formData.trades}
              onChange={handleChange}
              placeholder="5"
            />
          </div>
          <div className="form-group">
            <label>✅ Плюс</label>
            <input
              type="number"
              name="wins"
              value={formData.wins}
              onChange={handleChange}
              placeholder="3"
            />
          </div>
          <div className="form-group">
            <label>❌ Минус</label>
            <input
              type="number"
              name="losses"
              value={formData.losses}
              onChange={handleChange}
              placeholder="2"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>💰 Профит ($)</label>
            <input
              type="number"
              name="profit"
              value={formData.profit}
              onChange={handleChange}
              placeholder="150"
            />
          </div>
          <div className="form-group">
            <label>📉 Убыток ($)</label>
            <input
              type="number"
              name="loss"
              value={formData.loss}
              onChange={handleChange}
              placeholder="50"
            />
          </div>
        </div>

        <div className="form-group">
          <label>💭 Заметки</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Что сработало хорошо? Что можно улучшить?"
            rows="3"
          />
        </div>

        <div className="form-actions">
          {editingId ? (
            <>
              <button className="btn-save" onClick={handleSaveEdit}>
                💾 Сохранить
              </button>
              <button className="btn-cancel" onClick={resetForm}>
                ❌ Отмена
              </button>
            </>
          ) : (
            <button className="btn-add" onClick={handleAdd}>
              ➕ Добавить запись
            </button>
          )}
        </div>
      </section>

      {/* Список записей */}
      <section className="journal-entries">
        <h2>📚 История записей</h2>
        
        {entries.length === 0 ? (
          <div className="empty-state">
            <p>Пока нет записей. Добавьте первую сделку!</p>
          </div>
        ) : (
          <div className="entries-list">
            {entries.map(entry => (
              <div key={entry.id} className="entry-card">
                <div className="entry-header">
                  <div className="entry-datetime">
                    <span className="date">{entry.date}</span>
                    <span className="time">{entry.time}</span>
                  </div>
                  <div className="entry-actions">
                    <button className="btn-edit" onClick={() => handleEdit(entry)}>
                      ✏️
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(entry.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="entry-stats">
                  <div className="stat">
                    <span className="stat-num">{entry.trades}</span>
                    <span className="stat-text">сделок</span>
                  </div>
                  <div className="stat win">
                    <span className="stat-num">{entry.wins}</span>
                    <span className="stat-text">плюс</span>
                  </div>
                  <div className="stat loss">
                    <span className="stat-num">{entry.losses}</span>
                    <span className="stat-text">минус</span>
                  </div>
                  <div className="stat profit">
                    <span className="stat-num">+${entry.profit}</span>
                  </div>
                  <div className="stat loss">
                    <span className="stat-num">-${entry.loss}</span>
                  </div>
                </div>
                
                {entry.notes && (
                  <div className="entry-notes">
                    <strong>💭 Заметки:</strong>
                    <p>{entry.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default JournalScreen
