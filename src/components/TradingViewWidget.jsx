import './TradingViewWidget.css'

/**
 * TradingViewWidget — реальный график EUR/USD с TradingView
 * Показывает 100% реальные данные Forex (FX) в реальном времени
 * Синхронизирован с Binarium
 */
function TradingViewWidget() {
  return (
    <div className="tradingview-widget-container">
      <div className="tradingview-widget">
        <iframe
          src="https://s.tradingview.com/embed-widget/advanced-chart/?symbol=FX%3AEURUSD&interval=60&hidesidetoolbar=0&saveimage=0&popupbutton=0&studies=%5B%5D&theme=dark&style=2&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=true&popup_width=1000&popup_height=650&locale=ru&backgroundColor=rgba%280%2C0%2C0%2C0%29&gridColor=rgba%28255%2C255%2C255%2C0.03%29"
          style={{ width: '100%', height: '100%', border: 'none' }}
          frameBorder="0"
          allowFullScreen
          loading="eager"
          title="TradingView EUR/USD Chart"
        ></iframe>
      </div>
      <div className="widget-footer">
        <span>📊 Данные: TradingView FX EUR/USD (реальные)</span>
        <span>⚡ Синхронизировано с Binarium</span>
      </div>
    </div>
  )
}

export default TradingViewWidget
