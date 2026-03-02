import common from '../locales/tr/common.json';

export const tr = {
  common,

  // Auth
  auth: {
    login: 'Giriş Yap' as string,
    logout: 'Çıkış Yap' as string,
    email: 'E-posta' as string,
    password: 'Şifre' as string,
    rememberMe: 'Beni Hatırla' as string,
    forgotPassword: 'Şifremi Unuttum' as string,
    loginTitle: 'Yönetici Girişi' as string,
    loginSubtitle: 'Lütfen oturum açmak için bilgilerinizi girin.' as string,
    loginButton: 'Giriş Yap' as string,
    loginButtonLoading: 'Giriş Yapılıyor...' as string,
    loginSuccess: 'Giriş başarılı! Yönlendiriliyorsunuz...' as string,
    loginError: 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.' as string,
    invalidCredentials: 'E-posta veya şifre hatalı.' as string,
    required: 'Bu alan zorunludur.' as string,
    invalidEmail: 'Geçerli bir e-posta adresi giriniz.' as string,
  },

  // Navigation
  nav: {
    dashboard: 'Panel' as string,
    orders: 'Siparişler' as string,
    menu: 'Menü' as string,
    customers: 'Müşteriler' as string,
    inventory: 'Stok' as string,
    cash: 'Kasa' as string,
    settings: 'Ayarlar' as string,
    helpCenter: 'Yardım Merkezi' as string,
    privacyPolicy: 'Gizlilik Politikası' as string,
    termsOfService: 'Kullanım Şartları' as string,
  },

  // Dashboard
  dashboard: {
    welcome: 'Hoş geldiniz!' as string,
    title: 'Restaurant Yönetim Sistemi' as string,
    subtitle: 'Geleceğin restoran yönetim sistemine hoş geldiniz. Operasyonlarınızı akıllı ve şık bir arayüzle yönetin.' as string,
  },

  // Footer
  footer: {
    helpCenter: 'Yardım Merkezi' as string,
    privacyPolicy: 'Gizlilik Politikası' as string,
    termsOfService: 'Kullanım Şartları' as string,
    continueWith: 'Veya şununla devam et' as string,
    google: 'Google' as string,
    apple: 'Apple' as string,
  },

  // Customers (Dummy cast to any to satisfy the complex nested structure for now, 
  // though a proper interface would be better)
  customers: {
    title: "MÜŞTERİ VERİTABANI",
    description: "Müşteri kayıtlarını yönetin, sadakat puanlarını ve borç geçmişini takip edin.",
    newCustomer: "YENİ MÜŞTERİ",
    debtOnly: "SADECE BORÇLULAR",
    searchPlaceholder: "İSİM VEYA TELEFON İLE ARA...",
    table: {
      name: "MÜŞTERİ ADI",
      phone: "TELEFON",
      visit_count: "ZİYARET",
      total_spent: "HARCAMA",
      current_debt: "BORÇ",
      creditLimit: "LİMİT",
      lastVisit: "SON ZİYARET",
      actions: "İŞLEMLER"
    },
    form: {
      firstName: "AD",
      lastName: "SOYAD",
      phone: "TELEFON",
      email: "E-POSTA",
      creditLimitEnabled: "VERESİYE LİMİTİ",
      creditLimit: "LİMİT TUTARI",
      maxOpenOrders: "MAX. AÇIK SİPARİŞ",
      notes: "NOTLAR"
    },
    details: {
      title: "MÜŞTERİ DETAYI",
      stats: "İSTATİSTİKLER",
      visitCount: "TOPLAM ZİYARET",
      totalSpent: "TOPLAM HARCAMA",
      currentDebt: "GÜNCEL BORÇ",
      orderHistory: "SİPARİŞ GEÇMİŞİ"
    },
    messages: {
      createSuccess: "Müşteri başarıyla oluşturuldu.",
      updateSuccess: "Müşteri başarıyla güncellendi.",
      deleteSuccess: "Müşteri başarıyla silindi.",
      deleteConfirm: "Müşteriyi silmek istediğinize emin misiniz?"
    }
  },
} as const;
