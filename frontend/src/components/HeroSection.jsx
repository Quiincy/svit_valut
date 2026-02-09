import { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw, Loader2, X, MapPin, User, Phone, Check, ArrowRight } from 'lucide-react';

export default function HeroSection({
  giveAmount,
  setGiveAmount,
  giveCurrency,
  setGiveCurrency,
  getCurrency,
  setGetCurrency,
  getAmount,
  onOpenCurrencyModal,
  onSwapCurrencies,
  onReserve,
  branches = [],
  settings,
  activeBranch,
  onBranchChange,
  onOpenChat,
  sellCurrency,
  buyCurrency,
  presetAction,
}) {
  const [bookingStep, setBookingStep] = useState(null); // null, 'branch', 'name', 'phone'
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [sellInputValue, setSellInputValue] = useState('');
  const [buyInputValue, setBuyInputValue] = useState('');

  const minAmount = settings?.min_wholesale_amount || 1000;
  const reservationTime = settings?.reservation_time_minutes || 60;
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // React to header dropdown preset selections
  useEffect(() => {
    if (!presetAction) return;
    const defaultAmount = '100';
    if (presetAction.type === 'sell') {
      // User wants to SELL foreign currency
      setSellInputValue(defaultAmount);
      setBuyInputValue('');
      setGiveAmount(Number(defaultAmount));
    } else if (presetAction.type === 'buy') {
      // User wants to BUY foreign currency
      setBuyInputValue(defaultAmount);
      setSellInputValue('');
      const rate = (presetAction.currency?.sell_rate && presetAction.currency.sell_rate > 0)
        ? presetAction.currency.sell_rate : 42.15;
      setGiveAmount(Number(defaultAmount) * rate);
    }
  }, [presetAction]);

  // Determine Active Mode "Officially" from Global State
  const isSellMode = giveCurrency && giveCurrency.code !== 'UAH';

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

  const handleStartBooking = () => {
    let currentAmount = giveAmount;

    // Detect Mode from Inputs (Reliability Fix)
    const sellVal = Number(sellInputValue.replace(/[^\d.]/g, '')) || 0;
    const buyVal = Number(buyInputValue.replace(/[^\d.]/g, '')) || 0;

    // Priority to non-zero input if currentAmount is 0
    if (currentAmount <= 0) {
      if (buyVal > 0) {
        const rate = (buyCurrency.sell_rate && buyCurrency.sell_rate > 0) ? buyCurrency.sell_rate : 42.15;
        currentAmount = buyVal * rate;
        setGiveAmount(currentAmount);
      } else if (sellVal > 0) {
        currentAmount = sellVal;
        setGiveAmount(currentAmount);
      }
    }

    if (currentAmount <= 0) {
      setError('Введіть суму');
      return;
    }
    setError('');
    // Always start with branch selection to ensure correct flow
    setSelectedBranch(activeBranch || branches[0]);
    setBookingStep('branch');
  };

  const handleSelectBranch = (branch) => {
    setSelectedBranch(branch);
    setBookingStep('name');
  };

  const handleNameSubmit = () => {
    if (!customerName.trim()) {
      setError("Введіть ваше ім'я");
      return;
    }
    setError('');
    setBookingStep('phone');
  };

  const handlePhoneSubmit = async () => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 12) {
      setError('Введіть коректний номер телефону');
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
      // Reset form
      setPhone('');
      setCustomerName('');
      setSelectedBranch(null);
      setBookingStep(null);
    } catch (err) {
      setError(err.message || 'Помилка бронювання');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setBookingStep(null);
    setError('');
  };

  // Sync Global giveAmount with Local Inputs when Currency/Mode Changes
  useEffect(() => {
    if (isSellMode) {
      const num = Number(sellInputValue.replace?.(/[^\d.]/g, '') || sellInputValue) || 0;
      setGiveAmount(num);
    } else {
      const num = Number(buyInputValue.replace?.(/[^\d.]/g, '') || buyInputValue) || 0;
      const rate = (buyCurrency.sell_rate && buyCurrency.sell_rate > 0) ? buyCurrency.sell_rate : 42.15;
      setGiveAmount(num * rate);
    }
  }, [sellCurrency, buyCurrency, isSellMode, sellInputValue, buyInputValue, setGiveAmount]);

  // Handlers
  const handleSellChange = (val) => {
    // Sanitize input to allow only digits and dot
    const sanitized = val.replace(/[^\d.]/g, '');

    setSellInputValue(sanitized);
    setBuyInputValue(''); // Enforce Exclusive Input
    const numVal = Number(sanitized) || 0;

    // Switch to Sell Mode if active
    if (!isSellMode || giveCurrency.code !== sellCurrency.code) {
      setGiveCurrency(sellCurrency);
      setGetCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
    }
    setGiveAmount(numVal);
  };

  const handleBuyChange = (val) => {
    // Sanitize input to allow only digits and dot
    const sanitized = val.replace(/[^\d.]/g, '');

    setBuyInputValue(sanitized);
    setSellInputValue(''); // Enforce Exclusive Input
    const numVal = Number(sanitized) || 0;

    // Switch to Buy Mode if active
    if (isSellMode || getCurrency.code !== buyCurrency.code) {
      setGetCurrency(buyCurrency);
      setGiveCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
    }

    // Calculate Amount in UAH (GiveAmount)
    const rate = (buyCurrency.sell_rate && buyCurrency.sell_rate > 0) ? buyCurrency.sell_rate : 42.15;
    setGiveAmount(numVal * rate);
  };

  // Display Rates
  const activeCurrency = isSellMode ? (sellCurrency || giveCurrency) : (buyCurrency || getCurrency);
  const buyRate = activeCurrency?.buy_rate || 0;
  const sellRate = activeCurrency?.sell_rate || 1;

  return (
    <section className="pt-20 lg:pt-24">
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="flex flex-col gap-8">
              {/* Title */}
              <h1 className="text-5xl xl:text-7xl font-bold leading-tight">
                <span className="text-accent-yellow">Обмін валют</span>
                <br />
                <span className="text-white font-light text-4xl xl:text-6xl">без ризиків та переплат</span>
              </h1>

              {/* Banner */}
              <div className="flex items-center gap-3 bg-white/10 rounded-full pl-2 pr-6 py-2 w-fit backdrop-blur-md border border-white/5">
                <div className="w-8 h-8 rounded-full border border-accent-blue text-accent-blue flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span className="text-base text-gray-300">Швидко. Безпечно. За вигідним курсом.</span>
              </div>

              {/* Contact Block */}
              <div className="mt-8">
                <p className="text-gray-400 mb-4 text-lg">
                  Маєте питання?<br />
                  Напишіть нам — відповімо за кілька хвилин.
                </p>
                <div className="flex items-center gap-6">
                  {/* Avatar & Status */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces"
                        alt="Irina"
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-primary"></div>
                    </div>
                    <div>
                      <div className="font-medium text-white">Ірина</div>
                      <div className="text-accent-blue text-sm">в мережі</div>
                    </div>
                  </div>

                  {/* Chat Button */}
                  <button
                    onClick={onOpenChat}
                    className="px-8 py-3 bg-gradient-to-r from-accent-yellow to-yellow-600 rounded-full text-primary font-bold hover:shadow-lg hover:shadow-yellow-500/20 transition-all"
                  >
                    Відкрити чат
                  </button>
                </div>
              </div>
            </div>

            {/* Right - Exchange Card */}
            <div className="flex justify-end">
              <ExchangeCard
                giveAmount={giveAmount}
                setGiveAmount={setGiveAmount}
                giveCurrency={giveCurrency}
                setGiveCurrency={setGiveCurrency}
                getCurrency={getCurrency}
                setGetCurrency={setGetCurrency}
                getAmount={getAmount}
                onOpenCurrencyModal={onOpenCurrencyModal}
                onSwapCurrencies={onSwapCurrencies}
                onReserve={handleStartBooking}
                error={error}
                settings={settings}
                branches={branches}
                activeBranch={activeBranch}
                onBranchChange={onBranchChange}
                sellCurrency={sellCurrency}
                buyCurrency={buyCurrency}
                sellInputValue={sellInputValue}
                setSellInputValue={setSellInputValue}
                buyInputValue={buyInputValue}
                setBuyInputValue={setBuyInputValue}
                minAmount={minAmount}
                reservationTime={reservationTime}
                branchDropdownOpen={branchDropdownOpen}
                setBranchDropdownOpen={setBranchDropdownOpen}
                focusedInput={focusedInput}
                setFocusedInput={setFocusedInput}
                isSellMode={isSellMode}
                handleSellChange={handleSellChange}
                handleBuyChange={handleBuyChange}
                buyRate={buyRate}
                sellRate={sellRate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden px-4 py-10 flex flex-col gap-8">
        <div className="flex flex-col gap-4 text-center items-center">
          <h1 className="text-3xl font-bold leading-tight">
            <span className="text-accent-yellow text-4xl">Обмін валют</span>
            <br />
            <span className="text-white font-light text-2xl">без ризиків та переплат</span>
          </h1>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-1 pr-4 py-1 w-fit backdrop-blur-md">
            <div className="w-8 h-8 bg-accent-blue/20 rounded-full flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-accent-blue transform -rotate-45" />
            </div>
            <span className="text-xs font-medium text-white/90">Швидко. Безпечно. Вигідно.</span>
          </div>
        </div>

        <ExchangeCard
          giveAmount={giveAmount}
          setGiveAmount={setGiveAmount}
          giveCurrency={giveCurrency}
          setGiveCurrency={setGiveCurrency}
          getCurrency={getCurrency}
          setGetCurrency={setGetCurrency}
          getAmount={getAmount}
          onOpenCurrencyModal={onOpenCurrencyModal}
          onSwapCurrencies={onSwapCurrencies}
          onReserve={handleStartBooking}
          error={error}
          settings={settings}
          isMobile
          branches={branches}
          activeBranch={activeBranch}
          onBranchChange={onBranchChange}
          sellCurrency={sellCurrency}
          buyCurrency={buyCurrency}
          sellInputValue={sellInputValue}
          setSellInputValue={setSellInputValue}
          buyInputValue={buyInputValue}
          setBuyInputValue={setBuyInputValue}
          minAmount={minAmount}
          reservationTime={reservationTime}
          branchDropdownOpen={branchDropdownOpen}
          setBranchDropdownOpen={setBranchDropdownOpen}
          focusedInput={focusedInput}
          setFocusedInput={setFocusedInput}
          isSellMode={isSellMode}
          handleSellChange={handleSellChange}
          handleBuyChange={handleBuyChange}
          buyRate={buyRate}
          sellRate={sellRate}
        />

        <p className="text-center text-sm text-text-secondary">
          Фіксація курсу на {settings?.reservation_time_minutes || 60} хвилин.<br />
          Оптовий курс від {settings?.min_wholesale_amount || 1000} USD.
        </p>
      </div>

      {/* Step 1: Branch Selection Modal */}
      {bookingStep === 'branch' && (
        <BookingModal onClose={closeModal} step={1} totalSteps={3}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-accent-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-accent-blue" />
            </div>
            <h3 className="text-xl font-bold mb-2">Оберіть відділення</h3>
            <p className="text-text-secondary text-sm">Куди вам зручніше приїхати?</p>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => handleSelectBranch(branch)}
                className="w-full p-4 bg-primary rounded-xl border border-white/10 hover:border-accent-blue/50 transition-all text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-blue font-bold">{branch.id}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{branch.address}</div>
                  <div className="text-sm text-text-secondary">{branch.hours}</div>
                  {branch.phone && <div className="text-sm text-accent-yellow">{branch.phone}</div>}
                </div>
                <ArrowRight className="w-5 h-5 text-text-secondary" />
              </button>
            ))}
          </div>
        </BookingModal>
      )}

      {/* Step 2: Name Modal */}
      {bookingStep === 'name' && (
        <BookingModal onClose={closeModal} step={2} totalSteps={3}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-accent-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-accent-yellow" />
            </div>
            <h3 className="text-xl font-bold mb-2">Як вас звати?</h3>
            <p className="text-text-secondary text-sm">Щоб оператор міг до вас звернутися</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); setError(''); }}
              placeholder="Ваше ім'я"
              autoFocus
              className="w-full px-4 py-4 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-center text-lg"
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            <button
              onClick={handleNameSubmit}
              className="w-full py-4 bg-accent-yellow rounded-xl text-primary font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Далі
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </BookingModal>
      )}

      {/* Step 3: Phone Modal */}
      {bookingStep === 'phone' && (
        <BookingModal onClose={closeModal} step={3} totalSteps={3}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ваш номер телефону</h3>
            <p className="text-text-secondary text-sm">Ми зателефонуємо для підтвердження</p>
          </div>

          <div className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); }}
              placeholder="+38 (0XX) XXX-XX-XX"
              autoFocus
              className="w-full px-4 py-4 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-center text-lg font-mono"
            />

            {/* Summary */}
            <div className="p-4 bg-primary rounded-xl border border-white/10">
              <div className="text-sm text-text-secondary mb-2">Ваше бронювання:</div>
              <div className="flex justify-between mb-1">
                <span>Сума:</span>
                <span className="font-bold">{giveAmount} {giveCurrency.code} → {getAmount.toLocaleString()} {getCurrency.code}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Відділення:</span>
                <span className="font-medium text-sm">{selectedBranch?.address}</span>
              </div>
              <div className="flex justify-between">
                <span>Ім'я:</span>
                <span className="font-medium">{customerName}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            <button
              onClick={handlePhoneSubmit}
              disabled={loading}
              className="w-full py-4 bg-gradient-gold rounded-xl text-primary font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Бронювання...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Забронювати
                </>
              )}
            </button>
          </div>
        </BookingModal>
      )}
    </section>
  );
}

