# Login Entegrasyon Planı

## 1. Mevcut Durum Analizi

### Backend Auth Endpoint
- **Endpoint:** `POST /api/v1/auth/login`
- **Request Body:**
  ```typescript
  {
    email: string;
    password: string;
  }
  ```
- **Response:**
  ```typescript
  {
    access_token: string;
  }
  ```

### Frontend Referans (frontend folder)
- `modules/auth/` - Auth modülü (api, service, context, components)
- `modules/shared/api/http.ts` - Axios interceptor ile merkezi error handling
- `modules/shared/components/` - Input, Button gibi reusable componentler

---

## 2. Planlanan Yapı (web folder)

```
web/
├── app/
│   ├── (auth)/                 # Auth route group
│   │   └── login/
│   │       └── page.tsx        # Login page
│   └── layout.tsx              # Root layout with providers
├── modules/
│   ├── auth/                   # Auth modülü
│   │   ├── api.ts              # Login API call
│   │   ├── types.ts            # User, LoginResponse types
│   │   ├── schemas.ts          # Zod validation schemas
│   │   ├── context/            # Auth context
│   │   │   └── AuthContext.tsx
│   │   └── components/         # Auth components
│   │       └── LoginForm.tsx
│   └── shared/
│       ├── api/
│       │   ├── http.ts         # Axios interceptor with toast
│       │   └── api-fetch.ts    # Fetch wrapper
│       ├── components/         # Reusable UI components
│       │   ├── Button.tsx
│       │   ├── Input.tsx
│       │   └── ...
│       ├── hooks/
│       ├── types/
│       └── i18n/               # Multilanguage
│           ├── index.ts         # i18n setup
│           └── locales/        # Translation files
│               ├── tr.json
│               └── en.json
```

---

## 3. Adım Adım Implementasyon

### Step 1: Package.json Güncelleme
Eklenecek bağımlılıklar:
- `axios` - HTTP client
- `sonner` - Toast notifications
- `zod` - Validation
- `@hookform/resolvers` - React Hook Form + Zod
- `react-hook-form` - Form handling
- `cookies-next` - Cookie management
- `jwt-decode` - JWT decode

### Step 2: Shared Modül Kurulumu

#### 2.1 HTTP Client (`modules/shared/api/http.ts`)
- Axios instance oluştur
- Request interceptor: JWT token ekle
- Response interceptor:
  - 401 → Cookie sil, login sayfasına yönlendir + toast
  - Diğer hatalar → Toast mesajı göster
  - Merkezi error handling

#### 2.2 Toast/Error Handling
```typescript
// Merkezi hata yönetimi - frontend-rules.md'ye uygun
// Tüm API hataları http.ts interceptor'dan yönetilir
// Login hatası için özel handling
```

### Step 3: Auth Modülü

#### 3.1 Types (`modules/auth/types.ts`)
```typescript
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  restaurantId?: string;
}

export interface LoginResponse {
  access_token: string;
}
```

