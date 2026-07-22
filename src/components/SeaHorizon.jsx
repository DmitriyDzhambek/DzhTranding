/**
 * SeaHorizon — динамический морской фон
 * Штиль — гладкая вода со звёздами
 * Волнение — рябь при повышенной волатильности
 * Шторм — тёмные бурные волны при высоком риске
 */
import { useEffect, useState, useRef } from 'react'
import './SeaHorizon.css'

function SeaHorizon({ volatility = 0, marketState = 'flat', timeOfDay = 'night' }) {
  const [state, setState] = useState('calm') // calm, choppy, storm
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const timeRef = useRef(0)

  // Определяем состояние моря
  useEffect(() => {
    let newState = 'calm'
    
    if (volatility > 0.0008 || marketState === 'bear') {
      newState = 'storm'
    } else if (volatility > 0.0004 || marketState === 'bull') {
      newState = 'choppy'
    }
    
    setState(newState)
  }, [volatility, marketState])

  // Рисуем морской горизонт на canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Цвета для разных состояний
    const colors = {
      calm: {
        sky: ['#0a0e27', '#1a1f4e', '#2d3561'],
        water: ['#0d1b2a', '#1b2838', '#2a3f5f'],
        stars: true,
        waveHeight: 15,
        waveSpeed: 0.005,
        waveCount: 3
      },
      choppy: {
        sky: ['#1a1a2e', '#16213e', '#1f4068'],
        water: ['#162447', '#1f4068', '#2a5298'],
        stars: false,
        waveHeight: 35,
        waveSpeed: 0.015,
        waveCount: 5
      },
      storm: {
        sky: ['#0a0a0a', '#1a1a2e', '#2d2d44'],
        water: ['#0d1117', '#161b22', '#21262d'],
        stars: false,
        waveHeight: 60,
        waveSpeed: 0.03,
        waveCount: 7
      }
    }

    const config = colors[state]

    // Рисуем звёзды
    const stars = []
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2
      })
    }

    const draw = () => {
      timeRef.current += config.waveSpeed
      
      const w = canvas.width
      const h = canvas.height
      
      // Небо — градиент
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55)
      skyGrad.addColorStop(0, config.sky[0])
      skyGrad.addColorStop(0.5, config.sky[1])
      skyGrad.addColorStop(1, config.sky[2])
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Звёзды (только для штиля)
      if (config.stars) {
        stars.forEach(star => {
          const alpha = 0.3 + 0.7 * Math.abs(Math.sin(timeRef.current * 2 + star.twinkle))
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fill()
        })
      }

      // Луна/Солнце
      const celestialY = state === 'storm' ? h * 0.15 : h * 0.2
      const celestialX = w * 0.75
      const celestialRadius = state === 'storm' ? 25 : 35
      
      // Свечение
      const glowGrad = ctx.createRadialGradient(celestialX, celestialY, 0, celestialX, celestialY, celestialRadius * 4)
      glowGrad.addColorStop(0, state === 'storm' ? 'rgba(100, 100, 120, 0.3)' : 'rgba(255, 255, 200, 0.4)')
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glowGrad
      ctx.fillRect(0, 0, w, h)

      // Тело небесного тела
      ctx.beginPath()
      ctx.arc(celestialX, celestialY, celestialRadius, 0, Math.PI * 2)
      ctx.fillStyle = state === 'storm' ? '#666680' : '#fffde7'
      ctx.fill()

      // Вода — горизонт
      const waterStartY = h * 0.55
      
      // Базовый градиент воды
      const waterGrad = ctx.createLinearGradient(0, waterStartY, 0, h)
      waterGrad.addColorStop(0, config.water[2])
      waterGrad.addColorStop(0.5, config.water[1])
      waterGrad.addColorStop(1, config.water[0])
      ctx.fillStyle = waterGrad
      ctx.fillRect(0, waterStartY, w, h - waterStartY)

      // Волны
      for (let layer = 0; layer < config.waveCount; layer++) {
        const layerOffset = layer * 0.3
        const layerAlpha = 0.15 - layer * 0.02
        const layerHeight = config.waveHeight * (1 + layer * 0.5)
        
        ctx.beginPath()
        ctx.moveTo(0, h)
        
        for (let x = 0; x <= w; x += 5) {
          const y = waterStartY + layer * 20 + 
            Math.sin(x * 0.008 + timeRef.current + layerOffset) * layerHeight +
            Math.sin(x * 0.015 + timeRef.current * 1.5 + layerOffset) * (layerHeight * 0.5) +
            Math.sin(x * 0.003 + timeRef.current * 0.5) * (layerHeight * 2)
          
          ctx.lineTo(x, y)
        }
        
        ctx.lineTo(w, h)
        ctx.closePath()
        
        ctx.fillStyle = `rgba(${state === 'storm' ? '30, 40, 60' : '100, 150, 200'}, ${layerAlpha})`
        ctx.fill()
      }

      // Блики на воде (только для штиля)
      if (state === 'calm') {
        for (let i = 0; i < 20; i++) {
          const shimmerX = (celestialX + Math.sin(timeRef.current + i) * 100) % w
          const shimmerY = waterStartY + 30 + i * 15
          const shimmerAlpha = 0.1 + 0.1 * Math.sin(timeRef.current * 3 + i * 0.5)
          
          ctx.beginPath()
          ctx.ellipse(shimmerX, shimmerY, 30 + Math.sin(timeRef.current + i) * 10, 2, 0, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 200, ${shimmerAlpha})`
          ctx.fill()
        }
      }

      // Молнии (только для шторма)
      if (state === 'storm' && Math.random() < 0.005) {
        ctx.beginPath()
        let lx = Math.random() * w
        let ly = 0
        ctx.moveTo(lx, ly)
        
        for (let i = 0; i < 8; i++) {
          lx += (Math.random() - 0.5) * 60
          ly += h * 0.08
          ctx.lineTo(lx, ly)
        }
        
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.8)'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Вспышка
        ctx.fillStyle = 'rgba(200, 200, 255, 0.1)'
        ctx.fillRect(0, 0, w, h)
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [state])

  return (
    <canvas
      ref={canvasRef}
      className="sea-horizon-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1
      }}
    />
  )
}

export default SeaHorizon
