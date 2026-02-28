# Rezervasyon Modülü Migration Planı

> Bu doküman, frontend klasöründeki rezervasyon modülünün web klasörüne taşınması ve web mimari standartlarına uygun hale getirilmesi için yapılması gereken değişiklikleri içerir.

---

## Özet

### Amaç

`frontend/modules/reservations/` klasöründe bulunan rezervasyon modülünü `web/modules/reservations/` klasörüne taşımak ve mevcut web modülleri (orders, tables, customers gibi) ile aynı elden çıkmış gibi yeniden yazmak.

### Mevcut Durum

**Frontend Rezervasyon Modülü Yapısı:**
```
frontend/modules/reservations/
├── service.ts                          # API çağrıları ve tipler
└── components/
    ├── ReservationModal.tsx           # Rezervasyon oluşturma/düzenleme modalı
    ├── WeeklyView.tsx                  # Haftalık görünüm
    ├── MonthlyView.tsx                 # Aylık görünüm (FullCalendar)
    ├── AgendaView.tsx                  # Günlük ajanda görünümü
    └── ReservationAlert.tsx            # Masa rezervasyon uyarısı
```

**Hedef Web Modül Yapısı:**
```
web/modules/reservations/
├── types.ts                            #, enumlar, label'lar, Zod şem Tüm tipleraları
├── services/
│   └── reservations.service.ts        # API çağrıları
├── store/
│   └── reservations.store.ts           # Zustand store + selectors + optimistic updates
├── components/
│   ├── ReservationClient.tsx          # Ana sayfa bileşeni
│   ├── ReservationModal.tsx            # Rezervasyon modalı (react-hook-form + Zod)
│   ├── WeeklyView.tsx                  # Haftalık görünüm (custom)
│   ├── MonthlyView.tsx                 # Aylık görünüm (react-day-picker)
│   ├── AgendaView.tsx                  # Günlük ajanda (custom)
│   ├── ReservationAlert.tsx            # Rezervasyon uyarısı
│   └── ReservationCard.tsx             # Rezervasyon kartı
├── hooks/
│   ├── useReservations.ts             # Rezervasyon hook'u + optimistic updates
│   ├── useReservationConflicts.ts      # Çakışma kontrolü hook'u
│   └── useReservationSelectors.ts      # Optimized selectors (yeni)
├── utils/
│   ├── date-utils.ts                   # Tarih yardımcıları
│   └── reservation.utils.ts            # Rezervasyon yardımcı fonksiyonları
└── validations/
    └── reservation.schema.ts           # Zod şemaları
```

---

## Etkilenecek Dosyalar

### Oluşturulacak Dosyalar

| Dosya | Açıklama |
|--------|-----------|
| `web/modules/reservations/types.ts` | Tüm tipler, enumlar, label'lar |
| `web/modules/reservations/services/reservations.service.ts` | API çağrıları |
| `web/modules/reservations/store/reservations.store.ts` | Zustand store + selectors + optimistic updates |
| `web/modules/reservations/components/ReservationClient.tsx` | Ana sayfa bileşeni |
| `web/modules/reservations/components/ReservationCard.tsx` | Rezervasyon kartı |
| `web/modules/reservations/hooks/useReservations.ts` | React hook + optimistic updates |
| `web/modules/reservations/hooks/useReservationConflicts.ts` | Çakışma kontrolü hook'u |
| `web/modules/reservations/hooks/useReservationSelectors.ts` | Optimized selectors |
| `web/modules/reservations/utils/date-utils.ts` | Tarih yardımcıları |
| `web/modules/reservations/utils/reservation.utils.ts` | Rezervasyon yardımcıları |
| `web/modules/reservations/validations/reservation.schema.ts` | Zod şemaları |
| `web/app/(main)/reservations/page.tsx` | Rezervasyon sayfası |

### Güncellenecek Dosyalar

| Dosya | Açıklama |
|--------|-----------|
| `web/modules/shared/components/Sidebar.tsx` | Rezervasyon menüsü eklenecek |
| `web/modules/dashboard/components/UpcomingReservations.tsx` | Dashboard rezervasyon widget'ı (entegrasyyon) |
| `web/modules/tables/components/TableCard.tsx` | Rezervasyon uyarısı için store kullanımı |

### Backend İlişkili Dosyalar

| Dosya | Açıklama |
|--------|-----------|
| `backend/src/modules/reservations/entities/reservation.entity.ts` | Entity referans |
| `backend/src/modules/reservations/reservations.service.ts` | Service referans |
| `backend/src/modules/reservations/reservations.controller.ts` | API endpoints referans |

---

## Adım Adım Değişiklikler

### Adım 1: types.ts ve Zod Şemaları Oluştur

**Dosya:** `web/modules/reservations/types.ts`

Backend entity'sine uygun tipler oluştur:

