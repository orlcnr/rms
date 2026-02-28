'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, MapPin, Loader2 } from 'lucide-react';
import { customersApi, Customer } from '@/modules/customers/services/customers.service';
import { PhoneInput } from '@/modules/shared/components/PhoneInput';
import { cleanPhoneNumber } from '@/modules/shared/utils/format';

// ============================================
// NEW CUSTOMER MODAL - Yeni Müşteri Ekleme Modalı
// Açık Hesap ödemelerinde müşteri oluşturmak için kullanılır
// ============================================

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  restaurantId: string;
  initialName?: string;
}

export function NewCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  restaurantId,
  initialName,
}: NewCustomerModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens with initial name
  useEffect(() => {
    if (isOpen) {
      if (initialName) {
        const nameParts = initialName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        setFormData({
          first_name: firstName,
          last_name: lastName,
          phone: '',
          email: '',
          notes: '',
        });
      } else {
        setFormData({
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          notes: '',
        });
      }
      setError(null);
    }
  }, [isOpen, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Create customer via API
      const newCustomer = await customersApi.create({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: cleanPhoneNumber(formData.phone),
        email: formData.email || undefined,
        notes: formData.notes || undefined,
      });

      onSuccess(newCustomer);
      onClose();
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      const message = err.response?.data?.message || 'Müşteri oluşturulamadı. Lütfen tekrar deneyin.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-bg-surface w-full max-w-md mx-4 shadow-2xl rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-bg-muted/30">
          <h3 className="text-lg font-black text-text-primary uppercase tracking-wider">
            Yeni Müşteri
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 hover:bg-bg-muted rounded-sm transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-danger-main/10 border border-danger-main/20 rounded-sm">
              <p className="text-sm text-danger-main">{error}</p>
            </div>
          )}

          {/* First Name */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
              Ad <span className="text-danger-main">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                required
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-bg-surface border border-border-light rounded-sm
                  focus:outline-none focus:border-primary-main focus:ring-2 focus:ring-primary-main/20
                  placeholder:text-text-muted/40 transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Ad"
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
              Soyad <span className="text-danger-main">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                required
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-bg-surface border border-border-light rounded-sm
                  focus:outline-none focus:border-primary-main focus:ring-2 focus:ring-primary-main/20
                  placeholder:text-text-muted/40 transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Soyad"
              />
            </div>
          </div>

          {/* Phone */}
          <PhoneInput
            id="phone"
            name="phone"
            label="Telefon"
            required
            value={formData.phone}
            onChange={(value) => setFormData({ ...formData, phone: value })}
            disabled={isLoading}
          />

          {/* Email (Optional) */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
              E-posta <span className="text-text-muted">(opsiyonel)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                type="email"
                inputMode="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-bg-surface border border-border-light rounded-sm
                  focus:outline-none focus:border-primary-main focus:ring-2 focus:ring-primary-main/20
                  placeholder:text-text-muted/40 transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="email@ornek.com"
              />
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
              Notlar <span className="text-text-muted">(opsiyonel)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-text-muted pointer-events-none" />
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={isLoading}
                rows={2}
                className="w-full pl-10 pr-4 py-3 bg-bg-surface border border-border-light rounded-sm
                  focus:outline-none focus:border-primary-main focus:ring-2 focus:ring-primary-main/20
                  placeholder:text-text-muted/40 transition-all resize-none
                  disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Müşteri notları..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary-main text-white font-semibold rounded-sm 
              hover:bg-primary-hover transition-colors 
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <User className="h-5 w-5" />
                <span>Müşteriyi Kaydet</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
