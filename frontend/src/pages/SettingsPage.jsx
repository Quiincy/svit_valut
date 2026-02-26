import { useState, useEffect } from 'react';
import {
  Save, Plus, Trash2, Edit2, X, Phone, Mail, Clock,
  MapPin, MessageSquare, Send, Globe, HelpCircle, Briefcase,
  Users, Upload, Loader2
} from 'lucide-react';
import { settingsService, faqService, servicesService, branchService, adminService, seoService } from '../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('contacts');
  const [settings, setSettings] = useState(null);
  const [faqItems, setFaqItems] = useState([]);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingSeo, setEditingSeo] = useState(null);
  const [message, setMessage] = useState(null);
  const [seoItems, setSeoItems] = useState([]);

  // Operators state
  const [users, setUsers] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', name: '', branch_id: '' });
  const [userSaving, setUserSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await adminService.uploadImage(file);
      if (res.data && res.data.url) {
        setEditingService(prev => ({ ...prev, image_url: res.data.url }));
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      showMessage('Помилка завантаження зображення', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSeoImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await adminService.uploadImage(file);
      if (res.data && res.data.url) {
        setEditingSeo(prev => ({ ...prev, image_url: res.data.url }));
      }
    } catch (error) {
      console.error('SEO Image upload failed:', error);
      showMessage('Помилка завантаження зображення', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, faqRes, servicesRes, branchesRes, usersRes, seoRes] = await Promise.all([
        settingsService.get(),
        faqService.getAll(),
        servicesService.getAll(),
        branchService.getAll(),
        adminService.getUsers(),
        seoService.getAll(),
      ]);
      setSettings(settingsRes.data);
      setFaqItems(faqRes.data);
      setServices(servicesRes.data);
      setBranches(branchesRes.data);
      setUsers(usersRes.data);
      setSeoItems(seoRes.data);
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
      if (branch.id) {
        await adminService.updateBranch(branch.id, branch);
      } else {
        await branchService.create(branch);
      }
      fetchData();
      setEditingBranch(null);
      showMessage('Відділення збережено');
    } catch (error) {
      showMessage('Помилка збереження', 'error');
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!confirm('Видалити це відділення?')) return;
    try {
      await branchService.delete(id);
      fetchData();
      showMessage('Відділення видалено');
    } catch (error) {
      showMessage(error.response?.data?.detail || 'Помилка видалення', 'error');
    }
  };

  // Operators functions
  const openUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        password: '',
        name: user.name,
        branch_id: user.branch_id || '',
      });
    } else {
      setEditingUser(null);
      setUserForm({ username: '', password: '', name: '', branch_id: '' });
    }
    setUserModalOpen(true);
  };

  const handleUserSubmit = async () => {
    setUserSaving(true);
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.id, {
          name: userForm.name,
          branch_id: userForm.branch_id || null,
          password: userForm.password || null,
        });
      } else {
        await adminService.createUser({
          username: userForm.username,
          password: userForm.password,
          name: userForm.name,
          branch_id: userForm.branch_id || null,
          role: 'operator',
        });
      }
      setUserModalOpen(false);
      const usersRes = await adminService.getUsers();
      setUsers(usersRes.data);
      showMessage('Оператора збережено');
    } catch (error) {
      console.error('Error saving user:', error);
      showMessage(error.response?.data?.detail || 'Помилка збереження', 'error');
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Видалити цього оператора?')) return;
    setUserSaving(true);
    try {
      await adminService.deleteUser(userId);
      const usersRes = await adminService.getUsers();
      setUsers(usersRes.data);
      showMessage('Оператора видалено');
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage(error.response?.data?.detail || 'Помилка видалення', 'error');
    } finally {
      setUserSaving(false);
    }
  };

  const handleSaveSeo = async (item) => {
    try {
      if (item.id) {
        await seoService.update(item.id, item);
      } else {
        await seoService.create(item);
      }
      fetchData();
      setEditingSeo(null);
      showMessage('SEO налаштування збережено');
    } catch (error) {
      showMessage(error.response?.data?.detail || 'Помилка збереження', 'error');
    }
  };

  const handleDeleteSeo = async (id) => {
    if (!confirm('Видалити ці налаштування SEO?')) return;
    try {
      await seoService.delete(id);
      fetchData();
      showMessage('Видалено');
    } catch (error) {
      showMessage('Помилка видалення', 'error');
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
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          } text-white font-medium shadow-lg`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'contacts', label: 'Контакти', icon: Phone },
          { id: 'branches', label: 'Відділення', icon: MapPin },
          { id: 'operators', label: 'Оператори', icon: Users },
          { id: 'faq', label: 'FAQ', icon: HelpCircle },
          { id: 'services', label: 'Послуги', icon: Briefcase },
          { id: 'seo', label: 'SEO', icon: Globe },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${activeTab === tab.id
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
              <label htmlFor="field_1" className="block text-sm text-text-secondary mb-2">Назва компанії</label>
              <input id="field_1"
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="field_2" className="block text-sm text-text-secondary mb-2">Основний телефон</label>
              <input id="field_2"
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="email_3" className="block text-sm text-text-secondary mb-2">Email</label>
              <input id="email_3"
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="field_4" className="block text-sm text-text-secondary mb-2">Години роботи</label>
              <input id="field_4"
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
              <label htmlFor="telegram_url_5" className="block text-sm text-text-secondary mb-2">Telegram URL</label>
              <input id="telegram_url_5"
                type="text"
                value={settings.telegram_url || ''}
                onChange={(e) => setSettings({ ...settings, telegram_url: e.target.value })}
                placeholder="https://t.me/username"
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="viber_url_6" className="block text-sm text-text-secondary mb-2">Viber URL</label>
              <input id="viber_url_6"
                type="text"
                value={settings.viber_url || ''}
                onChange={(e) => setSettings({ ...settings, viber_url: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="whatsapp_url_7" className="block text-sm text-text-secondary mb-2">WhatsApp URL</label>
              <input id="whatsapp_url_7"
                type="text"
                value={settings.whatsapp_url || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_url: e.target.value })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="instagram_url_8" className="block text-sm text-text-secondary mb-2">Instagram URL</label>
              <input id="instagram_url_8"
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
              <label htmlFor="field_10" className="block text-sm text-text-secondary mb-2">Час бронювання (хвилин)</label>
              <input id="field_10"
                type="number"
                value={settings.reservation_time_minutes || 60}
                onChange={(e) => setSettings({ ...settings, reservation_time_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
            </div>
          </div>

          <h4 className="text-md font-bold mt-8 mb-4">Динамічні URL</h4>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="contacts_url" className="block text-sm text-text-secondary mb-2">URL сторінки контактів</label>
              <input id="contacts_url"
                type="text"
                value={settings.contacts_url || '/contacts'}
                onChange={(e) => setSettings({ ...settings, contacts_url: e.target.value })}
                placeholder="/contacts"
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
              <p className="text-xs text-text-secondary mt-1">Наприклад: /contacts, /kontakty, /zv-yazok</p>
            </div>
            <div>
              <label htmlFor="faq_url" className="block text-sm text-text-secondary mb-2">URL сторінки FAQ</label>
              <input id="faq_url"
                type="text"
                value={settings.faq_url || '/faq'}
                onChange={(e) => setSettings({ ...settings, faq_url: e.target.value })}
                placeholder="/faq"
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
              <p className="text-xs text-text-secondary mt-1">Наприклад: /faq, /chasti-pytannya</p>
            </div>
            <div>
              <label htmlFor="rates_url" className="block text-sm text-text-secondary mb-2">URL сторінки курсів</label>
              <input id="rates_url"
                type="text"
                value={settings.rates_url || '/rates'}
                onChange={(e) => setSettings({ ...settings, rates_url: e.target.value })}
                placeholder="/rates"
                className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
              />
              <p className="text-xs text-text-secondary mt-1">Наприклад: /rates, /kursy-valyut</p>
            </div>
          </div>

          <h4 className="text-md font-bold mt-8 mb-4">SEO-текст для головної сторінки</h4>
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              SEO-текст (відображається перед футером на головній сторінці)
            </label>
            <div className="seo-quill-editor bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <ReactQuill
                theme="snow"
                value={settings.homepage_seo_text || ''}
                onChange={(val) => setSettings({ ...settings, homepage_seo_text: val })}
                modules={{
                  toolbar: [
                    [{ header: [2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link'],
                    ['clean']
                  ]
                }}
                className="text-white min-h-[200px]"
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
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Відділення</h3>
            <button
              onClick={() => setEditingBranch({ address: '', hours: 'щодня: 9:00-20:00', phone: '', telegram_chat: '', cashier: '', is_open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-accent-yellow rounded-xl text-primary font-medium"
            >
              <Plus className="w-4 h-4" />
              Додати
            </button>
          </div>

          <div className="space-y-4">
            {branches.map((branch) => (
              <div key={branch.id} className="p-4 bg-primary rounded-xl border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-yellow/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-yellow font-bold">{branch.number}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{branch.address}</h4>
                      <p className="text-sm text-text-secondary">{branch.hours}</p>
                      <p className="text-sm text-accent-yellow">{branch.phone || 'Телефон не вказано'}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        Номер відділення: <span className="font-mono text-white">{branch.number}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingBranch(branch)}
                      className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBranch(branch.id)}
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

      {/* Operators Tab */}
      {activeTab === 'operators' && (
        <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Управління операторами</h3>
            <button
              onClick={() => openUserModal()}
              className="px-4 py-2 bg-accent-yellow text-primary rounded-xl font-medium flex items-center gap-2 hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" />
              Додати оператора
            </button>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Немає операторів</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-text-secondary border-b border-white/10">
                    <th className="pb-3 pr-4">Ім'я</th>
                    <th className="pb-3 pr-4">Логін</th>
                    <th className="pb-3 pr-4">Роль</th>
                    <th className="pb-3 pr-4">Відділення</th>
                    <th className="pb-3">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4 pr-4 font-medium">{u.name}</td>
                      <td className="py-4 pr-4 text-sm text-text-secondary">{u.username}</td>
                      <td className="py-4 pr-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                          {u.role === 'admin' ? 'Адмін' : 'Оператор'}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-sm">
                        {u.branch_address || <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openUserModal(u)}
                            className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-lg font-bold mb-4">
              {editingUser ? 'Редагувати оператора' : 'Новий оператор'}
            </h3>

            <div className="space-y-4">
              {!editingUser && (
                <div>
                  <label htmlFor="field_11" className="block text-sm text-text-secondary mb-1">Логін</label>
                  <input id="field_11"
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                    placeholder="username"
                  />
                </div>
              )}

              <div>
                <label htmlFor="field_12" className="block text-sm text-text-secondary mb-1">Ім'я</label>
                <input id="field_12"
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  placeholder="Іван Петров"
                />
              </div>

              <div>
                <label htmlFor="editinguser_13" className="block text-sm text-text-secondary mb-1">
                  {editingUser ? 'Новий пароль (залиште пустим для збереження)' : 'Пароль'}
                </label>
                <input id="editinguser_13"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  placeholder={editingUser ? '••••••••' : 'password123'}
                />
              </div>

              <div>
                <label htmlFor="field_14" className="block text-sm text-text-secondary mb-1">Відділення</label>
                <select id="field_14"
                  value={userForm.branch_id}
                  onChange={(e) => setUserForm({ ...userForm, branch_id: e.target.value ? parseInt(e.target.value) : '' })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                >
                  <option value="">— Без відділення —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.address} (#{b.number})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setUserModalOpen(false)}
                className="flex-1 py-3 bg-white/5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all"
              >
                Скасувати
              </button>
              <button
                onClick={handleUserSubmit}
                disabled={userSaving}
                className="flex-1 py-3 bg-accent-yellow text-primary rounded-xl font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {userSaving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
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
              onClick={() => setEditingService({ title: '', short_description: '', description: '', image_url: '', order: services.length + 1, is_active: true })}
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
                  <p className="text-sm text-text-secondary mb-3 line-clamp-3">
                    {item.short_description || (item.description ? item.description.replace(/<[^>]*>?/gm, '') : '')}
                  </p>
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
          <div className="bg-primary-light rounded-2xl p-6 max-w-lg w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">
                {editingBranch.id ? `Редагувати відділення #${editingBranch.id}` : 'Нове відділення'}
              </h3>
              <button onClick={() => setEditingBranch(null)} className="p-2 hover:bg-white/5 rounded-lg" aria-label="Закрити">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="field_15" className="block text-sm text-text-secondary mb-2">Адреса</label>
                <input id="field_15"
                  type="text"
                  value={editingBranch.address}
                  onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="field_16" className="block text-sm text-text-secondary mb-2">Години роботи</label>
                <input id="field_16"
                  type="text"
                  value={editingBranch.hours}
                  onChange={(e) => setEditingBranch({ ...editingBranch, hours: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="field_17" className="block text-sm text-text-secondary mb-2">Телефон</label>
                <input id="field_17"
                  type="text"
                  value={editingBranch.phone || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="field_18" className="block text-sm text-text-secondary mb-2">Номер відділення</label>
                  <input id="field_18"
                    type="number"
                    value={editingBranch.number || editingBranch.id}
                    onChange={(e) => setEditingBranch({ ...editingBranch, number: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="telegram_19" className="block text-sm text-text-secondary mb-2">Telegram чат</label>
                  <input id="telegram_19"
                    type="text"
                    value={editingBranch.telegram_chat || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, telegram_chat: e.target.value })}
                    placeholder="https://t.me/..."
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="field_lat" className="block text-sm text-text-secondary mb-2">Широта (Lat)</label>
                  <input id="field_lat"
                    type="number"
                    step="0.000001"
                    value={editingBranch.lat || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, lat: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="50.4501"
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none placeholder-white/20"
                  />
                </div>
                <div>
                  <label htmlFor="field_lng" className="block text-sm text-text-secondary mb-2">Довгота (Lng)</label>
                  <input id="field_lng"
                    type="number"
                    step="0.000001"
                    value={editingBranch.lng || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, lng: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="30.5234"
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none placeholder-white/20"
                  />
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                * Якщо координати не вказані, вони визначаться автоматично за адресою
              </p>

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
          <div className="bg-primary-light rounded-2xl p-6 max-w-lg w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{editingFaq.id ? 'Редагувати' : 'Додати'} FAQ</h3>
              <button onClick={() => setEditingFaq(null)} className="p-2 hover:bg-white/5 rounded-lg" aria-label="Закрити">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="field_20" className="block text-sm text-text-secondary mb-2">Питання</label>
                <input id="field_20"
                  type="text"
                  value={editingFaq.question}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="field_21" className="block text-sm text-text-secondary mb-2">Відповідь</label>
                <textarea id="field_21"
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
          <div className="bg-primary-light rounded-2xl p-6 max-w-lg w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{editingService.id ? 'Редагувати' : 'Додати'} послугу</h3>
              <button onClick={() => setEditingService(null)} className="p-2 hover:bg-white/5 rounded-lg" aria-label="Закрити">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="field_22" className="block text-sm text-text-secondary mb-2">Назва</label>
                <input id="field_22"
                  type="text"
                  value={editingService.title}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="field_23" className="block text-sm text-text-secondary mb-2">Короткий опис (для списків)</label>
                <textarea id="field_23"
                  value={editingService.short_description || ''}
                  onChange={(e) => setEditingService({ ...editingService, short_description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none resize-none"
                  placeholder="Короткий опис послуги..."
                />
              </div>

              <div>
                <label htmlFor="service_link_url" className="block text-sm text-text-secondary mb-2">URL послуги</label>
                <input id="service_link_url"
                  type="text"
                  value={editingService.link_url || ''}
                  onChange={(e) => setEditingService({ ...editingService, link_url: e.target.value })}
                  className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                  placeholder="/obmin-valyut"
                />
                <p className="text-xs text-text-secondary mt-1">Кастомний URL для цієї послуги (наприклад: /obmin-valyut)</p>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Опис</label>
                <div className="seo-quill-editor bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={editingService.description}
                    onChange={(value) => setEditingService({ ...editingService, description: value })}
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['link', 'clean']
                      ]
                    }}
                    className="text-white"
                    placeholder="Опис послуги..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">URL зображення</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingService.image_url || ''}
                    onChange={(e) => setEditingService({ ...editingService, image_url: e.target.value })}
                    className="flex-1 px-4 py-3 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                    placeholder="https://..."
                    aria-label="URL зображення"
                  />
                  <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-center transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 text-accent-yellow animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-text-secondary" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      aria-label="Завантажити зображення"
                    />
                  </label>
                </div>
                {editingService.image_url && (
                  <div className="mt-2 relative w-full h-32 bg-black/20 rounded-xl overflow-hidden border border-white/5 group">
                    <img src={editingService.image_url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setEditingService({ ...editingService, image_url: '' })}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
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

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">SEO Налаштування</h3>
            <button
              onClick={() => setEditingSeo({ url_path: '/', h1: '', title: '', description: '', text: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-accent-yellow rounded-xl text-primary font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Додати правило
            </button>
          </div>

          {!editingSeo ? (
            <div className="space-y-4">
              {seoItems.map((seo) => (
                <div key={seo.id} className="p-4 bg-primary rounded-xl border border-white/10 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-3 py-1 bg-white/5 rounded-lg text-sm font-mono text-accent-yellow mb-2">
                        {seo.url_path}
                      </span>
                      <h4 className="font-bold text-lg mb-1">{seo.title || 'Без назви'}</h4>
                      <p className="text-sm text-text-secondary">{seo.description || 'Немає опису'}</p>
                    </div>
                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingSeo(seo)}
                        className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSeo(seo.id)}
                        className="p-2 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {seoItems.length === 0 && (
                <p className="text-center text-text-secondary py-8">Немає жодного SEO правила.</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-primary rounded-xl border border-white/10">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label htmlFor="url_buy_usd_24" className="block text-sm text-text-secondary mb-2">URL шлях (наприклад: /buy-usd)</label>
                    <input id="url_buy_usd_24"
                      type="text"
                      value={editingSeo.url_path || ''}
                      onChange={(e) => setEditingSeo({ ...editingSeo, url_path: e.target.value })}
                      placeholder="/about"
                      className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="meta_title_25" className="block text-sm text-text-secondary mb-2">Meta Title</label>
                    <input id="meta_title_25"
                      type="text"
                      value={editingSeo.title || ''}
                      onChange={(e) => setEditingSeo({ ...editingSeo, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="meta_description_26" className="block text-sm text-text-secondary mb-2">Meta Description</label>
                    <textarea id="meta_description_26"
                      value={editingSeo.description || ''}
                      onChange={(e) => setEditingSeo({ ...editingSeo, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="h1_27" className="block text-sm text-text-secondary mb-2">H1 Заголовок</label>
                    <input id="h1_27"
                      type="text"
                      value={editingSeo.h1 || ''}
                      onChange={(e) => setEditingSeo({ ...editingSeo, h1: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="h2_28" className="block text-sm text-text-secondary mb-2">H2 Заголовок</label>
                    <input id="h2_28"
                      type="text"
                      value={editingSeo.h2 || ''}
                      onChange={(e) => setEditingSeo({ ...editingSeo, h2: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-text-secondary mb-2">Зображення (для Hero Section)</label>
                    <div className="flex gap-4 items-start">
                      {editingSeo.image_url && (
                        <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-white/10">
                          <img src={editingSeo.image_url} alt="SEO Preview" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setEditingSeo({ ...editingSeo, image_url: '' })}
                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500/80 rounded transition-colors"
                            aria-label="Видалити зображення">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      )}

                      <div className="flex-1">
                        <label className={`
                          flex flex-col items-center justify-center w-full h-24
                          border-2 border-dashed border-white/20 rounded-xl
                          hover:border-accent-yellow hover:bg-white/5 transition-all
                          cursor-pointer ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}
                        `}>
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploadingImage ? (
                              <Loader2 className="w-6 h-6 text-accent-yellow animate-spin mb-2" />
                            ) : (
                              <Upload className="w-6 h-6 text-text-secondary mb-2 group-hover:text-accent-yellow" />
                            )}
                            <p className="text-xs text-text-secondary">
                              {uploadingImage ? 'Завантаження...' : 'Натисніть для завантаження'}
                            </p>
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={handleSeoImageUpload} aria-label="Завантажити SEO зображення" />
                        </label>
                        <input
                          type="text"
                          value={editingSeo.image_url || ''}
                          onChange={(e) => setEditingSeo({ ...editingSeo, image_url: e.target.value })}
                          placeholder="Або вставте посилання (URL) на зображення"
                          aria-label="URL SEO зображення"
                          className="w-full mt-2 px-4 py-2 text-sm bg-white/5 rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-text-secondary mb-2">SEO Текст</label>
                    <div className="seo-quill-editor bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                      <ReactQuill
                        theme="snow"
                        value={editingSeo.text || ''}
                        onChange={(value) => setEditingSeo({ ...editingSeo, text: value })}
                        modules={{
                          toolbar: [
                            [{ header: [2, 3, false] }],
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                            ['link', 'clean']
                          ]
                        }}
                        className="text-white min-h-[200px]"
                        placeholder="Текст статті або основний SEO контент..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditingSeo(null)}
                    className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10 font-medium"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={() => handleSaveSeo(editingSeo)}
                    className="flex-1 py-3 bg-accent-yellow rounded-xl text-primary font-bold hover:opacity-90"
                  >
                    Зберегти
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
