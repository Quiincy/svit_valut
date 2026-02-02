import axios from 'axios';
import * as XLSX from 'xlsx';

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
    // Always include mock reservations in stats
    const mockReservations = getMockReservations();
    
    try {
      const response = await api.get('/admin/dashboard');
      const backendData = response.data;
      
      // Add mock stats to backend stats
      return { 
        data: { 
          total_reservations: backendData.total_reservations + mockReservations.length, 
          pending_reservations: backendData.pending_reservations + mockReservations.filter(r => r.status === 'pending').length, 
          confirmed_reservations: backendData.confirmed_reservations + mockReservations.filter(r => r.status === 'confirmed').length, 
          completed_today: backendData.completed_today + mockReservations.filter(r => r.status === 'completed').length, 
          total_volume_uah: backendData.total_volume_uah + mockReservations.reduce((sum, r) => sum + (r.get_amount || 0), 0)
        } 
      };
    } catch (error) {
      // Backend unavailable - use only mock data
      return { 
        data: { 
          total_reservations: mockReservations.length, 
          pending_reservations: mockReservations.filter(r => r.status === 'pending').length, 
          confirmed_reservations: mockReservations.filter(r => r.status === 'confirmed').length, 
          completed_today: mockReservations.filter(r => r.status === 'completed').length, 
          total_volume_uah: mockReservations.reduce((sum, r) => sum + (r.get_amount || 0), 0)
        } 
      };
    }
  },
  getReservations: async (params = {}) => {
    // Always get mock reservations from localStorage first
    const mockItems = getMockReservations();
    
    try {
      const response = await api.get('/admin/reservations', { params });
      const backendItems = response.data.items || [];
      
      // Combine: all unique items from both sources
      const allItemsMap = new Map();
      
      // Add backend items first
      backendItems.forEach(item => {
        allItemsMap.set(item.id, item);
      });
      
      // Add mock items if not already present
      mockItems.forEach(item => {
        if (!allItemsMap.has(item.id)) {
          allItemsMap.set(item.id, item);
        }
      });
      
      let allItems = Array.from(allItemsMap.values());
      
      // Sort by created_at descending
      allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Apply status filter
      if (params.status) {
        allItems = allItems.filter(r => r.status === params.status);
      }
      
      return { data: { items: allItems, total: allItems.length, page: 1, pages: 1 } };
    } catch (error) {
      // Backend unavailable - use only mock data
      let reservations = mockItems;
      if (params.status) {
        reservations = reservations.filter(r => r.status === params.status);
      }
      return { data: { items: reservations, total: reservations.length, page: 1, pages: 1 } };
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
    // Get mock reservations and filter by branch
    let mockReservations = getMockReservations();
    if (currentMockUser?.branch_id) {
      mockReservations = mockReservations.filter(r => r.branch_id === currentMockUser.branch_id);
    }
    
    try {
      const response = await api.get('/operator/dashboard');
      const backendData = response.data;
      
      // Add mock stats to backend stats
      return { 
        data: { 
          total_reservations: backendData.total_reservations + mockReservations.length, 
          pending_reservations: backendData.pending_reservations + mockReservations.filter(r => r.status === 'pending').length, 
          confirmed_reservations: backendData.confirmed_reservations + mockReservations.filter(r => r.status === 'confirmed').length, 
          completed_today: backendData.completed_today + mockReservations.filter(r => r.status === 'completed').length, 
          total_volume_uah: backendData.total_volume_uah + mockReservations.reduce((sum, r) => sum + (r.get_amount || 0), 0)
        } 
      };
    } catch (error) {
      // Backend unavailable
      return { 
        data: { 
          total_reservations: mockReservations.length, 
          pending_reservations: mockReservations.filter(r => r.status === 'pending').length, 
          confirmed_reservations: mockReservations.filter(r => r.status === 'confirmed').length, 
          completed_today: mockReservations.filter(r => r.status === 'completed').length, 
          total_volume_uah: mockReservations.reduce((sum, r) => sum + (r.get_amount || 0), 0)
        } 
      };
    }
  },
  getReservations: async (params = {}) => {
    // Get mock reservations
    let mockItems = getMockReservations();
    if (currentMockUser?.branch_id) {
      mockItems = mockItems.filter(r => r.branch_id === currentMockUser.branch_id);
    }
    
    try {
      const response = await api.get('/operator/reservations', { params });
      const backendItems = response.data.items || [];
      
      // Combine items
      const allItemsMap = new Map();
      backendItems.forEach(item => allItemsMap.set(item.id, item));
      mockItems.forEach(item => {
        if (!allItemsMap.has(item.id)) allItemsMap.set(item.id, item);
      });
      
      let allItems = Array.from(allItemsMap.values());
      allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (params.status) {
        allItems = allItems.filter(r => r.status === params.status);
      }
      
      return { data: { items: allItems, total: allItems.length, page: 1, pages: 1 } };
    } catch (error) {
      let reservations = mockItems;
      if (params.status) {
        reservations = reservations.filter(r => r.status === params.status);
      }
      return { data: { items: reservations, total: reservations.length, page: 1, pages: 1 } };
    }
  },
  downloadRates: async () => {
    // Generate Excel client-side - no server call needed
    const ratesData = [
      { 'Прапор': '🇺🇸', 'Код валюти': 'USD', 'Назва': 'Долар США', 'Купівля': 42.10, 'Продаж': 42.15 },
      { 'Прапор': '🇪🇺', 'Код валюти': 'EUR', 'Назва': 'Євро', 'Купівля': 49.30, 'Продаж': 49.35 },
      { 'Прапор': '🇵🇱', 'Код валюти': 'PLN', 'Назва': 'Злотий', 'Купівля': 11.50, 'Продаж': 11.65 },
      { 'Прапор': '🇬🇧', 'Код валюти': 'GBP', 'Назва': 'Фунт', 'Купівля': 56.10, 'Продаж': 56.25 },
      { 'Прапор': '🇨🇭', 'Код валюти': 'CHF', 'Назва': 'Франк', 'Купівля': 52.80, 'Продаж': 52.95 },
      { 'Прапор': '🇨🇦', 'Код валюти': 'CAD', 'Назва': 'Канадський долар', 'Купівля': 31.20, 'Продаж': 31.35 },
      { 'Прапор': '🇦🇺', 'Код валюти': 'AUD', 'Назва': 'Австралійський долар', 'Купівля': 30.40, 'Продаж': 30.55 },
      { 'Прапор': '🇨🇿', 'Код валюти': 'CZK', 'Назва': 'Чеська крона', 'Купівля': 1.85, 'Продаж': 1.90 },
      { 'Прапор': '🇹🇷', 'Код валюти': 'TRY', 'Назва': 'Турецька ліра', 'Купівля': 1.22, 'Продаж': 1.28 },
      { 'Прапор': '🇯🇵', 'Код валюти': 'JPY', 'Назва': 'Японська єна', 'Купівля': 0.28, 'Продаж': 0.29 },
    ];
    
    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(ratesData);
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, ws, 'Курси');
    
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    return { data: blob };
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

// Settings persistence in localStorage
const getLocalSettings = () => {
  try {
    return JSON.parse(localStorage.getItem('siteSettings')) || null;
  } catch {
    return null;
  }
};

const saveLocalSettings = (settings) => {
  localStorage.setItem('siteSettings', JSON.stringify(settings));
};

// Settings service
export const settingsService = {
  get: async () => {
    try {
      const response = await api.get('/settings');
      // Cache settings locally
      if (response.data) {
        saveLocalSettings(response.data);
      }
      return response;
    } catch (error) {
      // Try local cache first, then default
      const localSettings = getLocalSettings();
      return { data: localSettings || DEFAULT_SETTINGS };
    }
  },
  update: async (data) => {
    try {
      const response = await api.put('/admin/settings', data);
      // Update local cache
      saveLocalSettings(data);
      return response;
    } catch (error) {
      // Save locally even if backend fails
      saveLocalSettings(data);
      return { data };
    }
  },
};

// FAQ persistence
const getLocalFaq = () => {
  try {
    return JSON.parse(localStorage.getItem('siteFaq')) || null;
  } catch {
    return null;
  }
};

const saveLocalFaq = (faq) => {
  localStorage.setItem('siteFaq', JSON.stringify(faq));
};

// FAQ service
export const faqService = {
  getAll: async () => {
    try {
      const response = await api.get('/faq');
      if (response.data) {
        saveLocalFaq(response.data);
      }
      return response;
    } catch (error) {
      const localFaq = getLocalFaq();
      return { data: localFaq || DEFAULT_FAQ };
    }
  },
  create: async (data) => {
    try {
      return await api.post('/admin/faq', data);
    } catch (error) {
      // Add to local storage
      const localFaq = getLocalFaq() || [];
      const newItem = { ...data, id: Date.now() };
      localFaq.push(newItem);
      saveLocalFaq(localFaq);
      return { data: newItem };
    }
  },
  update: async (id, data) => {
    try {
      return await api.put(`/admin/faq/${id}`, data);
    } catch (error) {
      const localFaq = getLocalFaq() || [];
      const idx = localFaq.findIndex(f => f.id === id);
      if (idx >= 0) {
        localFaq[idx] = { ...localFaq[idx], ...data };
        saveLocalFaq(localFaq);
      }
      return { data };
    }
  },
  delete: async (id) => {
    try {
      return await api.delete(`/admin/faq/${id}`);
    } catch (error) {
      const localFaq = getLocalFaq() || [];
      saveLocalFaq(localFaq.filter(f => f.id !== id));
      return { data: { success: true } };
    }
  },
};

// Services persistence
const getLocalServices = () => {
  try {
    return JSON.parse(localStorage.getItem('siteServices')) || null;
  } catch {
    return null;
  }
};

const saveLocalServices = (services) => {
  localStorage.setItem('siteServices', JSON.stringify(services));
};

// Services service
export const servicesService = {
  getAll: async () => {
    try {
      const response = await api.get('/services');
      if (response.data) {
        saveLocalServices(response.data);
      }
      return response;
    } catch (error) {
      const localServices = getLocalServices();
      return { data: localServices || DEFAULT_SERVICES };
    }
  },
  create: async (data) => {
    try {
      return await api.post('/admin/services', data);
    } catch (error) {
      const localServices = getLocalServices() || [];
      const newItem = { ...data, id: Date.now() };
      localServices.push(newItem);
      saveLocalServices(localServices);
      return { data: newItem };
    }
  },
  update: async (id, data) => {
    try {
      return await api.put(`/admin/services/${id}`, data);
    } catch (error) {
      const localServices = getLocalServices() || [];
      const idx = localServices.findIndex(s => s.id === id);
      if (idx >= 0) {
        localServices[idx] = { ...localServices[idx], ...data };
        saveLocalServices(localServices);
      }
      return { data };
    }
  },
  delete: async (id) => {
    try {
      return await api.delete(`/admin/services/${id}`);
    } catch (error) {
      const localServices = getLocalServices() || [];
      saveLocalServices(localServices.filter(s => s.id !== id));
      return { data: { success: true } };
    }
  },
};

export default api;
