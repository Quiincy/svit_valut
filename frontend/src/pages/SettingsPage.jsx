import { useState, useEffect } from 'react';
import { 
  Save, Plus, Trash2, Edit2, X, Phone, Mail, Clock, 
  MapPin, MessageSquare, Send, Globe, HelpCircle, Briefcase,
  ToggleLeft, ToggleRight, DollarSign
} from 'lucide-react';
import { settingsService, faqService, servicesService, branchService, adminService, currencyService } from '../services/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('contacts');
  const [settings, setSettings] = useState(null);
  const [faqItems, setFaqItems] = useState([]);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, faqRes, servicesRes, branchesRes, currenciesRes] = await Promise.all([
        settingsService.get(),
        faqService.getAll(),
        servicesService.getAll(),
        branchService.getAll(),
        currencyService.getAll(),
      ]);
      setSettings(settingsRes.data);
      setFaqItems(faqRes.data);
      setServices(servicesRes.data);
      setBranches(branchesRes.data);
      setCurrencies(currenciesRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await settingsService.update(settings);
      showMessage('Налаштування збережено');
    } catch (error) {
      showMessage('Помилка збереження', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFaq = async (item) => {
    try {
      if (item.id) {
        await faqService.update(item.id, item);
      } else {
        await faqService.create(item);
      }
      fetchData();
      setEditingFaq(null);
      showMessage('FAQ збережено');
    } catch (error) {
      showMessage('Помилка збереження', 'error');
    }
  };

  const handleDeleteFaq = async (id) => {
    if (!confirm('Видалити це питання?')) return;
    try {
      await faqService.delete(id);
      fetchData();
      showMessage('Видалено');
    } catch (error) {
      showMessage('Помилка видалення', 'error');
    }
  };

  const handleSaveService = async (item) => {
    try {
      if (item.id) {
        await servicesService.update(item.id, item);
      } else {
        await servicesService.create(item);
      }
      fetchData();
      setEditingService(null);
      showMessage('Послугу збережено');
    } catch (error) {
      showMessage('Помилка збереження', 'error');
    }
  };

  const handleDeleteService = async (id) => {
    if (!confirm('Видалити цю послугу?')) return;
    try {
      await servicesService.delete(id);
      fetchData();
      showMessage('Видалено');
    } catch (error) {
      showMessage('Помилка видалення', 'error');
    }
  };

  const handleSaveBranch = async (branch) => {
    try {
      await adminService.updateBranch(branch.id, branch);
      fetchData();
      setEditingBranch(null);
      showMessage('Відділення збережено');
    } catch (error) {
      showMessage('Помилка збереження', 'error');
    }
  };

  const handleToggleCurrency = async (code, isActive) => {
    try {
      await adminService.updateCurrency(code, { is_active: !isActive });
      setCurrencies(currencies.map(c => c.code === code ? { ...c, is_active: !isActive } : c));
      showMessage(`Валюту ${code} ${!isActive ? 'увімкнено' : 'вимкнено'}`);
    } catch (error) {
      showMessage('Помилка оновлення', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl ${
          message.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white font-medium shadow-lg`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'contacts', label: 'Контакти', icon: Phone },
          { id: 'branches', label: 'Відділення', icon: MapPin },
          { id: 'currencies', label: 'Валюти', icon: DollarSign },
          { id: 'faq', label: 'FAQ', icon: HelpCircle },
          { id: 'services', label: 'Послуги', icon: Briefcase },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-accent-yellow text-primary'
                : 'bg-primary-light text-text-secondary hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contacts Tab */}
      {activeTab === 'contacts' && settings && (
        <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold mb-6">Контактна інформація</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-text-secondary mb-2">Назва компанії</label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Основний телефон</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Години роботи</label>
              <input
                type="text"
                value={settings.working_hours || ''}
                onChange={(e) => setSettings({ ...settings, working_hours: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>
          </div>

          <h4 className="text-md font-bold mt-8 mb-4">Соціальні мережі</h4>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-text-secondary mb-2">Telegram URL</label>
              <input
                type="text"
                value={settings.telegram_url || ''}
                onChange={(e) => setSettings({ ...settings, telegram_url: e.target.value })}
                placeholder="https://t.me/username"
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Viber URL</label>
              <input
                type="text"
                value={settings.viber_url || ''}
                onChange={(e) => setSettings({ ...settings, viber_url: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">WhatsApp URL</label>
              <input
                type="text"
                value={settings.whatsapp_url || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_url: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Instagram URL</label>
              <input
                type="text"
                value={settings.instagram_url || ''}
                onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>
          </div>

          <h4 className="text-md font-bold mt-8 mb-4">Налаштування бронювання</h4>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-text-secondary mb-2">Мін. сума для оптового курсу ($)</label>
              <input
                type="number"
                value={settings.min_wholesale_amount || 1000}
                onChange={(e) => setSettings({ ...settings, min_wholesale_amount: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-2">Час бронювання (хвилин)</label>
              <input
                type="number"
                value={settings.reservation_time_minutes || 60}
                onChange={(e) => setSettings({ ...settings, reservation_time_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-accent-yellow rounded-xl text-primary font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Збереження...' : 'Зберегти налаштування'}
          </button>
        </div>
      )}

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold mb-6">Відділення</h3>
          
          <div className="space-y-4">
            {branches.map((branch) => (
              <div key={branch.id} className="p-4 bg-primary rounded-xl border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-blue font-bold">{branch.id}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{branch.address}</h4>
                      <p className="text-sm text-text-secondary">{branch.hours}</p>
                      <p className="text-sm text-accent-yellow">{branch.phone || 'Телефон не вказано'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingBranch(branch)}
                    className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currencies Tab */}
      {activeTab === 'currencies' && (
        <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Валюти</h3>
            <p className="text-sm text-text-secondary">Увімкніть/вимкніть відображення валют</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currencies.map((currency) => (
              <div 
                key={currency.code} 
                className={`p-4 rounded-xl border transition-all ${
                  currency.is_active !== false 
                    ? 'bg-primary border-white/10' 
                    : 'bg-primary/50 border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currency.flag}</span>
                    <div>
                      <div className="font-medium">{currency.code}</div>
                      <div className="text-xs text-text-secondary">{currency.name_uk}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleCurrency(currency.code, currency.is_active !== false)}
                    className={`p-2 rounded-lg transition-colors ${
                      currency.is_active !== false 
                        ? 'text-green-400 hover:bg-green-400/10' 
                        : 'text-text-secondary hover:bg-white/5'
                    }`}
                  >
                    {currency.is_active !== false ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-green-400">Купівля: {currency.buy_rate?.toFixed(2)}</span>
                  <span className="text-red-400">Продаж: {currency.sell_rate?.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Часті запитання (FAQ)</h3>
            <button
              onClick={() => setEditingFaq({ question: '', answer: '', order: faqItems.length + 1 })}
              className="flex items-center gap-2 px-4 py-2 bg-accent-yellow rounded-xl text-primary font-medium"
            >
              <Plus className="w-4 h-4" />
              Додати
            </button>
          </div>

          <div className="space-y-3">
            {faqItems.map((item) => (
              <div key={item.id} className="p-4 bg-primary rounded-xl border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{item.question}</h4>
                    <p className="text-sm text-text-secondary">{item.answer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingFaq(item)}
                      className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(item.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-text-secondary hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Послуги</h3>
            <button
              onClick={() => setEditingService({ title: '', description: '', image_url: '', order: services.length + 1, is_active: true })}
              className="flex items-center gap-2 px-4 py-2 bg-accent-yellow rounded-xl text-primary font-medium"
            >
              <Plus className="w-4 h-4" />
              Додати
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((item) => (
              <div key={item.id} className="bg-primary rounded-xl border border-white/10 overflow-hidden">
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-4">
                  <h4 className="font-medium mb-1">{item.title}</h4>
                  <p className="text-sm text-text-secondary mb-3">{item.description}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingService(item)}
                      className="flex-1 py-2 bg-white/5 rounded-lg text-sm hover:bg-white/10"
                    >
                      Редагувати
                    </button>
                    <button
                      onClick={() => handleDeleteService(item.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Branch Edit Modal */}
      {editingBranch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl p-6 max-w-lg w-full border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Редагувати відділення #{editingBranch.id}</h3>
              <button onClick={() => setEditingBranch(null)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Адреса</label>
                <input
                  type="text"
                  value={editingBranch.address}
                  onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Години роботи</label>
                <input
                  type="text"
                  value={editingBranch.hours}
                  onChange={(e) => setEditingBranch({ ...editingBranch, hours: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Телефон</label>
                <input
                  type="text"
                  value={editingBranch.phone || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Telegram чат</label>
                <input
                  type="text"
                  value={editingBranch.telegram_chat || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, telegram_chat: e.target.value })}
                  placeholder="https://t.me/..."
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingBranch(null)}
                className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10"
              >
                Скасувати
              </button>
              <button
                onClick={() => handleSaveBranch(editingBranch)}
                className="flex-1 py-3 bg-accent-yellow rounded-xl text-primary font-bold"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Edit Modal */}
      {editingFaq && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl p-6 max-w-lg w-full border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{editingFaq.id ? 'Редагувати' : 'Додати'} FAQ</h3>
              <button onClick={() => setEditingFaq(null)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Питання</label>
                <input
                  type="text"
                  value={editingFaq.question}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Відповідь</label>
                <textarea
                  value={editingFaq.answer}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingFaq(null)}
                className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10"
              >
                Скасувати
              </button>
              <button
                onClick={() => handleSaveFaq(editingFaq)}
                className="flex-1 py-3 bg-accent-yellow rounded-xl text-primary font-bold"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Edit Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl p-6 max-w-lg w-full border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{editingService.id ? 'Редагувати' : 'Додати'} послугу</h3>
              <button onClick={() => setEditingService(null)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Назва</label>
                <input
                  type="text"
                  value={editingService.title}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Опис</label>
                <textarea
                  value={editingService.description}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">URL зображення</label>
                <input
                  type="text"
                  value={editingService.image_url || ''}
                  onChange={(e) => setEditingService({ ...editingService, image_url: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingService(null)}
                className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10"
              >
                Скасувати
              </button>
              <button
                onClick={() => handleSaveService(editingService)}
                className="flex-1 py-3 bg-accent-yellow rounded-xl text-primary font-bold"
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
