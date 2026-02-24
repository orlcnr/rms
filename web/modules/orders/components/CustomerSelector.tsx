'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { http } from '@/modules/shared/api/http';
import { Search, User, AlertCircle, Loader2 } from 'lucide-react';

// ============================================
// CUSTOMER SELECTOR - Müşteri Arama Bileşeni
// Debounced arama + Mevcut borç bilgisi
// ============================================

// Customer tipi (Backend'den)
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  total_debt: number;
  current_debt: number;
  credit_limit: number;
  credit_limit_enabled: boolean;
}

interface CustomerSelectorProps {
  restaurantId: string;
  value?: string; // customerId
  onChange: (customer: Customer | null) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}

export function CustomerSelector({
  restaurantId,
  value,
  onChange,
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

  // Load customer by ID if value provided
  useEffect(() => {
    if (value && value !== selectedCustomer?.id) {
      loadCustomerById(value);
    }
  }, [value]);

  const loadCustomerById = async (customerId: string) => {
    try {
      setIsLoading(true);
      const response = await http.get<Customer>(`/customers/${customerId}`);
      setSelectedCustomer(response);
      setCustomers([response]);
    } catch (error) {
      console.error('Failed to load customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchCustomers = async (query: string) => {
    try {
      setIsLoading(true);
      // Backend customers endpoint - varsayılan olarak search parametresi ile
      const response = await http.get<{ data: Customer[] }>('/customers', {
        params: { search: query, restaurant_id: restaurantId, limit: 10 },
      });
      
      // Handle both array and { data: [] } response formats
      const customerList = Array.isArray(response) ? response : response?.data || [];
      setCustomers(customerList);
    } catch (error) {
      console.error('Customer search failed:', error);
      // Fallback: show mock data for development
      setCustomers(getMockCustomers(query));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(`${customer.first_name} ${customer.last_name} (${customer.phone})`);
    setIsOpen(false);
    onChange(customer);
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    setSearchQuery('');
    setCustomers([]);
    onChange(null);
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

      {/* Dropdown */}
      {isOpen && customers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-light rounded-sm shadow-lg max-h-60 overflow-y-auto">
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
                    <div className="text-xs text-text-muted">{customer.phone}</div>
                  </div>
                </div>
                
                {/* Borç Bilgisi */}
                <div className="text-right">
                  <div className={`text-sm font-bold ${getDebtColor(customer.current_debt, customer.credit_limit, customer.credit_limit_enabled)}`}>
                    {customer.current_debt.toFixed(2)} TL
                  </div>
                  {customer.credit_limit_enabled && customer.credit_limit > 0 && (
                    <div className="text-xs text-text-muted">
                      / {customer.credit_limit.toFixed(2)} TL
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Seçili Müşteri - Alt Bilgi */}
      {selectedCustomer && (
        <div className="mt-2 p-3 bg-bg-muted rounded-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted">Mevcut Borç: </span>
              <span className={`text-sm font-bold ${getDebtColor(selectedCustomer.current_debt, selectedCustomer.credit_limit, selectedCustomer.credit_limit_enabled)}`}>
                {selectedCustomer.current_debt.toFixed(2)} TL
              </span>
            </div>
            {selectedCustomer.credit_limit_enabled && selectedCustomer.credit_limit > 0 && (
              <div className="text-xs text-text-muted">
                Kredi Limiti: {selectedCustomer.credit_limit.toFixed(2)} TL
              </div>
            )}
          </div>
          
          {/* Limit aşım uyarısı */}
          {selectedCustomer.credit_limit_enabled && 
           selectedCustomer.credit_limit > 0 && 
           selectedCustomer.current_debt >= selectedCustomer.credit_limit && (
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