```typescript
import { BaseEntity } from '@/modules/shared/types'

// ============================================
// ENUMS (Backend'den)
// ============================================

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

// ============================================
// STATUS MAPPING & LABELS
// ============================================

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: 'Bekliyor',
  [ReservationStatus.CONFIRMED]: 'Onaylandı',
  [ReservationStatus.COMPLETED]: 'Tamamlandı',
  [ReservationStatus.CANCELLED]: 'İptal Edildi',
  [ReservationStatus.NO_SHOW]: 'Gelmedi',
}

export const RESERVATION_STATUS_CONFIG = {
  [ReservationStatus.PENDING]: {
    label: 'Bekliyor',
    color: 'warning' as const,
  },
  [ReservationStatus.CONFIRMED]: {
    label: 'Onaylandı',
    color: 'success' as const,
  },
  [ReservationStatus.COMPLETED]: {
    label: 'Tamamlandı',
    color: 'success' as const,
  },
  [ReservationStatus.CANCELLED]: {
    label: 'İptal',
    color: 'danger' as const,
  },
  [ReservationStatus.NO_SHOW]: {
    label: 'Gelmedi',
    color: 'danger' as const,
  },
}

// ============================================
// TYPES
// ============================================

export interface Reservation extends BaseEntity {
  customer_id: string
  customer?: {
    id: string
    first_name: string
    last_name: string
    phone: string
  }
  table_id: string
  table?: {
    id: string
    name: string
    table_number?: string
  }
  reservation_time: string
  guest_count: number
  prepayment_amount: number
  status: ReservationStatus
  notes?: string
}

export interface CreateReservationDto {
  customer_id: string
  table_id: string
  reservation_time: string
  guest_count: number
  prepayment_amount?: number
  notes?: string
}

export interface UpdateReservationDto extends Partial<CreateReservationDto> {
  status?: ReservationStatus
}

// ============================================
// API PARAMETERS
// ============================================

export interface GetReservationsParams {
  date?: string
  startDate?: string
  endDate?: string
}

export interface GetReservationsQueryParams extends GetReservationsParams {
  restaurantId: string
}

// ============================================
// CONFLICT TYPES
// ============================================

export interface ReservationConflict {
  hasConflict: boolean
  conflictingReservation?: Reservation
  message?: string
}

// ============================================
// OPTIMISTIC UPDATE TYPES
// ============================================

export interface PendingUpdate {
  reservationId: string
  previousState: Reservation
  timestamp: number
}
```

**Dosya:** `web/modules/reservations/validations/reservation.schema.ts`

Zod validation şemaları oluştur:

```typescript
import { z } from 'zod'

// UUID regex kontrolü
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Geçerli rezervasyon durumları
const reservationStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const

// Rezervasyon oluşturma şeması
export const createReservationSchema = z.object({
  customer_id: z.string()
    .min(1, 'Müşteri seçilmelidir')
    .regex(UUID_REGEX, 'Geçerli bir müşteri ID olmalıdır'),
  table_id: z.string()
    .min(1, 'Masa seçilmelidir')
    .regex(UUID_REGEX, 'Geçerli bir masa ID olmalıdır'),
  reservation_time: z.string().refine((val) => {
    const date = new Date(val)
    const now = new Date()
    // Geçmiş tarihe izin verme
    return date > now
  }, 'Geçmiş tarihe rezervasyon yapılamaz'),
  guest_count: z.number()
    .min(1, 'En az 1 kişi olmalıdır')
    .max(50, 'Maksimum 50 kişi olabilir'),
  prepayment_amount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
})

// Hızlı müşteri oluşturma şeması (modal içinde)
export const quickCustomerSchema = z.object({
  first_name: z.string().min(1, 'Ad zorunludur').max(50),
  last_name: z.string().max(50).optional(),
  phone: z.string()
    .min(10, 'Geçerli bir telefon numarası giriniz')
    .regex(/^[0-9+\s()-]+$/, 'Geçersiz telefon formatı'),
  email: z.string().email('Geçerli bir email giriniz').optional().or(z.literal('')),
})

// Dinamik schema oluşturucu - müşteri seçili mi yoksa yeni müşteri mi
export const createReservationSchemaWithCustomer = (hasCustomer: boolean, hasNewCustomer: boolean) => {
  let schema = createReservationSchema
  
  if (!hasCustomer && !hasNewCustomer) {
    // Şemaya customer_id validation'ı ekle ama esnek tut
    return schema.extend({
      customer_id: z.string().min(1, 'Müşteri seçilmeli veya yeni oluşturulmalıdır'),
    })
  }
  
  return schema
}

// Rezervasyon güncelleme şeması
export const updateReservationSchema = createReservationSchema.partial().extend({
  status: z.enum(reservationStatuses).optional(),
}).refine((data) => {
  // Eğer status değişmiyorsa, en az bir alan değişmeli
  if (data.status === undefined) {
    return Object.keys(data).length > 0
  }
  return true
}, 'En az bir alan güncellenmelidir')

// Form için tip çıkarımı
export type CreateReservationFormData = z.infer<typeof createReservationSchema>
export type UpdateReservationFormData = z.infer<typeof updateReservationSchema>
export type QuickCustomerFormData = z.infer<typeof quickCustomerSchema>

// Validation helper fonksiyonları
export function validateReservationTime(time: string): { valid: boolean; message?: string } {
  const date = new Date(time)
  const now = new Date()
  const maxAdvanceDays = 90 // 90 gün sonrasına kadar
  
  if (date < now) {
    return { valid: false, message: 'Geçmiş tarihe rezervasyon yapılamaz' }
  }
  
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays)
  
  if (date > maxDate) {
    return { valid: false, message: `En fazla ${maxAdvanceDays} gün sonrasına rezervasyon yapılabilir` }
  }
  
  return { valid: true }
}

export function validateGuestCount(count: number): { valid: boolean; message?: string } {
  if (count < 1) {
    return { valid: false, message: 'En az 1 kişi olmalıdır' }
  }
  if (count > 50) {
    return { valid: false, message: 'Maksimum 50 kişi olabilir' }
  }
  return { valid: true }
}
```

### Adım 2: Services Oluştur

**Dosya:** `web/modules/reservations/services/reservations.service.ts`

