# Web Development Rules

## Genel Kurallar

### 1. Modüler Yapı Organizasyonu

Her modül aşağıdaki standart yapıya sahip olmalıdır:

Kod yazarken DRY (Don't Repeat Yourself), tek sorumluluk prensibi ve endişelerin ayrılması prensiplerini uygula. Okunabilir, test edilebilir ve bakımı kolay kod yaz.

```
web/modules/[module-name]/
├── types.ts          # TypeScript tip tanımları + CONSTANTS (ZORUNLU)
│                     # NOT: Tüm statik veriler (unit options, form labels,
│                     #      default values, helper functions) bu dosyada tutulur
├── service.ts        # API servis fonksiyonları - ZORUNLU
├── schemas.ts        # Zod validation şemaları - Opsiyonel
├── enums/            # Enum tanımları - Opsiyonel
├── components/       # Modül bileşenleri
│   └── [ComponentName].tsx
├── hooks/           # Custom hooks - İş mantığı için
│   └── use[HookName].ts
└── context/         # React context - Opsiyonel
    └── [ContextName]Context.tsx
```

**CRITICAL: Constants Nerede Tutulur?**
- Tüm statik veriler (seçenekler, etiketler, varsayılan değerler, helper fonksiyonlar) `types.ts` dosyasında tutulur
- Ayrı `constants/` klasörü kullanılmaz
- Bu DRY prensibinin merkezi uygulamasıdır

---

### 2. TypeScript Kuralları

```typescript
// DO - Interface kullanımı
export interface User {
  id: string;
  name: string;
  email: string;
}

// DO NOT - Type kullanımı object'ler için
export type User = {
  id: string;
  name: string;
}

// DO - Union type'lar
export type Status = 'pending' | 'active' | 'completed';

// DO - Enum kullanımı
export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
}
```

---

### 2.1 Enum ve Sabitler Kuralı

**CRITICAL:** Asla sayfa içinde veya component içinde hardcoded string/number kullanmayın!

```typescript
// YANLIŞ - Sayfa içinde hardcoded string
if (order.status === 'pending') { ... }

// DOĞRU - Enum'dan import et
import { OrderStatus } from '@/modules/orders/enums';
if (order.status === OrderStatus.PENDING) { ... }

// YANLIŞ - Component içinde status mapping
const statusLabels = {
  pending: 'Beklemede',
  preparing: 'Hazırlanıyor',
};

// DOĞRU - Shared enum dosyasında tanımla
export enum OrderStatusLabel {
  PENDING = 'Beklemede',
  PREPARING = 'Hazırlanıyor',
  READY = 'Hazır',
}

// Kullanım
import { OrderStatusLabel } from '@/modules/orders/enums';
const label = OrderStatusLabel[order.status];
```

**Enum Oluşturma Kuralları:**

```
web/modules/[module]/enums/
├── order-status.enum.ts      # Status enum'ları
├── order-type.enum.ts        # Tip enum'ları
├── payment-method.enum.ts    # Ödeme metodu enum'ları
└── index.ts                  # Tüm enum'ları export eden barrel file
```

---

### 2.2 Component Boyut Kuralı (MAX 200 SATIR)

**CRITICAL:** Her component dosyası maksimum 200 satır olmalıdır!

```typescript
// YANLIŞ - 500 satırlık component
export function LargePage() {
  // 500 satır kod...
}

// DOĞRU - Küçük component'lere böl

// page.tsx - Ana sayfa (sadece layout ve data fetching)
export default async function DashboardPage() {
  const data = await fetchData();
  return <DashboardContent data={data} />;
}

// components/DashboardContent.tsx - İçerik koordinasyonu
export function DashboardContent({ data }) {
  return (
    <div>
      <DashboardStats stats={data.stats} />
      <DashboardCharts charts={data.charts} />
    </div>
  );
}

// components/DashboardStats.tsx - İstatistik kartları (max 50 satır)
export function DashboardStats({ stats }) {
  // Sadece stats kartları render eder
}

// components/DashboardCharts.tsx - Grafikler (max 50 satır)
export function DashboardCharts({ charts }) {
  // Sadece grafikleri render eder
}
```

**Bölme Kuralları:**
- Her component tek bir sorumluluğa sahip olmalı
- 200 satırı aşan component mutlaka bölünmeli
- Mantıksal gruplar ayrı component olmalı
- Ortak kullanılan UI parçaları shared components'e alınmalı

---

### 2.3 Custom Hook Kuralı (Business Logic Separation)

**CRITICAL:** Karmaşık form logic'i ve API etkileşimleri custom hook'a taşınmalıdır!

```typescript
// hooks/useProductForm.ts
// Tüm state ve business logic burada

export function useProductForm(props: UseProductFormProps) {
    // State
    const [formData, setFormData] = useState(...)
    const [recipes, setRecipes] = useState(...)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // API Calls
    const handleSubmit = async (file?: File) => {...}
    const handleDeleteIngredient = async (id: string) => {...}

    // Computed
    const ingredientOptions = useMemo(...)

    return {
        formData, recipes, setFormData,
        ingredientOptions,
        handleSubmit,
    }
}
```

**Kullanım:**
```typescript
// ProductForm.tsx - SADECE layout
const hook = useProductForm(props);

return (
    <form onSubmit={hook.handleSubmit}>
        <BasicInfo {...hook} />
        <RecipeTable {...hook} />
    </form>
);
```

**Faydaları:**
- UI ile business logic ayrılır
- Test edilebilirlik artar
- Kod tekrarı azalır
- Component'ler sadece render ile ilgilenir

---

### 2.4 Component Composition Kuralı

**CRITICAL:** Büyük formları mantıksal parçalara böl!

```typescript
// ProductForm.tsx - Ana layout (max 200 satır)
export function ProductForm(props) {
    const hook = useProductForm(props);

    return (
        <form onSubmit={hook.handleSubmit}>
            {/* Her bölüm ayrı component */}
            <ProductBasicInfo {...hook} />
            <ProductImage {...hook} />
            <RecipeTable {...hook} />
            <FormActions />
        </form>
    );
}

// components/ProductBasicInfo.tsx - Form fields (max 100 satır)
export function ProductBasicInfo({ formData, setFormData }) {
    return (
        <div className="grid">
            <Input
                label="Ürün Adı"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
            />
        </div>
    );
}

// components/RecipeTable.tsx - Reçete yönetimi (max 150 satır)
export function RecipeTable({ recipes, setRecipes, onAdd, onRemove }) {
    // Reçete tablosu render
}
```

---

### 2.5 Server-Client Component Ayrımı (Next.js App Router)

**CRITICAL:** Server ve Client component'ler mutlaka ayrılmalıdır!

```typescript
// page.tsx - Server Component (Server-side data fetching)
import { menusApi } from '@/modules/menus/service';
import { getRestaurantContext } from '@/modules/auth/server/getServerUser';
import MenusClient from './_components/MenusClient';

export default async function MenusPage() {
  const { restaurantId } = await getRestaurantContext();

  // Server-side fetch - hydration için
  const categories = await menusApi.getCategories(restaurantId);
  const menuItems = await menusApi.getMenuItems(restaurantId);

  return (
    <MenusClient
      restaurantId={restaurantId}
      initialCategories={categories}
      initialMenuItems={menuItems}
    />
  );
}
```

```typescript
// _components/MenusClient.tsx - Client Component ('use client')
'use client';

interface MenusClientProps {
  restaurantId: string;
  initialCategories: Category[];
  initialMenuItems: MenuItem[];
}

export default function MenusClient({
  restaurantId,
  initialCategories,
  initialMenuItems
}: MenusClientProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [menuItems, setMenuItems] = useState(initialMenuItems);

  // Interactive logic here - state, handlers, effects
  return (
    // JSX
  );
}
```

**Kurallar:**

1. **Server Component** (`page.tsx`):
   - Server-side data fetching yapılır
   - API çağrıları burada yapılır
   - Sadece props olarak veri aktarır
   - `'use client'` kullanılmaz
   - **Auth kontrolü için `getRestaurantContext` kullanılır** - middleware zaten token kontrolü yapar, bu fonksiyon restaurantId'yi güvenli şekilde alır

2. **Client Component** (`_components/*.tsx`):
   - `'use client'` directive'i eklenir
   - State, handlers, effects burada
   - Initial data props olarak alır
   - Render ve etkileşimlerle ilgilenir

3. **Dosya Yapısı:**

```
app/(main)/module/
├── page.tsx                  # Server Component - data fetching
└── _components/
    ├── ModuleClient.tsx      # Client Component - main logic
    ├── FeatureCard.tsx       # Smaller client components
    └── index.ts
```

**ÖNEMLİ: Auth Kontrolü (DRY Prensibi)**

Auth ve restaurant context kontrolü **middleware** ve **`getRestaurantContext`** içinde merkezi olarak yapılır. Sayfalarda tekrar auth kontrolü yapılmaz!

```typescript
// DO - getRestaurantContext kullan
import { getRestaurantContext } from '@/modules/auth/server/getServerUser';

export default async function SomePage() {
  const { restaurantId } = await getRestaurantContext();
  // restaurantId artık güvenli bir şekilde kullanılabilir
}

// DO NOT - Manuel token kontrolü YAPMA
// Bu işlem middleware ve getRestaurantContext tarafından yapılır
const token = request.cookies.get('access_token');
if (!token) redirect('/login');  // GEREKSİZ!
```

---

### 3. API Servis Kuralları

```typescript
// service.ts standart yapısı
import { http } from '@/modules/shared/api/http';
import { Entity } from './types';

export const entityApi = {
  // GET - Liste
  getAll: async (params?: GetParams) => {
    return http.get('/endpoint', { params });
  },

  // GET - Tekil
  getById: async (id: string) => {
    return http.get(`/endpoint/${id}`);
  },

  // POST - Oluştur
  create: async (data: CreateDto) => {
    return http.post('/endpoint', data);
  },

  // PATCH - Güncelle
  update: async (id: string, data: UpdateDto) => {
    return http.patch(`/endpoint/${id}`, data);
  },

  // DELETE - Sil
  delete: async (id: string) => {
    return http.delete(`/endpoint/${id}`);
  },
};
```

React component yazarken şu kurallara uy:

1. **Büyük componentleri küçük parçalara böl** - 150-200 satırdan uzun componentler oluşturma. Her component tek bir sorumluluğa sahip olmalı. Mantıksal bölümleri ayrı dosyalara çıkar.

2. **İş mantığını görsel katmandan ayır** - API çağrılarını ve veri işlemlerini custom hook'lara taşı. Form mantığını ayrı hook'larda tut. Component'ler sadece render ve kullanıcı etkileşimleriyle ilgilenmeli.

3. **Tekrarlanan className'leri ve stilleri temizle** - Uzun className zincirleri yerine `cn` utility'si kullan. Tailwind kullanıyorsan `@apply` direktifleriyle ortak stilleri grupla.

4. **Derin iç içe JSX'ten kaçın** - Karmaşık koşullu render'ları ayrı fonksiyon veya component'lere çıkar. Çok fazla iç içe ternary operatörü kullanma.

---

### 4. Bileşen Kuralları

> **ÖNEMLİ:** DRY (Don't Repeat Yourself) component extraction kuralları için ayrı bir doküman mevcuttur. Detaylı bilgi için bkz: [frontend-dry-component-rules.md](./frontend-dry-component-rules.md)

```typescript
// DO - Bileşen yapısı
interface ComponentProps {
  // Props interface her zaman tanımlanmalı
  title: string;
  data: SomeType;
  onAction?: (id: string) => void; // Opsiyonel callback
}

export function Component({ title, data, onAction }: ComponentProps) {
  // State'ler en üstte
  const [state, setState] = useState(initialState);

  // Hook'lar state'lerden sonra
  const { user } = useAuth();

  // Memo ve callback'ler
  const memoizedValue = useMemo(() => compute(data), [data]);
  const handleAction = useCallback((id: string) => {
    onAction?.(id);
  }, [onAction]);

  // Effect'ler
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // Early returns
  if (!data) {
    return <LoadingSpinner />;
  }

  // Ana render
  return (
    <div>
      {/* Content */}
    </div>
  );
}
```

---

### 5. Naming Convention

| Tür | Kural | Örnek |
|-----|-------|-------|
| Bileşen | PascalCase | `OrderCard.tsx` |
| Fonksiyon | camelCase | `handleSubmit` |
| Hook | use prefix | `useOrders` |
| Constant | UPPER_SNAKE | `API_BASE_URL` |
| Type/Interface | PascalCase | `OrderItem` |
| Enum | PascalCase | `OrderStatus` |
| File | kebab-case | `order-card.tsx` veya `OrderCard.tsx` |

---

### 6. Tailwind CSS Kuralları

```typescript
// DO - cn utility kullanımı
import { cn } from '@/modules/shared/utils/cn';

<div className={cn('base-class', isActive && 'active-class')} />

// DO NOT - Inline style
<div style={{ color: 'red' }} />

// DO NOT - Hardcoded değerler
<div className="text-[#ff0000]" />
```

---

### 7. Form Handling Kuralları

```typescript
// Zod schema tanımı
const formSchema = z.object({
  name: z.string().min(1, 'İsim zorunludur'),
  email: z.string().email('Geçerli email giriniz'),
  quantity: z.number().min(1).max(100),
});

type FormData = z.infer<typeof formSchema>;

// React Hook Form kullanımı
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: '',
    email: '',
    quantity: 1,
  },
});

// Form submit
const onSubmit = async (data: FormData) => {
  try {
    await entityApi.create(data);
    toast.success('Başarıyla oluşturuldu');
  } catch (error) {
    toast.error('Hata oluştu');
  }
};
```

---

### 7.1 Service Katmanı ve Validation Kuralları (ZORUNLU)

**CRITICAL:** Component içinde fetch/axios doğrudan KULLANILMAMALIDIR. Tüm API istekleri service katmanında yapılmalıdır!

```typescript
// YANLIŞ - Component içinde fetch
const handleSubmit = async () => {
  const response = await fetch('/api/login', { ... });
};

// DOĞRU - Service katmanı kullanımı
// modules/auth/services/auth.service.ts
import { http } from '@/modules/shared/api/http';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return http.post<LoginResponse>('/auth/login', data);
  },
};
```

**Validation Schema Kuralları:**

```typescript
// modules/auth/validations/login.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta zorunludur')
    .email('Geçerli bir e-posta adresi giriniz'),
  password: z
    .string()
    .min(1, 'Şifre zorunludur')
    .min(6, 'Şifre en az 6 karakter olmalıdır'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

**Component Yapısı:**

```typescript
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { authService } from '@/modules/auth/services/auth.service';
import { loginSchema, LoginInput } from '@/modules/auth/validations/login.schema';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      // Service katmanını çağır
      await authService.login(data);
      toast.success('Giriş başarılı!');
    } catch (error) {
      toast.error('Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

**Klasör Yapısı:**

```
modules/auth/
├── types.ts                 # Tip tanımları
├── services/                # Service katmanı (ZORUNLU)
│   └── auth.service.ts
├── validations/             # Validation şemaları (ZORUNLU)
│   └── login.schema.ts
├── enums/                   # Enum tanımları
└── components/             # Bileşenler
    └── LoginForm.tsx
```

**Kurallar:**
1. **Service Katmanı:** Tüm API istekleri `modules/[modul]/services/` altında yapılır
2. **Validation:** Form validation `modules/[modul]/validations/` altında Zod ile yapılır
3. **Component:** Sadece UI mantığı ve state yönetimi yapar
4. **DO NOT:** Component içinde `fetch`, `axios` doğrudan KULLANILMAZ

---

### 8. Internationalization (i18n) Kuralları

**CRITICAL:** Tüm metinler component içinde HARDCODED olmamalıdır. JSON locale dosyaları kullanılmalıdır!

**Klasör Yapısı:**

```
web/
├── modules/
│   ├── auth/
│   ├── orders/
│   ├── products/
│   ├── reports/
│
├── i18n/
│   ├── locales/
│   │   ├── en/
│   │   │   ├── common.json      # Ortak metinler
│   │   │   ├── auth.json        # Auth modülü metinleri
│   │   │   ├── orders.json      # Orders modülü metinleri
│   │   │   └── products.json    # Products modülü metinleri
│   │   └── tr/
│   │       ├── common.json
│   │       ├── auth.json
│   │       ├── orders.json
│   │       └── products.json
│   └── i18n.config.ts           # i18n yapılandırması
```

**JSON Dosya Örneği:**

```json
// i18n/locales/tr/auth.json
{
  "login": {
    "title": "Giriş Yap",
    "email": "E-posta",
    "password": "Şifre",
    "submit": "Giriş Yap",
    "submitting": "Giriş yapılıyor...",
    "success": "Giriş başarılı!",
    "error": "Giriş başarısız"
  },
  "validation": {
    "emailRequired": "E-posta zorunludur",
    "emailInvalid": "Geçerli bir e-posta adresi giriniz",
    "passwordRequired": "Şifre zorunludur",
    "passwordMin": "Şifre en az 6 karakter olmalıdır"
  }
}
```

**Kullanım:**

```typescript
// Component içinde kullanım
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('auth');
  
  return (
    <form>
      <input placeholder={t('login.email')} />
      <button>{t('login.submit')}</button>
    </form>
  );
}
```

**Kurallar:**
1. **Her modülün kendi JSON dosyası olmalı:** `auth.json`, `orders.json`, `products.json`
2. **Ortak metinler `common.json` içinde:** Buton metinleri, hata mesajları vb.
3. **Component içinde hardcoded string YOK:** Mutlaka locale JSON'dan alınmalı
4. **Nested yapı kullan:** Daha iyi organizasyon için `login.email`, `validation.emailRequired` gibi

---

### 8. Error Handling Kuralları

```typescript
// DO - Try-catch ile API çağrıları
const fetchData = async () => {
  try {
    const data = await api.getData();
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
};

// DO - Loading state
const [loading, setLoading] = useState(false);
const handleSubmit = async () => {
  setLoading(true);
  try {
    await api.submit(data);
  } finally {
    setLoading(false);
  }
};

// DO - Error boundary için
if (error) {
  return <ErrorMessage error={error} />;
}
```

---

### 8.1 Hydration Error Önleme Kuralları

Next.js App Router'da client-side state (localStorage, Zustand persist, window vb.) kullanan bileşenlerde hydration hatası oluşabilir. Bu hatayı önlemek için mounted check kullanılmalıdır.

```typescript
// DO - Hydration hatası önleme (Zustand/localStorage kullanan bileşenlerde)
export function ClientComponent(props: Props) {
  // Mounted state - TÜM HOOKS'TAN ÖNCE tanımlanmalı
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Diğer hooks...
  const [state, setState] = useState(initialState)
  const store = useStore()

  // RENDER - Tüm hooks çağrıldıktan SONRA conditional return
  if (!mounted) {
    return <div className="min-h-screen bg-bg-app" />
  }

  return (
    // JSX
  )
}
```

**Önemli Kurallar:**
1. `mounted` state ve `useEffect` TÜM HOOKS'TAN ÖNCE tanımlanmalı
2. Conditional return TÜM HOOKS çağrıldıktan SONRA yapılmalı
3. Erken return (return before hooks) "Rendered more hooks than during the previous render" hatasına yol açar
4. Bu pattern özellikle Zustand persist, localStorage, window API kullanan bileşenlerde zorunludur

```typescript
// DO NOT - YANLIŞ! Hooks'dan önce erken return
function WrongComponent() {
  if (typeof window === 'undefined') {  // HATALI!
    return null
  }
  const [state, setState] = useState(...)  // HATA VERİR!
}
```

---

### 9. State Management Kuralları

```typescript
// DO - Local state basit veriler için
const [isOpen, setIsOpen] = useState(false);

// DO - Context global veriler için
const AuthContext = createContext<AuthContextType>(null);

// DO - URL state filtreleme/sayfalama için
const searchParams = useSearchParams();
const page = searchParams.get('page') || '1';

// DO NOT - Prop drilling
// 3+ seviye prop geçilirse context kullanılmalı
```

---

### 10. Real-Time Data Kuralları

```typescript
// Socket.io kullanımı
import { socketService } from '@/modules/shared/api/socket';

useEffect(() => {
  socketService.connect(restaurantId);

  socketService.on('order_created', (order) => {
    setOrders(prev => [...prev, order]);
  });

  socketService.on('order_updated', (updatedOrder) => {
    setOrders(prev =>
      prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
    );
  });

  return () => {
    socketService.off('order_created');
    socketService.off('order_updated');
    socketService.disconnect();
  };
}, [restaurantId]);
```

---

### 11. API ve Backend Entegrasyonu Kuralları

**API Dokümantasyonu:** Tüm endpoint'ler ve response formatları için `https://api.localhost/api/docs` adresinden Swagger dokümantasyonu incelenmelidir.

#### 11.1. Endpoint Response'larını Referans Alma

```typescript
// DO - API response'u types.ts dosyasında tanımla
// Önce API dokümantasyonunu kontrol et: https://api.localhost/api/docs

// Backend'den dönen response örneği:
// GET /api/customers/:id
// {
//   id: string;
//   name: string;
//   email: string;
//   phone: string | null;
//   totalOrders: number;
//   totalSpent: number;
//   createdAt: string;
// }

// types.ts - Backend response ile eşleştir
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

// DO NOT - Backend ile uyumsuz tip tanımlama
export interface Customer {
  id: number;        // Backend string dönüyor!
  fullName: string;  // Backend name dönüyor!
  orders: Order[];   // Backend totalOrders dönüyor!
}
```

#### 11.2. Server-Side Requests ve Data Fetching

```typescript
// DO - Server-side data fetching ile ilk veriyi çek
// app/(main)/customers/page.tsx
import { customersApi } from '@/modules/customers/service';

export default async function CustomersPage() {
  const initialCustomers = await customersApi.getAll();
  return <CustomersClient initialData={initialCustomers} />;
}

// DO - Client-side'da refresh ve mutations
// _components/CustomersClient.tsx
'use client';

export function CustomersClient({ initialData }: Props) {
  const [customers, setCustomers] = useState(initialData);

  const refreshData = async () => {
    const data = await customersApi.getAll();
    setCustomers(data);
  };
}
```

#### 11.3. Tekrar Kullanılabilir Bileşenler Oluşturma

```typescript
// DO - Generic ve tekrar kullanılabilir bileşen
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T>({ data, columns, onRowClick, pagination }: DataTableProps<T>) {
  // Generic implementasyon
}

// DO NOT - Spesifik ve tekrar kullanılamaz bileşen
export function CustomerListForDashboard() {
  // Sadece dashboard için, tekrar kullanılamaz
}
```

#### 11.4. Kod Tekrarından Kaçınma

```typescript
// DO - Ortak logic'leri custom hook'a taşı
export function usePagination(totalItems: number, itemsPerPage: number = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const nextPage = () => setPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setPage(p => Math.max(p - 1, 1));
  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
  return { page, totalPages, nextPage, prevPage, goToPage };
}
```

#### 11.5. API Response Tip Güvenliği

```typescript
// DO - API response için tip tanımla
export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

export const customersApi = {
  getAll: async (params?: GetCustomersDto): Promise<CustomerListResponse> => {
    return http.get('/customers', { params });
  },
};

// DO NOT - any kullanımı
export const customersApi = {
  getAll: async (params?: any): Promise<any> => {
    return http.get('/customers', { params });
  },
};
```

#### 11.6. Backend Değişikliklerini Takip Etme

```typescript
// Backend'de bir endpoint değişikliği olduğunda:
// 1. API dokümantasyonunu kontrol et: https://api.localhost/api/docs
// 2. types.ts dosyasını güncelle
// 3. service.ts dosyasını güncelle
// 4. Bileşenleri test et

// Örnek: Backend response değişti
// Eski: { id, name, email }
// Yeni: { id, name, email, phone, address }

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;   // Yeni alan
  address: string | null; // Yeni alan
}
```

---

## Sayfa Kuralları

### 1. Page Component Yapısı

```typescript
// app/(main)/[module]/page.tsx
import { getServerUser } from '@/modules/auth/server/getServerUser';
import { api } from '@/modules/[module]/service';
import { ClientComponent } from './_components/ClientComponent';

export default async function Page() {
  const user = await getServerUser();
  const initialData = await api.getAll();

  return (
    <main>
      <ClientComponent initialData={initialData} />
    </main>
  );
}
```

### 2. Client Component Ayrımı

```typescript
// _components/ClientComponent.tsx
'use client';

import { useState } from 'react';

interface ClientComponentProps {
  initialData: DataType[];
}

export function ClientComponent({ initialData }: ClientComponentProps) {
  const [data, setData] = useState(initialData);

  return (
    // JSX
  );
}
```

### 3. Loading ve Error State'ler

```typescript
// loading.tsx
export default function Loading() {
  return <LoadingSpinner />;
}

// error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <p>Bir hata oluştu!</p>
      <button onClick={reset}>Tekrar dene</button>
    </div>
  );
}
```

---

## Next.js Spesifik Kurallar

### 12. Metadata ve SEO

**CRITICAL:** Her sayfa için metadata tanımlanmalıdır!

```typescript
// app/(main)/orders/page.tsx
import { Metadata } from 'next';

// Statik metadata
export const metadata: Metadata = {
  title: 'Siparişler | Restaurant App',
  description: 'Sipariş yönetim paneli',
  openGraph: {
    title: 'Siparişler',
    description: 'Sipariş yönetim paneli',
  },
};

// Dinamik metadata - ID'ye göre farklı sayfalarda
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const order = await ordersApi.getById(id);

  return {
    title: `Sipariş #${order.orderNumber} | Restaurant App`,
    description: `Sipariş detayları`,
  };
}

export default async function OrdersPage() {
  // ...
}
```

**Kurallar:**
- Her `page.tsx` dosyasında `metadata` export edilmeli
- Dinamik sayfalar için `generateMetadata` kullanılmalı
- `title` formatı: `Sayfa Adı | Uygulama Adı`
- `robots`, `canonical` gibi SEO kritik alanlar gerektiğinde eklenmeli

---

### 13. Route Handlers (API Routes)

```typescript
// app/api/[resource]/route.ts - Standart yapı
import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/modules/auth/server/getServerUser';
import { entityApi } from '@/modules/[module]/service';

// GET - Liste veya tekil
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await entityApi.getById(id);

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST - Oluştur
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = await entityApi.create(body);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH - Güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = await entityApi.update(id, body);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE - Sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await entityApi.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

**Dosya Yapısı:**

```
app/api/
├── [resource]/
│   ├── route.ts              # GET (list), POST
│   └── [id]/
│       └── route.ts          # GET (single), PATCH, DELETE
```

**Kurallar:**
- Her route handler auth kontrolü yapmalı
- Try-catch ile hata yönetimi zorunlu
- HTTP status code'ları doğru kullanılmalı
- Response her zaman `NextResponse.json()` ile dönmeli
- `params` Next.js 15'te `Promise` olarak gelir, `await` kullanılmalı

---

### 14. Middleware

```typescript
// middleware.ts - Proje kökünde
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Public route'lar - auth gerekmez
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Auth koruması
  if (!isPublicRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Giriş yapmış kullanıcı login sayfasına gitmesin
  if (isPublicRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Custom header ekle (server component'lerde kullanım için)
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);

  return response;
}

// Middleware'in çalışacağı route'ları belirt
export const config = {
  matcher: [
    /*
     * Şunlar hariç tüm route'lar:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
```

**Kurallar:**
- `middleware.ts` proje kökünde olmalı
- Auth kontrolü middleware'de yapılmalı, her sayfada tekrar edilmemeli
- `matcher` config ile gereksiz route'ları dışla
- Middleware hafif olmalı — ağır işlemler burada yapılmamalı
- Rate limiting için middleware kullanılabilir

---

### 15. Server Actions

**CRITICAL:** Mutation işlemleri için Server Actions kullanılmalıdır!

```typescript
// modules/[module]/actions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/modules/auth/server/getServerUser';
import { entityApi } from './service';
import { createSchema } from './schemas';

// Oluşturma action'ı
export async function createEntityAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) redirect('/login');

  // Zod ile validasyon
  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await entityApi.create(parsed.data);

    // Cache invalidation
    revalidatePath('/entities');
    revalidateTag('entities');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: { general: ['Bir hata oluştu'] },
    };
  }
}

// Güncelleme action'ı
export async function updateEntityAction(id: string, formData: FormData) {
  const user = await getServerUser();
  if (!user) redirect('/login');

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await entityApi.update(id, parsed.data);
    revalidatePath(`/entities/${id}`);
    revalidateTag(`entity-${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, errors: { general: ['Güncelleme başarısız'] } };
  }
}

