import { createContext, useContext } from 'react'
import { useMarketData as useMarketDataSource } from '../hooks/useMarketData'

/**
 * MarketDataContext — ОДИН живой поток на всё приложение.
 *
 * Раньше каждый экран вызывал useMarketData() и открывал свой WebSocket.
 * Теперь поток создаётся один раз здесь, а все экраны читают его через useMarket().
 */
const MarketDataContext = createContext(null)

export function MarketDataProvider({ children }) {
  const market = useMarketDataSource()

  return (
    <MarketDataContext.Provider value={market}>
      {children}
    </MarketDataContext.Provider>
  )
}

export function useMarket() {
  const ctx = useContext(MarketDataContext)

  if (!ctx) {
    // Безопасный фолбэк, чтобы экран не падал вне провайдера
    return {
      eurUsd: null,
      currentPrice: null,
      priceHistory: [],
      marketSignals: {
        rsi: '—',
        macd: '—',
        trend: 'neutral',
        activity: 'low',
        confidence: 0,
        signal: { type: 'wait', text: 'Нет подключения', icon: '📡' }
      },
      loading: true,
      connected: false,
      source: null,
      lastUpdate: null
    }
  }

  return ctx
}

export default MarketDataContext
