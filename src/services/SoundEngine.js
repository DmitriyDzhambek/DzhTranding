/**
 * SoundEngine — генерация звуков через Web Audio API
 * Без внешних файлов — всё синтезируется программно
 */

class SoundEngine {
  constructor() {
    this.audioContext = null
    this.enabled = true
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  /**
   * Звук "всплеск волны" — плавный rise + fall с фильтром
   * Используется при закрытии свечи / сигнале
   */
  playWaveSplash(duration = 0.8) {
    if (!this.enabled) return
    this.init()

    const ctx = this.audioContext
    const now = ctx.currentTime

    // Основной тон — низкий "бульк"
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(180, now)
    osc1.frequency.exponentialRampToValueAtTime(80, now + duration)
    gain1.gain.setValueAtTime(0.3, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + duration)
    osc1.connect(gain1).connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + duration)

    // Шум воды — белый шум через bandpass
    const bufferSize = ctx.sampleRate * duration
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.setValueAtTime(800, now)
    bandpass.frequency.exponentialRampToValueAtTime(300, now + duration)
    bandpass.Q.value = 2

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.15, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration)

    noise.connect(bandpass).connect(noiseGain).connect(ctx.destination)
    noise.start(now)
    noise.stop(now + duration)

    // Высокий "блик" — как капля
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1200, now + duration * 0.3)
    osc2.frequency.exponentialRampToValueAtTime(600, now + duration)
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.08, now + duration * 0.3)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + duration)
    osc2.connect(gain2).connect(ctx.destination)
    osc2.start(now)
    osc2.stop(now + duration)
  }

  /**
   * Звук "успех" — приятный аккорд при совпадении сигнала
   */
  playSuccess() {
    if (!this.enabled) return
    this.init()

    const ctx = this.audioContext
    const now = ctx.currentTime

    // Аккорд C-E-G
    const freqs = [523.25, 659.25, 783.99]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05 + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + 1.2)
    })
  }

  /**
   * Звук "ошибка" — мягкий низкий тон
   */
  playError() {
    if (!this.enabled) return
    this.init()

    const ctx = this.audioContext
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.linearRampToValueAtTime(200, now + 0.4)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.4)
  }

  /**
   * Звук "уведомление" — короткий двойной пинг
   */
  playNotification() {
    if (!this.enabled) return
    this.init()

    const ctx = this.audioContext
    const now = ctx.currentTime

    [0, 0.15].forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0, now + delay)
      gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.12)
    })
  }

  /**
   * Звук "режим сна" — мягкий затухающий тон
   */
  playSleepMode() {
    if (!this.enabled) return
    this.init()

    const ctx = this.audioContext
    const now = ctx.currentTime
    const duration = 1.5

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + duration)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + duration)
  }

  /**
   * Звук "пробуждение" — восходящий тон
   */
  playWakeUp() {
    if (!this.enabled) return
    this.init()

    const ctx = this.audioContext
    const now = ctx.currentTime
    const duration = 0.6

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + duration)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + duration)
  }

  toggle() {
    this.enabled = !this.enabled
    localStorage.setItem('soundEnabled', this.enabled ? 'true' : 'false')
    return this.enabled
  }

  loadState() {
    const saved = localStorage.getItem('soundEnabled')
    if (saved !== null) {
      this.enabled = saved === 'true'
    }
  }
}

export const soundEngine = new SoundEngine()
export default soundEngine
