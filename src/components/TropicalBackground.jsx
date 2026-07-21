import { useEffect, useState } from 'react'
import './TropicalBackground.css'

/**
 * TropicalBackground — тропический фон с оверлеем для читаемости
 * Использует изображение пляжного домика как основной фон
 */
function TropicalBackground() {
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Изображение из public/assets
  const bgImage = '/assets/beach-house.jpg'
  
  useEffect(() => {
    // Предзагрузка изображения
    const img = new Image()
    img.src = bgImage
    img.onload = () => {
      console.log('🌴 Тропический фон загружен!')
      setImageLoaded(true)
    }
    img.onerror = () => {
      console.log('⚠️ Изображение не найдено, используется fallback градиент')
      setImageLoaded(true) // Чтобы fallback работал
    }
  }, [bgImage])
  
  return (
    <>
      {/* Fallback градиент — всегда виден первым */}
      <div className="tropical-fallback"></div>
      
      {/* Фоновое изображение */}
      <div 
        className={`tropical-background ${imageLoaded ? 'loaded' : ''}`}
        style={{ 
          backgroundImage: `url(${bgImage})`,
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 1.5s ease-in-out'
        }}
      />
      
      {/* Градиент поверх для читаемости контента */}
      <div className="tropical-overlay"></div>
      
      {/* Предзагрузка */}
      <img 
        src={bgImage} 
        alt="" 
        style={{ display: 'none' }}
        loading="eager"
      />
    </>
  )
}

export default TropicalBackground
