export const tr = {
  // Common
  common: {
    loading: 'Yükleniyor...' as string,
    save: 'Kaydet' as string,
    cancel: 'İptal' as string,
    delete: 'Sil' as string,
    edit: 'Düzenle' as string,
    add: 'Ekle' as string,
    search: 'Ara' as string,
    filter: 'Filtrele' as string,
    back: 'Geri' as string,
    next: 'İleri' as string,
    submit: 'Gönder' as string,
    confirm: 'Onayla' as string,
    yes: 'Evet' as string,
    no: 'Hayır' as string,
    or: 'Veya' as string,
  },

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
} as const;
