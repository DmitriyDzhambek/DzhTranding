import { useEffect, useState } from 'react'

/**
 * MarketBackground — адаптивный фон в зависимости от фазы рынка
 * Использует SVG изображения из папки public/assets
 */
function MarketBackground({ marketState = 'flat' }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  
  // Маппинг состояний рынка на файлы
  const bgMap = {
    'flat': '/assets/flat-market.svg',
    'bull': '/assets/bull-market.svg',
    'bear': '/assets/bear-market.svg',
  }
  
  const currentBg = bgMap[marketState] || bgMap['flat']
  
  // Предзагрузка изображений
  useEffect(() => {
    const images = Object.values(bgMap)
    let loaded = 0
    
    images.forEach(src => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        loaded++
        if (loaded === images.length) {
          setImageLoaded(true)
        }
      }
    })
  }, [])
  
  // Отслеживаем переключение состояния
  useEffect(() => {
    setTransitioning(true)
    const timer = setTimeout(() => setTransitioning(false), 2500)
    return () => clearTimeout(timer)
  }, [marketState])
  
  return (
    <>
      {/* Фоновое изображение */}
      <div 
        className={`market-background market-${marketState}`}
        style={{ 
          backgroundImage: `url(${currentBg})`,
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 2.5s ease-in-out'
        }}
      />
      
      {/* Градиент поверх для читаемости контента */}
      <div className="content-overlay"></div>
      
      {/* Предзагрузка изображений */}
      {Object.values(bgMap).map((src, index) => (
        <img 
          key={index}
          src={src} 
          alt="" 
          style={{ display: 'none' }}
          loading="eager"
        />
      ))}
    </>
  )
}

export default MarketBackground
