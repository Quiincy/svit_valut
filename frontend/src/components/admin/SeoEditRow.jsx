import { useState, useEffect } from 'react';
import { Globe, X, Save, RefreshCw } from 'lucide-react';

export default function SeoEditRow({ currency, onSave, onCancel }) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        buy_url: '', sell_url: ''
    });

    useEffect(() => {
        if (currency) {
            setFormData({
                buy_url: currency.buy_url || '',
                sell_url: currency.sell_url || '',
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

    return (
        <tr key={`${currency.code}-seo`}>
            <td colSpan="7" className="p-4 bg-primary/50 border-b border-white/5">
                <div className="p-5 bg-primary rounded-xl border border-accent-yellow/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <h4 className="font-bold text-accent-yellow flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                URL сторінок для {currency.code}
                            </h4>
                        </div>
                        <button onClick={onCancel} className="text-text-secondary hover:text-white transition-colors" aria-label="Закрити">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
                        <div>
                            <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 mb-3">
                                <p className="text-xs text-green-400">Сторінка <b>Купівлі {currency.code}</b></p>
                            </div>
                            <label className="text-xs text-text-secondary block mb-1">URL маршрут</label>
                            <input
                                type="text"
                                value={formData.buy_url}
                                onChange={(e) => setFormData({ ...formData, buy_url: e.target.value })}
                                placeholder={`/buy-${currency.code.toLowerCase()}`}
                                className="w-full px-4 py-3 bg-primary-light rounded-xl border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                            />
                        </div>

                        <div>
                            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-3">
                                <p className="text-xs text-red-400">Сторінка <b>Продажу {currency.code}</b></p>
                            </div>
                            <label className="text-xs text-text-secondary block mb-1">URL маршрут</label>
                            <input
                                type="text"
                                value={formData.sell_url}
                                onChange={(e) => setFormData({ ...formData, sell_url: e.target.value })}
                                placeholder={`/sell-${currency.code.toLowerCase()}`}
                                className="w-full px-4 py-3 bg-primary-light rounded-xl border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-6 gap-3">
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                        >
                            Скасувати
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-accent-yellow text-primary font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
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
