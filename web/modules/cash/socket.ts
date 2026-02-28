// ============================================
// CASH MODULE SOCKET EVENTS
// Real-time event handling for cash operations
// ============================================

/**
 * Socket events for cash module
 */
export enum CashSocketEvents {
  CASH_MOVEMENT_CREATED = 'CASH_MOVEMENT_CREATED',
  CASH_SESSION_OPENED = 'CASH_SESSION_OPENED',
  CASH_SESSION_CLOSED = 'CASH_SESSION_CLOSED',
  CASH_BALANCE_UPDATED = 'CASH_BALANCE_UPDATED',
  TIP_RECEIVED = 'TIP_RECEIVED',
}

/**
 * Cash movement created event payload
 */
export interface CashMovementCreatedPayload {
  sessionId: string
  restaurantId: string
  movementId: string
  newBalance?: number
  amount: number
  type: string
  isLiquid: boolean
}

/**
 * Tip received event payload
 */
export interface TipReceivedPayload {
  sessionId: string
  restaurantId: string
  orderId: string
  tipAmount: number
  paymentMethod: 'cash' | 'card'
  isLiquid: boolean
}

/**
 * Cash session opened event payload
 */
export interface CashSessionOpenedPayload {
  sessionId: string
  registerId: string
  restaurantId: string
  openingBalance: number
}

/**
 * Cash session closed event payload
 */
export interface CashSessionClosedPayload {
  sessionId: string
  registerId: string
  restaurantId: string
  closingBalance: number
  difference: number
}

/**
 * Cash balance updated event payload
 */
export interface CashBalanceUpdatedPayload {
  sessionId: string
  restaurantId: string
  newBalance: number
}

// ============================================
// SOCKET EVENT EMITTERS
// ============================================

/**
 * Emit cash movement created event
 * Called from payment flow after successful payment
 */
export const emitCashMovementCreated = (payload: CashMovementCreatedPayload): void => {
  // Socket emit would go here
  // socket.emit(CashSocketEvents.CASH_MOVEMENT_CREATED, payload)
  console.log('[Cash Socket] Movement created:', payload)
}

/**
 * Emit tip received event
 * Called from payment flow when a tip is added
 */
export const emitTipReceived = (payload: TipReceivedPayload): void => {
  // Socket emit would go here
  // socket.emit(CashSocketEvents.TIP_RECEIVED, payload)
  console.log('[Cash Socket] Tip received:', payload)
}

/**
 * Emit cash session opened event
 * Called when a new session is opened
 */
export const emitCashSessionOpened = (payload: CashSessionOpenedPayload): void => {
  // Socket emit would go here
  // socket.emit(CashSocketEvents.CASH_SESSION_OPENED, payload)
  console.log('[Cash Socket] Session opened:', payload)
}

/**
 * Emit cash session closed event
 * Called when a session is closed
 */
export const emitCashSessionClosed = (payload: CashSessionClosedPayload): void => {
  // Socket emit would go here
  // socket.emit(CashSocketEvents.CASH_SESSION_CLOSED, payload)
  console.log('[Cash Socket] Session closed:', payload)
}

// ============================================
// SOCKET EVENT LISTENERS
// ============================================

export type CashEventCallback<T> = (data: T) => void

/**
 * Setup cash event listeners
 * Returns cleanup function
 */
export const setupCashEventListeners = (
  callbacks: {
    onMovementCreated?: CashEventCallback<CashMovementCreatedPayload>
    onTipReceived?: CashEventCallback<TipReceivedPayload>
    onSessionOpened?: CashEventCallback<CashSessionOpenedPayload>
    onSessionClosed?: CashEventCallback<CashSessionClosedPayload>
    onBalanceUpdated?: CashEventCallback<CashBalanceUpdatedPayload>
  }
): (() => void) => {
  // Socket listener setup would go here
  // const cleanup: (() => void)[] = []
  //
  // if (callbacks.onMovementCreated) {
  //   socket.on(CashSocketEvents.CASH_MOVEMENT_CREATED, callbacks.onMovementCreated)
  //   cleanup.push(() => socket.off(CashSocketEvents.CASH_MOVEMENT_CREATED, callbacks.onMovementCreated))
  // }
  //
  // if (callbacks.onTipReceived) {
  //   socket.on(CashSocketEvents.TIP_RECEIVED, callbacks.onTipReceived)
  //   cleanup.push(() => socket.off(CashSocketEvents.TIP_RECEIVED, callbacks.onTipReceived))
  // }
  //
  // ... etc

  // Return cleanup function
  return () => {
    // Cleanup all listeners
    console.log('[Cash Socket] Cleaning up listeners')
  }
}

// ============================================
// DEFAULT EXPORTS
// ============================================

export const cashSocket = {
  events: CashSocketEvents,
  emit: {
    movementCreated: emitCashMovementCreated,
    tipReceived: emitTipReceived,
    sessionOpened: emitCashSessionOpened,
    sessionClosed: emitCashSessionClosed,
  },
  setupListeners: setupCashEventListeners,
}

export default cashSocket