```typescript
import { http } from '@/modules/shared/api/http'
import { 
  Reservation, 
  CreateReservationDto, 
  UpdateReservationDto,
  GetReservationsQueryParams 
} from '../types'

export const reservationsApi = {
  getAll: async (params: GetReservationsQueryParams) => {
    const { restaurantId, ...queryParams } = params
    const searchParams = new URLSearchParams()
    
    if (queryParams.date) searchParams.append('date', queryParams.date)
    if (queryParams.startDate) searchParams.append('startDate', queryParams.startDate)
    if (queryParams.endDate) searchParams.append('endDate', queryParams.endDate)
    
    const queryString = searchParams.toString()
    const url = `/reservations${queryString ? `?${queryString}` : ''}`
    
    return http.get<Reservation[]>(url, {
      params: { restaurantId },
    })
  },

  create: async (data: CreateReservationDto) => {
    return http.post<Reservation>('/reservations', data)
  },

  update: async (id: string, data: Partial<UpdateReservationDto>) => {
    return http.patch<Reservation>(`/reservations/${id}`, data)
  },

  updateStatus: async (id: string, status: string) => {
    return http.patch<Reservation>(`/reservations/${id}/status`, { status })
  },

  delete: async (id: string) => {
    return http.delete<void>(`/reservations/${id}`)
  },
}
```

### Adım 3: Zustand Store Oluştur (Global State + Selectors + Optimistic Updates)

**Dosya:** `web/modules/reservations/store/reservations.store.ts`

```typescript
import { create } from 'zustand'
import { Reservation, ReservationStatus, PendingUpdate } from '../types'

// ============================================
// RESERVATIONS STORE
// Neden Zustand?
// - Tables sayfasında rezervasyon verisine erişim gerekiyor
// - Real-time güncellemeler için merkezi state
// - Performans için sayfa yenilemesi gerekmiyor
// ============================================

interface ReservationsState {
  // State
  reservations: Reservation[]
  selectedDate: string
  isLoading: boolean
  error: Error | null
  
  // Optimistic Updates için
  pendingUpdates: Map<string, PendingUpdate>
  
  // Actions
  setReservations: (reservations: Reservation[]) => void
  addReservation: (reservation: Reservation) => void
  updateReservation: (id: string, data: Partial<Reservation>) => void
  removeReservation: (id: string) => void
  setSelectedDate: (date: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  
  // Optimistic Update Actions
  optimisticUpdate: (id: string, data: Partial<Reservation>) => void
  commitUpdate: (id: string) => void
  rollbackUpdate: (id: string) => void
  clearPendingUpdates: () => void
  
  // Selectors (store içinde computed - performans için)
  getReservationsByDate: (date: string) => Reservation[]
  getReservationsByTable: (tableId: string) => Reservation[]
  getActiveReservations: () => Reservation[]
  getUpcomingReservations: (minutes: number) => Reservation[]
}

export const useReservationsStore = create<ReservationsState>((set, get) => ({
  // Initial State
  reservations: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  error: null,
  pendingUpdates: new Map(),
  
  // Actions
  setReservations: (reservations) => set({ reservations }),
  
  addReservation: (reservation) => set((state) => ({
    reservations: [...state.reservations, reservation]
  })),
  
  updateReservation: (id, data) => set((state) => ({
    reservations: state.reservations.map((res) =>
      res.id === id ? { ...res, ...data } : res
    )
  })),
  
  removeReservation: (id) => set((state) => ({
    reservations: state.reservations.filter((res) => res.id !== id)
  })),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // ============================================
  // OPTIMISTIC UPDATE IMPLEMENTATION
  // ============================================
  
  optimisticUpdate: (id, data) => set((state) => {
    const reservation = state.reservations.find(r => r.id === id)
    if (!reservation) return state
    
    // Önceki durumu kaydet
    const newPendingUpdates = new Map(state.pendingUpdates)
    newPendingUpdates.set(id, {
      reservationId: id,
      previousState: { ...reservation },
      timestamp: Date.now(),
    })
    
    return {
      reservations: state.reservations.map((res) =>
        res.id === id ? { ...res, ...data } : res
      ),
      pendingUpdates: newPendingUpdates,
    }
  }),
  
  commitUpdate: (id) => set((state) => {
    const newPendingUpdates = new Map(state.pendingUpdates)
    newPendingUpdates.delete(id)
    
    return {
      pendingUpdates: newPendingUpdates,
    }
  }),
  
  rollbackUpdate: (id) => set((state) => {
    const pending = state.pendingUpdates.get(id)
    if (!pending) return state
    
    const newPendingUpdates = new Map(state.pendingUpdates)
    newPendingUpdates.delete(id)
    
    return {
      reservations: state.reservations.map((res) =>
        res.id === id ? pending.previousState : res
      ),
      pendingUpdates: newPendingUpdates,
    }
  }),
  
  clearPendingUpdates: () => set({ pendingUpdates: new Map() }),
  
  // ============================================
  // COMPUTED SELECTORS (Store içinde)
  // ============================================
  
  getReservationsByDate: (date) => {
    const { reservations } = get()
    return reservations.filter((res) => {
      const resDate = new Date(res.reservation_time).toISOString().split('T')[0]
      return resDate === date
    })
  },
  
  getReservationsByTable: (tableId) => {
    const { reservations } = get()
    return reservations.filter((res) => res.table_id === tableId)
  },
  
  getActiveReservations: () => {
    const { reservations } = get()
    return reservations.filter((res) =>
      res.status === ReservationStatus.PENDING ||
      res.status === ReservationStatus.CONFIRMED
    )
  },
  
  getUpcomingReservations: (minutes) => {
    const { reservations } = get()
    const now = new Date()
    const future = new Date(now.getTime() + minutes * 60 * 1000)
    
    return reservations.filter((res) => {
      const resTime = new Date(res.reservation_time)
      return resTime > now && resTime <= future &&
        (res.status === ReservationStatus.PENDING || res.status === ReservationStatus.CONFIRMED)
    })
  },
}))
```

### Adım 4: Optimized Selectors Hook Oluştur

**Dosya:** `web/modules/reservations/hooks/useReservationSelectors.ts`

