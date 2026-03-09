import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LogOut, RefreshCw, CheckCircle, XCircle, Clock,
  DollarSign, TrendingUp, Phone, MapPin, MessageSquare,
  Check, X, AlertCircle, Download, Bell, Copy, Pencil,
  Volume2, VolumeX
} from 'lucide-react';
import { operatorService, branchService } from '../services/api';
import BranchBalancesTab from '../components/admin/BranchBalancesTab';
import { useAudioNotification } from '../hooks/useAudioNotification';

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
  const [activeTab, setActiveTab] = useState('reservations');
  const [dashboard, setDashboard] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [note, setNote] = useState('');
  const [lastReservationTime, setLastReservationTime] = useState(null);
  const [newReservationAlert, setNewReservationAlert] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copiedId, setCopiedId] = useState(null);
  const { playNotification, volume, setVolume } = useAudioNotification();

  // Edit modal state
  const [editingReservation, setEditingReservation] = useState(null);
  const [resForm, setResForm] = useState({});
  const [resSaving, setResSaving] = useState(false);
  const [branches, setBranches] = useState([]);

  // Fetch branches for transfer dropdown
  useEffect(() => {
    branchService.getAll().then(res => {
      if (res?.data) setBranches(res.data);
    }).catch(() => { });
  }, []);

  const prevReservationsRef = useRef([]);
  const prevPendingIdsRef = useRef(null);

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

      // Detect strictly new pending items via ID diffs
      let shouldNotify = false;
      const currentPendingIds = dashboardRes.data.pending_ids || [];

      if (prevPendingIdsRef.current !== null) {
        const newIds = currentPendingIds.filter(id => !prevPendingIdsRef.current.includes(id));
        if (newIds.length > 0) {
          shouldNotify = true;
        }
      }

      if (shouldNotify) {
        setNewReservationAlert(true);
        playNotification();
        setTimeout(() => setNewReservationAlert(false), 5000);
      }

      // Update trackers
      prevPendingIdsRef.current = currentPendingIds;
      prevReservationsRef.current = items;
      setReservations(items);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, lastReservationTime, dateFrom, dateTo]);

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

  const openCancelConfirm = (id) => {
    setCancelModal(id);
  };

  const confirmCancel = async () => {
    if (!cancelModal) return;
    const id = cancelModal;
    setCancelModal(null);
    setActionLoading(id);
    try {
      await operatorService.cancelReservation(id);
      fetchData();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Помилка скасування: ' + (error.response?.data?.detail || error.message));
    } finally {
      setActionLoading(null);
    }
  };

  const closeCancelConfirm = () => {
    setCancelModal(null);
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

  // --- Edit modal logic ---
  const openResModal = (res) => {
    setEditingReservation(res);
    setResForm({
      give_amount: res.give_amount,
      get_amount: res.get_amount,
      rate: res.rate,
      branch_id: res.branch_id || '',
      operator_note: res.operator_note || '',
    });
  };

  const handleResSave = async () => {
    setResSaving(true);
    try {
      await operatorService.updateReservation(editingReservation.id, {
        give_amount: parseFloat(resForm.give_amount),
        get_amount: parseFloat(resForm.get_amount),
        rate: parseFloat(resForm.rate),
        branch_id: resForm.branch_id || null,
        operator_note: resForm.operator_note || null,
      });
      setEditingReservation(null);
      fetchData();
    } catch (error) {
      console.error('Error saving reservation:', error);
      alert(error.response?.data?.detail || 'Помилка збереження');
    } finally {
      setResSaving(false);
    }
  };

  // Auto-recalculate: when give_amount or rate changes, recalculate get_amount
  const handleResFormChange = (field, value) => {
    const updated = { ...resForm, [field]: value };

    if (editingReservation && (field === 'give_amount' || field === 'rate')) {
      const amount = parseFloat(field === 'give_amount' ? value : updated.give_amount);
      const rate = parseFloat(field === 'rate' ? value : updated.rate);
      if (!isNaN(amount) && !isNaN(rate) && rate > 0) {
        // If client gives UAH (buying foreign) => get_amount = give / rate
        // If client gives foreign (selling) => get_amount = give * rate
        if (editingReservation.give_currency === 'UAH') {
          updated.get_amount = (amount / rate).toFixed(2);
        } else {
          updated.get_amount = (amount * rate).toFixed(2);
        }
      }
    }

    setResForm(updated);
  };

  // Direction helper
  const getDirection = (res) => {
    // If client gives UAH => they are BUYING foreign currency
    // If client gives foreign => they are SELLING foreign currency
    if (res.give_currency === 'UAH') {
      return { label: 'Купля', color: 'text-green-400 bg-green-400/10' };
    }
    return { label: 'Продажа', color: 'text-blue-400 bg-blue-400/10' };
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-primary-light border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent-yellow rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Панель оператора</h1>
              <p className="text-xs text-text-secondary">
                {user.branch_address} {user.branch_number ? `(№${user.branch_number})` : ''}
              </p>
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

            {/* Volume Control */}
            <div className="flex items-center gap-2 bg-primary-light/50 rounded-lg px-3 py-1.5 border border-white/10">
              <button
                onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                className="p-1 text-text-secondary hover:text-accent-yellow transition-colors"
                title={volume === 0 ? 'Увімкнути звук' : 'Вимкнути звук'}
              >
                {volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-accent-yellow" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 accent-accent-yellow cursor-pointer"
                title={`Гучність: ${Math.round(volume * 100)}%`}
              />
              <button
                onClick={playNotification}
                className="p-1 text-text-secondary hover:text-accent-yellow transition-colors"
                title="Перевірити звук"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>

            {/* Download Rates Button */}
            <button
              onClick={handleDownloadRates}
              className="flex items-center gap-2 px-4 py-2 bg-accent-yellow/10 text-accent-yellow rounded-lg hover:bg-accent-yellow/20 transition-colors"
              title="Завантажити курси"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Курси</span>
            </button>

            <div className="text-right">
              <div className="font-medium text-sm">{user.name}</div>
              <div className="text-xs text-accent-yellow">Оператор</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Вийти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        {dashboard && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
          </div>
        )}

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all relative ${activeTab === 'reservations'
              ? 'bg-accent-yellow text-primary'
              : dashboard?.pending_reservations > 0
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 animate-pulse'
                : 'bg-primary-light text-text-secondary hover:text-white'
              }`}
          >
            Бронювання
            {dashboard?.pending_reservations > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'balances'
              ? 'bg-accent-yellow text-primary'
              : 'bg-primary-light text-text-secondary hover:text-white'
              }`}
          >
            Залишки
          </button>
        </div>

        {activeTab === 'reservations' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${statusFilter === tab.value
                        ? 'bg-accent-yellow text-primary'
                        : tab.value === 'pending' && dashboard?.pending_reservations > 0
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 animate-pulse'
                          : tab.value === 'confirmed' && dashboard?.confirmed_reservations > 0
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 animate-pulse'
                            : 'bg-primary-light text-text-secondary hover:text-white'
                        }`}
                    >
                      {tab.label}
                      {tab.value === 'pending' && dashboard?.pending_reservations > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping"></span>
                      )}
                      {tab.value === 'confirmed' && dashboard?.confirmed_reservations > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping"></span>
                      )}
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
                      aria-label="Початкова дата"
                      className="px-3 py-2 bg-primary-light rounded-xl border border-white/10 text-sm focus:outline-none focus:border-accent-yellow text-white [color-scheme:dark]"
                    />
                    <span className="text-text-secondary">—</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label="Кінцева дата"
                      className="px-3 py-2 bg-primary-light rounded-xl border border-white/10 text-sm focus:outline-none focus:border-accent-yellow text-white [color-scheme:dark]"
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
                      className={`rounded-2xl p-5 border transition-all ${res.status === 'pending'
                        ? 'border-yellow-500/50 bg-accent-yellow/10 animate-pulse'
                        : 'border-white/10 bg-primary-light'
                        }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Main Info */}
                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-4">
                          {/* ID & Name & Phone */}
                          <div>
                            <div className="text-xs text-text-secondary mb-1">Бронювання</div>
                            <div className="font-mono font-bold">#{res.id}</div>
                            <div className="text-sm font-medium mt-1">{res.customer_name || '—'}</div>
                            <div className="flex items-center gap-1 mt-1 text-sm text-text-secondary">
                              <Phone className="w-3 h-3" />
                              <span>••••••••••</span>
                            </div>
                          </div>

                          {/* Direction */}
                          <div>
                            <div className="text-xs text-text-secondary mb-1">Тип</div>
                            {(() => {
                              const dir = getDirection(res);
                              return (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${dir.color}`}>
                                  {dir.label}
                                </span>
                              );
                            })()}
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
                                onClick={() => openCancelConfirm(res.id)}
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
                                onClick={() => openCancelConfirm(res.id)}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => openResModal(res)}
                            className="p-2 rounded-xl transition-colors bg-white/5 text-text-secondary hover:text-white hover:bg-white/10"
                            title="Редагувати"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setNoteModal(res.id);
                              setNote(res.operator_note || '');
                            }}
                            className={`p-2 rounded-xl transition-colors ${res.operator_note
                              ? 'bg-accent-yellow text-primary hover:bg-accent-yellow/90'
                              : 'bg-white/5 text-text-secondary hover:text-white hover:bg-white/10'
                              }`}
                            title={res.operator_note ? "Редагувати нотатку" : "Додати нотатку"}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>


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
        )}

        {activeTab === 'balances' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BranchBalancesTab branchId={user.branch_id} readOnly={false} />
          </div>
        )}
      </div>

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-lg font-bold mb-4">Нотатка до бронювання #{noteModal}</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Нотатка оператора"
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

      {/* Cancel Confirm Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl w-full max-w-sm border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 mx-auto">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Скасувати бронювання?</h3>
              <p className="text-text-secondary text-center text-sm mb-6">
                Ви впевнені, що хочете скасувати це бронювання #{cancelModal}? Цю дію неможливо скасувати.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeCancelConfirm}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium text-sm"
                >
                  Відхилити
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium text-sm shadow-lg shadow-red-500/20"
                >
                  Так, скасувати
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Reservation Modal */}
      {editingReservation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Редагувати бронювання #{editingReservation.id}</h3>

            {/* Direction badge */}
            {(() => {
              const dir = getDirection(editingReservation);
              return (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold mb-4 ${dir.color}`}>
                  Клієнт: {dir.label}
                </div>
              );
            })()}

            <div className="space-y-4">
              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">
                    Віддає ({editingReservation.give_currency})
                  </label>
                  <input
                    type="number"
                    value={resForm.give_amount}
                    onChange={(e) => handleResFormChange('give_amount', e.target.value)}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">
                    Отримує ({editingReservation.get_currency})
                  </label>
                  <input
                    type="number"
                    value={resForm.get_amount}
                    onChange={(e) => handleResFormChange('get_amount', e.target.value)}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm text-text-secondary mb-1">Курс</label>
                <input
                  type="number"
                  step="0.01"
                  value={resForm.rate}
                  onChange={(e) => handleResFormChange('rate', e.target.value)}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                />
              </div>

              {/* Branch (Transfer) */}
              <div>
                <label className="block text-sm text-text-secondary mb-1">Відділення</label>
                <select
                  value={resForm.branch_id}
                  onChange={(e) => setResForm({ ...resForm, branch_id: e.target.value ? parseInt(e.target.value) : '' })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                >
                  <option value="">— Оберіть відділення —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.address} (№{b.number})</option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm text-text-secondary mb-1">Нотатка</label>
                <textarea
                  value={resForm.operator_note || ''}
                  onChange={(e) => setResForm({ ...resForm, operator_note: e.target.value })}
                  placeholder="Нотатка до бронювання..."
                  rows={2}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingReservation(null)}
                className="flex-1 py-3 bg-white/5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all"
              >
                Скасувати
              </button>
              <button
                onClick={handleResSave}
                disabled={resSaving}
                className="flex-1 py-3 bg-accent-yellow text-primary rounded-xl font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {resSaving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