// Silme action'ı
export async function deleteEntityAction(id: string) {
  const user = await getServerUser();
  if (!user) redirect('/login');

  try {
    await entityApi.delete(id);
    revalidatePath('/entities');
    revalidateTag('entities');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Silme başarısız' };
  }
}
```

**Client Component'te Kullanım:**

```typescript
// _components/EntityForm.tsx
'use client';

import { useTransition } from 'react';
import { createEntityAction } from '../actions';

export function EntityForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createEntityAction(formData);
      if (result.success) {
        toast.success('Başarıyla oluşturuldu');
      } else {
        toast.error('Hata oluştu');
      }
    });
  };

  return (
    <form action={handleSubmit}>
      <input name="name" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  );
}
```

**Dosya Yapısı:**

```
modules/[module]/
├── actions.ts        # Server Actions - 'use server' direktifi
├── service.ts        # API servis fonksiyonları
├── types.ts          # Tipler
└── schemas.ts        # Zod şemaları (actions ve forms tarafından paylaşılır)
```

**Kurallar:**
- `actions.ts` her zaman `'use server'` ile başlamalı
- Her action auth kontrolü yapmalı
- Zod ile input validasyonu zorunlu
- Başarılı mutation sonrası `revalidatePath` veya `revalidateTag` çağrılmalı
- Action'lar `{ success: boolean, errors?: ... }` formatında dönmeli
- Client component'lerde `useTransition` ile çağrılmalı

---

### 16. Cache Stratejisi

**CRITICAL:** Her data fetching için uygun cache stratejisi belirlenmeli!

```typescript
// 16.1 - fetch ile cache kontrolü (Server Component'lerde)

