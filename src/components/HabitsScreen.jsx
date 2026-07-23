import { useState, useEffect } from 'react'
import './HabitsScreen.css'
import { calculateMarketConfidence, getCurrentPrice } from '../services/AIEngine'
import { getTimeUntilMarketOpen } from '../services/MarketAvailability'
import DailyScenarios from './DailyScenarios'

/**
 * HabitsScreen — привычки трейдера + сценарии + статус рынка
 * Всё, что было на главном экране
 */
function HabitsScreen({ priceHistory, currentPrice }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [marketConfidence, setMarketConfidence] = useState(null)
  const [isLoadingConfidence, setIsLoadingConfidence] = useState(false)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isOpen: true })

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Обратный отсчёт
  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getTimeUntilMarketOpen())
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  // Уверенность рынка
  useEffect(() => {
    const loadConfidence = async () => {
      setIsLoadingConfidence(true)
      try {
        const [historicalData, currentPrice] = await Promise.all([
          (await import('../services/AIEngine')).getHistoricalData(30),
          getCurrentPrice()
        ])
        
        if (historicalData && historicalData.length >= 20) {
          const prices = historicalData.map(d => d.price)
          const confidence = calculateMarketConfidence(prices)
          setMarketConfidence(confidence)
        }
      } catch (error) {
        console.error('Ошибка загрузки уверенности:', error)
      } finally {
        setIsLoadingConfidence(false)
      }
    }
    
    loadConfidence()
    const interval = setInterval(loadConfidence, 120000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatCountdownDisplay = () => {
    if (countdown.isOpen && !countdown.isClosingSoon) return 'Рынок открыт'
    
    const hh = String(countdown.hours).padStart(2, '0')
    const mm = String(countdown.minutes).padStart(2, '0')
    const ss = String(countdown.seconds).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  return (
    <div className="habits-screen">
      <div className="habits-screen-header">
        <h2>📊 Торговый рынок</h2>
        <p>Статус и сценарии на день</p>
      </div>

      {/* Статус рынка */}
      <div className={`market-status-card ${countdown.isOpen ? (countdown.isClosingSoon ? 'closing' : 'open') : 'closed'}`}>
        <div className="market-status-header">
          <div className="market-status-icon">
            {countdown.isOpen ? (countdown.isClosingSoon ? '🟡' : '🟢') : '🔴'}
          </div>
          <div className="market-status-info">
            <h3>EUR/USD</h3>
            <p className="market-status-message">
              {countdown.isOpen 
                ? (countdown.isClosingSoon ? 'Скоро закроется' : 'Рынок открыт') 
                : 'Рынок закрыт'}
            </p>
          </div>
        </div>

        <button className={`market-status-btn ${countdown.isOpen ? (countdown.isClosingSoon ? 'closing' : 'open') : 'waiting'}`}>
          <span className="countdown-timer">{formatCountdownDisplay()}</span>
          {!countdown.isOpen && (
            <span className="countdown-label">до открытия</span>
          )}
          {countdown.isClosingSoon && (
            <span className="countdown-label">до закрытия</span>
          )}
        </button>

        <div className="market-status-time">
          Обновлено: {formatTime(currentTime)}
        </div>
      </div>

      {/* Сценарии на день */}
      <DailyScenarios 
        priceHistory={priceHistory} 
        currentPrice={currentPrice} 
      />

      {/* Концепция «Турбо-Миллион» */}
      <div className="turbo-card">
        <div className="turbo-header">
          <div className="turbo-badge">ТУРБО-МИЛЛИОН</div>
          <h3>Система для сверхбыстрого роста</h3>
          <p className="turbo-subtitle">
            «Супер-сигналы» — только 99%+ точности
          </p>
        </div>

        <div className="turbo-highlight">
          <div className="turbo-highlight-value">1–2</div>
          <div className="turbo-highlight-label">
            сигнала в день
            <span>но с максимальной точностью</span>
          </div>
        </div>

        <p className="turbo-lead">
          Мы не даём сотни сигналов. Мы даём точечные входы, используя
          комбинацию технологий:
        </p>

        <div className="turbo-features">
          <div className="turbo-feature">
            <div className="turbo-feature-icon" style={{ background: 'rgba(64, 145, 108, 0.2)' }}>
              🧠
            </div>
            <div className="turbo-feature-info">
              <div className="turbo-feature-name">Нейросеть</div>
              <div className="turbo-feature-desc">
                Обучена на 5 годах тиковых данных EUR/USD
              </div>
            </div>
          </div>

          <div className="turbo-feature">
            <div className="turbo-feature-icon" style={{ background: 'rgba(33, 158, 188, 0.2)' }}>
              📰
            </div>
            <div className="turbo-feature-info">
              <div className="turbo-feature-name">Анализ настроений</div>
              <div className="turbo-feature-desc">
                На основе потоков новостей в реальном времени
              </div>
            </div>
          </div>

          <div className="turbo-feature">
            <div className="turbo-feature-icon" style={{ background: 'rgba(212, 163, 115, 0.2)' }}>
              💧
            </div>
            <div className="turbo-feature-info">
              <div className="turbo-feature-name">Кластеры ликвидности</div>
              <div className="turbo-feature-desc">
                Куда ставят стопы крупные игроки
              </div>
            </div>
          </div>

          <div className="turbo-feature">
            <div className="turbo-feature-icon" style={{ background: 'rgba(129, 140, 248, 0.2)' }}>
              📈
            </div>
            <div className="turbo-feature-info">
              <div className="turbo-feature-name">Экстремальный RSI + Divergence</div>
              <div className="turbo-feature-desc">
                Разворотные зоны на пределе перекупленности/перепроданности
              </div>
            </div>
          </div>

          <div className="turbo-feature">
            <div className="turbo-feature-icon" style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
              🔇
            </div>
            <div className="turbo-feature-info">
              <div className="turbo-feature-name">Фильтр «Тишина»</div>
              <div className="turbo-feature-desc">
                Вход только когда рынок «просыпается» после консолидации
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HabitsScreen
