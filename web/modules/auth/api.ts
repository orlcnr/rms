// Backwards compatibility - re-export from services
export { authService as authApi } from './services/auth.service';
export { loginSchema } from './validations/login.schema';
export type { LoginInput } from './validations/login.schema';
