import { useState, useEffect, useRef } from 'react'
import { calculateRSI, calculateMACD, determineTrend, calculateMarketConfidence } from '../services/AIEngine'
import './HomeScreen.css'
import { useMarketData } from '../hooks/useMarketData'

function HomeScreen({ isWeekday, marketState, price, change, isUp, priceHistory: propPriceHistory, currentPrice: propCurrentPrice }) {
  const { eurUsd, moscowIndex, marketSignals, loading, lastUpdate, error, eurUsdChange } = useMarketData()
  
  // Получаем актуальные данные
  const currentPriceValue = eurUsd || propCurrentPrice || price || '1.08500'
  
  // Расчёт индикаторов (если есть данные)
  const rsi = marketSignals.rsi
  const macdValue = marketSignals.macd
  const trend = marketSignals.trend
  const confidence = marketSignals.confidence

  // --- ЛОГИКА ВОЛАТИЛЬНОСТИ ---
  function calculateATR(data, period = 14) {
    if (data.length < period + 1) return null
    const ranges = []
    for (let i = 1; i <= data.length; i++) {
      ranges.push(Math.abs(data[data.length - i] - data[data.length - i - 1]))
    }
    if (ranges.length < period) return null
    const atr = ranges.slice(0, period).reduce((a, b) => a + b, 0) / period
    return parseFloat(atr.toFixed(6))
  }

  // Получаем волатильность из marketSignals
  const volatilityLevel = marketSignals.volatility || 'low'
  
  const getVolatilityInfo = (level) => {
    if (level === 'high') {
      return { 
        level: 'high', 
        text: 'Высокая (Торгуем)', 
        emoji: '🔥', 
        color: '#f87171',
        advice: 'Сильное движение! Идеально для скальпинга и тренда.' 
      }
    } else if (level === 'medium') {
      return { 
        level: 'medium', 
        text: 'Средняя (Активна)', 
        emoji: '☁️', 
        color: '#fbbf24',
        advice: 'Нормальная торговая активность. Следите за трендом.' 
      }
    }
    return { 
      level: 'low', 
      text: 'Низкая (Сессия)', 
      emoji: '❄️', 
      color: '#38bdf8',
      advice: 'Рынок спит. Входить нельзя. Ждите Лондона/Нью-Йорка.' 
    }
  }

  const volInfo = getVolatilityInfo(volatilityLevel)

  // Статусы
  const isMarketOpen = isWeekday
  const marketStatusText = isMarketOpen ? '🟢 Открыт' : '🔴 Закрыт'
  
  // "Температура" рынка
  const getMarketMood = () => {
    if (!isMarketOpen) return '❄️ Рынок закрыт'
    if (marketSignals.trend === 'bullish') return '📈 Бычий (Рост)'
    if (marketSignals.trend === 'bearish') return '📉 Медвежий (Падение)'
    return '🌊 Спокойный (Флэт)'
  }
  const marketMoodText = getMarketMood()

  // Состояние рынка для индикатора
  const getMarketIndicator = () => {
    if (marketSignals.trend === 'bullish') return { icon: '📈', label: 'Бычий', sublabel: 'Рост', color: '#34d399' }
    if (marketSignals.trend === 'bearish') return { icon: '📉', label: 'Медвежий', sublabel: 'Падение', color: '#f87171' }
    return { icon: '🌊', label: 'Спокойный', sublabel: 'Флэт', color: '#8ecae6' }
  }
  const indicator = getMarketIndicator()

  return (
    <div className="home-screen">
      {/* Шапка */}
      <header className="cockpit-header">
        <div className="header-top">
          <div>
            <h1>🌺 Секреты Большого Счастья</h1>
            <div className="header-subtitle">Профессиональный навигатор</div>
          </div>
          <div className={`status-badge ${isMarketOpen ? 'open' : 'closed'}`}>
            {marketStatusText}
          </div>
        </div>
        <div className="market-mood">
          <span className="mood-icon">{indicator.icon}</span>
          <span className="mood-text">{marketMoodText}</span>
        </div>
      </header>

      {/* Текущие цены */}
      <section className="prices-card">
        <div className="price-item">
          <div className="price-label">
            <span className="price-icon">💱</span>
            <span>EUR/USD</span>
          </div>
          <div className="price-value">
            <span className="price-number">{eurUsd ? eurUsd.toFixed(5) : '—'}</span>
            {eurUsdChange && (
              <span className={`price-change ${parseFloat(eurUsdChange) >= 0 ? 'positive' : 'negative'}`}>
                {parseFloat(eurUsdChange) >= 0 ? '▲' : '▼'} {Math.abs(eurUsdChange).toFixed(3)}%
              </span>
            )}
          </div>
        </div>
        
        <div className="price-item">
          <div className="price-label">
            <span className="price-icon">🏛️</span>
            <span>Индекс Мосбиржи</span>
          </div>
          <div className="price-value">
            <span className="price-number">{moscowIndex ? moscowIndex.toFixed(2) : '—'}</span>
          </div>
        </div>
        
        {lastUpdate && (
          <div className="last-update">
            🕐 Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
          </div>
        )}
      </section>

      {/* Блок Волатильности (Умный анализ) */}
      <section className="volatility-card">
        <div className="vol-header">
          <span className="vol-label">📊 Активность рынка</span>
          <span className={`vol-level ${volInfo.level}`}>{volInfo.text}</span>
        </div>
        
        <div className="vol-content">
          <div className="vol-icon-wrap">
            {volInfo.emoji}
          </div>
          <div className="vol-advice">
            <div className="vol-advice-label">Рекомендация:</div>
            <div className="vol-advice-text" style={{ color: volInfo.color }}>
              {volInfo.advice}
            </div>
          </div>
        </div>
      </section>

      {/* Приборная панель */}
      <section className="dashboard-section">
        <h2>📊 Приборная панель</h2>
        <div className="indicators-grid">
          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">RSI (14)</span>
              <span className="indicator-value">{rsi || '—'}</span>
            </div>
            <div className="indicator-status">
              {rsi ? (parseFloat(rsi) < 30 ? '🟢 Перепродан' : parseFloat(rsi) > 70 ? '🔴 Перекуплен' : '⚪ Нейтрально') : '⏳ Загрузка...'}
            </div>
          </div>

          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">MACD</span>
              <span className="indicator-value">{macdValue || '—'}</span>
            </div>
            <div className="indicator-status">
              {macdValue ? (parseFloat(macdValue) > 0 ? '📈 Рост' : '📉 Падение') : '⏳ Загрузка...'}
            </div>
          </div>

          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">Тренд</span>
              <span className="indicator-value">{trend === 'bullish' ? '🟢 Вверх' : trend === 'bearish' ? '🔴 Вниз' : '⚪ Флэт'}</span>
            </div>
            <div className="indicator-status">
              На основе EMA
            </div>
          </div>

          <div className="indicator-card">
            <div className="indicator-header">
              <span className="indicator-name">Сила</span>
              <span className="indicator-value">{confidence}%</span>
            </div>
            <div className="indicator-status">
              {confidence > 70 ? '🟢 Сильный' : confidence > 50 ? '🟡 Средний' : '🔴 Нет'}
            </div>
          </div>
        </div>
      </section>

      {/* Вердикт Штурмана */}
      <section className="verdict-section">
        <h2>🧭 Вердикт Штурмана</h2>
        <div className="verdict-card">
          {(() => {
            if (!isMarketOpen) return '🛑 Рынок закрыт. Ожидайте открытия.'
            
            let text = ''
            let icon = '⏸️'
            
            if (volInfo.level === 'high' && confidence > 60) {
              text = '🔥 Высокая волатильность + сильный сигнал. Отличное время для входа!'
              icon = '🎯'
            } else if (volInfo.level === 'low') {
              text = '❄️ Рынок спит. Нет смысла входить — нет движения.'
              icon = '💤'
            } else if (confidence > 70) {
              text = 'Индикаторы показывают сильный сигнал. Следуйте системе.'
              icon = '✅'
            } else {
              text = 'Рынок в зоне турбулентности. Индикаторы противоречивы. Ждите ясности.'
              icon = '🌊'
            }

            return (
              <>
                <div className="verdict-icon">{icon}</div>
                <p>{text}</p>
              </>
            )
          })()}
        </div>
      </section>

      {/* Умный сигнал */}
      <SmartSignalSection 
        volInfo={volInfo} 
        trend={trend} 
        confidence={confidence} 
        marketSignals={marketSignals}
        isMarketOpen={isMarketOpen} 
      />
    </div>
  )
}

