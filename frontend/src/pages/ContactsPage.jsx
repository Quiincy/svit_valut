import { useOutletContext } from 'react-router-dom';
import { MapPin, Phone, Clock, Send, MessageSquare } from 'lucide-react';

export default function ContactsPage() {
    const { branches, settings, onOpenChat } = useOutletContext();

    const phone = settings?.phone || '(096) 048-88-84';
    const phoneClean = phone.replace(/[^\d+]/g, '');
    const workingHours = settings?.working_hours || 'щодня: 8:00-20:00';

    return (
        <div className="min-h-screen bg-primary pt-28 pb-16">
            <div className="max-w-5xl mx-auto px-4 lg:px-8">
                {/* Page Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4">Контакти</h1>
                    <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                        Зв'яжіться з нами будь-яким зручним способом або завітайте до одного з наших відділень.
                    </p>
                </div>

                {/* Contact Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {/* Phone */}
                    <a
                        href={`tel:${phoneClean}`}
                        className="bg-primary-light border border-white/10 rounded-2xl p-6 hover:border-accent-yellow/30 transition-all group text-center"
                    >
                        <div className="w-14 h-14 bg-accent-yellow/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-yellow/20 transition-colors">
                            <Phone className="w-7 h-7 text-accent-yellow" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Телефон</h3>
                        <p className="text-accent-yellow font-bold text-xl">{phone}</p>
                        <p className="text-text-secondary text-sm mt-1">Гаряча лінія</p>
                    </a>

                    {/* Working Hours */}
                    <div className="bg-primary-light border border-white/10 rounded-2xl p-6 text-center">
                        <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-7 h-7 text-green-400" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Графік роботи</h3>
                        <p className="text-green-400 font-bold text-xl">{workingHours}</p>
                        <p className="text-text-secondary text-sm mt-1">Без вихідних</p>
                    </div>

                    {/* Chat */}
                    <button
                        onClick={onOpenChat}
                        className="bg-primary-light border border-white/10 rounded-2xl p-6 hover:border-accent-blue/30 transition-all group text-center"
                    >
                        <div className="w-14 h-14 bg-accent-blue/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-blue/20 transition-colors">
                            <MessageSquare className="w-7 h-7 text-accent-blue" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Онлайн-чат</h3>
                        <p className="text-accent-blue font-bold text-lg">Написати в чат</p>
                        <p className="text-text-secondary text-sm mt-1">Відповідаємо за кілька хвилин</p>
                    </button>
                </div>

                {/* Social Links */}
                {(settings?.telegram_url || settings?.instagram_url || settings?.facebook_url) && (
                    <div className="bg-primary-light border border-white/10 rounded-2xl p-8 mb-12 text-center">
                        <h2 className="text-xl font-bold text-white mb-6">Ми в соціальних мережах</h2>
                        <div className="flex justify-center gap-4">
                            {settings?.telegram_url && (
                                <a
                                    href={settings.telegram_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-xl px-6 py-4 hover:bg-[#0088cc]/20 transition-colors"
                                >
                                    <Send className="w-6 h-6 text-[#0088cc]" />
                                    <span className="text-white font-medium">Telegram</span>
                                </a>
                            )}
                            {settings?.instagram_url && (
                                <a
                                    href={settings.instagram_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/20 rounded-xl px-6 py-4 hover:bg-pink-500/20 transition-colors"
                                >
                                    <svg className="w-6 h-6 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                    <span className="text-white font-medium">Instagram</span>
                                </a>
                            )}
                            {settings?.facebook_url && (
                                <a
                                    href={settings.facebook_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-[#1877f2]/10 border border-[#1877f2]/20 rounded-xl px-6 py-4 hover:bg-[#1877f2]/20 transition-colors"
                                >
                                    <svg className="w-6 h-6 text-[#1877f2]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    <span className="text-white font-medium">Facebook</span>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Branches */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Наші відділення</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {branches?.map(branch => (
                            <div
                                key={branch.id}
                                className="bg-primary-light border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <MapPin className="w-5 h-5 text-accent-yellow mt-0.5 shrink-0" />
                                    <div>
                                        <h3 className="text-white font-bold text-lg">{branch.name}</h3>
                                        <p className="text-text-secondary text-sm mt-1">{branch.address}</p>
                                    </div>
                                </div>
                                {branch.working_hours && (
                                    <div className="flex items-center gap-2 text-sm text-text-secondary ml-8">
                                        <Clock className="w-4 h-4 text-green-400" />
                                        <span>{branch.working_hours}</span>
                                    </div>
                                )}
                                {branch.phone && (
                                    <div className="flex items-center gap-2 text-sm ml-8 mt-1">
                                        <Phone className="w-4 h-4 text-accent-yellow" />
                                        <a href={`tel:${branch.phone.replace(/[^\d+]/g, '')}`} className="text-accent-yellow hover:opacity-80">
                                            {branch.phone}
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
