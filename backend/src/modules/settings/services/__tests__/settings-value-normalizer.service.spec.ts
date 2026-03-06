import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '../../../payments/entities/payment.entity';
import { SettingsValueNormalizerService } from '../settings-value-normalizer.service';

describe('SettingsValueNormalizerService', () => {
  const service = new SettingsValueNormalizerService();

  it('parses valid enabled payment methods list', () => {
    const result = service.parseEnabledPaymentMethods(
      JSON.stringify([PaymentMethod.CASH, PaymentMethod.CREDIT_CARD]),
    );

    expect(result).toEqual([PaymentMethod.CASH, PaymentMethod.CREDIT_CARD]);
  });

  it('returns defaults for invalid enabled payment methods payload', () => {
    const result = service.parseEnabledPaymentMethods('{"invalid":true}');

    expect(result).toEqual(Object.values(PaymentMethod));
  });

  it('throws when normalizeEnabledPaymentMethods receives empty array', () => {
    expect(() => service.normalizeEnabledPaymentMethods([])).toThrow(
      BadRequestException,
    );
  });
});
