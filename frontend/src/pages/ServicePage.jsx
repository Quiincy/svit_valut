import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Phone, MessageSquare } from 'lucide-react';

export default function ServicePage() {
  const { slug } = useParams();
  const { services, settings } = useOutletContext();

  // Find service by slug (from link_url) or id
  // Note: services are already fetched by layout
  const service = services.find(s =>
    s.link_url?.includes(slug) || s.id.toString() === slug
  );

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center p-4 py-20">
        <h1 className="text-2xl font-bold mb-4">Послугу не знайдено</h1>
        <Link to="/" className="text-accent-blue hover:underline">← Повернутися на головну</Link>
      </div>
    );
  }

  return (
    <div className="bg-primary pb-12">
      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        {service.image_url && (
          <img
            src={service.image_url}
            alt={service.title}
            className="w-full h-64 lg:h-96 object-cover rounded-2xl mb-8"
          />
        )}

        <h1 className="text-3xl lg:text-4xl font-bold mb-4">{service.title}</h1>
        <p className="text-lg text-text-secondary mb-8">{service.description}</p>

        {/* Placeholder content - can be dynamic if backend supports content body */}
        <div className="prose prose-invert max-w-none">
          <h2 className="text-xl font-bold mb-4">Як це працює?</h2>
          <p className="text-text-secondary mb-4">
            Ми приймаємо валюту будь-якого стану та року випуску. Наші фахівці оцінять ваші банкноти
            та запропонують найкращий курс обміну.
          </p>

          <h2 className="text-xl font-bold mb-4 mt-8">Переваги обміну у нас</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-2 mb-8">
            <li>Приймаємо банкноти будь-якого стану</li>
            <li>Миттєва оцінка та обмін</li>
            <li>Конкурентні курси</li>
            <li>Безпечні умови обміну</li>
            <li>5 відділень у Києві</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-primary-light rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold mb-4">Готові обміняти валюту?</h3>
          <p className="text-text-secondary mb-6">
            Зв'яжіться з нами або відвідайте найближче відділення
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${settings?.phone?.replace(/[^\d+]/g, '')}`}
              className="flex items-center gap-2 px-6 py-3 bg-accent-yellow rounded-xl text-primary font-bold hover:opacity-90"
            >
              <Phone className="w-5 h-5" />
              {settings?.phone || '(096) 048-88-84'}
            </a>

            <a
              href={settings?.telegram_url || '#'}
              className="flex items-center gap-2 px-6 py-3 bg-[#0088cc] rounded-xl text-white font-medium hover:opacity-90"
            >
              <MessageSquare className="w-5 h-5" />
              Telegram
            </a>

            <Link
              to="/#branches"
              className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20"
            >
              Знайти відділення
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
