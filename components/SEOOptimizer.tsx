import React, { useEffect } from 'react';

interface SEOOptimizerProps {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'profile';
    lang?: 'en' | 'ar';
}

const SEOOptimizer: React.FC<SEOOptimizerProps> = ({
    title = 'Mohammed Ibrahim Abdullah - Automation & AI Integration Specialist',
    description = 'Expert in building intelligent systems and custom solutions using n8n, AI tools, and custom interfaces for maximum efficiency.',
    keywords = ['automation', 'AI integration', 'n8n workflows', 'custom solutions', 'telegram bots', 'SaaS development'],
    image = 'https://images.unsplash.com/photo-1677756119517-756a188d2d94?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=1200',
    url = 'https://mohammed-ibrahim-portfolio.com',
    type = 'website',
    lang = 'ar'
}) => {
    useEffect(() => {
        // Update document title
        document.title = title;

        // Update meta tags
        updateMetaTag('description', description);
        updateMetaTag('keywords', keywords.join(', '));
        updateMetaTag('author', 'Mohammed Ibrahim Abdullah');
        updateMetaTag('robots', 'index, follow');
        updateMetaTag('language', lang);
        updateMetaTag('revisit-after', '7 days');

        // Open Graph tags
        updateMetaProperty('og:title', title);
        updateMetaProperty('og:description', description);
        updateMetaProperty('og:image', image);
        updateMetaProperty('og:url', url);
        updateMetaProperty('og:type', type);
        updateMetaProperty('og:locale', lang === 'ar' ? 'ar_SA' : 'en_US');
        updateMetaProperty('og:site_name', 'Mohammed Ibrahim Abdullah Portfolio');

        // Twitter Card tags
        updateMetaName('twitter:card', 'summary_large_image');
        updateMetaName('twitter:title', title);
        updateMetaName('twitter:description', description);
        updateMetaName('twitter:image', image);
        updateMetaName('twitter:creator', '@mabda724');

        // LinkedIn tags
        updateMetaProperty('linkedin:owner', 'mohammed-ibrahim-abdullah');

        // Additional SEO tags
        updateMetaName('theme-color', '#00e5ff');
        updateMetaName('msapplication-TileColor', '#00e5ff');
        updateMetaName('apple-mobile-web-app-capable', 'yes');
        updateMetaName('apple-mobile-web-app-status-bar-style', 'black-translucent');

        // Canonical URL
        updateCanonicalUrl(url);

        // Structured Data (JSON-LD)
        updateStructuredData({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Mohammed Ibrahim Abdullah',
            jobTitle: 'Automation & AI Integration Specialist',
            description: description,
            url: url,
            image: image,
            sameAs: [
                'https://linkedin.com/in/mohammed-ibrahim-abdullah',
                'https://github.com/mabda724',
                'https://twitter.com/mabda724'
            ],
            knowsAbout: [
                'Process Automation',
                'Artificial Intelligence',
                'n8n Workflows',
                'Custom Software Development',
                'Telegram Bot Development',
                'SaaS Development'
            ],
            offers: {
                '@type': 'Service',
                serviceType: 'Automation & AI Integration',
                provider: {
                    '@type': 'Person',
                    name: 'Mohammed Ibrahim Abdullah'
                }
            }
        });

        // Preload critical resources
        preloadCriticalResources();

        // Add breadcrumb structured data
        addBreadcrumbStructuredData();

    }, [title, description, keywords, image, url, type, lang]);

    const updateMetaTag = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    };

    const updateMetaProperty = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.content = content;
    };

    const updateMetaName = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    };

    const updateCanonicalUrl = (url: string) => {
        let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = url;
    };

    const updateStructuredData = (data: any) => {
        let script = document.querySelector('script[type="application/ld+json"]');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data);
    };

    const preloadCriticalResources = () => {
        // Preload critical images
        const criticalImages = [
            'https://images.unsplash.com/photo-1677756119517-756a188d2d94?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600',
            'https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600'
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });

        // Preload fonts
        const fonts = [
            'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap',
            'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap'
        ];

        fonts.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = href;
            document.head.appendChild(link);
        });
    };

    const addBreadcrumbStructuredData = () => {
        const breadcrumbData = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: url
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Services',
                    item: `${url}#services`
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: 'Projects',
                    item: `${url}#projects`
                },
                {
                    '@type': 'ListItem',
                    position: 4,
                    name: 'Contact',
                    item: `${url}#contact`
                }
            ]
        };

        let script = document.querySelector('script[data-type="breadcrumb"]');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.setAttribute('data-type', 'breadcrumb');
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(breadcrumbData);
    };

    return null; // This component doesn't render anything
};

export default SEOOptimizer;