```typescript
import { useMemo } from 'react'
import { useReservationsStore } from '../store/reservations.store'
import { Reservation } from '../types'

// ============================================
// OPTIMIZED SELECTORS
// Performans için useMemo ile sarmalanmış seçiciler
// TableCard gibi çok sayıda render edilen bileşenlerde kullanılmalı
// ============================================

/**
 * Belirli bir tarihteki rezervasyonları döndürür
 * useMemo ile optimize edilmiş - sadece reservations veya date değişince recalculate eder
 */
export function useReservationsByDate(date: string): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)
  
  return useMemo(() => {
    return reservations.filter((res) => {
      const resDate = new Date(res.reservation_time).toISOString().split('T')[0]
      return resDate === date
    })
  }, [reservations, date])
}

/**
 * Belirli bir masadaki rezervasyonları döndürür
 */
export function useReservationsByTable(tableId: string): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)
  
  return useMemo(() => {
    return reservations.filter((res) => res.table_id === tableId)
  }, [reservations, tableId])
}

/**
 * Aktif (pending/confirmed) rezervasyonları döndürür
 */
export function useActiveReservations(): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)
  
  return useMemo(() => {
    return reservations.filter((res) =>
      res.status === 'pending' || res.status === 'confirmed'
    )
  }, [reservations])
}

/**
 * Yaklaşan rezervasyonları döndürür (belirli dakika içinde)
 */
export function useUpcomingReservations(minutes: number = 30): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)
  
  return useMemo(() => {
    const now = new Date()
    const future = new Date(now.getTime() + minutes * 60 * 1000)
    
    return reservations.filter((res) => {
      const resTime = new Date(res.reservation_time)
      return resTime > now && resTime <= future &&
        (res.status === 'pending' || res.status === 'confirmed')
    })
  }, [reservations, minutes])
}

/**
 * Belirli bir masanın yaklaşan rezervasyonlarını döndürür (TableCard için)
 */
export function useTableUpcomingReservations(tableId: string, minutes: number = 30): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)
  
  return useMemo(() => {
    const now = new Date()
    const future = new Date(now.getTime() + minutes * 60 * 1000)
    
    return reservations.filter((res) => {
      if (res.table_id !== tableId) return false
      const resTime = new Date(res.reservation_time)
      return resTime > now && resTime <= future &&
        (res.status === 'pending' || res.status === 'confirmed')
    })
  }, [reservations, tableId, minutes])
}

/**
 * Belirli bir rezervasyonun güncellenme durumunu döndürür (loading state için)
 */
export function useIsReservationPending(reservationId: string): boolean {
  const pendingUpdates = useReservationsStore((state) => state.pendingUpdates)
  
  return useMemo(() => {
    return pendingUpdates.has(reservationId)
  }, [pendingUpdates, reservationId])
}

/**
 * Toplam istatistikleri döndürür (dashboard için)
 */
export function useReservationStats() {
  const reservations = useReservationsStore((state) => state.reservations)
  
  return useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayReservations = reservations.filter(
      (res) => new Date(res.reservation_time).toISOString().split('T')[0] === today
    )
    
    return {
      total: todayReservations.length,
      pending: todayReservations.filter((r) => r.status === 'pending').length,
      confirmed: todayReservations.filter((r) => r.status === 'confirmed').length,
      completed: todayReservations.filter((r) => r.status === 'completed').length,
      cancelled: todayReservations.filter((r) => r.status === 'cancelled').length,
      noShow: todayReservations.filter((r) => r.status === 'no_show').length,
      totalGuests: todayReservations.reduce((sum, r) => sum + r.guest_count, 0),
    }
  }, [reservations])
}
```

### Adım 5: date-utils ve reservation.utils Güncelle

**Dosya:** `web/modules/reservations/utils/date-utils.ts`

```typescript
// ============================================
// DATE UTILITIES
// Rezervasyon modülü için tarih yardımcı fonksiyonları
// ============================================

export function formatReservationDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatReservationTime(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function formatReservationDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function getDateForApi(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
  }).format(date)
}

export function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date)
  monday.setDate(diff)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

// ============================================
// REZERVASYON ZAMAN HESAPLAMA
// ReservationCard'da kullanılacak dinamik zaman bilgisi
// ============================================

export interface ReservationTimeInfo {
  text: string
  color: 'danger' | 'warning' | 'info' | 'muted'
  isPast: boolean
  isUrgent: boolean
}

export function getReservationTimeInfo(reservationTime: string): ReservationTimeInfo {
  const now = new Date()
  const resDate = new Date(reservationTime)
  const diffMinutes = Math.floor((resDate.getTime() - now.getTime()) / 60000)
  
  // Geçmiş rezervasyonlar
  if (diffMinutes < 0) {
    return {
      text: 'Süresi Geçti',
      color: 'muted',
      isPast: true,
      isUrgent: false,
    }
  }
  
  // 30 dakika veya daha az
  if (diffMinutes <= 30) {
    return {
      text: `${diffMinutes} dk kaldı`,
      color: 'danger',
      isPast: false,
      isUrgent: true,
    }
  }
  
  // 2 saat veya daha az
  if (diffMinutes <= 120) {
    return {
      text: 'Yaklaşıyor',
      color: 'warning',
      isPast: false,
      isUrgent: false,
    }
  }
  
  // 2 saat sonra
  return {
    text: 'Gelecek',
    color: 'info',
    isPast: false,
    isUrgent: false,
  }
}
```

**Dosya:** `web/modules/reservations/utils/reservation.utils.ts`

