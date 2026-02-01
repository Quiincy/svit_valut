import { Banknote, TrendingUp, AlertTriangle, MapPin, Shield } from 'lucide-react';

const features = [
  {
    icon: Banknote,
    title: '30+ валют до обміну',
    description: 'Долар, Євро, Злотий, Дірхам, Франк та інші — навіть рідкісні.',
    color: 'text-accent-yellow',
  },
  {
    icon: TrendingUp,
    title: 'Оптові курси',
    description: 'Підбираємо ставку під вашу суму протягом кількох хвилин.',
    color: 'text-accent-yellow',
  },
  {
    icon: AlertTriangle,
    title: 'Пошкоджені банкноти',
    description: 'Горілі, рвані, у плісняві — навіть ті, що вже вийшли з обігу',
    color: 'text-accent-yellow',
  },
  {
    icon: MapPin,
    title: '5 пунктів у Києві',
    description: 'Правий та лівий берег — оберіть найближчий',
    color: 'text-accent-yellow',
  },
  {
    icon: Shield,
    title: 'Преміум-безпека',
    description: 'Відеонагляд, контроль кас, окремі кімнати перерахунку',
    color: 'text-accent-yellow',
  },
];

export default function FeaturesSection({ settings }) {
  return (
    <section className="py-12 lg:py-20 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl lg:text-4xl font-bold mb-8 lg:mb-12">
          Обмін валют без ризиків
          <br />
          <span className="text-text-secondary">та переплат</span>
        </h2>

        {/* Mobile - List */}
        <div className="lg:hidden space-y-4">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex-shrink-0 w-1 bg-accent-yellow rounded-full" />
              <div>
                <h3 className={`font-semibold mb-1 ${feature.color}`}>{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop - Grid */}
        <div className="hidden lg:grid grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="p-6 bg-primary-light rounded-2xl border border-white/10 hover:border-accent-yellow/30 transition-colors"
            >
              <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Chat Section */}
        <div className="mt-12 lg:mt-16 p-6 lg:p-8 bg-primary-light rounded-2xl border border-white/10">
          <h3 className="text-xl lg:text-2xl font-bold mb-2">Чат з менеджером</h3>
          <p className="text-text-secondary mb-6">
            Маєте питання? Напишіть нам — відповімо за кілька хвилин
          </p>
          
          <div className="flex flex-wrap gap-3">
            <a 
              href={settings?.telegram_url || 'https://t.me/svitvalut'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#0088cc] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              Telegram
            </a>
            <a 
              href={settings?.viber_url || 'viber://chat?number=+380960488884'}
              className="flex items-center gap-2 px-6 py-3 bg-[#7360f2] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
            >
              Viber
            </a>
            <a 
              href={settings?.whatsapp_url || 'https://wa.me/380960488884'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#25D366] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
