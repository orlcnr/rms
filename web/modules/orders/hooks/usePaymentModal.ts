import { useState } from 'react';
import { customersApi, Customer } from '@/modules/customers/services/customers.service';
import { toast } from 'sonner';

interface UsePaymentModalOptions {
  restaurantId: string;
  onSuccess?: () => void;
}

interface UsePaymentModalReturn {
  isCreatingCustomer: boolean;
  handleAddNewCustomer: (name: string) => Promise<Customer | null>;
}

export function usePaymentModal({
  restaurantId,
  onSuccess,
}: UsePaymentModalOptions): UsePaymentModalReturn {
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const handleAddNewCustomer = async (name: string): Promise<Customer | null> => {
    try {
      setIsCreatingCustomer(true);

      // Parse name - assume it's in "FirstName LastName" format
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Müşteri';
      const lastName = nameParts.slice(1).join(' ') || 'Yeni';

      // Generate a unique temporary phone number using timestamp
      // Format: 5XX XXX XXXX (valid Turkish mobile format)
      // Uses timestamp + random suffix for uniqueness
      const timestamp = Date.now().toString().slice(-7);
      const randomSuffix = Math.floor(Math.random() * 90 + 10).toString();
      const tempPhone = `5${timestamp.slice(0, 3)}${timestamp.slice(3)}${randomSuffix}`;

      const newCustomer = await customersApi.create({
        first_name: firstName,
        last_name: lastName,
        phone: tempPhone,
        restaurant_id: restaurantId, // Required for multi-tenant support
      });

      toast.success('Müşteri başarıyla oluşturuldu');
      onSuccess?.();
      return newCustomer;
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      toast.error(error?.message || 'Müşteri oluşturulamadı');
      return null;
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  return {
    isCreatingCustomer,
    handleAddNewCustomer,
  };
}