// Her zaman cache'le (statik veri)
const response = await fetch('https://api/static-data', {
  cache: 'force-cache', // varsayılan
});

// Hiç cache'leme (her request'te taze veri)
const response = await fetch('https://api/live-data', {
  cache: 'no-store',
});

// Belirli süre cache'le (ISR benzeri)
const response = await fetch('https://api/semi-static', {
  next: { revalidate: 60 }, // 60 saniye
});

// Tag tabanlı cache (manuel invalidation için)
const response = await fetch('https://api/entities', {
  next: { tags: ['entities'] },
});

// 16.2 - unstable_cache ile fonksiyon cache'leme
import { unstable_cache } from 'next/cache';

const getCachedEntities = unstable_cache(
  async (restaurantId: string) => {
    return entityApi.getAll(restaurantId);
  },
  ['entities'], // cache key
  {
    revalidate: 300, // 5 dakika
    tags: ['entities'],
  }
);

// Kullanım
const entities = await getCachedEntities(restaurantId);

// 16.3 - revalidatePath ve revalidateTag (Server Action'larda)
import { revalidatePath, revalidateTag } from 'next/cache';

// Belirli bir path'i invalidate et
revalidatePath('/entities');
revalidatePath('/entities/[id]', 'page');
revalidatePath('/entities', 'layout');

