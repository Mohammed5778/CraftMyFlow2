import React, { useState, useEffect } from 'react';

interface PWAInstallerProps {
    lang: 'en' | 'ar';
}

const PWAInstaller: React.FC<PWAInstallerProps> = ({ lang }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
        
        // Check if iOS
        setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallPrompt(true);
        };

        // Listen for app installed event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    // Don't show if already installed or dismissed
    if (isStandalone || isInstalled || localStorage.getItem('pwa-install-dismissed')) {
        return null;
    }

    // iOS install instructions
    if (isIOS && !isStandalone) {
        return (
            <div className="fixed bottom-4 left-4 right-4 bg-secondary-dark border border-neon-cyan rounded-lg p-4 shadow-xl z-50 max-w-sm mx-auto">
                <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-10 h-10 bg-neon-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-mobile-alt text-neon-cyan"></i>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-text-primary font-semibold mb-2">
                            {lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                        </h4>
                        <p className="text-text-secondary text-sm mb-3">
                            {lang === 'ar' 
                                ? 'اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"'
                                : 'Tap the share button and then "Add to Home Screen"'
                            }
                        </p>
                        <div className="flex items-center space-x-2 space-x-reverse text-neon-cyan text-sm">
                            <i className="fas fa-share"></i>
                            <span>→</span>
                            <i className="fas fa-plus-square"></i>
                            <span>{lang === 'ar' ? 'إضافة للشاشة الرئيسية' : 'Add to Home Screen'}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
        );
    }

    // Android/Desktop install prompt
    if (showInstallPrompt && deferredPrompt) {
        return (
            <div className="fixed bottom-4 left-4 right-4 bg-secondary-dark border border-neon-cyan rounded-lg p-4 shadow-xl z-50 max-w-sm mx-auto">
                <div className="flex items-start space-x-3 space-x-reverse">
                    <div className="w-10 h-10 bg-neon-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-download text-neon-cyan"></i>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-text-primary font-semibold mb-2">
                            {lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                        </h4>
                        <p className="text-text-secondary text-sm mb-3">
                            {lang === 'ar' 
                                ? 'احصل على تجربة أفضل مع التطبيق المثبت'
                                : 'Get a better experience with the installed app'
                            }
                        </p>
                        <div className="flex space-x-2 space-x-reverse">
                            <button
                                onClick={handleInstallClick}
                                className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                {lang === 'ar' ? 'تثبيت' : 'Install'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="text-text-secondary hover:text-text-primary transition-colors px-4 py-2 text-sm"
                            >
                                {lang === 'ar' ? 'لاحقاً' : 'Later'}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default PWAInstaller;