import common from '../locales/en/common.json';

export const en = {
  common,

  // Auth
  auth: {
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password',
    loginTitle: 'Admin Login',
    loginSubtitle: 'Please enter your credentials to sign in.',
    loginButton: 'Sign In',
    loginButtonLoading: 'Signing in...',
    loginSuccess: 'Login successful! Redirecting...',
    loginError: 'Login failed. Please check your credentials.',
    invalidCredentials: 'Invalid email or password.',
    required: 'This field is required.',
    invalidEmail: 'Please enter a valid email address.',
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    orders: 'Orders',
    menu: 'Menu',
    customers: 'Customers',
    inventory: 'Inventory',
    cash: 'Cash',
    settings: 'Settings',
    helpCenter: 'Help Center',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
  },

  // Dashboard
  dashboard: {
    welcome: 'Welcome!',
    title: 'Restaurant Management System',
    subtitle: 'Welcome to the future of restaurant management. Manage your operations with a smart and elegant interface.',
  },

  // Footer
  footer: {
    helpCenter: 'Help Center',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    continueWith: 'Or continue with',
    google: 'Google' as string,
    apple: 'Apple' as string,
  },

  customers: {
    title: "CUSTOMER DATABASE",
    description: "Manage customer records, track loyalty points and debt history.",
    newCustomer: "NEW CUSTOMER",
    debtOnly: "DEBT ONLY",
    searchPlaceholder: "SEARCH BY NAME OR PHONE...",
    table: {
      name: "CUSTOMER NAME",
      phone: "PHONE",
      visit_count: "VISITS",
      total_spent: "SPENDING",
      current_debt: "DEBT",
      creditLimit: "CREDIT LIMIT",
      lastVisit: "LAST VISIT",
      actions: "ACTIONS"
    },
    form: {
      firstName: "FIRST NAME",
      lastName: "LAST NAME",
      phone: "PHONE",
      email: "EMAIL",
      creditLimitEnabled: "CREDIT LIMIT ENABLED",
      creditLimit: "LIMIT AMOUNT",
      maxOpenOrders: "MAX OPEN ORDERS",
      notes: "NOTES"
    },
    details: {
      title: "CUSTOMER DETAILS",
      stats: "STATISTICS",
      visitCount: "TOTAL VISITS",
      totalSpent: "TOTAL SPENT",
      currentDebt: "CURRENT DEBT",
      orderHistory: "ORDER HISTORY"
    },
    messages: {
      createSuccess: "Customer created successfully.",
      updateSuccess: "Customer updated successfully.",
      deleteSuccess: "Customer deleted successfully.",
      deleteConfirm: "Are you sure you want to delete this customer?"
    }
  },
} as const;
