import axios from 'axios';

// Determine API URL
// In production: use VITE_API_URL env variable
// In dev: use proxy through Vite
const getApiUrl = () => {
  // Check for production API URL
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL + '/api';
  }
  // Default to relative path for dev proxy
  return '/api';
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Mock data for when backend is not available
const MOCK_USERS = {
  admin: { id: 1, username: 'admin', role: 'admin', branch_id: null, name: 'Адміністратор' },
  operator1: { id: 2, username: 'operator1', role: 'operator', branch_id: 1, name: 'Марія Коваленко', branch_address: 'вул. Старовокзальна, 23' },
  operator2: { id: 3, username: 'operator2', role: 'operator', branch_id: 2, name: 'Олексій Шевченко', branch_address: 'вул. В. Васильківська, 110' },
};

const MOCK_PASSWORDS = {
  admin: 'admin123',
  operator1: 'op1pass',
  operator2: 'op2pass',
};

let mockMode = false;
let currentMockUser = null;

// Auth helper
export const setAuthCredentials = (username, password) => {
  const token = btoa(`${username}:${password}`);
  api.defaults.headers.common['Authorization'] = `Basic ${token}`;
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', username);
  localStorage.setItem('authPass', password);
};

export const clearAuthCredentials = () => {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  localStorage.removeItem('authPass');
  currentMockUser = null;
  mockMode = false;
};