// Компонент Умного сигнала
function SmartSignalSection({ volInfo, trend, confidence, marketSignals, isMarketOpen }) {
  const getSignal = () => {
    if (!isMarketOpen) return { icon: '🛑', text: 'Рынок закрыт', sub: 'Ожидайте открытия', color: '#f87171' }
    if (!marketSignals) return { icon: '⏳', text: 'Загрузка данных...', sub: 'Подождите', color: '#fbbf24' }
    
    if (volInfo.level === 'low') return { icon: '💤', text: 'Нет движения', sub: 'Ждите волатильности', color: '#38bdf8' }
    
    if (marketSignals.signal) {
      return {
        icon: marketSignals.signal.icon,
        text: marketSignals.signal.text,
        sub: `Сила: ${confidence}%`,
        color: marketSignals.signal.type === 'buy' ? '#4ade80' : 
               marketSignals.signal.type === 'sell' ? '#f87171' :
               marketSignals.signal.type === 'strong' ? '#fbbf24' : '#94a3b8'
      }
    }
    
    if (trend === 'bullish' && volInfo.level === 'high') return { icon: '🚀', text: 'Тренд ВВЕРХ', sub: 'Ищем покупки', color: '#4ade80' }
    if (trend === 'bearish' && volInfo.level === 'high') return { icon: '🔻', text: 'Тренд ВНИЗ', sub: 'Ищем продажи', color: '#4ade80' }
    
    if (confidence > 70) return { icon: '🎯', text: 'Сильный сигнал', sub: 'Следуйте системе', color: '#fbbf24' }
    
    return { icon: '⚖️', text: 'Флэт', sub: 'Смотрим уровни', color: '#94a3b8' }
  }

  const signal = getSignal()

  return (
    <section className="smart-signal-section">
      <div className={`smart-signal-card ${signal.color === '#4ade80' ? 'active' : ''}`}>
        <div className="signal-icon" style={{ color: signal.color }}>{signal.icon}</div>
        <div className="signal-content">
          <div className="signal-title" style={{ color: signal.color }}>{signal.text}</div>
          <div className="signal-sub">{signal.sub}</div>
        </div>
        <div className="signal-arrow">➜</div>
      </div>
    </section>
  )
}

export default HomeScreen
