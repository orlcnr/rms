'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { BodySection, SubHeaderSection } from '@/modules/shared/components/layout'
import { Button } from '@/modules/shared/components/Button'
import { notificationsService } from '@/modules/notifications/services'
import { emitNotificationRead } from '@/modules/notifications/utils'
import { playNotificationAudio } from '@/modules/shared/utils/notification-sound'
import { GuestStatusBanner } from './GuestStatusBanner'
import { guestStaffApi } from '../service'
import { PendingGuestApprovalItem } from '../types'

function getSocketUrl() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost/api/v1'
  const url = new URL(apiUrl)
  return `${url.protocol}//${url.host}/guest`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(Number(value || 0))
}

interface GuestApprovalsClientProps {
  restaurantId: string
  initialItems: PendingGuestApprovalItem[]
  mode?: 'page' | 'modal'
  focusOrderId?: string | null
  notificationId?: string | null
  onPendingCountChange?: (count: number) => void
}

export function GuestApprovalsClient({
  restaurantId,
  initialItems,
  mode = 'page',
  focusOrderId: focusOrderIdProp,
  notificationId: notificationIdProp,
  onPendingCountChange,
}: GuestApprovalsClientProps) {
  const searchParams = useSearchParams()
  const focusOrderId = focusOrderIdProp ?? searchParams.get('focus')
  const notificationId = notificationIdProp ?? searchParams.get('notificationId')

  const [items, setItems] = React.useState(initialItems)
  const [isLoading, setIsLoading] = React.useState(false)
  const [socketConnected, setSocketConnected] = React.useState(true)
  const [pollingEnabled, setPollingEnabled] = React.useState(false)
  const [stabilityTimerActive, setStabilityTimerActive] = React.useState(false)
  const [rejectOrderId, setRejectOrderId] = React.useState<string | null>(null)
  const [rejectReason, setRejectReason] = React.useState('')
  const [approvingOrderId, setApprovingOrderId] = React.useState<string | null>(null)
  const [processingRejectOrderId, setProcessingRejectOrderId] = React.useState<string | null>(null)
  const [focusMessage, setFocusMessage] = React.useState<string | null>(null)
  const [pendingAutoReadNotificationId, setPendingAutoReadNotificationId] =
    React.useState<string | null>(null)
  const stabilityTimerRef = React.useRef<number | null>(null)
  const autoReadRetryTimeoutRef = React.useRef<number | null>(null)
  const shouldToastOnStableReconnectRef = React.useRef(false)
  const itemRefs = React.useRef<Record<string, HTMLElement | null>>({})

  React.useEffect(() => {
    onPendingCountChange?.(items.length)
  }, [items.length, onPendingCountChange])

  const playOrderAlert = React.useCallback(() => {
    playNotificationAudio('/orders.mp3')
  }, [])

  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const nextItems = await guestStaffApi.getPendingApprovals(restaurantId)
      setItems(nextItems)

      if (focusOrderId) {
        const exists = nextItems.some((item) => item.id === focusOrderId)
        setFocusMessage(
          exists
            ? null
            : 'Secilen siparis artik bekleyen listede degil. Baska bir operator islemis olabilir.',
        )
      }
    } catch (error) {
      console.error('[GuestApprovals] Refresh failed:', error)
      toast.error('Misafir onay listesi yenilenemedi.')
    } finally {
      setIsLoading(false)
    }
  }, [focusOrderId, restaurantId])

  React.useEffect(() => {
    return () => {
      if (stabilityTimerRef.current) {
        window.clearTimeout(stabilityTimerRef.current)
      }
      if (autoReadRetryTimeoutRef.current) {
        window.clearTimeout(autoReadRetryTimeoutRef.current)
      }
    }
  }, [])

  const markNotificationRead = React.useCallback(async (id: string) => {
    try {
      await notificationsService.markAsRead(id)
      emitNotificationRead(id, 'guest-approvals')
      setPendingAutoReadNotificationId((current) =>
        current === id ? null : current,
      )
    } catch (error) {
      console.error('[GuestApprovals] Auto read failed:', error)
      setPendingAutoReadNotificationId(id)
    }
  }, [])

  React.useEffect(() => {
    if (!pendingAutoReadNotificationId) {
      return
    }

    autoReadRetryTimeoutRef.current = window.setTimeout(() => {
      void markNotificationRead(pendingAutoReadNotificationId)
    }, 5000)

    const retryOnFocus = () => {
      if (document.visibilityState === 'visible') {
        void markNotificationRead(pendingAutoReadNotificationId)
      }
    }

    window.addEventListener('focus', retryOnFocus)
    document.addEventListener('visibilitychange', retryOnFocus)

    return () => {
      if (autoReadRetryTimeoutRef.current) {
        window.clearTimeout(autoReadRetryTimeoutRef.current)
      }
      window.removeEventListener('focus', retryOnFocus)
      document.removeEventListener('visibilitychange', retryOnFocus)
    }
  }, [markNotificationRead, pendingAutoReadNotificationId])

  React.useEffect(() => {
    if (focusOrderId && items.length === 0) {
      setFocusMessage(
        'Secilen siparis artik bekleyen listede degil. Baska bir operator islemis olabilir.',
      )
    }
  }, [focusOrderId, items.length])

  React.useEffect(() => {
    if (!pollingEnabled) {
      return
    }

    const intervalId = window.setInterval(() => {
      void refresh()
    }, 10000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [pollingEnabled, refresh])

  React.useEffect(() => {
    if (!focusOrderId || !items.length) {
      return
    }

    const focusedItem = items.find((item) => item.id === focusOrderId)

    if (!focusedItem) {
      setFocusMessage(
        'Secilen siparis artik bekleyen listede degil. Baska bir operator islemis olabilir.',
      )
      return
    }

    setFocusMessage(null)

    const timeoutId = window.setTimeout(() => {
      itemRefs.current[focusOrderId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 120)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [focusOrderId, items])

  React.useEffect(() => {
    const socket: Socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
    })

    const markSocketDisconnected = () => {
      setSocketConnected(false)
      setPollingEnabled(true)
      setStabilityTimerActive(false)
      shouldToastOnStableReconnectRef.current = true

      if (stabilityTimerRef.current) {
        window.clearTimeout(stabilityTimerRef.current)
        stabilityTimerRef.current = null
      }
    }

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('staff:join_restaurant', { restaurantId })

      if (stabilityTimerRef.current) {
        window.clearTimeout(stabilityTimerRef.current)
      }

      setStabilityTimerActive(true)
      stabilityTimerRef.current = window.setTimeout(() => {
        setPollingEnabled(false)
        setStabilityTimerActive(false)
        if (shouldToastOnStableReconnectRef.current) {
          toast.success('Canli baglanti yeniden kuruldu.')
        }
        shouldToastOnStableReconnectRef.current = false
        void refresh()
      }, 5000)
    })

    socket.on('staff:joined_restaurant', () => {
      void refresh()
    })

    socket.on('ops:guest_order_submitted', () => {
      toast.success('Yeni misafir siparisi geldi.')
      playOrderAlert()
      void refresh()
    })

    socket.on(
      'ops:guest_order_converted',
      (payload: { guestOrderId?: string }) => {
        if (payload.guestOrderId) {
          setItems((current) =>
            current.filter((item) => item.id !== payload.guestOrderId),
          )
        } else {
          void refresh()
        }
      },
    )

    socket.on('disconnect', markSocketDisconnected)
    socket.on('connect_error', markSocketDisconnected)

    return () => {
      if (stabilityTimerRef.current) {
        window.clearTimeout(stabilityTimerRef.current)
      }
      socket.disconnect()
    }
  }, [playOrderAlert, refresh, restaurantId])

  const approve = async (id: string) => {
    setApprovingOrderId(id)

    try {
      await guestStaffApi.approveOrder(id)
      setItems((current) => current.filter((item) => item.id !== id))
      if (notificationId && focusOrderId === id) {
        void markNotificationRead(notificationId)
      }
      toast.success('Misafir siparisi onaylandi.')
    } catch (error) {
      console.error('[GuestApprovals] Approve failed:', error)
      const status = (error as { response?: { status?: number } })?.response?.status

      if (status === 409) {
        toast.error('Bu siparis baska bir operator tarafindan zaten islendi.')
        await refresh()
      } else {
        toast.error('Onay islemi basarisiz oldu.')
      }
    } finally {
      setApprovingOrderId(null)
    }
  }

  const reject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Red nedeni zorunludur.')
      return
    }

    setProcessingRejectOrderId(id)

    try {
      await guestStaffApi.rejectOrder(id, rejectReason.trim())
      setItems((current) => current.filter((item) => item.id !== id))
      setRejectOrderId(null)
      setRejectReason('')
      if (notificationId && focusOrderId === id) {
        void markNotificationRead(notificationId)
      }
      await refresh()
      toast.success('Misafir siparisi reddedildi.')
    } catch (error) {
      console.error('[GuestApprovals] Reject failed:', error)
      const status = (error as { response?: { status?: number } })?.response?.status

      if (status === 409) {
        toast.error('Bu siparis baska bir operator tarafindan zaten islendi.')
        setRejectOrderId(null)
        setRejectReason('')
        await refresh()
      } else {
        toast.error('Red islemi basarisiz oldu.')
      }
    } finally {
      setProcessingRejectOrderId(null)
    }
  }

  const content = (
    <>
      {!socketConnected ? (
        <div className="mb-4">
          <GuestStatusBanner
            variant="warning"
            title="Canli baglanti kesildi"
            description="Liste periyodik olarak yenileniyor."
          />
        </div>
      ) : null}

      {focusMessage ? (
        <div className="mb-4">
          <GuestStatusBanner
            title="Odaklanan siparis bulunamadi"
            description={focusMessage}
          />
        </div>
      ) : null}

      <div className="grid gap-4">
        {items.length ? (
          items.map((item) => (
            <section
              key={item.id}
              ref={(node) => {
                itemRefs.current[item.id] = node
              }}
              className={`rounded-sm border bg-white p-5 ${
                focusOrderId === item.id
                  ? 'border-amber-400 ring-2 ring-amber-200'
                  : 'border-border-light'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    {item.table?.name || 'Masa'}
                  </p>
                  <p className="mt-2 text-lg font-black uppercase tracking-tight text-text-primary">
                    {formatCurrency(item.totalAmount)}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm font-bold text-text-secondary">
                      Not: {item.notes}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-2">
                    {item.items.map((orderItem, index) => (
                      <div
                        key={`${orderItem.menuItemId}-${index}`}
                        className="grid grid-cols-[minmax(0,1fr)_60px_120px] gap-3"
                      >
                        <span className="truncate text-sm font-bold text-text-primary">
                          {orderItem.name}
                        </span>
                        <span className="text-right text-sm font-bold text-text-secondary">
                          {orderItem.quantity}
                        </span>
                        <span className="text-right text-sm font-black text-text-primary">
                          {formatCurrency(orderItem.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-3">
                  {rejectOrderId === item.id ? (
                    <>
                      <textarea
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        placeholder="Red nedeni"
                        className="min-h-24 w-full rounded-sm border border-border-light bg-bg-surface px-4 py-3 text-sm font-bold text-text-primary outline-none"
                      />
                      <div className="flex gap-3">
                        <Button
                          variant="danger"
                          className="flex-1"
                          onClick={() => void reject(item.id)}
                          isLoading={processingRejectOrderId === item.id}
                          disabled={processingRejectOrderId === item.id}
                        >
                          Reddi Onayla
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setRejectOrderId(null)
                            setRejectReason('')
                          }}
                          disabled={processingRejectOrderId === item.id}
                        >
                          Vazgec
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        variant="success"
                        className="flex-1"
                        onClick={() => void approve(item.id)}
                        isLoading={approvingOrderId === item.id}
                        disabled={
                          approvingOrderId === item.id ||
                          processingRejectOrderId === item.id
                        }
                      >
                        Onayla
                      </Button>
                      <Button
                        variant="danger"
                        className="flex-1"
                        onClick={() => {
                          setRejectOrderId(item.id)
                          setRejectReason('')
                        }}
                        disabled={
                          approvingOrderId === item.id ||
                          processingRejectOrderId === item.id
                        }
                      >
                        Reddet
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-sm border border-border-light bg-white p-6 text-sm font-bold text-text-secondary">
            Bekleyen misafir siparisi bulunmuyor.
          </div>
        )}
      </div>
    </>
  )

  if (mode === 'modal') {
    return <div className="space-y-4">{content}</div>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-app">
      <SubHeaderSection
        title="MISAFIR SIPARIS ONAYLARI"
        description="QR ile gelen siparisleri inceleyin, onaylayin veya gerekceli sekilde reddedin. Bekleyen siparisler manuel aksiyon bekler."
        moduleColor="bg-amber-600"
        isConnected={socketConnected}
        isSyncing={isLoading || stabilityTimerActive}
        onRefresh={() => void refresh()}
      />

      <main className="flex min-h-0 flex-1 flex-col pb-6">
        <BodySection className="overflow-auto bg-transparent p-0 shadow-none">
          {content}
        </BodySection>
      </main>
    </div>
  )
}