// Tag bazlı invalidation
revalidateTag('entities');        // 'entities' tagine sahip tüm cache
revalidateTag(`entity-${id}`);   // Spesifik entity cache
```

**Cache Stratejisi Rehberi:**

| Veri Türü | Strateji | Örnek |
|-----------|----------|-------|
| Statik içerik | `force-cache` | Kategori listesi |
| Kullanıcıya özel | `no-store` | Sipariş detayları |
| Sık değişmeyen | `revalidate: 300` | Menü öğeleri |
| Gerçek zamanlı | `no-store` | Canlı sipariş durumu |
| Tag'li cache | `next: { tags }` | Mutation sonrası invalidate edilecekler |

**Kurallar:**
- Cache stratejisi belirlenmeden `fetch` kullanılmamalı
- Kullanıcıya özel veriler asla `force-cache` olmamalı
- Server Action'larda mutation sonrası ilgili cache mutlaka invalidate edilmeli
- `revalidateTag` ile tag bazlı granular invalidation tercih edilmeli

---

### 17. Dynamic Route Segment Tipleri

**CRITICAL:** Next.js 15'te `params` ve `searchParams` Promise tipine dönüştü!

```typescript
// 17.1 - Page Component Tipleri

// Statik params
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EntityPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { page, filter } = await searchParams;

  const data = await entityApi.getById(id);

  return <EntityClient initialData={data} />;
}

