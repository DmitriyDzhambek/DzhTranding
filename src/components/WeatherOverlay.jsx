import { useState, useEffect, useRef, useCallback } from 'react'
import './WeatherOverlay.css'

/**
 * WeatherOverlay — эмоциональная погода в терминале
 * ☀️ Прибыль — солнце и тропические блики
 * 🌧️ Убыток — успокаивающий дождь
 */
function WeatherOverlay({ profitState = 'neutral' }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Сохранение истории сделок
  const saveTradeResult = useCallback((result) => {
    const history = JSON.parse(localStorage.getItem('tradingHistory') || '[]')
    history.push({
      date: new Date().toISOString(),
      result, // 'profit' или 'loss'
      timestamp: Date.now()
    })
    // Храним последние 30 сделок
    const recent = history.slice(-30)
    localStorage.setItem('tradingHistory', JSON.stringify(recent))
  }, [])

  // Расчёт текущего настроения
  const getMood = useCallback(() => {
    const history = JSON.parse(localStorage.getItem('tradingHistory') || '[]')
    
    if (history.length === 0) return 'neutral'
    
    const last10 = history.slice(-10)
    const profits = last10.filter(h => h.result === 'profit').length
    const losses = last10.filter(h => h.result === 'loss').length
    
    if (profits > losses) return 'profit'
    if (losses > profits) return 'loss'
    return 'neutral'
  }, [])

  // Обновление состояния
  useEffect(() => {
    const mood = getMood()
    if (mood !== profitState && profitState !== 'neutral') {
      setIsTransitioning(true)
      setTimeout(() => setIsTransitioning(false), 1000)
    }
  }, [getMood, profitState])

  // Анимация частиц на canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let particles = []
    let sunParticles = []
    let rainDrops = []

    // Настройка canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Класс для частиц солнца
    class SunParticle {
      constructor() {
        this.reset()
      }

      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 4 + 2
        this.speedX = (Math.random() - 0.5) * 0.5
        this.speedY = -Math.random() * 0.5 - 0.2
        this.opacity = Math.random() * 0.5 + 0.3
        this.life = Math.random() * 100 + 50
        this.maxLife = this.life
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.life--
        this.opacity = (this.life / this.maxLife) * 0.5

        if (this.life <= 0 || this.y < 0) {
          this.reset()
          this.y = canvas.height + 10
        }
      }

      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 215, 0, ${this.opacity})`
        ctx.fill()

        // Свечение
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 215, 0, ${this.opacity * 0.3})`
        ctx.fill()
      }
    }

    // Класс для капель дождя
    class RainDrop {
      constructor() {
        this.reset()
      }

      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * -canvas.height
        this.speed = Math.random() * 3 + 2
        this.length = Math.random() * 15 + 10
        this.opacity = Math.random() * 0.3 + 0.1
        this.width = Math.random() * 1.5 + 0.5
      }

      update() {
        this.y += this.speed
        this.x -= 0.5 // Небольшой наклон

        if (this.y > canvas.height) {
          this.reset()
        }
      }

      draw() {
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(this.x - 1, this.y + this.length)
        ctx.strokeStyle = `rgba(174, 194, 224, ${this.opacity})`
        ctx.lineWidth = this.width
        ctx.lineCap = 'round'
        ctx.stroke()
      }
    }

    // Класс для splash (брызги от капель)
    class Splash {
      constructor(x, y) {
        this.x = x
        this.y = y
        this.particles = []
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            x: 0,
            y: 0,
            speedX: (Math.random() - 0.5) * 2,
            speedY: -Math.random() * 2 - 1,
            life: 20,
            maxLife: 20
          })
        }
      }

      update() {
        this.particles.forEach(p => {
          p.x += p.speedX
          p.y += p.speedY
          p.speedY += 0.1 // Гравитация
          p.life--
        })
        this.particles = this.particles.filter(p => p.life > 0)
      }

      draw() {
        this.particles.forEach(p => {
          const opacity = p.life / p.maxLife * 0.3
          ctx.beginPath()
          ctx.arc(this.x + p.x, this.y + p.y, 1, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(174, 194, 224, ${opacity})`
          ctx.fill()
        })
      }
    }

    // Инициализация частиц
    const initParticles = () => {
      particles = []
      sunParticles = []
      rainDrops = []
      splashQueue = []

      // Солнечные частицы
      for (let i = 0; i < 30; i++) {
        sunParticles.push(new SunParticle())
      }

      // Капли дождя
      for (let i = 0; i < 80; i++) {
        rainDrops.push(new RainDrop())
      }
    }

    let splashQueue = []

    initParticles()

    // Анимация
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (profitState === 'profit') {
        // ☀️ Солнце и тропические блики
        sunParticles.forEach(p => {
          p.update()
          p.draw()
        })

        // Дополнительные блики
        const time = Date.now() * 0.001
        for (let i = 0; i < 5; i++) {
          const x = canvas.width * 0.2 + Math.sin(time + i) * 100
          const y = canvas.height * 0.3 + Math.cos(time * 0.7 + i) * 50
          const size = Math.sin(time + i * 2) * 10 + 20

          const gradient = ctx.createRadialGradient(x, y, 0, x, y, size)
          gradient.addColorStop(0, 'rgba(255, 215, 0, 0.15)')
          gradient.addColorStop(1, 'rgba(255, 215, 0, 0)')

          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        // Тропические листья (декоративные)
        drawTropicalLeaves(ctx, canvas, time)

      } else if (profitState === 'loss') {
        // 🌧️ Успокаивающий дождь
        rainDrops.forEach(drop => {
          drop.update()
          drop.draw()

          // Создаём брызги когда капля достигает "дна"
          if (drop.y > canvas.height - 50 && Math.random() < 0.02) {
            splashQueue.push(new Splash(drop.x, canvas.height - 50))
          }
        })

        // Рисуем брызги
        splashQueue.forEach(splash => {
          splash.update()
          splash.draw()
        })
        splashQueue = splashQueue.filter(s => s.particles.length > 0)

      } else {
        // 😌 Нейтральное состояние — лёгкие облака
        drawClouds(ctx, canvas)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [profitState])

  // Рисование тропических листьев
  const drawTropicalLeaves = (ctx, canvas, time) => {
    const leafPositions = [
      { x: canvas.width * 0.1, y: canvas.height * 0.15, size: 40 },
      { x: canvas.width * 0.85, y: canvas.height * 0.1, size: 35 },
      { x: canvas.width * 0.9, y: canvas.height * 0.8, size: 45 },
    ]

    leafPositions.forEach((pos, i) => {
      const sway = Math.sin(time * 0.5 + i) * 5
      const alpha = 0.1 + Math.sin(time + i) * 0.05

      ctx.save()
      ctx.translate(pos.x + sway, pos.y)
      ctx.rotate(Math.sin(time * 0.3 + i) * 0.1)

      // Рисуем лист
      ctx.beginPath()
      ctx.ellipse(0, 0, pos.size, pos.size * 0.4, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`
      ctx.fill()

      // Жилка листа
      ctx.beginPath()
      ctx.moveTo(-pos.size, 0)
      ctx.lineTo(pos.size, 0)
      ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.5})`
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.restore()
    })
  }

  // Рисование облаков
  const drawClouds = (ctx, canvas) => {
    const time = Date.now() * 0.0003
    const cloudPositions = [
      { x: (time * 50) % (canvas.width + 200) - 100, y: canvas.height * 0.2, size: 60 },
      { x: (time * 30 + 300) % (canvas.width + 200) - 100, y: canvas.height * 0.35, size: 50 },
    ]

    cloudPositions.forEach(cloud => {
      const gradient = ctx.createRadialGradient(
        cloud.x, cloud.y, 0,
        cloud.x, cloud.y, cloud.size
      )
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.beginPath()
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    })
  }

  return (
    <canvas 
      ref={canvasRef} 
      className="weather-canvas"
      style={{ 
        opacity: isTransitioning ? 0.5 : 1,
        transition: 'opacity 1s ease'
      }}
    />
  )
}

export default WeatherOverlay
