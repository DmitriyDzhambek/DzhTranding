import { useState, useRef } from 'react'
import './RippleButton.css'

/**
 * RippleButton — кнопка с волновым эффектом при нажатии
 * Волна цвета #00E5FF расходится как камень в воде
 */
function RippleButton({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  disabled = false,
  ...props 
}) {
  const [ripples, setRipples] = useState([])
  const buttonRef = useRef(null)

  const createRipple = (event) => {
    if (disabled) return
    
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const newRipple = {
      id: Date.now(),
      x,
      y,
      size,
    }

    setRipples(prev => [...prev, newRipple])

    // Удаляем ripple после анимации
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id))
    }, 600)

    if (onClick) {
      onClick(event)
    }
  }

  const getVariantClass = () => {
    switch (variant) {
      case 'accent':
        return 'btn-accent'
      case 'sand':
        return 'btn-sand'
      default:
        return 'btn-primary'
    }
  }

  return (
    <button
      ref={buttonRef}
      className={`btn ${getVariantClass()} ${className}`}
      onClick={createRipple}
      disabled={disabled}
      {...props}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple"
          style={{
            width: ripple.size,
            height: ripple.size,
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
      {children}
    </button>
  )
}

export default RippleButton