// 17.2 - generateStaticParams
export async function generateStaticParams() {
  const entities = await entityApi.getAll();

  return entities.map((entity) => ({
    id: entity.id,
  }));
}

// 17.3 - notFound ve redirect kullanımı
import { notFound, redirect } from 'next/navigation';

export default async function EntityPage({ params }: PageProps) {
  const { id } = await params;
  const data = await entityApi.getById(id);

  // Veri yoksa 404
  if (!data) {
    notFound();
  }

  // Koşullu yönlendirme
  if (data.status === 'archived') {
    redirect('/entities');
  }

  return <EntityClient initialData={data} />;
}
```

**Kurallar:**
- Next.js 15'te `params` `await` ile açılmalı
- `notFound()` ile 404 sayfaları yönetilmeli
- `redirect()` server component'lerde kullanılmalı, `router.push()` client component'lerde
- `generateStaticParams` statik sayfalar için kullanılmalı

---

### 18. Parallel ve Intercepting Routes

```typescript
// 18.1 - Parallel Routes (@slot)
// app/(main)/dashboard/
// ├── @stats/
// │   └── page.tsx
// ├── @charts/
// │   └── page.tsx
// └── layout.tsx

// layout.tsx - Parallel routes
export default function DashboardLayout({
  children,
  stats,
  charts,
}: {
  children: React.ReactNode;
  stats: React.ReactNode;
  charts: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2">
        {stats}
        {charts}
      </div>
    </div>
  );
}