```typescript
// ============================================
// RESERVATION UTILITIES
// Rezervasyon yardımcı fonksiyonları
// ============================================

import { Reservation, ReservationStatus } from '../types'

// ============================================
// ÇAKIŞMA KONTROLÜ YARDIMCILARI
// ============================================

export interface TimeSlot {
  start: Date
  end: Date
}

/**
 * İki zaman diliminin çakışıp çakışmadığını kontrol eder
 */
export function doTimeSlotsOverlap(
  slot1: TimeSlot,
  slot2: TimeSlot
): boolean {
  return slot1.start < slot2.end && slot1.end > slot2.start
}

/**
 * Rezervasyon için varsayılan süreyi hesapla (2 saat)
 */
export function getDefaultReservationEndTime(startTime: Date): Date {
  return new Date(startTime.getTime() + 2 * 60 * 60 * 1000)
}

/**
 * Belirli bir masanın belirli bir zamandaki çakışma durumunu kontrol eder
 */
export function checkTableConflict(
  reservations: Array<{ 
    id?: string
    table_id: string; 
    reservation_time: string; 
    status: string 
  }>,
  tableId: string,
  reservationTime: string,
  excludeReservationId?: string,
  durationHours: number = 2
): { hasConflict: boolean; conflictingReservation?: any } {
  const newStart = new Date(reservationTime)
  const newEnd = new Date(newStart.getTime() + durationHours * 60 * 60 * 1000)
  
  const activeStatuses = ['pending', 'confirmed']
  
  for (const res of reservations) {
    // Aynı masa değilse veya çıkarılacak rezervasyonsa atla
    if (res.table_id !== tableId) continue
    if (excludeReservationId && res.id === excludeReservationId) continue
    if (!activeStatuses.includes(res.status)) continue
    
    const existingStart = new Date(res.reservation_time)
    const existingEnd = new Date(existingStart.getTime() + 2 * 60 * 60 * 1000)
    
    if (doTimeSlotsOverlap(
      { start: newStart, end: newEnd },
      { start: existingStart, end: existingEnd }
    )) {
      return {
        hasConflict: true,
        conflictingReservation: res,
      }
    }
  }
  
  return { hasConflict: false }
}

// ============================================
// OPTIMISTIC UPDATE YARDIMCILARI
// ============================================

/**
 * Rezervasyon durumunu güncellemek için optimistic update wrapper
 */
export async function withOptimisticUpdate<T>(
  reservationId: string,
  updateData: Partial<Reservation>,
  store: {
    optimisticUpdate: (id: string, data: Partial<Reservation>) => void
    commitUpdate: (id: string) => void
    rollbackUpdate: (id: string) => void
  },
  apiCall: () => Promise<T>
): Promise<T> {
  // 1. Store'u optimistic olarak güncelle
  store.optimisticUpdate(reservationId, updateData)
  
  try {
    // 2. API çağrısını yap
    const result = await apiCall()
    
    // 3. Başarılı - commit yap
    store.commitUpdate(reservationId)
    
    return result
  } catch (error) {
    // 4. Hata - rollback yap
    store.rollbackUpdate(reservationId)
    throw error
  }
}

/**
 * Rezervasyon durumu değiştirmek için yardımcı fonksiyon
 */
export function canChangeStatus(
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus
): boolean {
  const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
    [ReservationStatus.PENDING]: [
      ReservationStatus.CONFIRMED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
    ],
    [ReservationStatus.CONFIRMED]: [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
    ],
    [ReservationStatus.COMPLETED]: [],
    [ReservationStatus.CANCELLED]: [ReservationStatus.PENDING], // Tekrar açabilir
    [ReservationStatus.NO_SHOW]: [ReservationStatus.PENDING],  // Tekrar aktif edebilir
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}
```

### Adım 6: useReservationConflicts Hook Oluştur

**Dosya:** `web/modules/reservations/hooks/useReservationConflicts.ts`

```typescript
import { useMemo, useCallback } from 'react'
import { Reservation } from '../types'
import { checkTableConflict } from '../utils/reservation.utils'

/**
 * Çakışma Kontrolü Hook'u
 * 
 * Kullanım:
 * - ReservationModal'da masa/seat seçildiğinde
 * - Real-time güncellemelerde
 * - Form validation'da
 */
export function useReservationConflicts(reservations: Reservation[]) {
  
  /**
   * Belirli bir masa ve zamandaki çakışmayı kontrol eder
   */
  const checkConflict = useCallback((
    tableId: string,
    reservationTime: string,
    excludeReservationId?: string
  ): { hasConflict: boolean; conflictingReservation?: Reservation } => {
    return checkTableConflict(
      reservations as any,
      tableId,
      reservationTime,
      excludeReservationId
    )
  }, [reservations])
  
  /**
   * Bir masanın tüm rezervasyonlarını döndürür
   */
  const getReservationsForTable = useCallback((
    tableId: string
  ): Reservation[] => {
    return reservations.filter(res => res.table_id === tableId)
  }, [reservations])
  
  /**
   * Belirli bir tarihteki rezervasyonları döndürür
   */
  const getReservationsForDate = useCallback((
    date: string
  ): Reservation[] => {
    return reservations.filter(res => {
      const resDate = new Date(res.reservation_time).toISOString().split('T')[0]
      return resDate === date
    })
  }, [reservations])
  
  /**
   * Bir masanın belirli bir tarihteki müsaitlik durumunu kontrol eder
   */
  const getAvailableTimeSlots = useCallback((
    tableId: string,
    date: string,
    startHour: number = 9,
    endHour: number = 23,
    slotDuration: number = 30 // 30 dakika aralıklarla
  ): { time: string; available: boolean }[] => {
    const slots: { time: string; available: boolean }[] = []
    const dateReservations = reservations.filter(res => {
      const resDate = new Date(res.reservation_time).toISOString().split('T')[0]
      return res.table_id === tableId && resDate === date &&
        ['pending', 'confirmed'].includes(res.status)
    })
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        const checkTime = new Date(`${date}T${timeString}:00`)
        
        const hasConflict = checkTableConflict(
          dateReservations as any,
          tableId,
          checkTime.toISOString()
        ).hasConflict
        
        slots.push({
          time: timeString,
          available: !hasConflict,
        })
      }
    }
    
    return slots
  }, [reservations])
  
  return {
    checkConflict,
    getReservationsForTable,
    getReservationsForDate,
    getAvailableTimeSlots,
  }
}
```

