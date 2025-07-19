import React, { useState, useEffect } from 'react';

interface AccessibilitySettings {
    fontSize: number;
    contrast: 'normal' | 'high' | 'dark';
    reducedMotion: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
    colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

interface AccessibilityEnhancerProps {
    children: React.ReactNode;
}

const AccessibilityEnhancer: React.FC<AccessibilityEnhancerProps> = ({ children }) => {
    const [settings, setSettings] = useState<AccessibilitySettings>({
        fontSize: 16,
        contrast: 'normal',
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: true,
        colorBlindMode: 'none'
    });
    const [showPanel, setShowPanel] = useState(false);
    const [currentFocus, setCurrentFocus] = useState<HTMLElement | null>(null);

    useEffect(() => {
        loadAccessibilitySettings();
        setupKeyboardNavigation();
        setupScreenReader();
        detectUserPreferences();
    }, []);

    useEffect(() => {
        applyAccessibilitySettings();
        saveAccessibilitySettings();
    }, [settings]);

    const loadAccessibilitySettings = () => {
        const saved = localStorage.getItem('accessibilitySettings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    };

    const saveAccessibilitySettings = () => {
        localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
    };

    const detectUserPreferences = () => {
        // Detect reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setSettings(prev => ({ ...prev, reducedMotion: true }));
        }

        // Detect high contrast preference
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            setSettings(prev => ({ ...prev, contrast: 'high' }));
        }

        // Detect dark mode preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setSettings(prev => ({ ...prev, contrast: 'dark' }));
        }
    };

    const applyAccessibilitySettings = () => {
        const root = document.documentElement;

        // Apply font size
        root.style.fontSize = `${settings.fontSize}px`;

        // Apply contrast mode
        root.classList.remove('high-contrast', 'dark-mode');
        if (settings.contrast === 'high') {
            root.classList.add('high-contrast');
        } else if (settings.contrast === 'dark') {
            root.classList.add('dark-mode');
        }

        // Apply reduced motion
        if (settings.reducedMotion) {
            root.style.setProperty('--animation-duration', '0s');
            root.style.setProperty('--transition-duration', '0s');
        } else {
            root.style.removeProperty('--animation-duration');
            root.style.removeProperty('--transition-duration');
        }

        // Apply color blind mode
        root.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
        if (settings.colorBlindMode !== 'none') {
            root.classList.add(settings.colorBlindMode);
        }
    };

    const setupKeyboardNavigation = () => {
        if (!settings.keyboardNavigation) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Tab navigation enhancement
            if (e.key === 'Tab') {
                const focusableElements = document.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const focusableArray = Array.from(focusableElements) as HTMLElement[];
                
                if (e.shiftKey) {
                    // Shift+Tab (backward)
                    const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableArray.length - 1;
                    focusableArray[prevIndex]?.focus();
                } else {
                    // Tab (forward)
                    const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement);
                    const nextIndex = currentIndex < focusableArray.length - 1 ? currentIndex + 1 : 0;
                    focusableArray[nextIndex]?.focus();
                }
            }

            // Skip to main content (Alt+M)
            if (e.altKey && e.key === 'm') {
                const mainContent = document.querySelector('main') || document.querySelector('#main-content');
                if (mainContent) {
                    (mainContent as HTMLElement).focus();
                }
            }

            // Skip to navigation (Alt+N)
            if (e.altKey && e.key === 'n') {
                const navigation = document.querySelector('nav') || document.querySelector('#navigation');
                if (navigation) {
                    (navigation as HTMLElement).focus();
                }
            }

            // Open accessibility panel (Alt+A)
            if (e.altKey && e.key === 'a') {
                setShowPanel(!showPanel);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    };

