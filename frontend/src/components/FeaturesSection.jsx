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

      </div>
    </section>
  );
}
