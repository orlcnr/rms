'use client'

import React from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

function getSocketUrl() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost/api/v1'
  const url = new URL(apiUrl)
  return `${url.protocol}//${url.host}/guest`
}

interface UseGuestSocketOptions {
  token: string | null
  onSessionRevoked?: (reason: string) => void
  onOrderStatusChanged?: () => void
  onTableRefresh?: () => void
}

export function useGuestSocket({
  token,
  onSessionRevoked,
  onOrderStatusChanged,
  onTableRefresh,
}: UseGuestSocketOptions) {
  React.useEffect(() => {
    if (!token) {
      return
    }

    const socket: Socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      auth: {
        token,
      },
    })

    socket.on('connect', () => {
      socket.emit('guest:join')
    })

    socket.on('guest:session:revoked', (payload: { reason?: string }) => {
      onSessionRevoked?.(payload.reason || 'session_revoked')
    })

    socket.on('guest:order:status_changed', () => {
      onOrderStatusChanged?.()
    })

    socket.on('guest:table:refresh', () => {
      onTableRefresh?.()
    })

    socket.on(
      'guest:bill:status',
      (payload: { message?: string; status?: string }) => {
        if (payload.message) {
          toast.success(payload.message)
        } else if (payload.status === 'paid') {
          toast.success('Masa ödemesi tamamlandı.')
        }
      },
    )

    socket.on(
      'guest:order:approved',
      (payload: { message?: string }) => {
        if (payload.message) {
          toast.success(payload.message)
        }
        onOrderStatusChanged?.()
        onTableRefresh?.()
      },
    )

    socket.on(
      'guest:order:rejected',
      (payload: { message?: string; rejectedReason?: string }) => {
        toast.error(payload.message || 'Siparisiniz reddedildi.')
        if (payload.rejectedReason) {
          toast.error(`Gerekce: ${payload.rejectedReason}`)
        }
        onOrderStatusChanged?.()
        onTableRefresh?.()
      },
    )
    return () => {
      socket.disconnect()
    }
  }, [onOrderStatusChanged, onSessionRevoked, onTableRefresh, token])
}