    const setupScreenReader = () => {
        if (!settings.screenReader) return;

        // Add ARIA labels and descriptions
        const addAriaLabels = () => {
            // Add labels to buttons without text
            document.querySelectorAll('button:not([aria-label])').forEach(button => {
                const icon = button.querySelector('i');
                if (icon && !button.textContent?.trim()) {
                    const iconClass = icon.className;
                    let label = 'Button';
                    
                    if (iconClass.includes('fa-search')) label = 'Search';
                    else if (iconClass.includes('fa-menu')) label = 'Menu';
                    else if (iconClass.includes('fa-close') || iconClass.includes('fa-times')) label = 'Close';
                    else if (iconClass.includes('fa-edit')) label = 'Edit';
                    else if (iconClass.includes('fa-delete') || iconClass.includes('fa-trash')) label = 'Delete';
                    
                    button.setAttribute('aria-label', label);
                }
            });

            // Add labels to form inputs
            document.querySelectorAll('input:not([aria-label]):not([id])').forEach(input => {
                const placeholder = (input as HTMLInputElement).placeholder;
                if (placeholder) {
                    input.setAttribute('aria-label', placeholder);
                }
            });

            // Add landmarks
            const main = document.querySelector('main');
            if (main && !main.getAttribute('role')) {
                main.setAttribute('role', 'main');
            }

            const nav = document.querySelector('nav');
            if (nav && !nav.getAttribute('role')) {
                nav.setAttribute('role', 'navigation');
            }
        };

        addAriaLabels();

        // Announce page changes
        const announcePageChange = (message: string) => {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = message;
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        };

        // Monitor route changes
        let currentPath = window.location.pathname;
        const observer = new MutationObserver(() => {
            if (window.location.pathname !== currentPath) {
                currentPath = window.location.pathname;
                announcePageChange(`Navigated to ${document.title}`);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    };

    const increaseFontSize = () => {
        setSettings(prev => ({ 
            ...prev, 
            fontSize: Math.min(prev.fontSize + 2, 24) 
        }));
    };

    const decreaseFontSize = () => {
        setSettings(prev => ({ 
            ...prev, 
            fontSize: Math.max(prev.fontSize - 2, 12) 
        }));
    };

    const resetFontSize = () => {
        setSettings(prev => ({ ...prev, fontSize: 16 }));
    };

    const toggleContrast = () => {
        const modes: AccessibilitySettings['contrast'][] = ['normal', 'high', 'dark'];
        const currentIndex = modes.indexOf(settings.contrast);
        const nextIndex = (currentIndex + 1) % modes.length;
        setSettings(prev => ({ ...prev, contrast: modes[nextIndex] }));
    };

    const toggleReducedMotion = () => {
        setSettings(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
    };

    const toggleScreenReader = () => {
        setSettings(prev => ({ ...prev, screenReader: !prev.screenReader }));
    };

    const toggleKeyboardNavigation = () => {
        setSettings(prev => ({ ...prev, keyboardNavigation: !prev.keyboardNavigation }));
    };

    const changeColorBlindMode = (mode: AccessibilitySettings['colorBlindMode']) => {
        setSettings(prev => ({ ...prev, colorBlindMode: mode }));
    };

    return (
        <>
            {children}
            
            {/* Accessibility Button */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="fixed top-4 left-4 bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color p-3 rounded-full shadow-lg z-50 transition-colors"
                aria-label="Open accessibility options"
                title="Accessibility Options (Alt+A)"
            >
                <i className="fas fa-universal-access text-xl"></i>
            </button>

            {/* Accessibility Panel */}
            {showPanel && (
                <div className="fixed top-16 left-4 bg-secondary-dark border border-border-color rounded-lg shadow-xl z-50 p-6 max-w-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">إعدادات إمكانية الوصول</h3>
                        <button
                            onClick={() => setShowPanel(false)}
                            className="text-text-secondary hover:text-text-primary transition-colors"
                            aria-label="Close accessibility panel"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Font Size */}
                        <div>
                            <label className="block text-text-secondary text-sm mb-2">حجم الخط</label>
                            <div className="flex items-center space-x-2 space-x-reverse">
                                <button
                                    onClick={decreaseFontSize}
                                    className="bg-primary-dark hover:bg-border-color text-text-primary px-3 py-1 rounded transition-colors"
                                    aria-label="Decrease font size"
                                >
                                    A-
                                </button>
                                <span className="text-text-primary text-sm flex-1 text-center">
                                    {settings.fontSize}px
                                </span>
                                <button
                                    onClick={increaseFontSize}
                                    className="bg-primary-dark hover:bg-border-color text-text-primary px-3 py-1 rounded transition-colors"
                                    aria-label="Increase font size"
                                >
                                    A+
                                </button>
                                <button
                                    onClick={resetFontSize}
                                    className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-3 py-1 rounded transition-colors"
                                    aria-label="Reset font size"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Contrast */}
                        <div>
                            <label className="block text-text-secondary text-sm mb-2">التباين</label>
                            <button
                                onClick={toggleContrast}
                                className="w-full bg-primary-dark hover:bg-border-color text-text-primary px-3 py-2 rounded transition-colors text-left"
                            >
                                {settings.contrast === 'normal' && 'عادي'}
                                {settings.contrast === 'high' && 'عالي'}
                                {settings.contrast === 'dark' && 'داكن'}
                            </button>
                        </div>

                        {/* Color Blind Mode */}
                        <div>
                            <label className="block text-text-secondary text-sm mb-2">وضع عمى الألوان</label>
                            <select
                                value={settings.colorBlindMode}
                                onChange={(e) => changeColorBlindMode(e.target.value as AccessibilitySettings['colorBlindMode'])}
                                className="w-full bg-primary-dark border border-border-color rounded px-3 py-2 text-text-primary form-select"
                            >
                                <option value="none">عادي</option>
                                <option value="protanopia">Protanopia</option>
                                <option value="deuteranopia">Deuteranopia</option>
                                <option value="tritanopia">Tritanopia</option>
                            </select>
                        </div>

                        {/* Motion */}
                        <div>
                            <label className="flex items-center space-x-3 space-x-reverse">
                                <input
                                    type="checkbox"
                                    checked={settings.reducedMotion}
                                    onChange={toggleReducedMotion}
                                    className="form-checkbox"
                                />
                                <span className="text-text-primary">تقليل الحركة</span>
                            </label>
                        </div>

                        {/* Screen Reader */}
                        <div>
                            <label className="flex items-center space-x-3 space-x-reverse">
                                <input
                                    type="checkbox"
                                    checked={settings.screenReader}
                                    onChange={toggleScreenReader}
                                    className="form-checkbox"
                                />
                                <span className="text-text-primary">دعم قارئ الشاشة</span>
                            </label>
                        </div>

                        {/* Keyboard Navigation */}
                        <div>
                            <label className="flex items-center space-x-3 space-x-reverse">
                                <input
                                    type="checkbox"
                                    checked={settings.keyboardNavigation}
                                    onChange={toggleKeyboardNavigation}
                                    className="form-checkbox"
                                />
                                <span className="text-text-primary">التنقل بلوحة المفاتيح</span>
                            </label>
                        </div>
                    </div>

                    {/* Keyboard Shortcuts */}
                    <div className="mt-6 pt-4 border-t border-border-color">
                        <h4 className="text-sm font-medium text-text-primary mb-2">اختصارات لوحة المفاتيح</h4>
                        <div className="text-xs text-text-secondary space-y-1">
                            <div>Alt + M: الانتقال للمحتوى الرئيسي</div>
                            <div>Alt + N: الانتقال للتنقل</div>
                            <div>Alt + A: فتح إعدادات إمكانية الوصول</div>
                            <div>Tab: التنقل للأمام</div>
                            <div>Shift + Tab: التنقل للخلف</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Skip Links */}
            <div className="sr-only">
                <a href="#main-content" className="skip-link">
                    تخطي إلى المحتوى الرئيسي
                </a>
                <a href="#navigation" className="skip-link">
                    تخطي إلى التنقل
                </a>
            </div>

            {/* Screen Reader Announcements */}
            <div aria-live="polite" aria-atomic="true" className="sr-only"></div>
            <div aria-live="assertive" aria-atomic="true" className="sr-only"></div>
        </>
    );
};

export default AccessibilityEnhancer;