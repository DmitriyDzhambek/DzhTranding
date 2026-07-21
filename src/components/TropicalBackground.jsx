import { useEffect, useState } from 'react'
import './TropicalBackground.css'

/**
 * TropicalBackground — тропический фон с оверлеем для читаемости
 * Использует изображение пляжного домика как основной фон
 */
function TropicalBackground() {
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Изображение из assets (пользователь должен сохранить его туда)
  const bgImage = '/assets/beach-house.jpg'
  
  useEffect(() => {
    // Предзагрузка изображения
    const img = new Image()
    img.src = bgImage
    img.onload = () => setImageLoaded(true)
    img.onerror = () => {
      // Если изображение не загружено, используем fallback градиент
      console.log('Изображение не найдено, используется fallback градиент')
    }
  }, [bgImage])
  
  return (
    <>
      {/* Фоновое изображение */}
      <div 
        className="tropical-background"
        style={{ 
          backgroundImage: `url(${bgImage})`,
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 1.5s ease-in-out'
        }}
      />
      
      {/* Градиент поверх для читаемости контента */}
      <div className="tropical-overlay"></div>
      
      {/* Fallback градиент, если изображение не загрузилось */}
      <div className="tropical-fallback"></div>
      
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
