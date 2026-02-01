import { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw, Phone, Loader2, User, MapPin } from 'lucide-react';

export default function HeroSection({
  giveAmount,
  setGiveAmount,
  giveCurrency,
  getCurrency,
  getAmount,
  onOpenCurrencyModal,
  onSwapCurrencies,
  onReserve,
  branches = [],
  settings,
}) {
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]);
    }
  }, [branches]);

  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.length > 0 && !digits.startsWith('38')) {
      digits = '38' + digits;
    }
    if (digits.length > 12) digits = digits.slice(0, 12);

    let formatted = '+' + digits;
    if (digits.length > 2) formatted = '+' + digits.slice(0, 2) + ' (' + digits.slice(2);
    if (digits.length > 5) formatted = '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 5) + ') ' + digits.slice(5);
    if (digits.length > 8) formatted = '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 5) + ') ' + digits.slice(5, 8) + '-' + digits.slice(8);
    if (digits.length > 10) formatted = '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 5) + ') ' + digits.slice(5, 8) + '-' + digits.slice(8, 10) + '-' + digits.slice(10);

    return formatted;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
    setError('');
  };

  const handleReserve = async () => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 12) {
      setError('Введіть коректний номер телефону');
      return;
    }

    if (!customerName.trim()) {
      setError("Введіть ваше ім'я");
      return;
    }

    if (!selectedBranch) {
      setError('Оберіть відділення');
      return;
    }

    if (giveAmount <= 0) {
      setError('Введіть суму');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onReserve({
        give_amount: giveAmount,
        give_currency: giveCurrency.code,
        get_currency: getCurrency.code,
        phone: '+' + phoneDigits,
        customer_name: customerName.trim(),
        branch_id: selectedBranch.id,
      });
      setPhone('');
      setCustomerName('');
    } catch (err) {
      setError(err.message || 'Помилка бронювання');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-20 lg:pt-24">
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <h1 className="text-5xl xl:text-6xl font-extrabold leading-tight mb-6">
                <span className="text-white">Справді </span>
                <span className="text-accent-yellow">вигідний</span>
                <br />
                <span className="text-white">сервіс обміну валют</span>
              </h1>
              <p className="text-lg text-text-secondary mb-8 max-w-xl">
                Ми пропонуємо прозорі умови, актуальні курси та високий рівень безпеки. 
                Забудьте про ризики неофіційного ринку — обмінюйте валюту швидко, зручно та без переплат.
              </p>
            </div>

            {/* Right - Exchange Card */}
            <div className="flex justify-end">
              <ExchangeCard
                giveAmount={giveAmount}
                setGiveAmount={setGiveAmount}
                giveCurrency={giveCurrency}
                getCurrency={getCurrency}
                getAmount={getAmount}
                onOpenCurrencyModal={onOpenCurrencyModal}
                onSwapCurrencies={onSwapCurrencies}
                onReserve={handleReserve}
                phone={phone}
                onPhoneChange={handlePhoneChange}
                customerName={customerName}
                setCustomerName={setCustomerName}
                branches={branches}
                selectedBranch={selectedBranch}
                setSelectedBranch={setSelectedBranch}
                loading={loading}
                error={error}
                settings={settings}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden px-4 py-6">
        <ExchangeCard
          giveAmount={giveAmount}
          setGiveAmount={setGiveAmount}
          giveCurrency={giveCurrency}
          getCurrency={getCurrency}
          getAmount={getAmount}
          onOpenCurrencyModal={onOpenCurrencyModal}
          onSwapCurrencies={onSwapCurrencies}
          onReserve={handleReserve}
          phone={phone}
          onPhoneChange={handlePhoneChange}
          customerName={customerName}
          setCustomerName={setCustomerName}
          branches={branches}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          loading={loading}
          error={error}
          settings={settings}
          isMobile
        />
      </div>
    </section>
  );
}