#### 3.2 Schemas (`modules/auth/schemas.ts`)
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
  password: z.string().min(1, 'Şifre alanı zorunludur.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

#### 3.3 API (`modules/auth/api.ts`)
```typescript
import { http } from '@/modules/shared/api/http';
import { setCookie, deleteCookie } from 'cookies-next';

export const authApi = {
  login: async (credentials: LoginInput): Promise<LoginResponse> => {
    const data = await http.post<LoginResponse>('/auth/login', credentials);
    if (data.access_token) {
      setCookie('access_token', data.access_token, { maxAge: 60 * 60 * 24 * 7 });
    }
    return data;
  },
  
  logout: () => {
    deleteCookie('access_token');
    window.location.href = '/login';
  },
};
```

#### 3.4 Auth Context (`modules/auth/context/AuthContext.tsx`)
- JWT token'ı decode et
- User state yönet
- Logout fonksiyonu
- Auth state change event listener

### Step 4: Multilanguage Desteği

#### 4.1 i18n Kurulumu
```typescript
// next-intl veya i18next kullanılacak
// Dil dosyaları: tr.json, en.json
// Kullanım: t('auth.login.title')
```

#### 4.2 Translation Keys
```json
{
  "auth": {
    "login": {
      "title": "Yönetici Girişi",
      "subtitle": "Lütfen oturum açmak için bilgilerinizi girin.",
      "email": "E-posta Adresi",
      "emailPlaceholder": "E-posta giriniz",
      "password": "Şifre",
      "passwordPlaceholder": "••••••••",
      "rememberMe": "Beni Hatırla",
      "forgotPassword": "Şifremi Unuttum",
      "submit": "Giriş Yap",
      "submitting": "Giriş Yapılıyor...",
      "success": "Giriş başarılı!",
      "errors": {
        "invalidCredentials": "E-posta veya şifre hatalı.",
        "required": "Bu alan zorunludur.",
        "invalidEmail": "Geçerli bir e-posta adresi giriniz."
      }
    }
  },
  "common": {
    "or": "Veya şununla devam et",
    "help": "Yardım Merkezi",
    "privacy": "Gizlilik Politikası",
    "terms": "Kullanım Şartları"
  }
}
```

### Step 5: Login Sayfası

Tasarım özellikleri (HTML'den):
- **Theme:** Dark mode with orange primary (#ec5b13)
- **Glass panel:** backdrop-filter blur, border
- **Left side:** Hero image with branding
- **Right side:** Login form
- **Form fields:**
  - Email input with person icon
  - Password input with lock icon + visibility toggle
  - Remember me checkbox
  - Forgot password link
- **Social login:** Google, Apple buttons
- **Footer links:** Help, Privacy, Terms

---

## 4. Error Handling Yaklaşımı

### Merkezi Toast Sistemi (frontend-rules.md uyumlu)
```typescript
// modules/shared/api/http.ts - Interceptor
error.response?.data?.message → toast.error()

// Özel durumlar:
// - 401: "Oturum süreniz doldu" + logout
// - Network error: "Sunucuya bağlanılamadı"
// - Validation: Form field'larında göster
```

### Login Form Error Handling
```typescript
// LoginForm.tsx
try {
  await authApi.login(data);
  toast.success(t('auth.login.success'));
  router.push('/');
} catch (error: any) {
  // Backend'den gelen hata mesajını göster
  // email/password yanlış ise özel mesaj
}
```

---

## 5. Dosya Listesi

Oluşturulacak/Güncellenecek Dosyalar:

### Yeni Dosyalar
1. `web/package.json` - Dependencies eklenecek
2. `web/modules/auth/types.ts`
3. `web/modules/auth/schemas.ts`
4. `web/modules/auth/api.ts`
5. `web/modules/auth/context/AuthContext.tsx`
6. `web/modules/shared/api/http.ts`
7. `web/modules/shared/api/api-fetch.ts`
8. `web/modules/shared/components/Button.tsx`
9. `web/modules/shared/components/Input.tsx`
10. `web/modules/shared/lib/utils.ts`
11. `web/modules/shared/utils/cn.ts`
12. `web/modules/shared/i18n/index.ts`
13. `web/modules/shared/i18n/locales/tr.json`
14. `web/modules/shared/i18n/locales/en.json`
15. `web/app/(auth)/login/page.tsx`
16. `web/tailwind.config.ts`
17. `web/postcss.config.mjs`

### Güncellenecek Dosyalar
1. `web/app/layout.tsx` - Providers eklenecek
2. `web/next.config.mjs` - Tailwind config

---

## 6. Notlar

- **Backend Login DTO:** `email` ve `password` kullanır (username değil)
- **Token Storage:** Cookie'de `access_token` olarak saklanır
- **Cookie Settings:** 7 gün geçerli
- **Redirect:** Başarılı login sonrası `/` sayfasına yönlendirme

---

## 7. Önceki Sorunlar (Çözümler)

### Error Handler Problemleri
✅ **Çözüm:** Merkezi HTTP interceptor kullanılacak
- `http.ts` içinde tüm API hataları yakalanır
- Her yerde tekrar tekrar try-catch yazılması önlenecek
- `skipToast` option ile isteğe bağlı toast engelleme

### Multilanguage
✅ **Çözüm:** `next-intl` veya basit JSON tabanlı i18n
- Tüm metinler translation dosyalarından alınacak
- Kolayca yeni dil eklenebilir olacak
