import { useState, useEffect, useMemo } from 'react';
import { Globe, X, Save, RefreshCw, Upload, Loader2 } from 'lucide-react';
import { adminService } from '../../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Quill toolbar configuration
const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link'],
        ['clean']
    ]
};

const QUILL_FORMATS = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'link'
];

export default function SeoEditRow({ currency, onSave, onCancel }) {
    const [activeTab, setActiveTab] = useState('buy');
    const [isSaving, setIsSaving] = useState(false);
    const [loadingImage, setLoadingImage] = useState(null);
    const [formData, setFormData] = useState({
        seo_h1: '', seo_h2: '', seo_text: '', seo_image: '', buy_url: '', sell_url: '',
        seo_buy_h1: '', seo_buy_h2: '', seo_buy_title: '', seo_buy_desc: '', seo_buy_text: '', seo_buy_image: '',
        seo_sell_h1: '', seo_sell_h2: '', seo_sell_title: '', seo_sell_desc: '', seo_sell_text: '', seo_sell_image: ''
    });

    // Initialize form data from currency prop
    useEffect(() => {
        if (currency) {
            setFormData({
                seo_h1: currency.seo_h1 || '',
                seo_h2: currency.seo_h2 || '',
                seo_text: currency.seo_text || '',
                seo_image: currency.seo_image || '',
                buy_url: currency.buy_url || '',
                sell_url: currency.sell_url || '',

                // Split SEO
                seo_buy_h1: currency.seo_buy_h1 || '',
                seo_buy_h2: currency.seo_buy_h2 || '',
                seo_buy_title: currency.seo_buy_title || '',
                seo_buy_desc: currency.seo_buy_desc || '',
                seo_buy_text: currency.seo_buy_text || '',
                seo_buy_image: currency.seo_buy_image || '',

                seo_sell_h1: currency.seo_sell_h1 || '',
                seo_sell_h2: currency.seo_sell_h2 || '',
                seo_sell_title: currency.seo_sell_title || '',
                seo_sell_desc: currency.seo_sell_desc || '',
                seo_sell_text: currency.seo_sell_text || '',
                seo_sell_image: currency.seo_sell_image || '',
            });
        }
    }, [currency.code]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(currency.code, formData);
        } catch (error) {
            console.error('Error saving in row:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e, field) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoadingImage(field);
        try {
            const res = await adminService.uploadImage(file);
            if (res.data && res.data.url) {
                setFormData(prev => ({ ...prev, [field]: res.data.url }));
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            alert('Помилка завантаження зображення');
        } finally {
            setLoadingImage(null);
        }
    };

    return (
        <tr key={`${currency.code}-seo`}>
            <td colSpan="7" className="p-4 bg-primary/50 border-b border-white/5">
                <div className="p-5 bg-primary rounded-xl border border-accent-yellow/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <h4 className="font-bold text-accent-yellow flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                SEO для {currency.code}
                            </h4>
                            <div className="flex bg-primary-light rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => setActiveTab('buy')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'buy' ? 'bg-green-500/20 text-green-400 shadow-sm' : 'text-text-secondary hover:text-white'}`}
                                >
                                    Купівля
                                </button>
                                <button
                                    onClick={() => setActiveTab('sell')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'sell' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-text-secondary hover:text-white'}`}
                                >
                                    Продаж
                                </button>
                            </div>
                        </div>
                        <button onClick={onCancel} className="text-text-secondary hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>



                    {/* BUY TAB */}
                    {activeTab === 'buy' && (
                        <div className="grid md:grid-cols-2 gap-4 animate-fadeIn">
                            <div className="md:col-span-2 bg-green-500/5 border border-green-500/10 rounded-lg p-3 mb-2">
                                <p className="text-xs text-green-400">Налаштування для сторінки <b>Купівлі {currency.code}</b> (Користувач здає вам валюту)</p>
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">URL купівлі</label>
                                <input
                                    type="text"
                                    value={formData.buy_url}
                                    onChange={(e) => setFormData({ ...formData, buy_url: e.target.value })}
                                    placeholder="/buy-usd"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">Meta Title</label>
                                <input
                                    type="text"
                                    value={formData.seo_buy_title}
                                    onChange={(e) => setFormData({ ...formData, seo_buy_title: e.target.value })}
                                    placeholder="Meta Title"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">Meta Description</label>
                                <input
                                    type="text"
                                    value={formData.seo_buy_desc}
                                    onChange={(e) => setFormData({ ...formData, seo_buy_desc: e.target.value })}
                                    placeholder="Meta Description"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">H1 Заголовок</label>
                                <input
                                    type="text"
                                    value={formData.seo_buy_h1}
                                    onChange={(e) => setFormData({ ...formData, seo_buy_h1: e.target.value })}
                                    placeholder="H1"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">H2 Підзаголовок</label>
                                <input
                                    type="text"
                                    value={formData.seo_buy_h2}
                                    onChange={(e) => setFormData({ ...formData, seo_buy_h2: e.target.value })}
                                    placeholder="H2"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">Зображення (URL або Upload)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.seo_buy_image}
                                        onChange={(e) => setFormData({ ...formData, seo_buy_image: e.target.value })}
                                        placeholder="URL обкладинки"
                                        className="flex-1 px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                    />
                                    <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 flex items-center justify-center transition-colors">
                                        {loadingImage === 'seo_buy_image' ? (
                                            <Loader2 className="w-5 h-5 text-accent-yellow animate-spin" />
                                        ) : (
                                            <Upload className="w-5 h-5 text-text-secondary" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageUpload(e, 'seo_buy_image')}
                                            disabled={loadingImage === 'seo_buy_image'}
                                        />
                                    </label>
                                </div>
                                {formData.seo_buy_image && (
                                    <div className="mt-2 relative w-full h-32 bg-black/20 rounded-lg overflow-hidden border border-white/5 group">
                                        <img src={formData.seo_buy_image} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setFormData({ ...formData, seo_buy_image: '' })}
                                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-text-secondary block mb-1">SEO текст (Купівля)</label>
                                <div className="seo-quill-editor">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.seo_buy_text}
                                        onChange={(value) => setFormData(prev => ({ ...prev, seo_buy_text: value }))}
                                        modules={QUILL_MODULES}
                                        formats={QUILL_FORMATS}
                                        placeholder="Текст для сторінки купівлі..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SELL TAB */}
                    {activeTab === 'sell' && (
                        <div className="grid md:grid-cols-2 gap-4 animate-fadeIn">
                            <div className="md:col-span-2 bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-2">
                                <p className="text-xs text-red-400">Налаштування для сторінки <b>Продажу {currency.code}</b> (Користувач купує у вас валюту)</p>
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">URL продажу</label>
                                <input
                                    type="text"
                                    value={formData.sell_url}
                                    onChange={(e) => setFormData({ ...formData, sell_url: e.target.value })}
                                    placeholder="/sell-usd"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">Meta Title</label>
                                <input
                                    type="text"
                                    value={formData.seo_sell_title}
                                    onChange={(e) => setFormData({ ...formData, seo_sell_title: e.target.value })}
                                    placeholder="Meta Title"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">Meta Description</label>
                                <input
                                    type="text"
                                    value={formData.seo_sell_desc}
                                    onChange={(e) => setFormData({ ...formData, seo_sell_desc: e.target.value })}
                                    placeholder="Meta Description"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">H1 Заголовок</label>
                                <input
                                    type="text"
                                    value={formData.seo_sell_h1}
                                    onChange={(e) => setFormData({ ...formData, seo_sell_h1: e.target.value })}
                                    placeholder="H1"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">H2 Підзаголовок</label>
                                <input
                                    type="text"
                                    value={formData.seo_sell_h2}
                                    onChange={(e) => setFormData({ ...formData, seo_sell_h2: e.target.value })}
                                    placeholder="H2"
                                    className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary block mb-1">Зображення (URL або Upload)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.seo_sell_image}
                                        onChange={(e) => setFormData({ ...formData, seo_sell_image: e.target.value })}
                                        placeholder="URL обкладинки"
                                        className="flex-1 px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                    />
                                    <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 flex items-center justify-center transition-colors">
                                        {loadingImage === 'seo_sell_image' ? (
                                            <Loader2 className="w-5 h-5 text-accent-yellow animate-spin" />
                                        ) : (
                                            <Upload className="w-5 h-5 text-text-secondary" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageUpload(e, 'seo_sell_image')}
                                            disabled={loadingImage === 'seo_sell_image'}
                                        />
                                    </label>
                                </div>
                                {formData.seo_sell_image && (
                                    <div className="mt-2 relative w-full h-32 bg-black/20 rounded-lg overflow-hidden border border-white/5 group">
                                        <img src={formData.seo_sell_image} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setFormData({ ...formData, seo_sell_image: '' })}
                                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-text-secondary block mb-1">SEO текст (Продаж)</label>
                                <div className="seo-quill-editor">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.seo_sell_text}
                                        onChange={(value) => setFormData(prev => ({ ...prev, seo_sell_text: value }))}
                                        modules={QUILL_MODULES}
                                        formats={QUILL_FORMATS}
                                        placeholder="Текст для сторінки продажу..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end mt-4 gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                        >
                            Скасувати
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-accent-yellow text-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Зберегти
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );
}
