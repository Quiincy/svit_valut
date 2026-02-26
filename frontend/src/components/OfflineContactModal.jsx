import { X, MessageCircle, Phone, Camera, Send } from 'lucide-react';

export default function OfflineContactModal({ isOpen, onClose, settings }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
            onClick={onClose}
        >
            <div
                className="bg-primary-light rounded-3xl p-8 max-w-sm w-full border border-white/10 text-center relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg transition-colors"
                 aria-label="Закрити">
                    <X className="w-5 h-5 text-text-secondary" />
                </button>

                <div className="w-20 h-20 mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-accent-yellow/20 rounded-full animate-pulse" />
                    <div className="relative w-full h-full bg-accent-yellow/10 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-10 h-10 text-accent-yellow" />
                    </div>
                </div>

                <h3 className="text-2xl font-bold mb-3">Зараз неробочий час</h3>
                <p className="text-text-secondary mb-6">
                    Онлайн чат працює з 08:00 до 20:00. Однак ви можете написати нам у месенджери, і ми відповімо якнайшвидше!
                </p>

                <div className="grid grid-cols-2 gap-4">
                    {settings?.telegram_url && (
                        <a
                            href={settings.telegram_url.startsWith('http') ? settings.telegram_url : `https://${settings.telegram_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl hover:bg-[#0088cc]/20 hover:text-[#0088cc] border border-white/5 hover:border-[#0088cc]/50 transition-all group"
                        >
                            <Send className="w-8 h-8 mb-2 text-text-secondary group-hover:text-[#0088cc] transition-colors" />
                            <span className="text-sm font-medium text-text-secondary group-hover:text-[#0088cc] transition-colors">Telegram</span>
                        </a>
                    )}

                    {settings?.viber_url && (
                        <a
                            href={settings.viber_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl hover:bg-[#7360f2]/20 hover:text-[#7360f2] border border-white/5 hover:border-[#7360f2]/50 transition-all group"
                        >
                            <Phone className="w-8 h-8 mb-2 text-text-secondary group-hover:text-[#7360f2] transition-colors" />
                            <span className="text-sm font-medium text-text-secondary group-hover:text-[#7360f2] transition-colors">Viber</span>
                        </a>
                    )}

                    {settings?.whatsapp_url && (
                        <a
                            href={settings.whatsapp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl hover:bg-[#25D366]/20 hover:text-[#25D366] border border-white/5 hover:border-[#25D366]/50 transition-all group"
                        >
                            <MessageCircle className="w-8 h-8 mb-2 text-text-secondary group-hover:text-[#25D366] transition-colors" />
                            <span className="text-sm font-medium text-text-secondary group-hover:text-[#25D366] transition-colors">WhatsApp</span>
                        </a>
                    )}

                    {settings?.instagram_url && (
                        <a
                            href={settings.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl hover:bg-[#E1306C]/20 hover:text-[#E1306C] border border-white/5 hover:border-[#E1306C]/50 transition-all group"
                        >
                            <Camera className="w-8 h-8 mb-2 text-text-secondary group-hover:text-[#E1306C] transition-colors" />
                            <span className="text-sm font-medium text-text-secondary group-hover:text-[#E1306C] transition-colors">Instagram</span>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
