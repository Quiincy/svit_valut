import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Phone, MessageSquare } from 'lucide-react';
import { getStaticUrl } from '../services/api';
import { Helmet } from 'react-helmet-async';

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
    <div className="bg-primary pb-12 pt-20 lg:pt-24">
      <Helmet>
        <title>{service.seo_title || `${service.title} | Світ Валют`}</title>
        {service.seo_description && (
          <meta name="description" content={service.seo_description} />
        )}
        {service.seo_image && (
          <meta property="og:image" content={getStaticUrl(service.seo_image)} />
        )}
        <meta property="og:title" content={service.seo_title || service.title} />
        {service.seo_description && (
          <meta property="og:description" content={service.seo_description} />
        )}
      </Helmet>

      {/* Hero Image - Full width on mobile, constrained on desktop */}
      {service.image_url && (
        <div className="w-full lg:max-w-6xl lg:mx-auto lg:px-8 mb-6 lg:mb-10">
          <img
            src={getStaticUrl(service.image_url)}
            alt={service.title}
            className="w-full h-[250px] sm:h-[350px] lg:h-[450px] object-cover lg:rounded-3xl shadow-xl"
          />
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 lg:px-8 bg-primary">

        <h1 className="text-3xl lg:text-5xl font-bold mb-6 text-white leading-tight">
          {service.seo_h1 || service.title}
        </h1>

        {/* Manager Contact Banner - Prominent in first screen */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 mb-8 bg-primary-light/50 border border-white/10 rounded-2xl gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent-yellow/20 flex items-center justify-center shrink-0">
              <span className="text-accent-yellow font-bold text-xl">М</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Зв'язок з менеджером</p>
              <p className="text-[#d1d1d1] text-sm">Швидка консультація та замовлення</p>
            </div>
          </div>
          <a
            href={`tel:${settings?.phone?.replace(/[^\d+]/g, '')}`}
            className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto bg-accent-yellow rounded-xl text-primary font-bold hover:bg-yellow-400 transition-colors"
          >
            <Phone className="w-5 h-5" />
            {settings?.phone || '(096) 048-88-84'}
          </a>
        </div>

        <div
          className="text-lg mb-8 prose prose-invert max-w-none prose-p:text-[#d1d1d1] prose-li:text-[#d1d1d1] prose-strong:text-white"
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

        {/* SEO Text Block */}
        {service.seo_text && (
          <div className="mt-16 text-sm text-text-secondary prose prose-sm prose-invert max-w-none">
            {service.seo_h2 && <h2 className="text-xl font-bold text-white mb-4">{service.seo_h2}</h2>}
            <div dangerouslySetInnerHTML={{ __html: service.seo_text }} />
          </div>
        )}
      </main>
    </div>
  );
}
