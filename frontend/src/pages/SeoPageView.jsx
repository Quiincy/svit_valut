import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { seoPageService, getStaticUrl } from '../services/api';
import SeoTextBlock from '../components/SeoTextBlock';

export default function SeoPageView() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    seoPageService.getOne(slug)
      .then((res) => {
        setPage(res.data);
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Update document title
  useEffect(() => {
    if (page) {
      const title = page.meta_title || page.h1 || 'Світ Валют';
      document.title = title.includes('Світ Валют') ? title : `${title} | Світ Валют`;

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && page.meta_description) {
        metaDesc.setAttribute('content', page.meta_description);
      }
    }
  }, [page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !page) {
    return null; // Let parent route handle 404
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-28 lg:pt-32 pb-16 text-left animate-in fade-in duration-300">
      {/* Hero Image */}
      {page.image_url && (
        <div className="relative w-full h-48 md:h-72 rounded-2xl overflow-hidden mb-8">
          <img
            src={getStaticUrl(page.image_url)}
            alt={page.h1 || ''}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
        </div>
      )}

      {/* H1 */}
      {page.h1 && (
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          {page.h1}
        </h1>
      )}

      {/* H2 */}
      {page.h2 && (
        <h2 className="text-xl md:text-2xl font-semibold text-text-secondary mb-8">
          {page.h2}
        </h2>
      )}

      {/* SEO Text Content */}
      {page.seo_text && (
        <div className="mt-6">
          <SeoTextBlock
            html={page.seo_text}
            maxLines={100}
            prose
            className="prose-invert"
          />
        </div>
      )}
    </div>
  );
}
