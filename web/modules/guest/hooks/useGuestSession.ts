'use client'

import React from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { guestApi, isGuestSessionInvalidError } from '../service'
import { getGuestSessionUiState } from '../session-ui-config'
import type { GuestOrder } from '../types'

const ACTIVE_GUEST_TOKEN_STORAGE_KEY = 'guest:activeToken'
const ACTIVE_GUEST_SESSION_ID_STORAGE_KEY = 'guest:activeSessionId'
const GUEST_LOCK_REASON_STORAGE_KEY = 'guest:lockReason'
const CREATE_SESSION_REUSE_WINDOW_MS = 5000
const GUEST_DEBUG_ALLOWED =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_GUEST_DEBUG === '1'
const createSessionRequestCache = new Map<
  string,
  {
    createdAt: number
    promise: ReturnType<typeof guestApi.createSession>
  }
>()

function getGuestSessionStorageKey() {
  return ACTIVE_GUEST_TOKEN_STORAGE_KEY
}

function getGuestActiveSessionIdStorageKey() {
  return ACTIVE_GUEST_SESSION_ID_STORAGE_KEY
}

function getGuestLockReasonStorageKey() {
  return GUEST_LOCK_REASON_STORAGE_KEY
}

function getGuestPendingOrdersStorageKey(sessionId: string) {
  return `guest-pending-orders:${sessionId}`
}

function getGuestBasketStorageKey(sessionId: string) {
  return `guest-basket:${sessionId}`
}

function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return {
    userAgent: window.navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: window.navigator.language,
    platform: window.navigator.platform,
  }
}