// 18.2 - Intercepting Routes (Modal Pattern)
// app/(main)/orders/
// ├── @modal/
// │   └── (.)orders/
// │       └── [id]/
// │           └── page.tsx    # Modal görünüm
// ├── [id]/
// │   └── page.tsx            # Tam sayfa görünüm
// └── page.tsx

// @modal/(.)orders/[id]/page.tsx
export default async function OrderModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await ordersApi.getById(id);

  return (
    <Modal>
      <OrderDetail order={order} />
    </Modal>
  );
}
```

**Kullanım Senaryoları:**
- **Parallel Routes:** Dashboard widget'ları, tab'lar, bağımsız yüklenen bölümler
- **Intercepting Routes:** Galeri modalleri, sipariş detay modalleri, fotoğraf önizleme

---

### 19. Streaming ve Suspense

```typescript
// 19.1 - Sayfa seviyesi Suspense
// app/(main)/orders/page.tsx
import { Suspense } from 'react';

export default function OrdersPage() {
  return (
    <div>
      <h1>Siparişler</h1>
      {/* Her bölüm bağımsız yüklenir */}
      <Suspense fallback={<StatsSkeleton />}>
        <OrderStats />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <OrdersTable />
      </Suspense>
    </div>
  );
}

// Async Server Component
async function OrderStats() {
  const stats = await ordersApi.getStats(); // Bu beklenirken diğerleri yüklenir
  return <StatsCard data={stats} />;
}

