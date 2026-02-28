'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, AlertCircle, Loader2, Plus } from 'lucide-react';
import { customersApi, Customer } from '@/modules/customers/services/customers.service';
import { parseNumericValue, formatCurrency } from '@/modules/shared/utils/numeric';
import { formatPhoneNumber } from '@/modules/shared/utils/format';

// ============================================
// CUSTOMER SELECTOR - Müşteri Arama Bileşeni
// Debounced arama + Mevcut borç bilgisi
// ============================================

interface CustomerSelectorProps {
  restaurantId: string;
  value?: string; // customerId
  onChange: (customer: Customer | null) => void;
  onAddNew?: (name: string) => Promise<Customer | null>; // Callback for adding new customer (legacy - use onOpenNewCustomerModal instead)
  onOpenNewCustomerModal?: (initialName?: string) => void; // Opens separate modal for new customer
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}

export function CustomerSelector({
  restaurantId,
  value,
  onChange,
  onAddNew,
  onOpenNewCustomerModal,
  disabled = false,
  placeholder = 'Müşteri ara...',
  error,
}: CustomerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dışarı tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    if (searchQuery.trim().length < 2) {
      setCustomers([]);
      return;
    }

    const timeout = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 300);

    setDebounceTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  // Update searchQuery when selectedCustomer changes (for showing selected customer in input)
  useEffect(() => {
    if (selectedCustomer) {
      setSearchQuery(`${selectedCustomer.first_name} ${selectedCustomer.last_name} (${formatPhoneNumber(selectedCustomer.phone)})`);
    }
  }, [selectedCustomer]);

  // Load customer by ID if value provided
  useEffect(() => {
    if (value && value !== selectedCustomer?.id) {
      loadCustomerById(value);
    }
    // Reset selectedCustomer when value is cleared
    if (!value) {
      setSelectedCustomer(null);
      setSearchQuery('');
    }
  }, [value]);

  const loadCustomerById = async (customerId: string) => {
    try {
      setIsLoading(true);
      const customer = await customersApi.getById(customerId);
      setSelectedCustomer(customer);
      setCustomers([customer]);
    } catch (error) {
      console.error('Failed to load customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchCustomers = async (query: string) => {
    try {
      setIsLoading(true);
      // Use centralized API with restaurantId for multi-tenant filtering
      const customerList = await customersApi.search(query, restaurantId);
      setCustomers(customerList || []);
    } catch (error) {
      console.error('Customer search failed:', error);
      // Don't show mock data in production
      if (process.env.NODE_ENV !== 'production') {
        setCustomers(getMockCustomers(query));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(`${customer.first_name} ${customer.last_name} (${formatPhoneNumber(customer.phone)})`);
    setIsOpen(false);
    onChange(customer);
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    setSearchQuery('');
    setCustomers([]);
    onChange(null);
  };

  // Inline yeni müşteri oluşturma (legacy - onOpenNewCustomerModal kullanılmalı)
  const handleCreateNewCustomer = async () => {
    if (!onAddNew || !searchQuery) return;
    
    try {
      const newCustomer = await onAddNew(searchQuery);
      if (newCustomer) {
        setSelectedCustomer(newCustomer);
        setSearchQuery(`${newCustomer.first_name} ${newCustomer.last_name}`);
        onChange(newCustomer);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const getDebtColor = (currentDebt: number, creditLimit: number, limitEnabled: boolean) => {
    if (!limitEnabled || creditLimit === 0) return 'text-text-secondary';
    const percentage = (currentDebt / creditLimit) * 100;
    if (percentage >= 100) return 'text-danger-main';
    if (percentage >= 80) return 'text-warning-main';
    return 'text-success-main';
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Label */}
      <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5 block mb-2">
        Müşteri (Açık Hesap)
      </label>

      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-text-muted" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full bg-bg-surface border ${error ? 'border-danger-main' : 'border-border-light'} 
            pl-10 pr-10 py-3 text-base font-semibold text-text-primary 
            outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 
            rounded-sm transition-all placeholder:text-text-muted/40
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        />

        {/* Clear Button */}
        {selectedCustomer && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary"
          >
            <span className="text-xs">✕</span>
          </button>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-y-0 right-10 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
          </div>
        )}
      </div>

      {/* Dropdown - Her zaman açılır, sonuç yoksa boş state göster */}
      {isOpen && (
        <div className="absolute z-[110] w-full mt-1 bg-bg-surface border border-border-light rounded-sm shadow-lg max-h-72 overflow-hidden flex flex-col">
          {/* Sonuçlar veya Boş State */}
          <div className="flex-1 overflow-y-auto">
            {customers.length > 0 ? (
              <>
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    className={`
                      w-full text-left px-4 py-3 hover:bg-bg-muted transition-colors
                      ${selectedCustomer?.id === customer.id ? 'bg-bg-muted' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-main/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-main" />
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary">
                            {customer.first_name} {customer.last_name}
                          </div>
                          <div className="text-xs text-text-muted">{formatPhoneNumber(customer.phone)}</div>
                        </div>
                      </div>
                      
                      {/* Borç Bilgisi */}
                      <div className="text-right">
                        <div className={`text-sm font-bold ${getDebtColor(
                          parseNumericValue(customer.current_debt), 
                          parseNumericValue(customer.credit_limit), 
                          customer.credit_limit_enabled
                        )}`}>
                          {formatCurrency(customer.current_debt)}
                        </div>
                        {customer.credit_limit_enabled && parseNumericValue(customer.credit_limit) > 0 && (
                          <div className="text-xs text-text-muted">
                            / {formatCurrency(customer.credit_limit)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              /* Boş State - Sonuç yoksa */
              searchQuery.length >= 2 && !isLoading && (
                <div className="px-4 py-8 text-center text-text-muted">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Müşteri bulunamadı</p>
                  <p className="text-xs mt-1">Aşağıdan yeni müşteri ekleyebilirsiniz</p>
                </div>
              )
            )}
          </div>
          
          {/* Yeni Müşteri Butonu - HER ZAMAN GÖRÜNÜR */}
          {(onOpenNewCustomerModal || onAddNew) && (
            <button
              type="button"
              onClick={() => {
                if (onOpenNewCustomerModal) {
                  // Yeni modal ile aç
                  onOpenNewCustomerModal(searchQuery);
                } else if (onAddNew) {
                  // Eski yöntem - inline oluştur
                  handleCreateNewCustomer();
                }
              }}
              className="flex-shrink-0 w-full text-left px-4 py-3 hover:bg-primary-main/5 transition-colors border-t border-border-light bg-bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-main/10 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary-main" />
                </div>
                <div>
                  <div className="font-semibold text-primary-main">
                    Yeni Müşteri Ekle
                  </div>
                  <div className="text-xs text-text-muted">
                    {searchQuery ? `"${searchQuery}" için yeni cari hesap aç` : 'Yeni müşteri kaydet'}
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Seçili Müşteri - Alt Bilgi */}
      {selectedCustomer && (
        <div className="mt-2 p-3 bg-bg-muted rounded-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted">Mevcut Borç: </span>
              <span className={`text-sm font-bold ${getDebtColor(
                parseNumericValue(selectedCustomer.current_debt), 
                parseNumericValue(selectedCustomer.credit_limit), 
                selectedCustomer.credit_limit_enabled
              )}`}>
                {formatCurrency(selectedCustomer.current_debt)}
              </span>
            </div>
            {selectedCustomer.credit_limit_enabled && parseNumericValue(selectedCustomer.credit_limit) > 0 && (
              <div className="text-xs text-text-muted">
                Kredi Limiti: {formatCurrency(selectedCustomer.credit_limit)}
              </div>
            )}
          </div>
          
          {/* Limit aşım uyarısı */}
          {selectedCustomer.credit_limit_enabled && 
           parseNumericValue(selectedCustomer.credit_limit) > 0 && 
           parseNumericValue(selectedCustomer.current_debt) >= parseNumericValue(selectedCustomer.credit_limit) && (
            <div className="mt-2 flex items-center gap-2 text-danger-main text-xs">
              <AlertCircle className="h-3 w-3" />
              <span>Kredi limiti dolmuş!</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-danger-main">{error}</p>
      )}
    </div>
  );
}

// ============================================
// MOCK DATA - Geliştirme için
// ============================================

function getMockCustomers(query: string): Customer[] {
  const mockCustomers: Customer[] = [
    {
      id: '1',
      first_name: 'Ahmet',
      last_name: 'Yılmaz',
      phone: '0532 123 4567',
      email: 'ahmet@example.com',
      total_debt: 1500,
      current_debt: 500,
      credit_limit: 2000,
      credit_limit_enabled: true,
    },
    {
      id: '2',
      first_name: 'Ayşe',
      last_name: 'Demir',
      phone: '0533 987 6543',
      email: 'ayse@example.com',
      total_debt: 3000,
      current_debt: 1800,
      credit_limit: 2000,
      credit_limit_enabled: true,
    },
    {
      id: '3',
      first_name: 'Mehmet',
      last_name: 'Kara',
      phone: '0542 456 7890',
      total_debt: 500,
      current_debt: 0,
      credit_limit: 0,
      credit_limit_enabled: false,
    },
  ];

  const lowerQuery = query.toLowerCase();
  return mockCustomers.filter(
    (c) =>
      c.first_name.toLowerCase().includes(lowerQuery) ||
      c.last_name.toLowerCase().includes(lowerQuery) ||
      c.phone.includes(query)
  );
}
