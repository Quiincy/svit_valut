
export default function ChatSection({ settings }) {
    const telegramUrl = settings?.telegram_url || 'https://t.me/svitvalut';
    const viberUrl = settings?.viber_url || 'viber://chat?number=+380960488884';
    const whatsappUrl = settings?.whatsapp_url || 'https://wa.me/380960488884';

    return (
        <section className="py-16 lg:py-24 px-4 bg-[#0a0e14]">
            <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white tracking-tight">
                    Чат з менеджером
                </h2>
                <p className="text-lg lg:text-xl text-text-secondary mb-12 max-w-2xl mx-auto font-light">
                    Маєте питання? Напишіть нам — відповімо за кілька хвилин
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6">
                    {/* Telegram Button */}
                    <a
                        href={telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 lg:px-12 py-5 bg-accent-yellow rounded-2xl text-primary font-bold text-lg hover:shadow-[0_0_20px_rgba(245,213,71,0.3)] transition-all active:scale-95 group"
                    >
                        <TelegramIcon className="w-6 h-6" />
                        <span className="leading-none">Telegram</span>
                    </a>

                    {/* Viber Button */}
                    <a
                        href={viberUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 lg:px-12 py-5 border-2 border-accent-yellow/50 rounded-2xl text-accent-yellow font-bold text-lg hover:bg-accent-yellow/5 transition-all active:scale-95"
                    >
                        <ViberIcon className="w-6 h-6" />
                        <span className="leading-none">Viber</span>
                    </a>

                    {/* WhatsApp Button */}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 lg:px-12 py-5 border-2 border-accent-yellow/50 rounded-2xl text-accent-yellow font-bold text-lg hover:bg-accent-yellow/5 transition-all active:scale-95"
                    >
                        <WhatsAppIcon className="w-6 h-6" />
                        <span className="leading-none">WhatsApp</span>
                    </a>
                </div>
            </div>
        </section>
    );
}

// Custom Icons
function TelegramIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.565 8.16l-1.92 9.043c-.15.65-.53.81-1.07.505l-2.964-2.185-1.43 1.376c-.157.158-.29.29-.594.29l.212-3.02 5.5-4.97c.24-.213-.053-.332-.372-.12l-6.8 4.28-2.93-.916c-.636-.2-.647-.634.133-.938l11.45-4.414c.532-.192 1.0.118.805.975z" />
        </svg>
    );
}

import viberCustomIcon from '../assets/viber-custom.png';

function ViberIcon({ className }) {
    return (
        <div
            className={`${className} bg-current`}
            style={{
                maskImage: `url(${viberCustomIcon})`,
                WebkitMaskImage: `url(${viberCustomIcon})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center'
            }}
        />
    );
}

function WhatsAppIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.031 0C5.396 0 0 5.4 0 12.031c0 2.125.552 4.167 1.6 5.969L0 23.958l6.104-1.594c1.729.938 3.708 1.438 5.76 1.438h.01c6.625 0 12.031-5.396 12.031-12.031C23.906 5.4 18.667 0 12.031 0zm0 21.948h-.01c-1.844 0-3.646-.49-5.219-1.427l-.375-.219-3.865 1.01.99-3.792-.25-.396c-1.042-1.656-1.6-3.573-1.6-5.594 0-5.458 4.438-9.917 9.896-9.917 2.635 0 5.125 1.031 6.99 2.917 1.865 1.854 2.896 4.333 2.896 6.99 0 5.458-4.427 9.896-9.875 9.896l.448.526zm5.417-7.417c-.292-.146-1.74-1.073-2.01-1.198-.271-.125-.469-.188-.667.104-.198.292-.771.969-.948 1.167-.177.198-.354.219-.646.073-1.417-.677-2.344-1.396-3.271-3.031-.24-.417.24-.385.677-1.25-.02-.104-.104-.188-.208-.396-.104-.208-.667-1.604-.917-2.188-.24-.573-.479-.49-.667-.5-.167-.01-.365-.01-.563-.01-.198 0-.521.073-.792.365-.271.292-1.042 1.021-1.042 2.479 0 1.458 1.063 2.875 1.208 3.073.146.198 2.094 3.208 5.073 4.49 2.052.885 2.052.594 2.427.552.792-.083 1.74-.708 1.99-1.396.25-.688.25-1.271.177-1.396-.073-.125-.271-.198-.563-.344z" />
        </svg>
    );
}
