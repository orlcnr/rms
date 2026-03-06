import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod } from '../../payments/entities/payment.entity';

const ENABLED_PAYMENT_METHODS_KEY = 'enabled_payment_methods';

@Injectable()
export class SettingsValueNormalizerService {
  getEnabledPaymentMethodsKey(): string {
    return ENABLED_PAYMENT_METHODS_KEY;
  }

  getPaymentMethodDefaults(): PaymentMethod[] {
    return Object.values(PaymentMethod);
  }

  parseStoredValue(
    value: string,
    type: 'number' | 'boolean' | 'string',
  ): unknown {
    switch (type) {
      case 'number':
        return Number.parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'string':
      default:
        return value;
    }
  }

  parseEnabledPaymentMethods(value: unknown): PaymentMethod[] {
    const defaults = this.getPaymentMethodDefaults();

    if (Array.isArray(value)) {
      const filtered = value.filter((method): method is PaymentMethod =>
        defaults.includes(method as PaymentMethod),
      );
      return filtered.length > 0 ? filtered : defaults;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return defaults;
    }

    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return defaults;
      }

      const filtered = parsed.filter((method): method is PaymentMethod =>
        defaults.includes(method as PaymentMethod),
      );
      return filtered.length > 0 ? filtered : defaults;
    } catch {
      return defaults;
    }
  }

  normalizeForWrite(key: string, rawValue: unknown): unknown {
    if (key !== ENABLED_PAYMENT_METHODS_KEY) {
      return rawValue;
    }

    return this.normalizeEnabledPaymentMethods(rawValue);
  }

  normalizeEnabledPaymentMethods(value: unknown): PaymentMethod[] {
    const parsed =
      typeof value === 'string' ? this.safeJsonParse(value) : value;

    if (!Array.isArray(parsed)) {
      throw new BadRequestException(
        'enabled_payment_methods bir dizi olmalıdır',
      );
    }

    const availableMethods = new Set(this.getPaymentMethodDefaults());
    const seen = new Set<PaymentMethod>();
    const normalized: PaymentMethod[] = [];

    for (const item of parsed) {
      if (
        typeof item !== 'string' ||
        !availableMethods.has(item as PaymentMethod)
      ) {
        throw new BadRequestException(
          `Geçersiz ödeme yöntemi: ${String(item)}`,
        );
      }
      const method = item as PaymentMethod;
      if (!seen.has(method)) {
        normalized.push(method);
        seen.add(method);
      }
    }

    if (normalized.length === 0) {
      throw new BadRequestException('En az bir ödeme yöntemi seçilmelidir');
    }

    return normalized;
  }

  private safeJsonParse(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