### Adım 7: useReservations Hook Oluştur (Optimistic Updates + Socket.io)

**Dosya:** `web/modules/reservations/hooks/useReservations.ts`

```typescript
import { useEffect, useCallback } from 'react'
import { useReservationsStore } from '../store/reservations.store'
import { reservationsApi } from '../services/reservations.service'
import { Reservation, ReservationStatus, GetReservationsParams, CreateReservationDto } from '../types'
import { withOptimisticUpdate } from '../utils/reservation.utils'

/**
 * Rezervasyon Hook'u
 * 
 * Özellikler:
 * - API veri çekme
 * - Store güncelleme
 * - Socket.io real-time güncellemeleri
 * - Optimistic updates
 */
export function useReservations(restaurantId: string, params?: GetReservationsParams) {
  const {
    reservations,
    isLoading,
    error,
    setReservations,
    addReservation,
    updateReservation,
    removeReservation,
    setLoading,
    setError,
    getUpcomingReservations,
    optimisticUpdate,
    commitUpdate,
    rollbackUpdate,
  } = useReservationsStore()

  const fetchReservations = useCallback(async () => {
    if (!restaurantId) return
    
    setLoading(true)
    try {
      const data = await reservationsApi.getAll({
        restaurantId,
        ...params,
      })
      setReservations(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, params, setReservations, setLoading, setError])

  // İlk yükleme
  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  // ============================================
  // OPTIMISTIC STATUS UPDATE
  // ReservationCard'dan çağrılacak
  // ============================================
  
  const updateStatusOptimistic = useCallback(async (
    reservationId: string,
    newStatus: ReservationStatus
  ): Promise<void> => {
    const store = {
      optimisticUpdate,
      commitUpdate,
      rollbackUpdate,
    }
    
    await withOptimisticUpdate(
      reservationId,
      { status: newStatus },
      store,
      () => reservationsApi.updateStatus(reservationId, newStatus)
    )
  }, [optimisticUpdate, commitUpdate, rollbackUpdate])

  // ============================================
  // REAL-TIME GÜNCELLEME (Socket.io)
  // Backend'den gelen webhook/event dinleyicisi
  // ============================================
  useEffect(() => {
    if (!restaurantId) return

    // Socket.io listener'ları (örnek - gerçek implementasyon socket.ts'e göre)
    const handleNewReservation = (reservation: Reservation) => {
      addReservation(reservation)
    }

    const handleUpdateReservation = (data: { id: string; changes: Partial<Reservation> }) => {
      updateReservation(data.id, data.changes)
    }

    const handleDeleteReservation = (id: string) => {
      removeReservation(id)
    }

    // Socket event'lerini dinle
    // socket.on('reservation:created', handleNewReservation)
    // socket.on('reservation:updated', handleUpdateReservation)
    // socket.on('reservation:deleted', handleDeleteReservation)

    // Cleanup
    // return () => {
    //   socket.off('reservation:created', handleNewReservation)
    //   socket.off('reservation:updated', handleUpdateReservation)
    //   socket.off('reservation:deleted', handleDeleteReservation)
    // }
  }, [restaurantId, addReservation, updateReservation, removeReservation])

  return {
    reservations,
    isLoading,
    error,
    refetch: fetchReservations,
    addReservation,
    updateReservation,
    removeReservation,
    getUpcomingReservations,
    updateStatusOptimistic, // ✅ Yeni: Optimistic status update
  }
}
```

### Adım 8: ReservationModal Güncelle (react-hook-form + Zod + Conflict Check)

**Dosya:** `web/modules/reservations/components/ReservationModal.tsx`

Frontend'den uyarlanacak ancak şu değişikliklerle:

- Web'in shared component'lerini kullan (Modal, Button, Input yerine FormInput)
- **react-hook-form** kullanarak form yönetimi
- **Zod** şeması ile validation (`.string().uuid()` dahil)
- **Client-side çakışma kontrolü** (useReservationConflicts hook)
- Design token'ları kullan
- Maksimum 200 satır kuralına uy
- Customer arama için web'in customers service'ini kullan
- Masa seçimi için web'in tables service'ini kullan

**Örnek: Çakışma Kontrolü + Form Validation**
```typescript
// ReservationModal.tsx içinde

// Form setup
const { 
  register, 
  handleSubmit, 
  watch, 
  setValue,
  setError, 
  clearErrors,
  formState: { errors } 
} = useForm<CreateReservationFormData>({
  resolver: zodResolver(createReservationSchema),
  defaultValues: { ... }
})

// Çakışma kontrolü
const selectedTableId = watch('table_id')
const selectedTime = watch('reservation_time')

useEffect(() => {
  if (selectedTableId && selectedTime) {
    const conflict = checkConflict(
      selectedTableId,
      new Date(selectedTime).toISOString(),
      editingReservationId
    )
    
    if (conflict.hasConflict) {
      setError('table_id', { 
        message: `Bu saatte masa dolu: ${formatTime(conflict.conflictingReservation.reservation_time)}` 
      })
    } else {
      clearErrors('table_id')
    }
  }
}, [selectedTableId, selectedTime])
```

### Adım 9: View Bileşenlerini Güncelle

