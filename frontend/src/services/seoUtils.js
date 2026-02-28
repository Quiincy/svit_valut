/**
 * seoUtils.js — Helper functions for SEO and Schema.org generation.
 */

const BASE_DOMAIN = 'https://mirvalut.com';

/**
 * Updates or creates a canonical link tag in the document head.
 * @param {string} path - The current URL path (e.g., '/sell-usd')
 */
export const updateCanonicalTag = (path) => {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }

    // Ensure path starts with / and remove trailing / for consistency
    let cleanPath = path.startsWith('/') ? path : '/' + path;
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
        cleanPath = cleanPath.slice(0, -1);
    }

    canonical.setAttribute('href', `${BASE_DOMAIN}${cleanPath}`);
};

/**
 * Generates and updates the JSON-LD schema in the document head.
 * @param {Object} options - Data to populate the schema
 */
export const updateSchemaMarkup = ({ settings, activeBranch, currencies, giveCurrency, getCurrency }) => {
    let script = document.querySelector('script[type="application/ld+json"]#seo-schema');
    if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('id', 'seo-schema');
        document.head.appendChild(script);
    }

    const companyName = settings?.company_name || 'Світ Валют';
    const phone = settings?.phone || '(096) 048-88-84';

    // 1. LocalBusiness / FinancialService Schema
    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "FinancialService",
                "@id": `${BASE_DOMAIN}/#organization`,
                "name": companyName,
                "url": BASE_DOMAIN,
                "telephone": phone,
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": activeBranch?.address_uk || activeBranch?.address || "м. Київ",
                    "addressLocality": "Київ",
                    "addressCountry": "UA"
                },
                "openingHours": "Mo-Su 08:00-20:00",
                "image": `${BASE_DOMAIN}/logo.png`,
                "priceRange": "$$"
            }
        ]
    };

    // 2. CurrencyExchange Service (if we have active currencies)
    if (giveCurrency && getCurrency) {
        const isBuying = giveCurrency.code === 'UAH';
        const targetCurrency = isBuying ? getCurrency : giveCurrency;

        if (targetCurrency.code !== 'UAH') {
            schema["@graph"].push({
                "@type": "Service",
                "name": `Обмін ${targetCurrency.name_uk || targetCurrency.code}`,
                "serviceType": "Currency Exchange",
                "provider": { "@id": `${BASE_DOMAIN}/#organization` },
                "description": `Вигідний курс ${targetCurrency.code} у Києві. Оптовий та роздрібний обмін.`
            });
        }
    }

    script.text = JSON.stringify(schema);
};