function extractQrTokenFromLocation(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const readFromParams = (value?: string | null) =>
    value && value.trim().length > 0 ? value : undefined

  const currentUrl = new URL(window.location.href)
  const tokenFromSearch =
    readFromParams(currentUrl.searchParams.get('token')) ||
    readFromParams(currentUrl.searchParams.get('qrToken')) ||
    readFromParams(currentUrl.searchParams.get('qr')) ||
    readFromParams(currentUrl.searchParams.get('t'))

  if (tokenFromSearch) {
    return tokenFromSearch
  }

  if (currentUrl.hash) {
    const hash = currentUrl.hash.replace(/^#/, '')
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : hash
    const hashParams = new URLSearchParams(hashQuery)
    const tokenFromHash =
      readFromParams(hashParams.get('token')) ||
      readFromParams(hashParams.get('qrToken')) ||
      readFromParams(hashParams.get('qr')) ||
      readFromParams(hashParams.get('t'))

    if (tokenFromHash) {
      return tokenFromHash
    }
  }

  const pathSegments = currentUrl.pathname.split('/').filter(Boolean)

  if (pathSegments.length >= 2 && pathSegments[0] === 'guest') {
    return decodeURIComponent(pathSegments[1])
  }

  return undefined
}

function extractApiErrorMeta(error: unknown): { status?: number; message?: string } {
  if (!error || typeof error !== 'object') {
    return {}
  }

  const errorObject = error as {
    response?: { status?: number; data?: { message?: string | string[] } }
    message?: string
  }

  const responseMessage = errorObject.response?.data?.message
  const message = Array.isArray(responseMessage)
    ? responseMessage.join(', ')
    : responseMessage || errorObject.message

  return {
    status: errorObject.response?.status,
    message,
  }
}

interface UseGuestSessionOptions {
  resolvedQrToken?: string
  router: AppRouterInstance
  loadBootstrap: (
    token: string,
    hydrateDraft?: boolean,
  ) => Promise<{ session: { id: string } }>
  bootstrapSessionId?: string
  clearBootstrapState: () => void
  resetBasket: () => void
  onHydrateDraft: React.MutableRefObject<(order: GuestOrder | null) => void>
  guestToken: string | null
  setGuestToken: (token: string | null) => void
}

export interface UseGuestSessionResult {
  activeSessionId: string | null
  isLoading: boolean
  isSessionEnded: boolean
  errorMessage: string | null
  lockReason: string | null
  clearGuestClientState: (reason?: string | null) => void
  handleSessionInvalidation: (reason: string) => void
  clearLockState: () => void
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>
  setIsSessionEnded: React.Dispatch<React.SetStateAction<boolean>>
  setLockReason: React.Dispatch<React.SetStateAction<string | null>>
  setActiveSessionIdSafe: (sessionId: string | null) => void
}

export function useGuestSession({
  resolvedQrToken,
  router,
  loadBootstrap,
  bootstrapSessionId,
  clearBootstrapState,
  resetBasket,
  onHydrateDraft,
  guestToken,
  setGuestToken,
}: UseGuestSessionOptions): UseGuestSessionResult {
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSessionEnded, setIsSessionEnded] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [lockReason, setLockReason] = React.useState<string | null>(null)

  const activeSessionIdRef = React.useRef<string | null>(null)
  const initInFlightRef = React.useRef(false)
  const processedQrTokenRef = React.useRef<string | null>(null)
  const initRunIdRef = React.useRef(0)
  const isComponentMountedRef = React.useRef(true)
  const debugEnabledRef = React.useRef(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    debugEnabledRef.current =
      GUEST_DEBUG_ALLOWED &&
      (params.get('guestDebug') === '1' ||
        window.sessionStorage.getItem('guest:debug') === '1')
  }, [])

  const debug = React.useCallback((step: string, payload?: Record<string, unknown>) => {
    if (!debugEnabledRef.current) {
      return
    }

    console.debug('[GuestSessionDebug]', step, payload || {})
  }, [])

  React.useEffect(() => {
    isComponentMountedRef.current = true
    return () => {
      isComponentMountedRef.current = false
      processedQrTokenRef.current = null
      initInFlightRef.current = false
    }
  }, [])

  const persistGuestToken = React.useCallback((token: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const storageKey = getGuestSessionStorageKey()

    if (!token) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    window.sessionStorage.setItem(storageKey, token)
  }, [])

  const persistActiveSessionId = React.useCallback((sessionId: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const storageKey = getGuestActiveSessionIdStorageKey()

    if (!sessionId) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    window.sessionStorage.setItem(storageKey, sessionId)
  }, [])

  const persistLockState = React.useCallback((reason: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const storageKey = getGuestLockReasonStorageKey()

    if (!reason) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    window.sessionStorage.setItem(storageKey, reason)
  }, [])

  const getStoredGuestToken = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.sessionStorage.getItem(getGuestSessionStorageKey())
  }, [])

  const getStoredActiveSessionId = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.sessionStorage.getItem(getGuestActiveSessionIdStorageKey())
  }, [])

  const getStoredLockReason = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.sessionStorage.getItem(getGuestLockReasonStorageKey())
  }, [])

  const setActiveSessionIdSafe = React.useCallback(
    (sessionId: string | null) => {
      activeSessionIdRef.current = sessionId
      setActiveSessionId(sessionId)
      persistActiveSessionId(sessionId)
    },
    [persistActiveSessionId],
  )

  const clearGuestClientState = React.useCallback(
    (reason?: string | null) => {
      if (typeof window !== 'undefined') {
        const storedSessionId =
          activeSessionIdRef.current ||
          window.sessionStorage.getItem(getGuestActiveSessionIdStorageKey())

        if (storedSessionId) {
          window.sessionStorage.removeItem(getGuestBasketStorageKey(storedSessionId))
          window.sessionStorage.removeItem(
            getGuestPendingOrdersStorageKey(storedSessionId),
          )
        }
      }

      resetBasket()
      persistGuestToken(null)
      setGuestToken(null)
      setActiveSessionIdSafe(null)
      persistLockState(reason || null)
      clearBootstrapState()
      onHydrateDraft.current(null)
      setIsSessionEnded(Boolean(reason))
      setLockReason(reason || null)
      setErrorMessage(reason ? getGuestSessionUiState(reason).description : null)
    },
    [
      clearBootstrapState,
      onHydrateDraft,
      persistGuestToken,
      persistLockState,
      resetBasket,
      setActiveSessionIdSafe,
      setGuestToken,
    ],
  )

  const handleSessionInvalidation = React.useCallback(
    (reason: string) => {
      clearGuestClientState(reason)
    },
    [clearGuestClientState],
  )

  const clearLockState = React.useCallback(() => {
    setIsSessionEnded(false)
    setLockReason(null)
    setErrorMessage(null)
    persistLockState(null)
  }, [persistLockState])

  const validateCurrentSession = React.useCallback(async () => {
    if (!guestToken || !bootstrapSessionId) {
      return false
    }

    try {
      const response = await guestApi.heartbeat(guestToken, bootstrapSessionId)

      if (!response.isActive) {
        handleSessionInvalidation('session_revoked')
        return false
      }

      if (response.guestAccessToken) {
        setGuestToken(response.guestAccessToken)
        persistGuestToken(response.guestAccessToken)
      }

      return true
    } catch (error) {
      console.error('[Guest] Session validation failed:', error)
      if (isGuestSessionInvalidError(error)) {
        handleSessionInvalidation('session_revoked')
        return false
      }

      return true
    }
  }, [
    bootstrapSessionId,
    guestToken,
    handleSessionInvalidation,
    persistGuestToken,
    setGuestToken,
  ])

  React.useEffect(() => {
    if (!guestToken || !bootstrapSessionId) {
      return
    }

    const heartbeatInterval = window.setInterval(async () => {
      await validateCurrentSession()
    }, 15000)

    return () => {
      window.clearInterval(heartbeatInterval)
    }
  }, [bootstrapSessionId, guestToken, validateCurrentSession])

  React.useEffect(() => {
    const handleForegroundValidation = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return
      }

      void validateCurrentSession()
    }

    window.addEventListener('focus', handleForegroundValidation)
    window.addEventListener('online', handleForegroundValidation)
    document.addEventListener('visibilitychange', handleForegroundValidation)

    return () => {
      window.removeEventListener('focus', handleForegroundValidation)
      window.removeEventListener('online', handleForegroundValidation)
      document.removeEventListener('visibilitychange', handleForegroundValidation)
    }
  }, [validateCurrentSession])

  React.useEffect(() => {
    const effectiveQrToken = resolvedQrToken || extractQrTokenFromLocation()
    if (initInFlightRef.current) {
      debug('effect:skip_global_in_flight', {
        hasEffectiveQrToken: Boolean(effectiveQrToken),
      })
      return
    }
    const runId = ++initRunIdRef.current
    debug('effect:start', {
      runId,
      hasResolvedQrToken: Boolean(resolvedQrToken),
      hasEffectiveQrToken: Boolean(effectiveQrToken),
      hasGuestToken: Boolean(guestToken),
      bootstrapSessionId: bootstrapSessionId || null,
      activeSessionId: activeSessionIdRef.current,
    })

    async function initialize() {
      if (!effectiveQrToken && guestToken && bootstrapSessionId) {
        debug('init:skip_already_active', {
          runId,
          bootstrapSessionId,
        })
        if (isComponentMountedRef.current) {
          setIsLoading(false)
        }
        return
      }

      if (effectiveQrToken) {
        if (processedQrTokenRef.current === effectiveQrToken) {
          debug('init:skip_processed_token', { runId })
          return
        }

        if (initInFlightRef.current) {
          debug('init:skip_in_flight', { runId })
          return
        }
      }

      let acquiredInitLock = false

      try {
        if (effectiveQrToken) {
          debug('init:create_session:start', { runId })
          initInFlightRef.current = true
          acquiredInitLock = true
          processedQrTokenRef.current = effectiveQrToken

          clearGuestClientState(null)

          const now = Date.now()
          const cached = createSessionRequestCache.get(effectiveQrToken)
          const cachedPromise =
            cached && now - cached.createdAt < CREATE_SESSION_REUSE_WINDOW_MS
              ? cached.promise
              : null

          const sessionPromise =
            cachedPromise ||
            guestApi.createSession({
              qrToken: effectiveQrToken,
              deviceInfo: getDeviceInfo(),
            })

          if (!cachedPromise) {
            createSessionRequestCache.set(effectiveQrToken, {
              createdAt: now,
              promise: sessionPromise,
            })
            void sessionPromise.finally(() => {
              const current = createSessionRequestCache.get(effectiveQrToken)
              if (current?.promise === sessionPromise) {
                createSessionRequestCache.delete(effectiveQrToken)
              }
            })
          }

          const sessionResponse = await sessionPromise

          if (!isComponentMountedRef.current) {
            debug('init:create_session:unmounted_before_result', { runId })
            return
          }

          debug('init:create_session:success', {
            runId,
            sessionId: sessionResponse.session?.id || null,
          })
          setGuestToken(sessionResponse.guestAccessToken)
          persistGuestToken(sessionResponse.guestAccessToken)
          const bootstrapResponse = await loadBootstrap(
            sessionResponse.guestAccessToken,
            true,
          )
          debug('init:bootstrap_after_create:success', {
            runId,
            sessionId: bootstrapResponse.session.id,
          })
          setActiveSessionIdSafe(bootstrapResponse.session.id)
          setIsSessionEnded(false)
          setLockReason(null)
          setErrorMessage(null)
          persistLockState(null)
          if (typeof window !== 'undefined') {
            window.history.replaceState(window.history.state, '', '/guest')
          } else {
            router.replace('/guest')
          }
          return
        }

        debug('init:restore:start', { runId })
        const storedGuestToken = getStoredGuestToken()
        const storedLockReason = getStoredLockReason()
        const storedSessionId = getStoredActiveSessionId()
        debug('init:restore:storage', {
          runId,
          hasStoredGuestToken: Boolean(storedGuestToken),
          storedSessionId: storedSessionId || null,
          storedLockReason: storedLockReason || null,
        })

        if (!storedGuestToken || !storedSessionId) {
          debug('init:restore:missing_storage', { runId })
          handleSessionInvalidation(storedLockReason || 'session_revoked')
          return
        }

        try {
          setGuestToken(storedGuestToken)
          setActiveSessionIdSafe(storedSessionId)
          const bootstrapResponse = await loadBootstrap(storedGuestToken, true)
          debug('init:restore:bootstrap_success', {
            runId,
            sessionId: bootstrapResponse.session.id,
          })
          setActiveSessionIdSafe(bootstrapResponse.session.id)
          setIsSessionEnded(false)
          setLockReason(null)
          setErrorMessage(null)
          persistLockState(null)
        } catch (error) {
          console.warn('[Guest] Stored session restore failed.', error)
          debug('init:restore:bootstrap_error', {
            runId,
            isInvalidError: isGuestSessionInvalidError(error),
          })
          handleSessionInvalidation(
            isGuestSessionInvalidError(error)
              ? 'session_revoked'
              : storedLockReason || 'session_revoked',
          )
        }
      } catch (error) {
        console.error('[Guest] Initialization failed:', error)
        const { status, message } = extractApiErrorMeta(error)
        debug('init:error', {
          runId,
          status: status || null,
          message: message || null,
          hasEffectiveQrToken: Boolean(effectiveQrToken),
        })

        if (isComponentMountedRef.current && runId === initRunIdRef.current) {
          if (effectiveQrToken) {
            if (status === 429) {
              setIsSessionEnded(true)
              setLockReason('throttled')
              persistLockState('throttled')
              setErrorMessage(
                message || 'Çok fazla deneme yapıldı. Lütfen 1 dakika sonra tekrar deneyin.',
              )
              processedQrTokenRef.current = null
              return
            }

            const normalizedMessage = (message || '').toLowerCase()
            const isQrValidationError =
              status === 401 ||
              normalizedMessage.includes('invalid qr') ||
              normalizedMessage.includes('invalid qr token') ||
              normalizedMessage.includes('qr code has been rotated') ||
              normalizedMessage.includes('table is currently out of service')

            const reason = isQrValidationError ? 'invalid_qr' : 'session_revoked'
            handleSessionInvalidation(reason)
            if (message) {
              setErrorMessage(message)
            } else if (status === 429) {
              setErrorMessage('Çok fazla deneme yapıldı. Lütfen 1 dakika sonra tekrar deneyin.')
            }
            return
          }

          handleSessionInvalidation('session_revoked')
          if (message) {
            setErrorMessage(message)
          }
        }
      } finally {
        if (acquiredInitLock) {
          initInFlightRef.current = false
        }

        debug('init:finally', {
          runId,
          acquiredInitLock,
        })
        if (isComponentMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    void initialize()
  }, [
    bootstrapSessionId,
    clearGuestClientState,
    debug,
    guestToken,
    getStoredActiveSessionId,
    getStoredGuestToken,
    getStoredLockReason,
    handleSessionInvalidation,
    loadBootstrap,
    persistLockState,
    persistGuestToken,
    resolvedQrToken,
    router,
    setActiveSessionIdSafe,
    setGuestToken,
  ])

  return {
    activeSessionId,
    isLoading,
    isSessionEnded,
    errorMessage,
    lockReason,
    clearGuestClientState,
    handleSessionInvalidation,
    clearLockState,
    setErrorMessage,
    setIsSessionEnded,
    setLockReason,
    setActiveSessionIdSafe,
  }
}
