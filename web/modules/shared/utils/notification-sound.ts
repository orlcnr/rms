const SOUND_ENABLED_STORAGE_KEY = 'rms-notification-sound-enabled'

const audioCache = new Map<string, HTMLAudioElement>()

export function isNotificationSoundEnabled() {
  if (typeof window === 'undefined') {
    return true
  }

  const stored = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY)

  if (stored === null) {
    return true
  }

  return stored === 'true'
}

export function setNotificationSoundEnabled(value: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(value))
}

export function playNotificationAudio(
  src: string,
  options?: {
    volume?: number
  },
) {
  if (typeof window === 'undefined' || !isNotificationSoundEnabled()) {
    return
  }

  let audio = audioCache.get(src)

  if (!audio) {
    audio = new Audio(src)
    audio.preload = 'auto'
    audioCache.set(src, audio)
  }

  if (typeof options?.volume === 'number') {
    audio.volume = options.volume
  }

  audio.currentTime = 0

  void audio.play().catch((error) => {
    console.warn('[NotificationSound] Playback blocked:', error)
  })
}

