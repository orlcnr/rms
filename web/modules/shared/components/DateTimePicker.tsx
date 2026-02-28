'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

// ============================================
// INTERFACE
// ============================================

interface DateTimePickerProps {
  id: string
  label: string
  value: string // ISO format: YYYY-MM-DDTHH:MM
  onChange: (value: string) => void
  showTime?: boolean // Default: true
  minDate?: Date
  maxDate?: Date
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

// ============================================
// CONSTANTS
// ============================================

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const DAYS_TR = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

// Generate 30-min slots from 09:00 to 00:00
const TIME_SLOTS = Array.from({ length: 31 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2)
  const minute = (i % 2) * 30
  if (hour === 24) return '00:00'
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
})

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDisplayValue(isoValue: string, showTime: boolean): string {
  if (!isoValue) return ''
  const date = new Date(isoValue)
  if (isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  if (!showTime) return `${day}.${month}.${year}`

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${day}.${month}.${year} ${hours}:${minutes}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  // ISO day: 1 (Mon) to 7 (Sun)
  let day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// ============================================
// COMPONENT
// ============================================

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  showTime = true,
  minDate,
  maxDate,
  error,
  required,
  disabled = false,
  placeholder = 'Tarih ve saat seçin',
}: DateTimePickerProps) {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Update state when value changes externally
  useEffect(() => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setSelectedDate(date)
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
      }
    } else {
      setSelectedDate(null)
    }
  }, [value])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-scroll to selected time
  useEffect(() => {
    if (isOpen && selectedDate && timeListRef.current) {
      const timeStr = `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`
      const index = TIME_SLOTS.indexOf(timeStr)
      if (index !== -1) {
        const item = timeListRef.current.children[index] as HTMLElement
        if (item) {
          timeListRef.current.scrollTop = item.offsetTop - 100
        }
      }
    }
  }, [isOpen, selectedDate])

  const updateValue = (date: Date, timeStr?: string) => {
    const newDate = new Date(date)
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number)
      newDate.setHours(hours, minutes, 0, 0)
    } else if (selectedDate) {
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0)
    } else {
      newDate.setHours(19, 0, 0, 0) // Default 19:00
    }
    onChange(newDate.toISOString())
  }

  // Quick Handlers
  const handleQuickSelect = (type: 'today' | 'tomorrow' | 'weekend') => {
    const now = new Date()
    let target = new Date(now)
    if (type === 'tomorrow') target.setDate(now.getDate() + 1)
    if (type === 'weekend') {
      const day = now.getDay()
      target.setDate(now.getDate() + (day === 0 ? 6 : 6 - day))
    }
    setSelectedDate(target)
    setCurrentMonth(new Date(target.getFullYear(), target.getMonth(), 1))
    updateValue(target)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + (direction === 'prev' ? -1 : 1))
    setCurrentMonth(newMonth)
  }

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth())
  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-9" />)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const isSelected = selectedDate && isSameDay(date, selectedDate)
      const isToday = isSameDay(date, new Date())
      const isDisabled = (minDate && date < minDate) || (maxDate && date > maxDate)

      days.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => {
            setSelectedDate(date)
            updateValue(date)
          }}
          className={cn(
            "h-9 w-9 rounded-sm text-xs font-bold transition-all flex items-center justify-center",
            isSelected ? "bg-primary-main text-white shadow-lg shadow-primary-main/20 scale-110 z-10" : "hover:bg-bg-muted text-text-primary",
            isToday && !isSelected && "ring-1 ring-primary-main/50 text-primary-main",
            isDisabled && "opacity-20 cursor-not-allowed"
          )}
        >
          {day}
        </button>
      )
    }
    return days
  }, [currentMonth, selectedDate, minDate, maxDate])

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="text-[10px] font-black text-text-primary uppercase tracking-widest ml-0.5 block mb-2">
          {label} {required && <span className="text-danger-main">*</span>}
        </label>
      )}

      <div className="relative">
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-3 w-full bg-bg-surface border px-4 py-3 rounded-sm transition-all cursor-pointer group",
            error ? "border-danger-main" : "border-border-light focus-within:border-primary-main",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <CalendarIcon className={cn("w-4 h-4 transition-colors", isOpen ? "text-primary-main" : "text-text-muted")} />
          <span className={cn("text-sm font-bold flex-1", !value && "text-text-muted/50")}>
            {mounted ? (formatDisplayValue(value, showTime) || placeholder) : ''}
          </span>
          {value && !disabled && mounted && (
            <X
              className="w-4 h-4 text-text-muted hover:text-danger-main transition-colors"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
            />
          )}
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 z-[150] bg-bg-surface border border-border-light rounded-sm shadow-2xl animate-in fade-in zoom-in duration-200 origin-top-left min-w-[380px]">
            {/* 1. QUICK SELECTORS */}
            <div className="p-3 border-b border-border-light bg-bg-muted/10">
              <div className="flex p-1 bg-bg-muted rounded-lg gap-1">
                {[
                  { id: 'today', label: 'Bugün' },
                  { id: 'tomorrow', label: 'Yarın' },
                  { id: 'weekend', label: 'Hafta Sonu' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleQuickSelect(btn.id as any)}
                    className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all hover:bg-bg-surface hover:shadow-sm"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex h-[320px]">
              {/* 2. CALENDAR (Left) */}
              <div className="flex-1 p-4 border-r border-border-light">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-text-primary">
                    {MONTHS_TR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => navigateMonth('prev')} className="p-1 hover:bg-bg-muted rounded-sm"><ChevronLeft className="w-4 h-4" /></button>
                    <button type="button" onClick={() => navigateMonth('next')} className="p-1 hover:bg-bg-muted rounded-sm"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_TR.map(d => <span key={d} className="text-[10px] font-black text-text-muted text-center uppercase">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                  {calendarDays}
                </div>
              </div>

              {/* 3. TIME SLOTS (Right) */}
              {showTime && (
                <div className="w-[120px] bg-bg-muted/5 flex flex-col">
                  <div className="p-3 border-b border-border-light text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">SAAT</span>
                  </div>
                  <div ref={timeListRef} className="flex-1 overflow-y-auto scrollbar-none p-2 space-y-1">
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = selectedDate &&
                        `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}` === slot

                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => selectedDate && updateValue(selectedDate, slot)}
                          disabled={!selectedDate}
                          className={cn(
                            "w-full py-2 px-3 rounded-sm text-xs font-bold transition-all flex items-center justify-between",
                            isSelected ? "bg-primary-main text-white shadow-md shadow-primary-main/20" : "hover:bg-bg-muted text-text-primary",
                            !selectedDate && "opacity-20 cursor-not-allowed"
                          )}
                        >
                          {slot}
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-3 border-t border-border-light bg-bg-muted/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-text-primary text-white text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-black transition-all"
              >
                Tamam
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-[10px] font-bold text-danger-main uppercase tracking-tight ml-0.5">{error}</p>}
    </div>
  )
}
