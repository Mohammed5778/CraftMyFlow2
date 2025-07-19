import React, { Suspense, lazy } from 'react';

// Loading component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'جاري التحميل...' }) => (
    <div className="flex items-center justify-center py-12">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan mx-auto mb-4"></div>
            <p className="text-text-secondary">{message}</p>
        </div>
    </div>
);

// Lazy load components
export const LazyAdminPanel = lazy(() => import('./AdminPanel'));
export const LazyAnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
export const LazyRatingSystem = lazy(() => import('./RatingSystem'));
export const LazyAdvancedChatbot = lazy(() => import('./AdvancedChatbot'));

// HOC for lazy loading with error boundary
export const withLazyLoading = <P extends object>(
    Component: React.ComponentType<P>,
    loadingMessage?: string
) => {
    return (props: P) => (
        <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
            <Component {...props} />
        </Suspense>
    );
};

// Preload components for better UX
export const preloadComponent = (componentImport: () => Promise<any>) => {
    const componentImportFunc = componentImport;
    componentImportFunc();
};

// Intersection Observer based lazy loading for images
export const LazyImage: React.FC<{
    src: string;
    alt: string;
    className?: string;
    placeholder?: string;
}> = ({ src, alt, className = '', placeholder }) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [isInView, setIsInView] = React.useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
            {!isLoaded && (
                <div className="absolute inset-0 bg-secondary-dark animate-pulse flex items-center justify-center">
                    {placeholder ? (
                        <img src={placeholder} alt="" className="w-full h-full object-cover opacity-50" />
                    ) : (
                        <i className="fas fa-image text-text-secondary text-2xl"></i>
                    )}
                </div>
            )}
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setIsLoaded(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
};

// Progressive image loading with multiple sizes
export const ProgressiveImage: React.FC<{
    src: string;
    lowQualitySrc?: string;
    alt: string;
    className?: string;
    sizes?: string;
    srcSet?: string;
}> = ({ src, lowQualitySrc, alt, className = '', sizes, srcSet }) => {
    const [currentSrc, setCurrentSrc] = React.useState(lowQualitySrc || src);
    const [isLoaded, setIsLoaded] = React.useState(false);

    React.useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setCurrentSrc(src);
            setIsLoaded(true);
        };
        img.src = src;
    }, [src]);

    return (
        <img
            src={currentSrc}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            className={`transition-all duration-300 ${className} ${
                isLoaded ? 'filter-none' : 'filter blur-sm'
            }`}
            loading="lazy"
        />
    );
};

// Lazy load sections based on scroll position
export const LazySection: React.FC<{
    children: React.ReactNode;
    className?: string;
    threshold?: number;
}> = ({ children, className = '', threshold = 0.1 }) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const sectionRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [threshold]);

    return (
        <div ref={sectionRef} className={className}>
            {isVisible ? children : <LoadingSpinner />}
        </div>
    );
};

export default LazyLoader;