**Dosyalar:**
- `web/modules/reservations/components/WeeklyView.tsx` - Custom lightweight
- `web/modules/reservations/components/MonthlyView.tsx` - **react-day-picker** kullan
- `web/modules/reservations/components/AgendaView.tsx` - Custom lightweight

### Adım 10: ReservationCard Oluştur (Optimistic Update + Zaman Bilgisi)

**Dosya:** `web/modules/reservations/components/ReservationCard.tsx`

```typescript
interface ReservationCardProps {
  reservation: Reservation
  onClick?: (reservation: Reservation) => void
  onStatusChange?: (id: string, status: ReservationStatus) => void
}

export function ReservationCard({ reservation, onClick, onStatusChange }: ReservationCardProps) {
  // Optimistic update state'i
  const isPending = useIsReservationPending(reservation.id)
  
  // Durum değiştirme fonksiyonu
  const handleStatusChange = async (newStatus: ReservationStatus) => {
    try {
      // Optimistic update - API beklemeden UI güncellenir
      await updateStatusOptimistic(reservation.id, newStatus)
      toast.success('Durum güncellendi')
    } catch (error) {
      // Hata olursa otomatik rollback yapılır
      toast.error('Güncelleme başarısız')
    }
  }
  
  return (
    <div className={cn("reservation-card", isPending && "opacity-50")}>
      {/* Kart içeriği */}
      <ReservationTimeBadge time={reservation.reservation_time} />
      
      {/* Durum değiştirme dropdown */}
      <StatusDropdown 
        currentStatus={reservation.status}
        onChange={handleStatusChange}
        disabled={isPending}
      />
    </div>
  )
}
```

### Adım 11: ReservationClient Oluştur

**Dosya:** `web/modules/reservations/components/ReservationClient.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useReservations } from '../hooks/useReservations'
import { useReservationsStore } from '../store/reservations.store'
import { Reservation } from '../types'
import { ReservationModal } from './ReservationModal'
import { WeeklyView } from './WeeklyView'
import { MonthlyView } from './MonthlyView'
import { AgendaView } from './AgendaView'

type ViewType = 'agenda' | 'weekly' | 'monthly'

export function ReservationClient() {
  const { user } = useAuth()
  const { reservations, isLoading, refetch, updateStatusOptimistic } = useReservations(user?.restaurantId)
  const { selectedDate, setSelectedDate } = useReservationsStore()
  const [view, setView] = useState<ViewType>('agenda')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  // ... implement all view logic
}
```

### Adım 12: Sayfa Oluştur

**Dosya:** `web/app/(main)/reservations/page.tsx`

```typescript
import { ReservationClient } from '@/modules/reservations/components/ReservationClient'

export default function ReservationsPage() {
  return <ReservationClient />
}
```

### Adım 13: Sidebar ve Tables Entegrasyonu

**Sidebar'a Rezervasyon menüsü ekle:**

```typescript
{
  name: 'Rezervasyonlar',
  href: '/reservations',
  icon: Calendar,
}
```

**Tables Entegrasyonu - TableCard'da Kullanım:**

```typescript
// TableCard.tsx içinde
import { useTableUpcomingReservations } from '@/modules/reservations/hooks/useReservationSelectors'

function TableCard({ table }) {
  // Performans için useMemo'lu selector kullan
  const upcomingReservations = useTableUpcomingReservations(table.id, 30)
  
  if (upcomingReservations.length > 0) {
    return (
      <div className="relative">
        <TableCardContent />
        <ReservationWarningBadge 
          count={upcomingReservations.length}
          nextTime={upcomingReservations[0].reservation_time}
        />
      </div>
    )
  }
  
  return <TableCardContent />
}
```

---

## Test Senaryoları

### 1. Rezervasyon Oluşturma

- [ ] Yeni rezervasyon butonuna tıklandığında modal açılmalı
- [ ] Müşteri arama fonksiyonu çalışmalı
- [ ] Yeni müşteri oluşturma formu çalışmalı
- [ ] Masa seçimi listesi doğru görüntülenmeli
- [ ] Tarih/saat seçimi çalışmalı
- [ ] **Çakışma kontrolü**: Aynı masaya aynı saatte rezervasyon yapılamamalı
- [ ] **Validation**: Geçmiş tarihe rezervasyon yapılamamalı
- [ ] **Validation**: 0 kişi girilememeli
- [ ] **Validation**: UUID format kontrolü (.string().uuid())
- [ ] Kişi sayısı girilebilmeli
- [ ] Not alanı çalışmalı
- [ ] Submit sonrası başarı mesajı görünmeli
- [ ] Liste yenilenmeli

### 2. Çakışma Kontrolü

- [ ] Aynı masaya çakışan rezervasyon yapıldığında hata mesajı görünmeli
- [ ] Çakışan rezervasyonun saati kırmızı border ile gösterilmeli
- [ ] Farklı masalar aynı saatte müsait olmalı
- [ ] Düzenleme modunda kendi rezervasyonu çakışma sayılmamalı

### 3. Rezervasyon Düzenleme

- [ ] Mevcut rezervasyona tıklandığında düzenleme modalı açılmalı
- [ ] Tüm alanlar doğru doldurulmuş olmalı
- [ ] Güncelleme sonrası başarı mesajı görünmeli
- [ ] Liste yenilenmeli

### 4. Rezervasyon Durumu Güncelleme (Optimistic Update)

- [ ] Durum değiştirme butonları çalışmalı
- [ ] **Optimistic**: UI hemen güncellenmeli (API beklemeden)
- [ ] **Optimistic**: API hatasında eski haline dönmeli (rollback)
- [ ] Her durum için renk kodu doğru görünmeli
- [ ] Durum değişikliği sonrası liste yenilenmeli

### 5. Görünümler Arası Geçiş