function ExchangeCard({
  giveAmount,
  setGiveAmount,
  giveCurrency,
  getCurrency,
  getAmount,
  onOpenCurrencyModal,
  onSwapCurrencies,
  onReserve,
  phone,
  onPhoneChange,
  customerName,
  setCustomerName,
  branches,
  selectedBranch,
  setSelectedBranch,
  loading,
  error,
  settings,
  isMobile = false,
}) {
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const minAmount = settings?.min_wholesale_amount || 1000;
  const reservationTime = settings?.reservation_time_minutes || 60;

  return (
    <div className={`bg-primary-card backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/10 ${isMobile ? 'p-4' : 'p-6 lg:p-8 max-w-md w-full'}`}>
      <h3 className="text-lg lg:text-xl font-bold text-center mb-1">Забронювати валюту</h3>
      <p className="text-xs lg:text-sm text-text-secondary text-center mb-6">
        Фіксація курсу на {reservationTime} хвилин
      </p>

      {/* Give Input */}
      <div className="mb-3">
        <div className="flex items-center justify-between bg-primary-light rounded-xl p-3 lg:p-4 border border-white/10">
          <div className="flex-1">
            <label className="text-xs text-text-secondary block mb-1">Віддаю</label>
            <input
              type="text"
              value={giveAmount}
              onChange={(e) => setGiveAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
              className="w-full bg-transparent text-xl lg:text-2xl font-bold outline-none"
            />
          </div>
          <button
            onClick={() => onOpenCurrencyModal('give')}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="text-xl">{giveCurrency.flag}</span>
            <span className="font-semibold text-sm">{giveCurrency.code}</span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Get Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between bg-primary-light rounded-xl p-3 lg:p-4 border border-white/10">
          <div className="flex-1">
            <label className="text-xs text-text-secondary block mb-1">Отримую</label>
            <input
              type="text"
              value={getAmount.toLocaleString('uk-UA')}
              readOnly
              className="w-full bg-transparent text-xl lg:text-2xl font-bold outline-none"
            />
          </div>
          <button
            onClick={() => onOpenCurrencyModal('get')}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="text-xl">{getCurrency.flag}</span>
            <span className="font-semibold text-sm">{getCurrency.code}</span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Rate & Swap */}
      <div className="flex items-center justify-between py-3 border-t border-b border-white/10 mb-4">
        <div>
          <div className="text-sm font-medium">1{giveCurrency.code === 'UAH' ? '₴' : '$'} = {giveCurrency.buy_rate?.toFixed(2) || '42.10'}₴</div>
          <div className="text-xs text-text-secondary">Роздрібний курс</div>
        </div>
        <button
          onClick={onSwapCurrencies}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs">{getCurrency.code} → {giveCurrency.code}</span>
        </button>
      </div>

      {/* Branch Selection */}
      <div className="mb-3 relative">
        <button
          onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
          className="w-full px-4 py-3 bg-primary-light rounded-xl border border-white/10 flex items-center justify-between hover:border-accent-yellow/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-accent-blue" />
            <span className="text-sm">{selectedBranch?.address || 'Оберіть відділення'}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {branchDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-primary-light border border-white/10 rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => {
                  setSelectedBranch(branch);
                  setBranchDropdownOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors flex items-center gap-3 ${
                  selectedBranch?.id === branch.id ? 'bg-accent-blue/10 text-accent-blue' : ''
                }`}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div>{branch.address}</div>
                  <div className="text-xs text-text-secondary">{branch.hours}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer Name */}
      <div className="mb-3">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ваше ім'я"
            className="w-full pl-12 pr-4 py-3 bg-primary-light rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Phone Input */}
      <div className="mb-4">
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="tel"
            value={phone}
            onChange={onPhoneChange}
            placeholder="+38 (0XX) XXX-XX-XX"
            className="w-full pl-12 pr-4 py-3 bg-primary-light rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Reserve Button */}
      <button
        onClick={onReserve}
        disabled={loading}
        className="w-full py-4 bg-gradient-gold rounded-xl text-primary font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Бронювання...
          </>
        ) : (
          'Забронювати'
        )}
      </button>

      {/* Notes */}
      <div className="mt-4 space-y-1 text-center">
        <p className="text-xs text-text-secondary">Оптовий курс від {minAmount} $ або в еквіваленті</p>
        <p className="text-xs text-text-secondary">→ Максимальний термін бронювання — {reservationTime} хв</p>
      </div>
    </div>
  );
}