export const restoreAuth = () => {
  const token = localStorage.getItem('authToken');
  const username = localStorage.getItem('authUser');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Basic ${token}`;
    // Check if we were in mock mode
    if (username && MOCK_USERS[username]) {
      currentMockUser = MOCK_USERS[username];
    }
    return true;
  }
  return false;
};

// Mock reservations storage (persisted in localStorage)
const getMockReservations = () => {
  try {
    const stored = localStorage.getItem('mockReservations');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveMockReservations = (reservations) => {
  localStorage.setItem('mockReservations', JSON.stringify(reservations));
};

// Mock login function
const mockLogin = (username, password) => {
  if (MOCK_PASSWORDS[username] === password) {
    mockMode = true;
    currentMockUser = MOCK_USERS[username];
    return { data: { user: currentMockUser } };
  }
  throw new Error('Invalid credentials');
};

export const currencyService = {
  getAll: () => api.get('/currencies'),
  getOne: (code) => api.get(`/currencies/${code}`),
  getRates: () => api.get('/rates'),
  calculate: (amount, fromCurrency, toCurrency = 'UAH') => 
    api.get('/calculate', { params: { amount, from_currency: fromCurrency, to_currency: toCurrency } }),
};

export const orderService = {
  getAll: (type = null, page = 1, limit = 10) => 
    api.get('/orders', { params: { type, page, limit } }),
  getCount: () => api.get('/orders/count'),
};

export const branchService = {
  getAll: () => api.get('/branches'),
  getOne: (id) => api.get(`/branches/${id}`),
};

export const reservationService = {
  create: async (data) => {
    try {
      return await api.post('/reservations', data);
    } catch (error) {
      // Mock mode - save locally
      const mockReservations = getMockReservations();
      const now = new Date();
      const newReservation = {
        id: Date.now(),
        ...data,
        get_amount: data.give_amount * 42.10, // Mock rate
        rate: 42.10,
        status: 'pending',
        branch_id: data.branch_id || 1,
        branch_address: data.branch_id === 2 ? 'вул. В. Васильківська, 110' : 
                        data.branch_id === 3 ? 'вул. В. Васильківська, 130' :
                        data.branch_id === 4 ? 'вул. Р. Окіпної, 2' :
                        data.branch_id === 5 ? 'вул. Саксаганського, 69' : 'вул. Старовокзальна, 23',
        customer_name: data.customer_name || '',
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      };
      mockReservations.unshift(newReservation);
      saveMockReservations(mockReservations);
      return { data: newReservation };
    }
  },
  getOne: (id) => api.get(`/reservations/${id}`),
};

// Auth service with mock fallback
export const authService = {
  login: async (username, password) => {
    setAuthCredentials(username, password);
    try {
      const response = await api.post('/auth/login');
      return response;
    } catch (error) {
      // If backend is unavailable, try mock login
      console.log('Backend unavailable, trying mock login...');
      const mockResult = mockLogin(username, password);
      return mockResult;
    }
  },
  logout: () => {
    clearAuthCredentials();
  },
  me: async () => {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      // If backend unavailable but we have mock user
      if (currentMockUser) {
        return { data: currentMockUser };
      }
      // Try to restore from localStorage
      const username = localStorage.getItem('authUser');
      const password = localStorage.getItem('authPass');
      if (username && password && MOCK_PASSWORDS[username] === password) {
        currentMockUser = MOCK_USERS[username];
        mockMode = true;
        return { data: currentMockUser };
      }
      throw error;
    }
  },
};

// Admin service with mock fallback
export const adminService = {
  getDashboard: async () => {
    try {
      return await api.get('/admin/dashboard');
    } catch (error) {
      if (mockMode) {
        const reservations = getMockReservations();
        return { 
          data: { 
            total_reservations: reservations.length, 
            pending_reservations: reservations.filter(r => r.status === 'pending').length, 
            confirmed_reservations: reservations.filter(r => r.status === 'confirmed').length, 
            completed_today: reservations.filter(r => r.status === 'completed').length, 
            total_volume_uah: reservations.reduce((sum, r) => sum + (r.get_amount || 0), 0)
          } 
        };
      }
      throw error;
    }
  },
  getReservations: async (params = {}) => {
    try {
      return await api.get('/admin/reservations', { params });
    } catch (error) {
      if (mockMode) {
        let reservations = getMockReservations();
        if (params.status) {
          reservations = reservations.filter(r => r.status === params.status);
        }
        return { data: { items: reservations, total: reservations.length, page: 1, pages: 1 } };
      }
      throw error;
    }
  },
  uploadRates: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/rates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: () => api.get('/admin/rates/template', { responseType: 'blob' }),
  getAllRates: async () => {
    try {
      return await api.get('/admin/rates/all');
    } catch (error) {
      if (mockMode) {
        return { data: { base_rates: {}, branch_rates: {}, cross_rates: {}, branches: [] } };
      }
      throw error;
    }
  },
  getBranchRates: (branchId) => api.get(`/rates/branch/${branchId}`),
  getCrossRates: () => api.get('/rates/cross'),
  
  // Currency management
  getCurrencies: async () => {
    try {
      return await api.get('/admin/currencies');
    } catch (error) {
      // Fallback to public currencies
      return await api.get('/currencies');
    }
  },
  updateCurrency: (code, data) => api.put(`/admin/currencies/${code}`, data),
  
  // Branch management
  getBranches: () => api.get('/admin/branches'),
  updateBranch: (id, data) => api.put(`/admin/branches/${id}`, data),
};

// Operator service with mock fallback
export const operatorService = {
  getDashboard: async () => {
    try {
      return await api.get('/operator/dashboard');
    } catch (error) {
      if (mockMode) {
        let reservations = getMockReservations();
        // Filter by operator's branch
        if (currentMockUser?.branch_id) {
          reservations = reservations.filter(r => r.branch_id === currentMockUser.branch_id);
        }
        return { 
          data: { 
            total_reservations: reservations.length, 
            pending_reservations: reservations.filter(r => r.status === 'pending').length, 
            confirmed_reservations: reservations.filter(r => r.status === 'confirmed').length, 
            completed_today: reservations.filter(r => r.status === 'completed').length, 
            total_volume_uah: reservations.reduce((sum, r) => sum + (r.get_amount || 0), 0)
          } 
        };
      }
      throw error;
    }
  },
  getReservations: async (params = {}) => {
    try {
      return await api.get('/operator/reservations', { params });
    } catch (error) {
      if (mockMode) {
        let reservations = getMockReservations();
        // Filter by operator's branch
        if (currentMockUser?.branch_id) {
          reservations = reservations.filter(r => r.branch_id === currentMockUser.branch_id);
        }
        if (params.status) {
          reservations = reservations.filter(r => r.status === params.status);
        }
        return { data: { items: reservations, total: reservations.length, page: 1, pages: 1 } };
      }
      throw error;
    }
  },
  downloadRates: async () => {
    try {
      const response = await api.get('/operator/rates/download', { responseType: 'blob' });
      return response;
    } catch (error) {
      // Mock mode - generate Excel client-side
      if (mockMode) {
        try {
          const XLSX = await import('xlsx');
          const workbook = XLSX.utils.book_new();
          
          const ratesData = [
            { 'Код валюти': 'USD', 'Назва': 'Долар США', 'Купівля': 42.10, 'Продаж': 42.15 },
            { 'Код валюти': 'EUR', 'Назва': 'Євро', 'Купівля': 49.30, 'Продаж': 49.35 },
            { 'Код валюти': 'PLN', 'Назва': 'Злотий', 'Купівля': 11.50, 'Продаж': 11.65 },
            { 'Код валюти': 'GBP', 'Назва': 'Фунт', 'Купівля': 56.10, 'Продаж': 56.25 },
            { 'Код валюти': 'CHF', 'Назва': 'Франк', 'Купівля': 52.80, 'Продаж': 52.95 },
          ];
          
          const ws = XLSX.utils.json_to_sheet(ratesData);
          XLSX.utils.book_append_sheet(workbook, ws, 'Курси');
          
          const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          
          return { data: blob };
        } catch (xlsxError) {
          console.error('XLSX error:', xlsxError);
          throw new Error('Помилка генерації файлу');
        }
      }
      throw error;
    }
  },
  updateReservation: async (id, data) => {
    try {
      return await api.put(`/operator/reservations/${id}`, data);
    } catch (error) {
      if (mockMode) {
        const reservations = getMockReservations();
        const idx = reservations.findIndex(r => r.id === id);
        if (idx !== -1) {
          reservations[idx] = { ...reservations[idx], ...data };
          saveMockReservations(reservations);
          return { data: reservations[idx] };
        }
      }
      throw error;
    }
  },
  confirmReservation: async (id) => {
    try {
      return await api.post(`/operator/reservations/${id}/confirm`);
    } catch (error) {
      if (mockMode) {
        const reservations = getMockReservations();
        const idx = reservations.findIndex(r => r.id === id);
        if (idx !== -1) {
          reservations[idx].status = 'confirmed';
          saveMockReservations(reservations);
          return { data: reservations[idx] };
        }
      }
      throw error;
    }
  },
  completeReservation: async (id) => {
    try {
      return await api.post(`/operator/reservations/${id}/complete`);
    } catch (error) {
      if (mockMode) {
        const reservations = getMockReservations();
        const idx = reservations.findIndex(r => r.id === id);
        if (idx !== -1) {
          reservations[idx].status = 'completed';
          reservations[idx].completed_at = new Date().toISOString();
          saveMockReservations(reservations);
          return { data: reservations[idx] };
        }
      }
      throw error;
    }
  },
  cancelReservation: async (id) => {
    try {
      return await api.post(`/operator/reservations/${id}/cancel`);
    } catch (error) {
      if (mockMode) {
        const reservations = getMockReservations();
        const idx = reservations.findIndex(r => r.id === id);
        if (idx !== -1) {
          reservations[idx].status = 'cancelled';
          saveMockReservations(reservations);
          return { data: reservations[idx] };
        }
      }
      throw error;
    }
  },
};

// Default site settings for mock mode
const DEFAULT_SETTINGS = {
  company_name: "Світ Валют",
  phone: "(096) 048-88-84",
  phone_secondary: null,
  email: "info@svitvalut.ua",
  working_hours: "щодня: 8:00-20:00",
  telegram_url: "https://t.me/svitvalut",
  viber_url: "viber://chat?number=+380960488884",
  whatsapp_url: "https://wa.me/380960488884",
  instagram_url: null,
  facebook_url: null,
  address: "м. Київ",
  min_wholesale_amount: 1000,
  reservation_time_minutes: 60,
};

const DEFAULT_FAQ = [
  { id: 1, question: "Як захиститися від фальшивих купюр", answer: "Ми використовуємо професійне обладнання для перевірки справжності банкнот." },
  { id: 2, question: "Як правильно розрахувати курс USD → EUR?", answer: 'Це питання детально розібрано в статті "Що таке конвертація валюти та як вірно рахувати".', link_text: "Детальніше", link_url: "/articles/1" },
  { id: 3, question: "Як працює міжбанк і чому курс змінюється", answer: "Міжбанківський курс формується на основі попиту та пропозиції на валютному ринку між банками." },
  { id: 4, question: "Коли діє оптовий курс?", answer: "Оптовий курс діє при обміні від 1000 USD або еквівалент в іншій валюті." },
  { id: 5, question: "Які банкноти вважаються зношеними?", answer: "Зношеними вважаються банкноти з пошкодженнями: надриви, плями, написи, відсутні фрагменти." },
];

const DEFAULT_SERVICES = [
  { id: 1, title: "Приймаємо валюту, яка вийшла з обігу", description: "Миттєво обміняємо старі фунти, франки, марки.", image_url: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=200&fit=crop", link_url: "/services/old-currency" },
  { id: 2, title: "Приймаємо зношену валюту", description: "Зручний спосіб позбутися непотрібних купюр.", image_url: "https://images.unsplash.com/photo-1611324477757-c947df087651?w=400&h=200&fit=crop", link_url: "/services/damaged-currency" },
  { id: 3, title: "Старі франки на нові або USD", description: "Оновіть франки які вийшли з обігу.", image_url: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=400&h=200&fit=crop", link_url: "/services/old-francs" },
];

// Settings service
export const settingsService = {
  get: async () => {
    try {
      return await api.get('/settings');
    } catch (error) {
      return { data: DEFAULT_SETTINGS };
    }
  },
  update: (data) => api.put('/admin/settings', data),
};

// FAQ service
export const faqService = {
  getAll: async () => {
    try {
      return await api.get('/faq');
    } catch (error) {
      return { data: DEFAULT_FAQ };
    }
  },
  create: (data) => api.post('/admin/faq', data),
  update: (id, data) => api.put(`/admin/faq/${id}`, data),
  delete: (id) => api.delete(`/admin/faq/${id}`),
};

// Services service
export const servicesService = {
  getAll: async () => {
    try {
      return await api.get('/services');
    } catch (error) {
      return { data: DEFAULT_SERVICES };
    }
  },
  create: (data) => api.post('/admin/services', data),
  update: (id, data) => api.put(`/admin/services/${id}`, data),
  delete: (id) => api.delete(`/admin/services/${id}`),
};

export default api;
