import { useState, useEffect, useCallback } from 'react';
import {
  LogOut, RefreshCw, CheckCircle, XCircle, Clock,
  DollarSign, TrendingUp, Phone, MapPin, MessageSquare,
  Check, X, AlertCircle, Download, Bell, Copy
} from 'lucide-react';
import { operatorService } from '../services/api';

const STATUS_CONFIG = {
  pending: { label: 'Очікує', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  confirmed: { label: 'Підтверджено', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle },
  completed: { label: 'Завершено', color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
  cancelled: { label: 'Скасовано', color: 'text-red-400 bg-red-400/10', icon: XCircle },
  expired: { label: 'Прострочено', color: 'text-gray-400 bg-gray-400/10', icon: XCircle },
};

// Kyiv timezone
const formatKyivTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function OperatorDashboard({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [note, setNote] = useState('');
  const [lastReservationCount, setLastReservationCount] = useState(0);
  const [newReservationAlert, setNewReservationAlert] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copiedId, setCopiedId] = useState(null);

  // Update time every minute (Kyiv time)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, reservationsRes] = await Promise.all([
        operatorService.getDashboard(),
        operatorService.getReservations({
          status: statusFilter || undefined,
          limit: 50,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined
        }),
      ]);
      setDashboard(dashboardRes.data);
      const items = reservationsRes.data.items || [];

      // Check for new reservations
      if (items.length > lastReservationCount && lastReservationCount > 0) {
        setNewReservationAlert(true);
        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleX');
          audio.volume = 0.3;
          audio.play().catch(() => { });
        } catch { }
        setTimeout(() => setNewReservationAlert(false), 5000);
      }
      setLastReservationCount(items.length);
      setReservations(items);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, lastReservationCount, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDownloadRates = async () => {
    try {
      const response = await operatorService.downloadRates();
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rates_branch_${user.branch_id || 'all'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading rates:', error);
      alert('Помилка завантаження курсів: ' + (error.message || 'Невідома помилка'));
    }
  };

  const handleConfirm = async (id) => {
    setActionLoading(id);
    try {
      await operatorService.confirmReservation(id);
      fetchData();
    } catch (error) {
      console.error('Error confirming reservation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoading(id);
    try {
      await operatorService.completeReservation(id);
      fetchData();
    } catch (error) {
      console.error('Error completing reservation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Ви впевнені, що хочете скасувати це бронювання?')) return;

    setActionLoading(id);
    try {
      await operatorService.cancelReservation(id);
      fetchData();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async () => {
    if (!noteModal || !note.trim()) return;

    setActionLoading(noteModal);
    try {
      await operatorService.updateReservation(noteModal, { operator_note: note });
      setNoteModal(null);
      setNote('');
      fetchData();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getTimeLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Прострочено';
    const mins = Math.floor(diff / 60000);
    return `${mins} хв`;
  };

  const handleCopyPhone = (phone, id) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-primary-light border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent-blue rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Панель оператора</h1>
              <p className="text-xs text-text-secondary">{user.branch_address}</p>
            </div>
            {newReservationAlert && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg animate-pulse">
                <Bell className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">Нове бронювання!</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Kyiv Time */}
            <div className="hidden sm:block text-right text-sm text-text-secondary">
              <div>Київ</div>
              <div className="font-mono">{currentTime.toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            {/* Download Rates Button */}
            <button
              onClick={handleDownloadRates}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue/10 text-accent-blue rounded-lg hover:bg-accent-blue/20 transition-colors"
              title="Завантажити курси"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Курси</span>
            </button>

            <div className="text-right">
              <div className="font-medium text-sm">{user.name}</div>
              <div className="text-xs text-accent-blue">Оператор</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        {dashboard && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm text-text-secondary">Всього</span>
              </div>
              <div className="text-3xl font-bold">{dashboard.total_reservations}</div>
            </div>

            <div className="bg-primary-light rounded-2xl p-5 border border-yellow-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-sm text-text-secondary">Очікують</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400">{dashboard.pending_reservations}</div>
            </div>

            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-sm text-text-secondary">Сьогодні</span>
              </div>
              <div className="text-3xl font-bold text-green-400">{dashboard.completed_today}</div>
            </div>

            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm text-text-secondary">Обсяг за сьогодні (UAH)</span>
              </div>
              <div className="text-2xl font-bold">{dashboard.total_volume_uah.toLocaleString()}₴</div>
            </div>

            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm text-text-secondary">Обсяг за місяць (UAH)</span>
              </div>
              <div className="text-2xl font-bold">{dashboard.total_volume_uah_month?.toLocaleString()}₴</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'pending', label: 'Очікують' },
                { value: 'confirmed', label: 'Підтверджені' },
                { value: 'completed', label: 'Завершені' },
                { value: '', label: 'Всі' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${statusFilter === tab.value
                    ? 'bg-accent-yellow text-primary'
                    : 'bg-primary-light text-text-secondary hover:text-white'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDateFrom(today);
                    setDateTo(today);
                  }}
                  className="px-3 py-2 bg-primary-light rounded-xl border border-white/10 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                >
                  Сьогодні
                </button>
                <button
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yStr = yesterday.toISOString().split('T')[0];
                    setDateFrom(yStr);
                    setDateTo(yStr);
                  }}
                  className="px-3 py-2 bg-primary-light rounded-xl border border-white/10 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                >
                  Вчора
                </button>
                <div className="w-px h-8 bg-white/10 mx-1"></div>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 bg-primary-light rounded-xl border border-white/10 text-sm focus:outline-none focus:border-accent-blue text-white [color-scheme:dark]"
                />
                <span className="text-text-secondary">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 bg-primary-light rounded-xl border border-white/10 text-sm focus:outline-none focus:border-accent-blue text-white [color-scheme:dark]"
                />
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-primary-light rounded-xl text-text-secondary hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Оновити</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reservations List */}
        <div className="space-y-4">
          {reservations.length === 0 ? (
            <div className="bg-primary-light rounded-2xl p-12 border border-white/10 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-text-secondary opacity-50" />
              <p className="text-text-secondary">Немає бронювань</p>
            </div>
          ) : (
            reservations.map((res) => {
              const statusCfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              const isLoading = actionLoading === res.id;

              return (
                <div
                  key={res.id}
                  className={`bg-primary-light rounded-2xl p-5 border transition-all ${res.status === 'pending' ? 'border-yellow-500/30' : 'border-white/10'
                    }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Main Info */}
                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* ID & Name & Phone */}
                      <div>
                        <div className="text-xs text-text-secondary mb-1">Бронювання</div>
                        <div className="font-mono font-bold">#{res.id}</div>
                        <div className="text-sm font-medium mt-1">{res.customer_name || '—'}</div>
                        <div className="flex items-center gap-1 mt-1 text-sm">
                          <Phone className="w-3 h-3 text-accent-blue" />
                          <a href={`tel:${res.phone}`} className="text-accent-blue hover:underline">
                            {res.phone}
                          </a>
                          <button
                            onClick={() => handleCopyPhone(res.phone, res.id)}
                            className="ml-2 p-1 hover:bg-white/10 rounded-md transition-colors"
                            title="Копіювати номер"
                          >
                            {copiedId === res.id ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-text-secondary" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <div className="text-xs text-text-secondary mb-1">Сума обміну</div>
                        <div className="font-bold text-lg">
                          {res.give_amount.toLocaleString()} {res.give_currency}
                        </div>
                        <div className="text-sm text-accent-yellow">
                          → {res.get_amount.toLocaleString()} {res.get_currency}
                        </div>
                      </div>

                      {/* Rate */}
                      <div>
                        <div className="text-xs text-text-secondary mb-1">Курс</div>
                        <div className="font-bold">{res.rate}</div>
                        <div className="text-xs text-text-secondary">
                          Залишилось: {getTimeLeft(res.expires_at)}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <div className="text-xs text-text-secondary mb-1">Статус</div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 lg:ml-4">
                      {res.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleConfirm(res.id)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            Підтвердити
                          </button>
                          <button
                            onClick={() => handleCancel(res.id)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {res.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleComplete(res.id)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Завершити
                          </button>
                          <button
                            onClick={() => handleCancel(res.id)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setNoteModal(res.id);
                          setNote(res.operator_note || '');
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-text-secondary hover:text-white transition-colors"
                        title="Додати нотатку"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Note */}
                  {res.operator_note && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-text-secondary mt-0.5" />
                        <div>
                          <div className="text-xs text-text-secondary mb-1">Нотатка оператора</div>
                          <p className="text-sm">{res.operator_note}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Time info */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-text-secondary">
                    <span>Створено: {new Date(res.created_at).toLocaleString('uk-UA')}</span>
                    {res.completed_at && (
                      <span>Завершено: {new Date(res.completed_at).toLocaleString('uk-UA')}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-lg font-bold mb-4">Нотатка до бронювання #{noteModal}</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Введіть нотатку..."
              className="w-full h-32 p-4 bg-primary rounded-xl border border-white/10 text-white placeholder:text-text-secondary resize-none focus:outline-none focus:border-accent-yellow"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setNoteModal(null);
                  setNote('');
                }}
                className="flex-1 py-3 bg-white/5 rounded-xl text-text-secondary hover:text-white transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={handleAddNote}
                disabled={actionLoading === noteModal}
                className="flex-1 py-3 bg-accent-yellow rounded-xl text-primary font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