- [ ] Agenda view doğru görüntülenmeli
- [ ] Weekly view doğru görüntülenmeli
- [ ] **Monthly view** (react-day-picker) doğru görüntülenmeli
- [ ] View değişikliği düzgün çalışmalı

### 6. Tarih Seçimi

- [ ] Bugün seçili olmalı
- [ ] Tarih değiştirildiğinde rezervasyonlar güncellenmeli
- [ ] Haftalık görünümde günler doğru hesaplanmalı

### 7. Rezervasyon Uyarısı

- [ ] Masa için aktif rezervasyon varsa uyarı görünmeli
- [ ] "Tamamla" butonu rezervasyonu completed yapmalı
- [ ] "Göz Ardı Et" butonu uyarıyı kapatmalı

### 8. Real-time Güncellemeler

- [ ] Başka bir cihazdan eklenen rezervasyon anında görünmeli
- [ ] Silinen rezervasyon anında kaldırılmalı
- [ ] Durum değişiklikleri anında yansımalı

### 9. Global State (Tables Entegrasyonu)

- [ ] Tables sayfasında yaklaşan rezervasyon uyarısı görünmeli
- [ ] Dashboard'da rezervasyon widget'ı çalışmalı
- [ ] **Performance**: TableCard render'larında selector kullanımı doğru çalışmalı

### 10. Zaman Bilgisi Badge

- [ ] "30 dk kaldı" uyarısı doğru gösterilmeli
- [ ] Geçmiş rezervasyonlar "Süresi Geçti" göstermeli
- [ ] Yaklaşan rezervasyonlar "Yaklaşıyor" göstermeli

### 11. Responsive Davranış

- [ ] Mobilde view'lar doğru görüntülenmeli
- [ ] Modal mobilde düzgün çalışmalı

---

## Mimari Notlar

### Web Modül Standartları

1. **Types:** Tüm tipler, enumlar, label'lar `types.ts`'te
2. **Services:** API çağrıları `services/` klasöründe
3. **Store:** Zustand store `store/` klasöründe
4. **Components:** UI bileşenleri `components/` klasöründe
5. **Hooks:** React hooks `hooks/` klasöründe
6. **Utils:** Yardımcı fonksiyonlar `utils/` klasöründe
7. **Validations:** Zod şemaları `validations/` klasöründe

### Performans İyileştirmeleri

1. **Selectors:** 
   - Store'daki computed fonksiyonları doğrudan çağırma yerine `useReservationSelectors` hook'unu kullan
   - `useMemo` ile sarmala
   
2. **Optimistic Updates:**
   - API beklemeden UI güncellenir
   - Hata durumunda otomatik rollback

3. **Render Optimization:**
   - TableCard gibi çok render edilen bileşenlerde selector kullan
   - Gereksiz re-render'ları önle

### Design Token Kullanımı

- Frontend kurallarına uygun renk kullanımı
- Shared component'lerin (FormInput, FormSection, Modal, Button) kullanımı
- Gradient kullanılmaması

### Backend Entegrasyonu

- Backend'deki reservation entity'si referans alınmalı
- API endpoints mevcut controller'dan alınmalı
- Multi-tenant yapı için restaurantId kullanılmalı

### Real-time Mimarisi

- Socket.io event'leri ile anlık güncellemeler
- Zustand store üzerinden merkezi state yönetimi
- Tables ve Dashboard modülleri ile veri paylaşımı

---

## Bağımlılıklar

### Yeni Eklenenler

| Package | Kullanım Amacı |
|---------|----------------|
| `zod` | Runtime validation |
| `react-hook-form` | Form yönetimi |
| `zustand` | Global state management |
| `react-day-picker` | Monthly calendar (FullCalendar alternatifi) |
| `date-fns` | Tarih işlemleri (opsiyonel, date-utils'ta kullanılabilir) |

### Kaldırılacaklar

- `@fullcalendar/react` - Yerine react-day-picker
- `@fullcalendar/daygrid` - Yerine react-day-picker
- `@fullcalendar/interaction` - Yerine custom implementation
- `@fullcalendar/core/locales/tr` - Yerine react-day-picker locale

### Mevcut Bağımlılıklar

- `socket.io-client` - Real-time güncellemeler için (mevcut)

---

## Önemli Notlar

### Çakışma Kontrolü Stratejisi

1. **Client-side:** Mevcut reservations array'ini filtrele
2. **Optimistic UI:** Kullanıcıya anında geri bildirim
3. **Server-side:** API'de ikinci kontrol (backend'de zaten var)

### Selector Kullanım Kılavuzu

```typescript
// ❌ Yanlış - Her render'da yeni referans oluşabilir
const reservations = useReservationsStore(state => state.getReservationsByDate(selectedDate))

// ✅ Doğru - Hook ile useMemo kullan
const reservations = useReservationsByDate(selectedDate)

// ✅ Alternatif - Inline selector ile
const reservations = useReservationsStore(state => 
  state.reservations.filter(r => 
    new Date(r.reservation_time).toISOString().split('T')[0] === selectedDate
  )
)
```

### Optimistic Update Akışı

```
1. Kullanıcı butona tıklar
2. → Store.optimisticUpdate() çağrılır (UI hemen güncellenir)
3. → API isteği gönderilir
4. ✅ Başarılı → Store.commitUpdate() (pending temizlenir)
5. ❌ Hata → Store.rollbackUpdate() (eski haline dönülür)
```

### Zod Schema Entegrasyonu

```typescript
// Dinamik schema - müşteri seçili mi yoksa yeni mi
const schema = hasCustomer 
  ? createReservationSchema 
  : createReservationSchema.extend({
      customer_id: z.string().min(1, 'Müşteri seçilmeli')
    })
```