async function OrdersTable() {
  const orders = await ordersApi.getAll();
  return <DataTable data={orders} columns={orderColumns} />;
}

// 19.2 - loading.tsx ile otomatik Suspense
// app/(main)/orders/loading.tsx
export default function OrdersLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// 19.3 - error.tsx ile hata sınırı
// app/(main)/orders/error.tsx
'use client';

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p>Siparişler yüklenirken hata oluştu.</p>
      <button onClick={reset}>Tekrar Dene</button>
    </div>
  );
}
```

**Kurallar:**
- Bağımsız veri ihtiyacı olan bölümler ayrı `Suspense` boundary'lere sarılmalı
- Her `Suspense`'e anlamlı bir `fallback` verilmeli (Skeleton tercih edilmeli)
- Ağır component'leri stream etmek için `dynamic` import ile `Suspense` birlikte kullanılabilir
- `loading.tsx` tüm sayfayı kapsarken, `Suspense` granular kontrol sağlar

---

### 20. Environment Variables

```typescript
// 20.1 - Dosya yapısı
// .env.local             - Yerel geliştirme (git'e eklenmez)
// .env.development       - Development ortamı
// .env.production        - Production ortamı
// .env.example           - Örnek değerler (git'e eklenir, ZORUNLU)

// 20.2 - Naming convention
// NEXT_PUBLIC_ prefix    - Client ve server tarafında erişilebilir
// Prefix yok             - Sadece server tarafında erişilebilir (güvenli)

// .env.example
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SOCKET_URL=wss://api.example.com
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

