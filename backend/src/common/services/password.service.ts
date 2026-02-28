import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 12; // Yüksek güvenlik

  async hashPassword(password: string): Promise<string> {
    // Şifre karmaşıklık kontrolü
    this.validatePasswordStrength(password);
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        errors,
      });
    }
  }

  generateSecurePassword(length: number = 16): string {
    const bytes = randomBytes(length);
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }

    // Ensure it meets requirements
    if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1);
    if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
    if (!/[0-9]/.test(password))
      password = password.slice(0, -2) + '1' + password.slice(-1);
    if (!/[!@#$%^&*]/.test(password))
      password = password.slice(0, -3) + '!' + password.slice(-2);

    return password;
  }
}
