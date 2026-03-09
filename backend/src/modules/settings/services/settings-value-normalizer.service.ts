import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaymentMethod } from '../../payments/entities/payment.entity';

const ENABLED_PAYMENT_METHODS_KEY = 'enabled_payment_methods';
const PRINTER_PROFILES_KEY = 'printer_profiles';
const PRINTER_PROFILE_VERSION = 1;

const ALLOWED_PRINT_FORMATS = new Set([
  'receipt_80mm',
  'receipt_58mm',
  'a4',
  'label_4x6',
]);

type NormalizedPrinterProfile = {
  id: string;
  name: string;
  format: string;
  guidance?: string;
  isActive: boolean;
  updatedAt: string;
};

type NormalizedPrinterProfilesSetting = {
  version: number;
  profiles: NormalizedPrinterProfile[];
  defaultProfileId?: string;
};

@Injectable()
export class SettingsValueNormalizerService {
  private readonly logger = new Logger(SettingsValueNormalizerService.name);

  getEnabledPaymentMethodsKey(): string {
    return ENABLED_PAYMENT_METHODS_KEY;
  }

  getPrinterProfilesKey(): string {
    return PRINTER_PROFILES_KEY;
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
    if (key === ENABLED_PAYMENT_METHODS_KEY) {
      return this.normalizeEnabledPaymentMethods(rawValue);
    }

    if (key === PRINTER_PROFILES_KEY) {
      return this.normalizePrinterProfiles(rawValue, true);
    }

    return rawValue;
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

  parsePrinterProfiles(value: unknown): NormalizedPrinterProfilesSetting {
    return this.normalizePrinterProfiles(value, false);
  }

  private normalizePrinterProfiles(
    value: unknown,
    strict: boolean,
  ): NormalizedPrinterProfilesSetting {
    const parsed = typeof value === 'string' ? this.safeJsonParse(value) : value;
    if (!parsed || typeof parsed !== 'object') {
      return this.getDefaultPrinterProfiles();
    }

    const raw = parsed as Record<string, unknown>;
    const rawVersion =
      typeof raw.version === 'number' ? Math.trunc(raw.version) : undefined;
    if (
      rawVersion !== undefined &&
      rawVersion !== PRINTER_PROFILE_VERSION &&
      !strict
    ) {
      this.logger.warn(
        `Unknown printer_profiles version=${rawVersion}, falling back to safe normalize.`,
      );
    }
    const rawProfiles = Array.isArray(raw.profiles) ? raw.profiles : [];
    const normalizedProfiles: NormalizedPrinterProfile[] = [];
    const seenNames = new Set<string>();

    for (const entry of rawProfiles) {
      if (!entry || typeof entry !== 'object') {
        if (strict) {
          throw new BadRequestException('printer_profiles.profiles elemanları object olmalıdır');
        }
        continue;
      }

      const profile = entry as Record<string, unknown>;
      const id = String(profile.id || '').trim();
      const name = String(profile.name || '').trim();
      const format = String(profile.format || '').trim();
      const guidance =
        typeof profile.guidance === 'string' ? profile.guidance.trim() : '';
      const isActive =
        profile.isActive === undefined ? true : Boolean(profile.isActive);
      const updatedAtRaw = String(profile.updatedAt || '').trim();

      if (!id || !name || !format) {
        if (strict) {
          throw new BadRequestException(
            'printer_profiles.profile için id, name ve format zorunludur',
          );
        }
        continue;
      }

      if (!ALLOWED_PRINT_FORMATS.has(format)) {
        if (strict) {
          throw new BadRequestException(`Geçersiz print format: ${format}`);
        }
        continue;
      }

      const normalizedName = name.toLocaleLowerCase('tr-TR');
      if (seenNames.has(normalizedName)) {
        if (strict) {
          throw new BadRequestException('Yazıcı profil adı benzersiz olmalıdır');
        }
        continue;
      }
      seenNames.add(normalizedName);

      let updatedAt = updatedAtRaw;
      if (!updatedAt || Number.isNaN(new Date(updatedAt).getTime())) {
        updatedAt = new Date().toISOString();
      }

      normalizedProfiles.push({
        id,
        name,
        format,
        guidance: guidance || undefined,
        isActive,
        updatedAt,
      });
    }

    const defaultProfileId =
      typeof raw.defaultProfileId === 'string'
        ? raw.defaultProfileId.trim()
        : undefined;
    const resolvedDefaultProfileId =
      defaultProfileId &&
      normalizedProfiles.some((profile) => profile.id === defaultProfileId)
        ? defaultProfileId
        : undefined;

    return {
      version: PRINTER_PROFILE_VERSION,
      profiles: normalizedProfiles,
      defaultProfileId: resolvedDefaultProfileId,
    };
  }

  private getDefaultPrinterProfiles(): NormalizedPrinterProfilesSetting {
    return {
      version: PRINTER_PROFILE_VERSION,
      profiles: [],
      defaultProfileId: undefined,
    };
  }
}