// 20.3 - Tip güvenli env erişimi
// modules/shared/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Server-only (güvenli)
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),

  // Client + Server (public)
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SOCKET_URL: z.string(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

// Server-side env
export const serverEnv = envSchema.parse(process.env);

// Client-side env (sadece NEXT_PUBLIC_ değişkenler)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SOCKET_URL: z.string(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

// 20.4 - Kullanım
// Server Component'te
import { serverEnv } from '@/modules/shared/config/env';
const data = await fetch(`${serverEnv.NEXT_PUBLIC_API_URL}/endpoint`);

// Client Component'te
import { clientEnv } from '@/modules/shared/config/env';
const apiUrl = clientEnv.NEXT_PUBLIC_API_URL;
```

**Kurallar:**
- `process.env.X` doğrudan component'lerde kullanılmamalı — her zaman merkezi `env.ts`'den import edilmeli
- Hassas bilgiler (API key, secret) asla `NEXT_PUBLIC_` prefix'i almamalı
- `.env.example` dosyası her zaman güncel tutulmalı ve git'e eklenmeli
- `.env.local` git'e eklenmemeli (`.gitignore`'da olmalı)
- Yeni env değişkeni eklendiğinde `.env.example` ve `env.ts` şeması güncellenmeli

---

### 21. next.config.ts Kuralları

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 21.1 - Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.example.com',
        port: '',
        pathname: '/uploads/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // 21.2 - Redirects
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true, // 308
      },
      {
        source: '/temp-redirect',
        destination: '/target',
        permanent: false, // 307
      },
    ];
  },

  // 21.3 - Rewrites (proxy, clean URL'ler)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },

  // 21.4 - Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // 21.5 - Bundle analizi (development)
  ...(process.env.ANALYZE === 'true' && {
    // @next/bundle-analyzer ile kullanım
  }),
};

export default nextConfig;
```

**Kurallar:**
- `images.remotePatterns` tüm dış domain'ler için tanımlanmalı — wildcard (`*`) kullanımından kaçınılmalı
- Security header'lar production'da mutlaka aktif olmalı
- `permanent: true` redirect'ler tarayıcı ve CDN tarafından cache'lenir, dikkatli kullanılmalı
- `next.config.ts` değişiklikleri dev server restart gerektirir

---

## Performance Kuralları

### 1. Memoization

```typescript
// DO - Ağır hesaplamalar memoize edilmeli
const filteredData = useMemo(() => {
  return data.filter(item => item.status === activeStatus);
}, [data, activeStatus]);

// DO - Callback'ler memoize edilmeli
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);

// DO NOT - Gereksiz memoization
const name = useMemo(() => user.name, [user.name]); // Gereksiz
```

### 2. Code Splitting

```typescript
// DO - Dynamic import ile ağır bileşenler
const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    loading: () => <Skeleton />,
    ssr: false, // Client-only bileşenler için
  }
);
```

### 3. Image Optimization

```typescript
// DO - Next.js Image kullanımı
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Açıklama"
  width={800}
  height={600}
  priority // LCP image'lar için
/>

// DO NOT - img tag
<img src="/image.jpg" alt="Açıklama" />
```

---

## Accessibility Kuralları

### 1. Semantic HTML

```typescript
// DO
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// DO NOT
<div>
  <div>Home</div>
</div>
```

### 2. ARIA Attributes

```typescript
// DO - ARIA labels
<button aria-label="Siparişi sil">
  <TrashIcon />
</button>

// DO - Form labels
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### 3. Keyboard Navigation

```typescript
// DO - Keyboard accessible
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  onClick={handleClick}
>
  Clickable content
</div>
```

---

## Testing Kuralları

### 1. Unit Test

```typescript
// __tests__/Component.test.tsx
import { render, screen } from '@testing-library/react';
import { Component } from '../Component';

describe('Component', () => {
  it('renders title correctly', () => {
    render(<Component title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### 2. Integration Test

```typescript
// __tests__/integration/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Page from '../page';

describe('Page Integration', () => {
  it('submits form successfully', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

### 3. Server Action Test

```typescript
// __tests__/actions/entity.test.ts
import { createEntityAction } from '@/modules/entity/actions';
import { entityApi } from '@/modules/entity/service';

jest.mock('@/modules/entity/service');
jest.mock('@/modules/auth/server/getServerUser', () => ({
  getServerUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
}));

describe('createEntityAction', () => {
  it('creates entity successfully', async () => {
    const formData = new FormData();
    formData.set('name', 'Test Entity');

    const result = await createEntityAction(formData);

    expect(result.success).toBe(true);
    expect(entityApi.create).toHaveBeenCalledWith({ name: 'Test Entity' });
  });

  it('returns errors for invalid data', async () => {
    const formData = new FormData();
    // name eksik

    const result = await createEntityAction(formData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
```

---

## Git Commit Kuralları

### Commit Message Format

```
type(scope): subject

[optional body]

[optional footer]
```

### Type'lar

| Type | Açıklama |
|------|----------|
| feat | Yeni özellik |
| fix | Bug düzeltme |
| docs | Dokümantasyon |
| style | Formatlama |
| refactor | Kod düzeltme |
| test | Test ekleme |
| chore | Bakım işleri |

### Örnekler

```
feat(orders): add order status update functionality

- Add status update API endpoint
- Add status change button to order card
- Add real-time status update via WebSocket

Closes #123
```

```
fix(inventory): fix stock calculation error

Stock was being calculated incorrectly when multiple movements
occurred on the same day.

Fixes #456
```