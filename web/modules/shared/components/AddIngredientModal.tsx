'use client';

import React, { useState, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { inventoryApi } from '../../inventory/services/inventory.service';

// ============================================
// TYPES
// ============================================

export interface CreateIngredientData {
  name: string;
  unit: string;
  critical_level?: number;
  restaurant_id: string;
}

interface AddIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (ingredientId: string) => void;
  restaurantId: string;

  // Optional pre-filled data
  initialName?: string;

  // External loading control
  isLoading?: boolean;
  onSubmit?: (data: CreateIngredientData) => Promise<void>;
}

// ============================================
// CONSTANTS
// ============================================

const UNIT_OPTIONS = [
  { value: 'adet', label: 'Adet' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gr', label: 'Gram (gr)' },
  { value: 'lt', label: 'Litre (lt)' },
  { value: 'ml', label: 'Mililitre (ml)' },
  { value: 'paket', label: 'Paket' },
  { value: 'kutu', label: 'Kutu' },
  { value: 'şişe', label: 'Şişe' },
] as const;

// ============================================
// COMPONENT
// ============================================

export function AddIngredientModal({
  isOpen,
  onClose,
  onSuccess,
  restaurantId,
  initialName,
  isLoading: externalLoading,
  onSubmit: externalSubmit,
}: AddIngredientModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialName || '',
    unit: 'adet',
    critical_level: '',
  });

  const isLoading = externalLoading || internalLoading;

  // Reset form when modal opens with new initialName
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialName || '',
        unit: 'adet',
        critical_level: '',
      });
    }
  }, [isOpen, initialName]);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim() || !formData.unit) {
      toast.error('Malzeme adı ve birimi gereklidir');
      return;
    }

    // Use external submit handler if provided
    if (externalSubmit) {
      await externalSubmit({
        name: formData.name.trim(),
        unit: formData.unit,
        restaurant_id: restaurantId,
        critical_level: formData.critical_level ? Number(formData.critical_level) : undefined,
      });
      return;
    }

    // Internal submit logic
    setInternalLoading(true);
    try {
      const newIngredient = await inventoryApi.createIngredient({
        name: formData.name.trim(),
        unit: formData.unit,
        restaurant_id: restaurantId,
        critical_level: formData.critical_level ? Number(formData.critical_level) : undefined,
      } as any);

      toast.success('Malzeme başarıyla eklendi');
      onSuccess?.(newIngredient.id);
      onClose();
      
      // Reset form
      setFormData({ name: '', unit: 'adet', critical_level: '' });
    } catch (error) {
      console.error('Malzeme oluşturma hatası:', error);
      toast.error('Malzeme oluşturulamadı');
    } finally {
      setInternalLoading(false);
    }
  }, [formData, restaurantId, externalSubmit, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
      setFormData({ name: '', unit: 'adet', critical_level: '' });
    }
  }, [isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-text-primary/50"
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-bg-surface border border-border-light rounded-sm shadow-2xl w-full max-w-md p-6 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-text-primary uppercase tracking-wide">
            Yeni Malzeme Ekle
          </h3>
          <button 
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 hover:bg-bg-muted rounded-sm transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5">
              Malzeme Adı <span className="text-danger-main">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              className="w-full bg-bg-app border border-border-light px-4 py-3 text-base font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm transition-all placeholder:text-text-muted/40 disabled:opacity-50"
              placeholder="ÖRN: KIYMA"
            />
          </div>

          {/* Unit Select */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5">
              Birim <span className="text-danger-main">*</span>
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              disabled={isLoading}
              className="w-full bg-bg-app border border-border-light px-4 py-3 text-base font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm transition-all appearance-none cursor-pointer disabled:opacity-50"
            >
              {UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Critical Level Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5">
              Kritik Seviye (Opsiyonel)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.critical_level}
              onChange={(e) => setFormData({ ...formData, critical_level: e.target.value })}
              disabled={isLoading}
              className="w-full bg-bg-app border border-border-light px-4 py-3 text-base font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm transition-all placeholder:text-text-muted/40 disabled:opacity-50"
              placeholder="Minimum stok uyarısı"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-bg-app border border-border-light text-text-secondary text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-bg-muted transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !formData.name.trim()}
            className="flex-1 px-4 py-3 bg-primary-main border border-primary-main text-text-inverse text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Ekleniyor...
              </span>
            ) : (
              'Malzeme Ekle'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
