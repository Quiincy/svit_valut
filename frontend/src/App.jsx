import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import BranchesSection from './components/BranchesSection';
import RatesSection from './components/RatesSection';
import ServicesSection from './components/ServicesSection';
import FAQSection from './components/FAQSection';
import Footer from './components/Footer';
import CurrencyModal from './components/CurrencyModal';
import SuccessModal from './components/SuccessModal';
import MobileNav from './components/MobileNav';
import LiveChat from './components/LiveChat';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import RatesPage from './pages/RatesPage';
import ServicePage from './pages/ServicePage';
import AllServicesPage from './pages/AllServicesPage';
import { 
  currencyService, branchService, settingsService, faqService, servicesService,
  reservationService, authService, restoreAuth, clearAuthCredentials 
} from './services/api';

// Main public website
function PublicSite() {
  const [currencies, setCurrencies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [faqItems, setFaqItems] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [currencyModalType, setCurrencyModalType] = useState('give');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  
  const [giveAmount, setGiveAmount] = useState(500);
  const [giveCurrency, setGiveCurrency] = useState({ code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 42.10 });
  const [getCurrency, setGetCurrency] = useState({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦' });
  const [getAmount, setGetAmount] = useState(21050);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateExchange();
  }, [giveAmount, giveCurrency]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [currenciesRes, branchesRes, settingsRes, faqRes, servicesRes] = await Promise.all([
        currencyService.getAll(),
        branchService.getAll(),
        settingsService.get(),
        faqService.getAll(),
        servicesService.getAll(),
      ]);
      
      setCurrencies(currenciesRes.data);
      setBranches(branchesRes.data);
      setSettings(settingsRes.data);
      setFaqItems(faqRes.data);
      setServices(servicesRes.data);
      
      if (currenciesRes.data.length > 0) {
        setGiveCurrency(currenciesRes.data[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setCurrencies([
        { code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 42.10, sell_rate: 42.15, is_popular: true },
        { code: 'EUR', name_uk: 'Євро', flag: '🇪🇺', buy_rate: 49.30, sell_rate: 49.35, is_popular: true },
        { code: 'PLN', name_uk: 'Злотий', flag: '🇵🇱', buy_rate: 11.50, sell_rate: 11.65 },
        { code: 'GBP', name_uk: 'Фунт', flag: '🇬🇧', buy_rate: 56.10, sell_rate: 56.25, is_popular: true },
        { code: 'CHF', name_uk: 'Франк', flag: '🇨🇭', buy_rate: 52.80, sell_rate: 52.95 },
      ]);
      setBranches([
        { id: 1, address: 'вул. Старовокзальна, 23', hours: 'щодня: 9:00-19:00', phone: '(096) 048-88-84' },
        { id: 2, address: 'вул. В. Васильківська, 110', hours: 'щодня: 8:00-20:00', phone: '(096) 048-88-84' },
        { id: 3, address: 'вул. В. Васильківська, 130', hours: 'щодня: 8:00-20:00', phone: '(096) 048-88-84' },
        { id: 4, address: 'вул. Р. Окіпної, 2', hours: 'щодня: 8:00-20:00', phone: '(096) 048-88-84' },
        { id: 5, address: 'вул. Саксаганського, 69', hours: 'щодня: 9:00-20:00', phone: '(096) 048-88-84' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const calculateExchange = () => {
    const rate = giveCurrency.buy_rate || 42.10;
    setGetAmount(Math.round(giveAmount * rate));
  };

  const openCurrencyModal = (type) => {
    setCurrencyModalType(type);
    setCurrencyModalOpen(true);
  };

  const handleCurrencySelect = (currency) => {
    if (currencyModalType === 'give') {
      setGiveCurrency(currency);
    }
    setCurrencyModalOpen(false);
  };

  const handleSwapCurrencies = () => {
    const temp = giveCurrency;
    setGiveCurrency({ ...getCurrency, buy_rate: 1 / (temp.buy_rate || 42.10) });
    setGetCurrency(temp);
  };

  const handleReservation = async (data) => {
    try {
      const response = await reservationService.create(data);
      console.log('Reservation created:', response.data);
      setSuccessModalOpen(true);
      // Reset amount after successful reservation
      setGiveAmount(500);
    } catch (error) {
      console.error('Reservation error:', error);
      throw new Error(error.response?.data?.detail || 'Помилка створення бронювання');
    }
  };

  return (
    <div className="min-h-screen bg-primary">
      <Header onMenuToggle={() => setMobileMenuOpen(true)} onOpenChat={() => setChatOpen(true)} settings={settings} />
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} settings={settings} />
      
      <main>
        <HeroSection
          giveAmount={giveAmount}
          setGiveAmount={setGiveAmount}
          giveCurrency={giveCurrency}
          getCurrency={getCurrency}
          getAmount={getAmount}
          onOpenCurrencyModal={openCurrencyModal}
          onSwapCurrencies={handleSwapCurrencies}
          onReserve={handleReservation}
          branches={branches}
          settings={settings}
        />
        <FeaturesSection settings={settings} />
        <BranchesSection branches={branches} settings={settings} />
        <RatesSection currencies={currencies} />
        <ServicesSection services={services} />
        <FAQSection faqItems={faqItems} />
      </main>
      
      <Footer settings={settings} />
      
      <CurrencyModal
        isOpen={currencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        currencies={currencies}
        onSelect={handleCurrencySelect}
        type={currencyModalType}
      />
      
      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
      />
      
      <LiveChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
      
      {/* Chat FAB when chat is closed */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent-yellow rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ProtectedRoute({ children, user, requiredRole }) {
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/panel" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (restoreAuth()) {
      try {
        const res = await authService.me();
        setUser(res.data);
      } catch (error) {
        clearAuthCredentials();
      }
    }
    setAuthLoading(false);
  };

  const handleLogin = async (username, password) => {
    const res = await authService.login(username, password);
    setUser(res.data.user);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/services" element={<AllServicesPage />} />
        <Route path="/services/:slug" element={<ServicePage />} />
        <Route path="/login" element={user ? <Navigate to="/panel" replace /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/panel" element={
          user ? (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/operator" replace />) : <Navigate to="/login" replace />
        } />
        <Route path="/admin" element={
          <ProtectedRoute user={user} requiredRole="admin">
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/operator" element={
          <ProtectedRoute user={user}>
            <OperatorDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
