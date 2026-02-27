import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Phone, MessageSquare } from 'lucide-react';
import { getStaticUrl } from '../services/api';

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
        <Link to="/" className="text-accent-yellow hover:underline">← Повернутися на головну</Link>
      </div>
    );
  }

  return (
    <div className="bg-primary pb-12 pt-24">
      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        {service.image_url && (
          <img
            src={getStaticUrl(service.image_url)}
            alt={service.title}
            className="w-full h-64 lg:h-96 object-cover rounded-2xl mb-8"
          />
        )}

        <h1 className="text-3xl lg:text-4xl font-bold mb-4">{service.title}</h1>
        <div
          className="text-lg text-text-secondary mb-8 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: service.description }}
        />



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
