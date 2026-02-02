import { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw, Loader2, X, MapPin, User, Phone, Check, ArrowRight } from 'lucide-react';

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
  const [bookingStep, setBookingStep] = useState(null); // null, 'branch', 'name', 'phone'
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (giveAmount <= 0) {
      setError('Введіть суму');
      return;
    }
    setError('');
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
                onReserve={handleStartBooking}
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
          onReserve={handleStartBooking}
          error={error}
          settings={settings}
          isMobile
        />
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
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-8 bg-accent-yellow' : s < step ? 'w-2 bg-accent-yellow/50' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

// Exchange Card Component
function ExchangeCard({
  giveAmount,
  setGiveAmount,
  giveCurrency,
  getCurrency,
  getAmount,
  onOpenCurrencyModal,
  onSwapCurrencies,
  onReserve,
  error,
  settings,
  isMobile = false,
}) {
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

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Reserve Button */}
      <button
        onClick={onReserve}
        className="w-full py-4 bg-gradient-gold rounded-xl text-primary font-bold text-base hover:opacity-90 transition-opacity"
      >
        Забронювати
      </button>

      {/* Notes */}
      <div className="mt-4 space-y-1 text-center">
        <p className="text-xs text-text-secondary">Оптовий курс від {minAmount} $ або в еквіваленті</p>
        <p className="text-xs text-text-secondary">→ Максимальний термін бронювання — {reservationTime} хв</p>
      </div>
    </div>
  );
}
