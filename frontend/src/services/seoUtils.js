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
export const updateSchemaMarkup = ({ settings, activeBranch, branches, currencies, giveCurrency, getCurrency }) => {
    let script = document.querySelector('script[type="application/ld+json"]#seo-schema');
    if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('id', 'seo-schema');
        document.head.appendChild(script);
    }

    const companyName = settings?.company_name || 'Світ Валют';
    const mainPhone = settings?.phone || '(096) 048-88-84';
    const logoUrl = `${BASE_DOMAIN}/logo.png`;

    // Social links for sameAs
    const sameAs = [];
    if (settings?.telegram_url) sameAs.push(settings.telegram_url);
    if (settings?.viber_url) sameAs.push(settings.viber_url);
    if (settings?.facebook_url) sameAs.push(settings.facebook_url);
    if (settings?.instagram_url) sameAs.push(settings.instagram_url);

    // 1. Core Organization & WebSite
    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${BASE_DOMAIN}/#organization`,
                "name": companyName,
                "url": BASE_DOMAIN,
                "logo": {
                    "@type": "ImageObject",
                    "url": logoUrl
                },
                "telephone": mainPhone,
                "sameAs": sameAs
            },
            {
                "@type": "WebSite",
                "@id": `${BASE_DOMAIN}/#website`,
                "url": BASE_DOMAIN,
                "name": companyName,
                "publisher": { "@id": `${BASE_DOMAIN}/#organization` }
            }
        ]
    };

    // 2. Locations (Branches)
    const branchList = Array.isArray(branches) && branches.length > 0 ? branches : (activeBranch ? [activeBranch] : []);
    branchList.forEach((branch, index) => {
        schema["@graph"].push({
            "@type": "FinancialService",
            "@id": `${BASE_DOMAIN}/#branch-${branch.id || index}`,
            "name": `${companyName} - Відділення №${branch.number || index + 1}`,
            "description": `Обмін валют у Києві за адресою: ${branch.address}`,
            "image": logoUrl,
            "telephone": branch.phone || mainPhone,
            "url": `${BASE_DOMAIN}/contacts`,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": branch.address,
                "addressLocality": "Київ",
                "addressCountry": "UA"
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": branch.lat,
                "longitude": branch.lng
            },
            "openingHours": branch.hours || "Mo-Su 08:00-20:00",
            "priceRange": "$$"
        });
    });

    // 3. CurrencyExchange Service (Contextual based on selected currency pair)
    if (giveCurrency && getCurrency) {
        const isBuying = giveCurrency.code === 'UAH';
        const targetCurrency = isBuying ? getCurrency : giveCurrency;

        if (targetCurrency.code !== 'UAH') {
            schema["@graph"].push({
                "@type": "Service",
                "name": `Обмін ${targetCurrency.name_uk || targetCurrency.code}`,
                "serviceType": "Currency Exchange",
                "provider": { "@id": `${BASE_DOMAIN}/#organization` },
                "description": `Вигідний курс ${targetCurrency.code} у Києві. Оптовий та роздрібний обмін.`,
                "areaServed": {
                    "@type": "City",
                    "name": "Kyiv"
                }
            });
        }
    }

    script.text = JSON.stringify(schema);
};
