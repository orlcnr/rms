'use client';

import React, { RefObject } from 'react';
import { ImagePlus } from 'lucide-react';
import { Category } from '../types';
import { FormInput } from '@/modules/shared/components/FormInput';
import { FormSection } from '@/modules/shared/components/FormSection';

// ============================================
// PROPS
// ============================================

interface ProductGeneralInfoProps {
  formData: {
    name: string;
    description: string;
    price: string;
    category_id: string;
    is_available: boolean;
    track_inventory: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    price: string;
    category_id: string;
    is_available: boolean;
    track_inventory: boolean;
  }>>;
  categories: Category[];
  previewUrl: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function ProductGeneralInfo({
  formData,
  setFormData,
  categories,
  previewUrl,
  fileInputRef,
  handleFileChange,
  removeFile,
}: ProductGeneralInfoProps) {
  return (
    <FormSection title="TEMEL ÜRÜN BİLGİLERİ" variant="primary">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Form Fields */}
        <div className="md:col-span-12 lg:col-span-9 flex flex-col gap-6">
          {/* Name & Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <FormInput
              id="productName"
              name="name"
              label="Ürün Adı"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="ÖRN: IZGARA KÖFTE"
              required
            />

            {/* Product Category */}
            <FormInput
              id="productCategory"
              name="category_id"
              label="Ürün Kategorisi"
              value={formData.category_id}
              onChange={(value) => setFormData({ ...formData, category_id: value })}
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              isSelect
              required
              placeholder="KATEGORİ SEÇİN"
            />
          </div>

          {/* Description */}
          <FormInput
            id="productDescription"
            name="description"
            label="Ürün Açıklaması"
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="ÜRÜN İÇERİĞİ VE DETAYLAR..."
            isTextarea
            rows={3}
          />
        </div>

        {/* Image Upload */}
        <div className="md:col-span-12 lg:col-span-3">
          <FormInput
            id="productImage"
            name="image"
            label="Ürün Görseli"
            isFile
            accept="image/*"
            fileRef={fileInputRef}
            onFileChange={handleFileChange}
            onFileRemove={removeFile}
            previewUrl={previewUrl}
          />
        </div>
      </div>
    </FormSection>
  );
}