// Booking Modal Component
function BookingModal({ children, onClose, step, totalSteps }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-primary-light rounded-3xl p-6 max-w-md w-full border border-white/10 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-accent-yellow' : s < step ? 'w-2 bg-accent-yellow/50' : 'w-2 bg-white/20'
                }`}
            />
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

function ExchangeCard({
  giveAmount,
  setGiveAmount,
  giveCurrency,
  setGiveCurrency,
  getCurrency,
  setGetCurrency,
  getAmount,
  onOpenCurrencyModal,
  onSwapCurrencies,
  onReserve,
  error,
  settings,
  isMobile = false,
  branches = [],
  activeBranch,
  onBranchChange,
  sellCurrency,
  buyCurrency,
  sellInputValue,
  setSellInputValue,
  buyInputValue,
  setBuyInputValue,
  // Props passed down from HeroSection
  minAmount,
  reservationTime,
  branchDropdownOpen,
  setBranchDropdownOpen,
  focusedInput,
  setFocusedInput,
  isSellMode,
  handleSellChange,
  handleBuyChange,
  buyRate,
  sellRate
}) {
  return (
    <div className={`bg-primary-card backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/10 ${isMobile ? 'p-4' : 'p-6 lg:p-8 max-w-xl w-full'}`}>
      <h3 className="text-lg lg:text-xl font-bold text-center mb-1">Забронювати валюту</h3>
      <p className="text-xs lg:text-sm text-text-secondary text-center mb-6">
        Фіксація курсу на {reservationTime} хвилин
      </p>

      {/* Branch Selector */}
      {branches.length > 0 && (
        <div className="mb-6 relative">
          <button
            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-primary-light rounded-xl border border-white/10 hover:border-accent-yellow/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent-yellow" />
              <span className="text-sm font-medium truncate">
                {activeBranch?.address || 'Будь-яке відділення'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {branchDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-primary-light rounded-xl border border-white/10 shadow-xl z-50 max-h-48 overflow-y-auto">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => {
                    onBranchChange(branch);
                    setBranchDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${activeBranch?.id === branch.id ? 'bg-accent-yellow/10' : ''}`}
                >
                  <div className="text-sm font-medium">{branch.address}</div>
                  <div className="text-xs text-text-secondary">{branch.hours}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Row 1: I SELL (Give Foreign -> Get UAH) */}
      <div className="mb-3 transition-all rounded-xl border p-1 bg-primary-light border-white/10 focus-within:border-green-400 focus-within:shadow-[0_0_20px_rgba(74,222,128,0.2)]">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Input Group */}
          <div className="flex-1 flex items-center">
            <div className="pl-3 pr-2 py-2 w-full">
              <span className="text-xs text-text-secondary block">Я продаю</span>
              <input
                type="text"
                value={sellInputValue}
                onFocus={() => {
                  setFocusedInput('sell');
                  setBuyInputValue(''); // Clear other input
                  if (!isSellMode) {
                    setGiveCurrency(sellCurrency);
                    setGetCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
                    // Force update logic
                    const numVal = Number(sellInputValue.replace(/[^\d.]/g, '')) || 0;
                    setGiveAmount(numVal);
                  }
                }}
                onBlur={() => setFocusedInput(null)}
                onChange={(e) => handleSellChange(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-xl font-bold outline-none text-white min-w-[80px]"
              />
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-2 cursor-pointer hover:bg-white/10" onClick={() => onOpenCurrencyModal('sell_currency')}>
              <span className="text-lg">{sellCurrency?.flag}</span>
              <span className="font-bold text-sm">{sellCurrency?.code}</span>
              <ChevronDown className="w-3 h-3 text-text-secondary" />
            </div>
          </div>

          {/* Output Group */}
          <div className="flex-1 border-l border-white/10 pl-3 flex items-center">
            <div className="pl-3 pr-2 py-2 w-full">
              <span className="text-xs text-text-secondary block">Я отримаю</span>
              <input
                type="text"
                value={((isSellMode && !buyInputValue && sellInputValue) ? getAmount : ((Number(sellInputValue.replace(/[^\d.]/g, '')) || 0) * (sellCurrency.buy_rate || 0))).toFixed(2)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, '');
                  const rate = sellCurrency.buy_rate || 1;
                  const foreign = val / rate;
                  setSellInputValue(foreign.toFixed(2));
                  setBuyInputValue('');
                  if (!isSellMode) {
                    setGiveCurrency(sellCurrency);
                    setGetCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
                  }
                }}
                onFocus={() => setFocusedInput('sell')}
                onBlur={() => setFocusedInput(null)}
                placeholder="0"
                className="w-full bg-transparent text-xl font-bold outline-none text-right text-green-400 placeholder-green-400/50"
              />
            </div>
            <div className="pr-3 py-2">
              <span className="font-bold text-sm text-text-secondary">UAH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: I BUY (Give UAH -> Get Foreign) */}
      <div className="mb-6 transition-all rounded-xl border p-1 bg-primary-light border-white/10 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/50 focus-within:shadow-[0_0_20px_rgba(239,68,68,0.3)]">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Input Group */}
          <div className="flex-1 flex items-center">
            <div className="pl-3 pr-2 py-2 w-full">
              <span className="text-xs text-text-secondary block">Я купую</span>
              <input
                type="text"
                value={buyInputValue}
                onFocus={() => {
                  setFocusedInput('buy');
                  setSellInputValue(''); // Clear other input
                  if (isSellMode) {
                    setGetCurrency(buyCurrency);
                    setGiveCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
                    // Force update logic
                    const numVal = Number(buyInputValue.replace(/[^\d.]/g, '')) || 0;
                    const rate = (buyCurrency.sell_rate && buyCurrency.sell_rate > 0) ? buyCurrency.sell_rate : 42.15;
                    setGiveAmount(numVal * rate);
                  }
                }}
                onBlur={() => setFocusedInput(null)}
                onChange={(e) => handleBuyChange(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-xl font-bold outline-none text-white min-w-[80px]"
              />
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-2 cursor-pointer hover:bg-white/10" onClick={() => onOpenCurrencyModal('buy_currency')}>
              <span className="text-lg">{buyCurrency?.flag}</span>
              <span className="font-bold text-sm">{buyCurrency?.code}</span>
              <ChevronDown className="w-3 h-3 text-text-secondary" />
            </div>
          </div>

          {/* Output Group */}
          <div className="flex-1 border-l border-white/10 pl-3 flex items-center">
            <div className="pl-3 pr-2 py-2 w-full">
              <span className="text-xs text-text-secondary block">Мені знадобиться</span>
              <input
                type="text"
                value={((!isSellMode && !sellInputValue && buyInputValue) ? giveAmount : ((Number(buyInputValue.replace(/[^\d.]/g, '')) || 0) * (buyCurrency.sell_rate || 42.15))).toFixed(2)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, '');
                  const rate = (buyCurrency.sell_rate && buyCurrency.sell_rate > 0) ? buyCurrency.sell_rate : 42.15;
                  const foreign = val / rate;
                  setBuyInputValue(foreign.toFixed(2));
                  setSellInputValue('');
                  if (isSellMode) {
                    setGetCurrency(buyCurrency);
                    setGiveCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
                  }
                }}
                onFocus={() => setFocusedInput('buy')}
                onBlur={() => setFocusedInput(null)}
                placeholder="0"
                className="w-full bg-transparent text-xl font-bold outline-none text-right text-red-400 placeholder-red-400/50"
              />
            </div>
            <div className="pr-3 py-2">
              <span className="font-bold text-sm text-text-secondary">UAH</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-text-secondary mb-4 px-2">
        <div>
          Курс: <span className="text-white">{(buyRate).toFixed(2)} / {(sellRate).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          <span>Оновлено щойно</span>
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
        className="w-full py-4 bg-accent-yellow rounded-xl text-primary font-bold text-lg hover:opacity-90 transition-opacity"
      >
        Забронювати
      </button>

      {/* Wholesale Rate Info - Always Visible */}
      <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-center">
        <p className="text-sm text-accent-yellow">
          Оптовий курс діє від {minAmount} {isSellMode ? giveCurrency.code : (buyCurrency?.code || getCurrency.code)}
        </p>
      </div>
    </div>
  );
}
