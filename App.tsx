
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { auth, database, getCommunityPosts, approveCommunityPost, addCommunityPost, saveConversation, getUserConversations, addPurchase, getUserPurchases } from './services/firebase';
import { getChatbotResponse, analyzeChatForLeadQualification, getAiConsultation, getBrainstormResponse } from './services/gemini';
import type { User } from 'firebase/auth';
import { translations, servicesData, projectsData, ADMIN_EMAIL } from './constants';
import { CommunityPost, Project, Service, ConsultationResponse, SavedConversation, PurchaseRecord } from './types';

const N8N_WEBHOOK_URL = 'https://blackbox5577m.app.n8n.cloud/webhook-test/77c07039-baf3-48df-8762-7e661ff74f0b';

// --- STYLING CONSTANTS ---
const navLinkBaseClasses = "text-text-secondary font-semibold transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-neon-cyan after:to-neon-blue after:transition-all after:duration-300 hover:text-text-primary hover:drop-shadow-[0_0_5px_var(--tw-shadow-color)] hover:shadow-neon-cyan hover:after:w-full";
const navLinkActiveClasses = "text-text-primary drop-shadow-[0_0_5px_var(--tw-shadow-color)] shadow-neon-cyan after:w-full";
const authBtnClasses = "px-4 py-1.5 border border-neon-cyan text-neon-cyan rounded-full text-sm font-semibold transition-all duration-300 hover:bg-neon-cyan hover:text-bg-color hover:shadow-[0_0_15px_var(--tw-shadow-color)] shadow-neon-cyan";
const logoutBtnClasses = "border-red-500 text-red-500 hover:bg-red-500";
const ctaBtnClasses = "px-6 py-3 rounded-lg font-bold text-bg-color bg-gradient-to-r from-neon-cyan to-neon-blue transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_var(--tw-shadow-color)] shadow-neon-blue/50 disabled:opacity-50 disabled:cursor-not-allowed";
const ctaBtnSecondaryClasses = "bg-none border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-bg-color";
const formInputClasses = "w-full bg-primary-dark border border-border-color rounded-lg px-4 py-3 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-neon-blue transition-colors";
const formCheckboxClasses = "w-5 h-5 bg-primary-dark border-border-color text-neon-cyan rounded focus:ring-neon-blue focus:ring-offset-bg-color cursor-pointer";
const submitBtnClasses = "w-full px-6 py-4 rounded-lg font-bold text-bg-color bg-gradient-to-r from-neon-cyan to-neon-blue transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_var(--tw-shadow-color)] shadow-neon-blue/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100";


// --- CUSTOM HOOK for Scroll Animation ---
const useOnScreen = (options: IntersectionObserverInit = { threshold: 0.1 }) => {
    const ref = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(element);
            }
        }, options);

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, []);

    return [ref, isVisible] as const;
};


// --- CONTEXTS ---
interface LanguageContextType {
    lang: 'ar' | 'en';
    setLang: (lang: 'ar' | 'en') => void;
    t: (key: string) => string;
    dir: 'rtl' | 'ltr';
}
const LanguageContext = createContext<LanguageContextType | null>(null);
const useLanguage = () => useContext(LanguageContext)!;

const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lang, setLang] = useState<'ar' | 'en'>('ar');

    useEffect(() => {
        const savedLang = localStorage.getItem('preferredLanguage') as 'ar' | 'en';
        const browserLang = navigator.language.split('-')[0];
        setLang(savedLang || (browserLang === 'ar' ? 'ar' : 'en'));
    }, []);

    const handleSetLang = (newLang: 'ar' | 'en') => {
        setLang(newLang);
        localStorage.setItem('preferredLanguage', newLang);
        document.documentElement.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.body.className = `bg-bg-color text-text-primary overflow-x-hidden font-${newLang === 'ar' ? 'tajawal' : 'poppins'}`;
    };
    
    useEffect(() => {
        handleSetLang(lang);
    }, [lang]);

    const t = useCallback((key: string) => {
        return translations[lang][key] || key;
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
            {children}
        </LanguageContext.Provider>
    );
};


interface AuthContextType {
    currentUser: User | null;
    isAdmin: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);
const useAuth = () => useContext(AuthContext)!;

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const isAdmin = currentUser?.email === ADMIN_EMAIL;

    const value = { currentUser, isAdmin };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

// --- MAIN APP & LAYOUT ---
export default function App() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <HashRouter>
                    <MainLayout />
                </HashRouter>
            </AuthProvider>
        </LanguageProvider>
    );
}

const MainLayout: React.FC = () => {
    return (
        <>
            <Header />
            <main>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                </Routes>
            </main>
            <Chatbot />
            <Footer />
        </>
    );
};

// --- COMPONENTS ---

const Header: React.FC = () => {
    const { lang, setLang, t, dir } = useLanguage();
    const { currentUser, isAdmin } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const location = useLocation();

    const getNavLinks = () => {
        const links = [
            { to: "/#about", key: "nav_about" },
            { to: "/#services", key: "nav_services" },
            { to: "/#projects", key: "nav_projects" },
            { to: "/community", key: "nav_community" },
        ];
        if (currentUser) {
            links.push({ to: "/dashboard", key: "nav_dashboard" });
        }
        if (isAdmin) {
            links.push({ to: "/admin", key: "nav_admin" });
        }
        links.push({ to: "/#contact", key: "nav_contact" });
        return links;
    }

    const navLinks = getNavLinks();

    const NavLinkItem: React.FC<{ to: string, children: React.ReactNode, onClick?: () => void }> = ({ to, children, onClick }) => {
        const isHomePageLink = to.startsWith('/#');
        const targetId = isHomePageLink ? to.substring(2) : '';

        const handleClick = (e: React.MouseEvent) => {
            if (onClick) onClick();
            if (isHomePageLink && location.pathname === '/') {
                e.preventDefault();
                document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
            }
        };

        const getClassName = ({isActive}: {isActive: boolean}) => {
             const isHashActive = location.hash === `#${targetId}`;
             const finalIsActive = isHomePageLink ? (location.pathname === '/' && isHashActive) : isActive;
             return `${navLinkBaseClasses} ${finalIsActive ? navLinkActiveClasses : ''}`;
        }
        
        return <NavLink to={to} onClick={handleClick} className={getClassName}>{children}</NavLink>;
    }


    const closeMenu = () => setIsMenuOpen(false);

    return (
        <>
            <header className="fixed top-0 left-0 w-full h-[70px] z-40 bg-bg-color/80 backdrop-blur-lg border-b border-border-color flex items-center">
                <nav className="container mx-auto px-5 flex justify-between items-center w-full">
                    <NavLink to="/#hero" className="text-xl font-bold text-text-primary" onClick={() => location.pathname === '/' && document.getElementById('hero')?.scrollIntoView({behavior: 'smooth'})}>{t('nav_logo')}</NavLink>
                    
                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-8">
                        <ul className="flex gap-8">
                           {navLinks.map(link => (
                                <li key={link.key}>
                                    <NavLinkItem to={link.to}>{t(link.key)}</NavLinkItem>
                                </li>
                           ))}
                        </ul>
                        <div className="flex items-center gap-4">
                            {/* Auth Buttons */}
                            {currentUser ? (
                                <button onClick={() => auth.signOut()} className={`${authBtnClasses} ${logoutBtnClasses}`}>{t('nav_logout')}</button>
                            ) : (
                                <button onClick={() => setIsAuthModalOpen(true)} className={authBtnClasses}>{t('nav_login')}</button>
                            )}
                            {/* Lang Switcher */}
                            <div className="flex border border-border-color rounded-full overflow-hidden">
                                <button onClick={() => setLang('en')} className={`px-3 py-1 text-sm font-semibold transition-colors ${lang === 'en' ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-bg-color' : 'text-text-secondary'}`}>EN</button>
                                <button onClick={() => setLang('ar')} className={`px-3 py-1 text-sm font-semibold transition-colors ${lang === 'ar' ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-bg-color' : 'text-text-secondary'}`}>AR</button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Toggle */}
                    <div className="lg:hidden">
                        <button onClick={() => setIsMenuOpen(true)} className="text-2xl text-text-primary">
                            <i className="fas fa-bars"></i>
                        </button>
                    </div>
                </nav>
            </header>

            {/* Mobile Side Nav */}
            <div className={`fixed top-0 h-full w-3/4 max-w-sm bg-primary-dark/95 backdrop-blur-lg z-50 transition-transform duration-300 ease-in-out ${dir === 'ltr' ? (isMenuOpen ? 'translate-x-0' : '-translate-x-full') : (isMenuOpen ? 'translate-x-0' : 'translate-x-full')} ${dir === 'ltr' ? 'left-0' : 'right-0'}`}>
                <div className="p-8">
                    <button onClick={closeMenu} className={`absolute top-5 text-2xl text-text-primary ${dir === 'ltr' ? 'right-5' : 'left-5'}`}>
                        <i className="fas fa-times"></i>
                    </button>
                    <ul className="flex flex-col gap-8 mt-16">
                         {navLinks.map(link => (
                            <li key={link.key}>
                                <NavLinkItem to={link.to} onClick={closeMenu}>{t(link.key)}</NavLinkItem>
                            </li>
                       ))}
                    </ul>
                     <div className="mt-10 flex flex-col items-start gap-4">
                            {currentUser ? (
                                <button onClick={() => { auth.signOut(); closeMenu(); }} className={`${authBtnClasses} ${logoutBtnClasses} w-full text-start`}>{t('nav_logout')}</button>
                            ) : (
                                <div className="flex gap-4 w-full">
                                    <button onClick={() => { setIsAuthModalOpen(true); closeMenu(); }} className={`${authBtnClasses} w-full`}>{t('nav_login')}</button>
                                    <button onClick={() => { setIsAuthModalOpen(true); closeMenu(); }} className={`${authBtnClasses} w-full`}>{t('nav_signup')}</button>
                                </div>
                            )}
                            <div className="flex border border-border-color rounded-full overflow-hidden mt-4">
                                <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-sm font-semibold transition-colors ${lang === 'en' ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-bg-color' : 'text-text-secondary'}`}>EN</button>
                                <button onClick={() => setLang('ar')} className={`px-4 py-1.5 text-sm font-semibold transition-colors ${lang === 'ar' ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-bg-color' : 'text-text-secondary'}`}>AR</button>
                            </div>
                        </div>
                </div>
            </div>
            {isMenuOpen && <div onClick={closeMenu} className="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>}
            
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </>
    );
};


const Section: React.FC<{id: string, children: React.ReactNode, className?: string}> = ({ id, children, className }) => {
    const [ref, isVisible] = useOnScreen({ threshold: 0.1 });
    
    return (
        <section 
            ref={ref}
            id={id} 
            className={`py-24 border-b border-border-color transition-all duration-1000 ease-out ${className || ''} ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
        >
            {children}
        </section>
    );
}

const SectionTitle: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <h2 className="text-center text-4xl mb-16 font-extrabold bg-gradient-to-r from-neon-cyan to-neon-blue bg-clip-text text-transparent relative pb-4">
            {children}
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-neon-cyan to-neon-blue rounded"></span>
        </h2>
    )
}

const Footer: React.FC = () => {
    const { t } = useLanguage();
    const socialLinks = [
        { href: "https://github.com/Mohammed5778", icon: "fab fa-github" },
        { href: "https://linkedin.com/in/your-profile", icon: "fab fa-linkedin" },
        { href: "https://huggingface.co/Mabda724", icon: "fas fa-robot" },
    ];

    return (
        <footer className="py-10 text-center bg-primary-dark">
            <div className="container mx-auto px-5">
                <div className="mb-5 flex justify-center gap-8">
                    {socialLinks.map(link => (
                        <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="text-text-secondary text-2xl transition-colors hover:text-neon-cyan hover:drop-shadow-[0_0_8px_var(--tw-shadow-color)] shadow-neon-cyan">
                            <i className={link.icon}></i>
                        </a>
                    ))}
                </div>
                <p className="text-text-secondary text-sm">{t('footer_copyright')}</p>
            </div>
        </footer>
    );
};


const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { t } = useLanguage();

    useEffect(() => {
        if (isOpen) {
            setError('');
            setEmail('');
            setPassword('');
            setIsLoginView(true);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLoginView) {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-primary-dark p-8 md:p-10 rounded-xl border border-border-color w-11/12 max-w-md relative text-center shadow-lg shadow-neon-blue/10" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-text-secondary hover:text-text-primary transition-colors"><i className="fas fa-times"></i></button>
                <h2 className="text-3xl mb-8 font-bold bg-gradient-to-r from-neon-cyan to-neon-blue bg-clip-text text-transparent">
                    {t(isLoginView ? 'modal_login_title' : 'modal_signup_title')}
                </h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('contact_form_email')} className={formInputClasses} required />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('modal_password')} className={formInputClasses} required />
                    <button type="submit" className={submitBtnClasses}>{t(isLoginView ? 'modal_login_btn' : 'modal_signup_btn')}</button>
                </form>
                <p className="mt-6 text-sm text-text-secondary">
                    {t(isLoginView ? 'modal_switch_to_signup_text' : 'modal_switch_to_login_text')}{' '}
                    <button onClick={() => setIsLoginView(!isLoginView)} className="font-bold text-neon-cyan hover:underline">{t(isLoginView ? 'modal_switch_to_signup_link' : 'modal_switch_to_login_link')}</button>
                </p>
            </div>
        </div>
    );
};

// --- CHATBOT ---

type ChatHistoryItem = { role: 'user' | 'model'; parts: { text: string }[] };
type ChatbotView = 'main' | 'services' | 'serviceDetail' | 'brainstormInput' | 'brainstormResult' | 'requestService' | 'requestSuccess' | 'consultationInput' | 'consultationResult';

const Chatbot: React.FC = () => {
    const { t, lang, dir } = useLanguage();
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<ChatbotView>('main');
    const [serviceDetail, setServiceDetail] = useState<{ title: string; content: string } | null>(null);
    const [brainstormIdea, setBrainstormIdea] = useState('');
    const [brainstormResult, setBrainstormResult] = useState('');
    const [consultationResult, setConsultationResult] = useState<ConsultationResponse | null>(null);
    const [consultationProblem, setConsultationProblem] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showInitialPopup, setShowInitialPopup] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const [requestFormData, setRequestFormData] = useState({ name: '', email: '', phone: '', message: '', contactMethod: [] as string[] });
    const [isConvoSaved, setIsConvoSaved] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    const resetChat = () => {
        setView('main');
        setServiceDetail(null);
        setBrainstormIdea('');
        setBrainstormResult('');
        setConsultationResult(null);
        setConsultationProblem('');
        setChatHistory([]);
        setRequestFormData({ name: '', email: '', phone: '', message: '', contactMethod: [] });
        setIsConvoSaved(false);
    }

    const handleCloseChat = useCallback(async () => {
        setIsOpen(false);
        if (chatHistory.length > 0) {
            try {
                const analysis = await analyzeChatForLeadQualification(chatHistory);
                if (analysis?.isHotLead) {
                    const hotLeadData = {
                        leadType: 'Hot Lead - Auto Detected',
                        purchaseIntentScore: analysis.purchaseIntentScore,
                        businessSummary: analysis.businessSummary,
                        leadName: analysis.leadName || 'N/A',
                        leadEmail: analysis.leadEmail || 'N/A',
                        leadPhone: analysis.leadPhone || 'N/A',
                        timestamp: new Date().toISOString()
                    };
                    await fetch(N8N_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(hotLeadData),
                        mode: 'no-cors'
                    });
                }
            } catch (error) {
                console.error("Failed to process or send hot lead webhook:", error);
            }
        }
        resetChat();
    }, [chatHistory]);
    
    useEffect(() => {
        const timer = setTimeout(() => setShowInitialPopup(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [view, serviceDetail, isLoading, consultationResult, brainstormResult]);
    
    useEffect(() => {
        setIsConvoSaved(false);
    }, [view])

    const handleAction = (action: 'main' | 'services' | 'projects' | 'contact' | 'consultation', payload?: any) => {
        if (action === 'main') {
            setView('main');
            setServiceDetail(null);
        } else if (action === 'services') {
            setView('services');
        } else if (action === 'consultation') {
            setView('consultationInput');
        } else if (action === 'projects' || action === 'contact') {
            document.getElementById(action)?.scrollIntoView({ behavior: 'smooth' });
            handleCloseChat();
        }
    };
    
    const handleShowServiceDetail = async (service: Service) => {
        setView('serviceDetail');
        setIsLoading(true);
        const userPrompt = `Tell me about the "${service.title[lang]}" service.`;
        const aiPrompt = `Provide a concise, engaging, and persuasive description for the following service: "${service.title[lang]}". Explain its value and benefits for a potential client. Frame it as an investment using the 'leaky bucket' analogy where appropriate.`;
        
        setChatHistory(prev => [...prev, { role: 'user', parts: [{ text: userPrompt }] }]);
        setServiceDetail({ title: service.title[lang], content: '' });

        const responseText = await getChatbotResponse(aiPrompt, [], lang);
        setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: responseText }] }]);
        setServiceDetail({ title: service.title[lang], content: responseText });
        setIsLoading(false);
    };

    const handleBrainstormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setView('brainstormResult');
        setBrainstormResult('');

        setChatHistory(prev => [...prev, { role: 'user', parts: [{ text: `User idea for ${serviceDetail?.title}: ${brainstormIdea}` }] }]);
        const response = await getBrainstormResponse(brainstormIdea, serviceDetail?.title || '', lang);
        setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: response }] }]);
        
        setBrainstormResult(response);
        setIsLoading(false);
    };

    const handleDiscussIdea = () => {
        const ideaText = `Service: ${serviceDetail?.title}\n\nUser Idea:\n${brainstormIdea}\n\nAI Feedback:\n${brainstormResult}`;
        sessionStorage.setItem('prefillContactForm', ideaText);
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
        handleCloseChat();
    };
    
     const handleSaveBrainstorm = async () => {
        if (!currentUser || !brainstormResult) return;
        try {
            await saveConversation(currentUser.uid, {
                type: 'brainstorm',
                userInput: brainstormIdea,
                aiResponse: brainstormResult,
                serviceTitle: serviceDetail?.title || 'General'
            });
            setIsConvoSaved(true);
        } catch (error) {
            console.error("Failed to save brainstorm:", error);
        }
    };

    const handleBotCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setRequestFormData(prev => {
            const newMethods = checked
                ? [...prev.contactMethod, value]
                : prev.contactMethod.filter(m => m !== value);
            return {...prev, contactMethod: newMethods};
        });
    }

    const handleServiceRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const serviceRequestData = {
            leadType: 'Service Request from Bot',
            serviceType: serviceDetail?.title,
            ...requestFormData,
            timestamp: new Date().toISOString()
        };
        
        try {
            await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serviceRequestData),
                mode: 'no-cors'
            });
            setView('requestSuccess');
        } catch (error) {
            console.error("Service request submission error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleConsultationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setView('consultationResult');
        setConsultationResult(null);
        setChatHistory(prev => [...prev, { role: 'user', parts: [{ text: `Business Problem: ${consultationProblem}`}] }])
        
        const result = await getAiConsultation(consultationProblem);
        if (result) {
            setConsultationResult(result);
            setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: `Generated Proposal: ${JSON.stringify(result)}`}] }])
        } else {
            setView('consultationInput'); 
        }
        setIsLoading(false);
    }
    
    const handleSaveConsultation = async () => {
        if (!currentUser || !consultationResult) return;
        try {
            await saveConversation(currentUser.uid, {
                type: 'consultation',
                userInput: consultationProblem,
                aiResponse: consultationResult
            });
            setIsConvoSaved(true);
        } catch (error) {
            console.error("Failed to save consultation:", error);
        }
    };

    const handleDiscussProposal = () => {
        if (!consultationResult) return;
        const proposalText = `${t('bot_proposal_title')}\n\n${t('bot_proposal_problem')}:\n${consultationResult.problemAnalysis}\n\n${t('bot_proposal_solution')}:\n${consultationResult.proposedSolution}\n\n${t('bot_proposal_services')}:\n- ${consultationResult.suggestedServices.join('\n- ')}`;
        sessionStorage.setItem('prefillContactForm', proposalText);
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
        handleCloseChat();
    };
    
    const renderContent = () => {
        const optionButtonClasses = "w-full bg-secondary-dark border border-border-color text-neon-cyan text-sm px-3 py-2 rounded-lg hover:bg-neon-cyan hover:text-bg-color transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed";
        const backButtonClasses = "w-full bg-transparent border border-text-secondary text-text-secondary text-sm px-3 py-2 rounded-lg hover:bg-text-secondary hover:text-bg-color transition-colors text-center";

        const loadingSpinner = (text: string) => (
            <div className="flex flex-col items-center justify-center gap-3 text-center text-text-secondary">
                 <div className="flex items-center gap-1.5 py-2">
                    <span className="h-2 w-2 bg-neon-cyan rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-neon-cyan rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-neon-cyan rounded-full animate-bounce"></span>
                </div>
                <p className="text-sm">{text}</p>
            </div>
        );

        switch(view) {
            case 'main':
                return (
                    <div className="flex flex-col gap-3">
                         <div className="flex w-full justify-start">
                            <div className="max-w-[85%] px-4 py-2 rounded-xl bg-secondary-dark text-text-primary rounded-bl-none">
                                <p className="text-sm break-words">{t('bot_welcome')}</p>
                            </div>
                        </div>
                        <button onClick={() => handleAction('consultation')} className={`${optionButtonClasses} !bg-gradient-to-r !from-neon-cyan !to-neon-blue !text-bg-color !font-bold`}>{t('bot_option_consultation')}</button>
                        <button onClick={() => handleAction('services')} className={optionButtonClasses}>{t('bot_option_services')}</button>
                        <button onClick={() => handleAction('projects')} className={optionButtonClasses}>{t('bot_option_projects')}</button>
                        <button onClick={() => handleAction('contact')} className={optionButtonClasses}>{t('bot_option_hire')}</button>
                    </div>
                );

            case 'services':
                return (
                    <div className="flex flex-col gap-2">
                        {servicesData.map(service => (
                            <button key={service.title.en} onClick={() => handleShowServiceDetail(service)} className={optionButtonClasses}>{service.title[lang]}</button>
                        ))}
                        <button onClick={() => handleAction('main')} className={backButtonClasses}>
                           <i className={`fas ${dir === 'rtl' ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i> {t('bot_back')}
                        </button>
                    </div>
                );
            
            case 'serviceDetail':
                return (
                    <div className="flex flex-col gap-3">
                        <div className="flex w-full justify-start">
                            <div className="max-w-[100%] px-4 py-3 rounded-xl bg-secondary-dark text-text-primary">
                                <h4 className="font-bold text-base text-neon-cyan mb-2">{serviceDetail?.title}</h4>
                                {isLoading ? loadingSpinner('') : (
                                    <p className="text-sm break-words whitespace-pre-wrap">{serviceDetail?.content}</p>
                                )}
                            </div>
                        </div>
                        {!isLoading && (
                            <div className="flex flex-col gap-2">
                                <button onClick={() => { setBrainstormIdea(''); setView('brainstormInput'); }} className={optionButtonClasses}>{t('bot_brainstorm_idea')}</button>
                                <button onClick={() => setView('requestService')} className={`${optionButtonClasses} !bg-gradient-to-r !from-neon-cyan !to-neon-blue !text-bg-color !font-bold`}>{t('bot_request_this_service')}</button>
                                <button onClick={() => handleAction('services')} className={backButtonClasses}>{t('bot_back_to_services')}</button>
                            </div>
                        )}
                    </div>
                );

            case 'brainstormInput':
                 return (
                    <div className="flex flex-col gap-3">
                        <div className="max-w-[100%] px-4 py-3 rounded-xl bg-secondary-dark text-text-primary">
                            <h4 className="font-bold text-base text-neon-cyan mb-2">{t('bot_brainstorm_idea')}</h4>
                             <form onSubmit={handleBrainstormSubmit} className="flex flex-col gap-3">
                                <textarea 
                                    value={brainstormIdea} 
                                    onChange={e => setBrainstormIdea(e.target.value)} 
                                    placeholder={t('bot_brainstorm_prompt')} 
                                    className={`${formInputClasses} min-h-[120px] !py-2 !text-sm`} 
                                    required
                                ></textarea>
                                <button type="submit" className={`${optionButtonClasses} bg-gradient-to-r from-neon-cyan to-neon-blue !text-bg-color font-bold`} disabled={isLoading}>
                                    {t('bot_brainstorm_submit')}
                                </button>
                            </form>
                        </div>
                        <button onClick={() => setView('serviceDetail')} className={backButtonClasses}>{t('bot_back')}</button>
                    </div>
                );
            
            case 'brainstormResult':
                 return (
                    <div className="flex flex-col gap-3">
                         <div className="flex w-full justify-start">
                            <div className="max-w-[100%] px-4 py-3 rounded-xl bg-secondary-dark text-text-primary">
                                <h4 className="font-bold text-base text-neon-cyan mb-2">{t('bot_brainstorm_response_title')}</h4>
                                {isLoading ? loadingSpinner(t('bot_brainstorm_analyzing')) : (
                                    <p className="text-sm break-words whitespace-pre-wrap">{brainstormResult}</p>
                                )}
                            </div>
                        </div>
                        {!isLoading && (
                            <div className="space-y-2">
                               {currentUser && <button onClick={handleSaveBrainstorm} disabled={isConvoSaved} className={optionButtonClasses}>{isConvoSaved ? t('dashboard_convo_saved') : t('dashboard_save_convo')}</button>}
                               <button onClick={handleDiscussIdea} className={`${optionButtonClasses} !bg-gradient-to-r !from-neon-cyan !to-neon-blue !text-bg-color !font-bold`}>{t('bot_discuss_idea')}</button>
                               <button onClick={() => setView('brainstormInput')} className={backButtonClasses}>{t('bot_back')}</button>
                            </div>
                        )}
                    </div>
                );
            
            case 'requestService':
                return (
                    <div className="flex flex-col gap-3">
                        <div className="max-w-[100%] px-4 py-3 rounded-xl bg-secondary-dark text-text-primary">
                            <h4 className="font-bold text-base text-neon-cyan mb-2">{t('bot_request_service_title')}</h4>
                            <p className="text-sm mb-4">{t('bot_request_service_prompt')}</p>
                            <form onSubmit={handleServiceRequestSubmit} className="flex flex-col gap-4">
                                <textarea value={requestFormData.message} onChange={e => setRequestFormData(prev => ({...prev, message: e.target.value}))} placeholder={t('bot_request_service_message_placeholder')} className={formInputClasses + " !py-2 !text-sm min-h-[100px]"} required />
                                <input type="text" value={requestFormData.name} onChange={e => setRequestFormData(prev => ({...prev, name: e.target.value}))} placeholder={t('bot_request_service_name_placeholder')} className={formInputClasses + " !py-2 !text-sm"} required />
                                <input type="email" value={requestFormData.email} onChange={e => setRequestFormData(prev => ({...prev, email: e.target.value}))} placeholder={t('bot_request_service_email_placeholder')} className={formInputClasses + " !py-2 !text-sm"} required />
                                <input type="tel" value={requestFormData.phone} onChange={e => setRequestFormData(prev => ({...prev, phone: e.target.value}))} placeholder={t('bot_request_service_phone_placeholder')} className={formInputClasses + " !py-2 !text-sm"} />
                                 <fieldset className="border border-border-color p-3 rounded-lg">
                                    <legend className="px-2 text-xs text-text-secondary">{t('contact_form_contact_method')}</legend>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" name="contactMethod" value="Phone Call" onChange={handleBotCheckboxChange} className={formCheckboxClasses} />{t('contact_phone_call')}</label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" name="contactMethod" value="WhatsApp" onChange={handleBotCheckboxChange} className={formCheckboxClasses} />{t('contact_whatsapp')}</label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" name="contactMethod" value="Zoom" onChange={handleBotCheckboxChange} className={formCheckboxClasses} />{t('contact_zoom')}</label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" name="contactMethod" value="Discord" onChange={handleBotCheckboxChange} className={formCheckboxClasses} />{t('contact_discord')}</label>
                                    </div>
                                </fieldset>
                                <button type="submit" className={`${optionButtonClasses} bg-gradient-to-r from-neon-cyan to-neon-blue !text-bg-color font-bold`} disabled={isLoading}>
                                    {isLoading ? t('form_sending') : t('bot_request_service_submit')}
                                </button>
                            </form>
                        </div>
                        <button onClick={() => setView('serviceDetail')} className={backButtonClasses}>{t('bot_back')}</button>
                    </div>
                );
            
            case 'requestSuccess':
                 return (
                     <div className="flex flex-col gap-3 items-center text-center">
                         <div className="text-5xl text-green-400 mb-3"><i className="fas fa-check-circle"></i></div>
                         <p className="text-text-primary font-semibold">{t('bot_request_success')}</p>
                         <button onClick={handleCloseChat} className={optionButtonClasses + " mt-4"}>Close</button>
                     </div>
                 );

            case 'consultationInput':
                return (
                     <div className="flex flex-col gap-3">
                        <div className="max-w-[100%] px-4 py-3 rounded-xl bg-secondary-dark text-text-primary">
                            <h4 className="font-bold text-base text-neon-cyan mb-2">{t('bot_consultation_title')}</h4>
                            <form onSubmit={handleConsultationSubmit} className="flex flex-col gap-3">
                                <textarea 
                                    value={consultationProblem} 
                                    onChange={e => setConsultationProblem(e.target.value)} 
                                    placeholder={t('bot_consultation_prompt')} 
                                    className={`${formInputClasses} min-h-[160px] !py-2 !text-sm`} 
                                    required
                                ></textarea>
                                <button type="submit" className={`${optionButtonClasses} bg-gradient-to-r from-neon-cyan to-neon-blue !text-bg-color font-bold`} disabled={isLoading}>
                                    {t('bot_consultation_submit')}
                                </button>
                            </form>
                        </div>
                        <button onClick={() => handleAction('main')} className={backButtonClasses}>{t('bot_back')}</button>
                    </div>
                );
            
            case 'consultationResult':
                if (isLoading) {
                    return loadingSpinner(t('bot_consultation_analyzing'));
                }
                if (!consultationResult) {
                    return <p>Error generating proposal.</p>
                }
                return (
                    <div className="flex flex-col gap-3">
                        <div className="max-w-[100%] px-4 py-3 rounded-xl bg-secondary-dark text-text-primary">
                            <h4 className="font-bold text-base text-neon-cyan mb-3">{t('bot_proposal_title')}</h4>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <h5 className="font-bold text-text-primary mb-1">{t('bot_proposal_problem')}</h5>
                                    <p className="text-text-secondary whitespace-pre-wrap">{consultationResult.problemAnalysis}</p>
                                </div>
                                 <div>
                                    <h5 className="font-bold text-text-primary mb-1">{t('bot_proposal_solution')}</h5>
                                    <p className="text-text-secondary whitespace-pre-wrap">{consultationResult.proposedSolution}</p>
                                </div>
                                <div>
                                    <h5 className="font-bold text-text-primary mb-1">{t('bot_proposal_services')}</h5>
                                    <ul className="list-disc list-inside text-text-secondary">
                                        {consultationResult.suggestedServices.map(s => <li key={s}>{s}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                             {currentUser && <button onClick={handleSaveConsultation} disabled={isConvoSaved} className={optionButtonClasses}>{isConvoSaved ? t('dashboard_convo_saved') : t('dashboard_save_convo')}</button>}
                             <button onClick={handleDiscussProposal} className={`${optionButtonClasses} !bg-gradient-to-r !from-neon-cyan !to-neon-blue !text-bg-color !font-bold`}>{t('bot_discuss_proposal')}</button>
                             <button onClick={() => setView('consultationInput')} className={backButtonClasses}>{t('bot_back')}</button>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className={`fixed bottom-5 z-50 ${dir === 'rtl' ? 'left-5' : 'right-5'}`} dir="ltr">
            {/* Chat Window */}
            <div className={`absolute bottom-[75px] w-80 sm:w-96 bg-primary-dark border border-border-color rounded-xl shadow-2xl shadow-neon-blue/20 transition-all duration-300 ease-in-out ${dir === 'rtl' ? 'origin-bottom-left' : 'origin-bottom-right'} ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
                <div className="p-3 border-b border-border-color flex justify-between items-center" dir={dir}>
                    <p className="font-bold text-text-primary flex items-center gap-2">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-neon-cyan"></span></span>
                        Mabda Bot
                    </p>
                    <button onClick={handleCloseChat} className="text-text-secondary hover:text-text-primary transition-colors"><i className="fas fa-times"></i></button>
                </div>
                <div className="h-96 overflow-y-auto p-4" dir={dir}>
                    {renderContent()}
                    <div ref={chatEndRef} />
                </div>
            </div>
            
             {/* Proactive Welcome Popup */}
            <div className={`absolute bottom-[80px] p-3 bg-secondary-dark border border-neon-cyan rounded-lg shadow-lg transition-all duration-300 ${dir === 'rtl' ? 'left-0' : 'right-0'} ${showInitialPopup && !isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`} dir={dir}>
                <div className="flex items-center gap-3">
                    <p className="text-sm text-text-primary">{t('bot_proactive_prompt')}</p>
                    <button onClick={() => { setIsOpen(true); setShowInitialPopup(false); }} className="text-xs font-bold text-neon-cyan whitespace-nowrap">{t('bot_proactive_cta')}</button>
                </div>
            </div>

            {/* FAB */}
            <button onClick={() => isOpen ? handleCloseChat() : setIsOpen(true)} className="w-16 h-16 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-full flex items-center justify-center text-bg-color text-2xl shadow-lg animate-pulse transition-transform duration-300 hover:scale-110">
                <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'} transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
        </div>
    );
};


// --- MODALS ---

const ProjectDetailModal: React.FC<{ project: Project | null; isOpen: boolean; onClose: () => void }> = ({ project, isOpen, onClose }) => {
    const { t, lang, dir } = useLanguage();

    if (!isOpen || !project) return null;

    const SubHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <h3 className="text-2xl font-bold text-neon-cyan mb-4">{children}</h3>
    );
    
    const VisualsGallery: React.FC<{ visuals: Project['visuals'] }> = ({ visuals }) => {
      const [currentIndex, setCurrentIndex] = useState(0);

      if (!visuals || visuals.length === 0) return null;
      
      const currentVisual = visuals[currentIndex];
      
      return (
        <div className="mb-8">
            <div className="relative aspect-video bg-primary-dark rounded-lg overflow-hidden border border-border-color">
                {currentVisual.type === 'image' ? (
                     <img src={currentVisual.url} alt="Project visual" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <img src={currentVisual.url} alt="Video thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-sm hover:bg-white/30 transition-colors">
                                <i className="fas fa-play text-white text-3xl ltr:pl-1 rtl:pr-1"></i>
                            </div>
                        </div>
                        <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">Video Preview</span>
                    </div>
                )}
            </div>
             {visuals.length > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                    {visuals.map((_, index) => (
                        <button key={index} onClick={() => setCurrentIndex(index)} className={`w-3 h-3 rounded-full transition-colors ${currentIndex === index ? 'bg-neon-cyan' : 'bg-border-color hover:bg-text-secondary'}`}></button>
                    ))}
                </div>
            )}
        </div>
      );
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-secondary-dark rounded-xl border border-border-color w-full max-w-4xl h-[90vh] relative shadow-lg shadow-neon-blue/10 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border-color flex justify-between items-center">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-cyan to-neon-blue bg-clip-text text-transparent">{project.title[lang]}</h2>
                    <button onClick={onClose} className="text-2xl text-text-secondary hover:text-text-primary transition-colors"><i className="fas fa-times"></i></button>
                </div>
                <div className="flex-grow overflow-y-auto p-8" dir={dir}>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                        <div className="lg:col-span-3">
                            {/* Visual Proof */}
                            <section className="mb-8">
                                <SubHeading>{t('project_modal_visuals')}</SubHeading>
                                <VisualsGallery visuals={project.visuals} />
                            </section>

                             {/* Testimonial */}
                            <section className="mb-8">
                                <SubHeading>{t('project_modal_testimonial')}</SubHeading>
                                 <blockquote className="bg-primary-dark border-l-4 border-neon-blue p-6 rounded-r-lg italic">
                                    <p className="text-text-primary mb-4">"{project.testimonial.text[lang]}"</p>
                                    <footer className="text-text-secondary font-semibold">— {project.testimonial.author[lang]}</footer>
                                </blockquote>
                            </section>
                        </div>
                        <div className="lg:col-span-2">
                             {/* Problem */}
                            <section className="mb-8">
                                <SubHeading>{t('project_modal_problem')}</SubHeading>
                                <p className="text-text-secondary">{project.problem[lang]}</p>
                            </section>

                            {/* Solution */}
                            <section className="mb-8">
                                <SubHeading>{t('project_modal_solution')}</SubHeading>
                                <p className="text-text-secondary">{project.solution[lang]}</p>
                            </section>

                             {/* Results */}
                            <section className="mb-8">
                                <SubHeading>{t('project_modal_results')}</SubHeading>
                                <div className="space-y-4">
                                    {project.results.map(result => (
                                        <div key={result.label.en} className="flex items-center gap-4 bg-primary-dark p-4 rounded-lg">
                                            <p className="text-4xl font-bold text-neon-blue">{result.value}</p>
                                            <p className="text-text-primary">{result.label[lang]}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            
                            {project.link !== '#' && (
                                <a href={project.link} target="_blank" rel="noopener noreferrer" className={`${ctaBtnClasses} w-full text-center inline-block`}>
                                    {t('project_modal_live_link')} <i className={`fas fa-external-link-alt ltr:ml-2 rtl:mr-2`}></i>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- PAGES ---

const HomePage: React.FC = () => {
    const { t, lang, dir } = useLanguage();
    const [isHeroVisible, setIsHeroVisible] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    
    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            setTimeout(() => {
                document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
        const timer = setTimeout(() => setIsHeroVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const ServicesSection = () => (
        <Section id="services">
            <div className="container mx-auto px-5">
                <SectionTitle>{t('services_title')}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {servicesData.map((service, index) => (
                        <div key={index} className="bg-secondary-dark p-8 rounded-xl border border-border-color text-center transition-all duration-300 transform hover:-translate-y-2 hover:border-neon-cyan hover:shadow-2xl hover:shadow-neon-cyan/10">
                            <div className="text-5xl mb-6 text-neon-cyan"><i className={service.icon}></i></div>
                            <h3 className="text-xl font-bold mb-3">{service.title[lang]}</h3>
                            <p className="text-text-secondary">{service.desc[lang]}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );

    const ProjectsSection = () => {
        const [filter, setFilter] = useState('all');
        const filters = [
            { key: 'all', label: t('filter_all') },
            { key: 'Websites', label: t('filter_websites') },
            { key: 'n8n Workflows', label: t('filter_n8n') }
        ];

        const filteredProjects = projectsData.filter(p => filter === 'all' || p.category.en === filter);

        return (
            <Section id="projects">
                <div className="container mx-auto px-5">
                    <SectionTitle>{t('projects_title')}</SectionTitle>
                    <div className="flex justify-center flex-wrap gap-4 mb-12">
                        {filters.map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-5 py-2 rounded-full font-semibold text-text-secondary border-2 border-transparent transition-colors hover:text-text-primary ${filter === f.key ? 'text-neon-cyan border-neon-cyan bg-neon-cyan/10' : ''}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProjects.map((project, index) => (
                            <div key={index} className="bg-secondary-dark rounded-xl border border-border-color overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-neon-blue/20 hover:border-neon-blue">
                                <img src={project.image} alt={project.title[lang]} className="w-full h-52 object-cover" />
                                <div className="p-6 flex flex-col flex-grow">
                                    <span className="bg-neon-blue/10 text-neon-blue text-xs font-bold px-3 py-1 rounded-full self-start">{project.category[lang]}</span>
                                    <h3 className="text-xl font-bold my-3">{project.title[lang]}</h3>
                                    <p className="text-text-secondary flex-grow mb-4">{project.description[lang]}</p>
                                    <button onClick={() => setSelectedProject(project)} className="font-bold text-neon-cyan self-start group">
                                        {t('project_case_study_btn')}
                                        <i className={`fas ${dir === 'rtl' ? 'fa-arrow-left' : 'fa-arrow-right'} transition-transform duration-300 inline-block group-hover:translate-x-1 rtl:group-hover:-translate-x-1 ${dir === 'rtl' ? 'mr-2' : 'ml-2'}`}></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>
        );
    }
    
    const ContactSection = () => {
        const { t, lang } = useLanguage();
        const [status, setStatus] = useState<{type: 'success' | 'error' | '', msg: string} | null>(null);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [formData, setFormData] = useState({
            serviceType: '',
            name: '',
            email: '',
            phone: '',
            message: '',
            contactMethod: [] as string[]
        });

        useEffect(() => {
            const prefillMessage = sessionStorage.getItem('prefillContactForm');
            if (prefillMessage) {
                setFormData(prev => ({...prev, message: prefillMessage}));
                sessionStorage.removeItem('prefillContactForm');
            }
        }, []);
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({...prev, [name]: value}));
        }

        const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { value, checked } = e.target;
            setFormData(prev => {
                const newMethods = checked
                    ? [...prev.contactMethod, value]
                    : prev.contactMethod.filter(m => m !== value);
                return {...prev, contactMethod: newMethods};
            });
        }
    
        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            setStatus(null);
    
            const dataToSubmit = {
                leadType: 'Confirmed Lead - Contact Form',
                ...formData,
                timestamp: new Date().toISOString()
            };
            
            try {
                await Promise.all([
                    fetch(N8N_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dataToSubmit),
                        mode: 'no-cors'
                    }),
                    database.ref('messages').push(dataToSubmit)
                ]);
                setStatus({type: 'success', msg: t('form_success')});
                (e.target as HTMLFormElement).reset();
                setFormData({ serviceType: '', name: '', email: '', phone: '', message: '', contactMethod: [] });
            } catch (error) {
                console.error('Submission Error:', error);
                setStatus({type: 'error', msg: t('form_error')});
            } finally {
                setIsSubmitting(false);
            }
        };
    
        return (
            <Section id="contact">
                <div className="container mx-auto px-5">
                    <SectionTitle>{t('contact_title')}</SectionTitle>
                    <p className="text-center max-w-2xl mx-auto -mt-12 mb-12 text-text-secondary">{t('contact_subtitle')}</p>
                    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex flex-col gap-5">
                        <select name="serviceType" value={formData.serviceType} onChange={handleChange} className={`${formInputClasses} form-select`} required>
                            <option value="" disabled>{t('contact_form_service')}</option>
                            {servicesData.map(s => <option key={s.title.en} value={s.title.en}>{s.title[lang]}</option>)}
                        </select>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('contact_form_name')} className={formInputClasses} required />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder={t('contact_form_email')} className={formInputClasses} required />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder={t('contact_form_phone')} className={formInputClasses} />
                        
                        <fieldset className="border border-border-color p-4 rounded-lg">
                            <legend className="px-2 text-sm text-text-secondary">{t('contact_form_contact_method')}</legend>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="contactMethod" value="Phone Call" onChange={handleCheckboxChange} className={formCheckboxClasses} />{t('contact_phone_call')}</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="contactMethod" value="WhatsApp" onChange={handleCheckboxChange} className={formCheckboxClasses} />{t('contact_whatsapp')}</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="contactMethod" value="Zoom" onChange={handleCheckboxChange} className={formCheckboxClasses} />{t('contact_zoom')}</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="contactMethod" value="Discord" onChange={handleCheckboxChange} className={formCheckboxClasses} />{t('contact_discord')}</label>
                            </div>
                        </fieldset>
    
                        <textarea name="message" value={formData.message} onChange={handleChange} placeholder={t('contact_form_message')} className={`${formInputClasses} min-h-[150px]`} required></textarea>
                        <button type="submit" className={submitBtnClasses} disabled={isSubmitting}>
                            {isSubmitting ? t('form_sending') : t('contact_form_submit')}
                        </button>
                    </form>
                    {status && <div className={`text-center mt-5 p-4 rounded-lg ${status.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{status.msg}</div>}
                </div>
            </Section>
        );
    }

    return (
        <>
            {/* Hero Section */}
            <section id="hero" className="h-screen flex items-center justify-center text-center relative overflow-hidden -mt-[70px] pt-[70px]">
                <div className="absolute inset-0 bg-radial-gradient z-[-1]"></div>
                <div className={`container mx-auto px-5 transition-all duration-1000 ease-out ${isHeroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-3">{t('hero_title')}</h1>
                    <h2 className="text-2xl md:text-3xl mb-5 font-bold bg-gradient-to-r from-neon-cyan to-neon-blue bg-clip-text text-transparent">{t('hero_subtitle')}</h2>
                    <p className="text-lg text-text-secondary max-w-3xl mx-auto mb-8">{t('hero_description')}</p>
                    <div className="flex justify-center gap-8">
                         <a href="https://github.com/Mohammed5778" target="_blank" rel="noopener noreferrer" className="text-text-secondary text-2xl transition-colors hover:text-neon-cyan hover:drop-shadow-[0_0_8px_var(--tw-shadow-color)] shadow-neon-cyan"><i className="fab fa-github"></i></a>
                        <a href="https://linkedin.com/in/your-profile" target="_blank" rel="noopener noreferrer" className="text-text-secondary text-2xl transition-colors hover:text-neon-cyan hover:drop-shadow-[0_0_8px_var(--tw-shadow-color)] shadow-neon-cyan"><i className="fab fa-linkedin"></i></a>
                        <a href="https://huggingface.co/Mabda724" target="_blank" rel="noopener noreferrer" className="text-text-secondary text-2xl transition-colors hover:text-neon-cyan hover:drop-shadow-[0_0_8px_var(--tw-shadow-color)] shadow-neon-cyan"><i className="fas fa-robot"></i></a>
                    </div>
                </div>
            </section>
            
            {/* About Section */}
            <Section id="about">
                 <div className="container mx-auto px-5 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                    <div className="lg:w-2/5 lg:order-2">
                        <img src="https://raw.githubusercontent.com/Mohammed5778/Projectshtml/main/504081164_4273169156238679_1780606122166042485_n.jpg" alt="Mohammed Ibrahim Abdullah" className="rounded-xl border-2 border-border-color shadow-lg shadow-neon-blue/20 transition-all duration-300 hover:scale-105 hover:shadow-neon-cyan/30" />
                    </div>
                    <div className={`lg:w-3/5 lg:order-1 flex flex-col items-center text-center ${dir === 'rtl' ? 'lg:text-right lg:items-end' : 'lg:text-left lg:items-start'}`}>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6 w-full">{t('about_heading')}</h2>
                        <p className="text-text-secondary mb-4">{t('about_p1')}</p>
                        <p className="text-text-secondary mb-8">{t('about_p2')}</p>
                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                            <a href="https://www.credly.com/users/mohammed-ibrahim-abdullah/badges#credly" target="_blank" rel="noopener noreferrer" className={`${ctaBtnClasses} ${ctaBtnSecondaryClasses}`}><i className="fas fa-award ltr:mr-2 rtl:ml-2"></i> {t('about_credly_btn')}</a>
                            <a href="https://www.udacity.com/certificate/e/d8db02a4-3f2d-11f0-a37c-27b4441e3f85" target="_blank" rel="noopener noreferrer" className={`${ctaBtnClasses} ${ctaBtnSecondaryClasses}`}><i className="fas fa-graduation-cap ltr:mr-2 rtl:ml-2"></i> {t('about_udacity_btn')}</a>
                            <a href="/certificates.pdf" target="_blank" className={ctaBtnClasses}><i className="fas fa-file-pdf ltr:mr-2 rtl:ml-2"></i> {t('about_cert_btn_text')}</a>
                        </div>
                    </div>
                </div>
            </Section>
            
            <ServicesSection />
            <ProjectsSection />
            <ContactSection />
            <ProjectDetailModal project={selectedProject} isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} />
        </>
    );
};

const PurchaseModal: React.FC<{post: CommunityPost | null; isOpen: boolean; onClose: () => void; onSuccess: (post: CommunityPost, licenseKey?: string) => void}> = ({post, isOpen, onClose, onSuccess}) => {
    const { t } = useLanguage();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [licenseKey, setLicenseKey] = useState('');
    const [agreed, setAgreed] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setIsProcessing(false);
            setIsSuccess(false);
            setAgreed(false);
            setLicenseKey('');
        }
    }, [isOpen]);

    if (!isOpen || !post) return null;

    const handlePay = (e: React.FormEvent) => {
        e.preventDefault();
        if (post.isPaid && !agreed) return;

        setIsProcessing(true);
        // Simulate payment processing
        setTimeout(() => {
            const newKey = post.isPaid ? 'KEY-' + Math.random().toString(36).substring(2, 15).toUpperCase() : undefined;
            if(newKey) setLicenseKey(newKey);
            onSuccess(post, newKey);
            setIsProcessing(false);
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
            }, 3000);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-primary-dark p-8 rounded-xl border border-border-color w-full max-w-md relative text-start shadow-lg shadow-neon-blue/10" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-text-secondary hover:text-text-primary transition-colors"><i className="fas fa-times"></i></button>
                
                {isSuccess ? (
                    <div className="text-center">
                        <div className="text-5xl text-green-400 mb-4"><i className="fas fa-check-circle"></i></div>
                        <h2 className="text-2xl font-bold text-text-primary">{t('purchase_success_title')}</h2>
                        <p className="text-text-secondary mt-2">{t('purchase_success_message')}</p>
                        {licenseKey && <p className="font-mono bg-primary-dark border border-border-color text-neon-cyan p-2 rounded-lg mt-3 text-sm">{licenseKey}</p>}
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl mb-6 font-bold text-text-primary">{t('purchase_title')}</h2>
                        <div className="bg-secondary-dark p-4 rounded-lg mb-6 border border-border-color">
                            <div className="flex justify-between items-center text-text-secondary text-sm"><span>{t('purchase_item')}</span><span>{t('purchase_price')}</span></div>
                            <div className="flex justify-between items-center text-text-primary font-bold mt-1"><span>{post.title}</span><span>${post.price.toFixed(2)}</span></div>
                        </div>
                        <form onSubmit={handlePay}>
                            <h3 className="text-lg font-semibold text-text-primary mb-4">{t('purchase_card_details')}</h3>
                            <div className="space-y-4">
                                <input type="text" placeholder={t('purchase_card_number')} className={formInputClasses} />
                                <div className="flex gap-4">
                                    <input type="text" placeholder={t('purchase_card_expiry')} className={formInputClasses} />
                                    <input type="text" placeholder={t('purchase_card_cvc')} className={formInputClasses} />
                                </div>
                            </div>
                            {post.isPaid && (
                                <label className="flex items-center gap-3 mt-6 cursor-pointer text-sm text-text-secondary">
                                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className={formCheckboxClasses} />
                                    {t('purchase_license_agreement')}
                                </label>
                            )}
                            <button type="submit" className={`${submitBtnClasses} mt-6 !py-3`} disabled={isProcessing || (post.isPaid && !agreed)}>
                                {isProcessing ? t('form_sending') : `${t('purchase_pay_now')} $${post.price.toFixed(2)}`}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

const PostCard: React.FC<{post: CommunityPost; isPurchased: boolean; onPurchase: (post: CommunityPost) => void;}> = ({post, isPurchased, onPurchase}) => {
    const { t } = useLanguage();
    
    const getButtonContent = () => {
        if (isPurchased) {
            return t('community_access_content');
        }
        if (post.isPaid) {
            return t('community_purchase');
        }
        return t('community_enroll');
    };

    const handleButtonClick = () => {
        if (isPurchased && post.downloadLink) {
            window.open(post.downloadLink, '_blank');
        } else if (!isPurchased) {
            onPurchase(post);
        }
    };
    
    return (
        <div className="bg-secondary-dark rounded-xl border border-border-color flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-neon-blue/10 hover:border-neon-blue hover:-translate-y-1">
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-3 gap-3">
                    <h3 className="text-xl font-bold text-text-primary flex-1">{post.title}</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full self-start shrink-0 ${post.type === 'Project' ? 'bg-purple-500/10 text-purple-400' : 'bg-green-500/10 text-green-400'}`}>
                        {t(post.type === 'Project' ? 'create_post_type_project' : 'create_post_type_course')}
                    </span>
                </div>
                <p className="text-sm text-text-secondary mb-2">{t('community_by')} <span className="font-semibold">{post.authorEmail.split('@')[0]}</span></p>
                <p className="text-text-secondary flex-grow mb-5">{post.description}</p>
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-border-color">
                    <p className="font-bold text-neon-cyan">
                        {post.isPaid ? `$${post.price.toFixed(2)}` : t('community_free')}
                    </p>
                    <button onClick={handleButtonClick} className={`${ctaBtnClasses} !py-2 !px-4 text-sm ${isPurchased ? ctaBtnSecondaryClasses : ''}`}>
                        {getButtonContent()}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CreatePostModal: React.FC<{isOpen: boolean; onClose: () => void}> = ({isOpen, onClose}) => {
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'Project' | 'Course' | 'Workshop'>('Project');
    const [isPaid, setIsPaid] = useState(false);
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState<{type: 'success' | 'error' | '', msg: string} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleClose = () => {
      setStatus(null);
      setIsSubmitting(false);
      onClose();
    }
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!currentUser) {
            setStatus({type: 'error', msg: 'You must be logged in to post.'});
            return;
        }

        setIsSubmitting(true);
        setStatus(null);

        try {
            await addCommunityPost({
                authorId: currentUser.uid,
                authorEmail: currentUser.email!,
                title,
                description,
                type,
                isPaid,
                price: isPaid ? price : 0,
                isApproved: false,
            });
            setStatus({type: 'success', msg: t('post_created_success')});
            setTitle('');
            setDescription('');
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch(err) {
            console.error(err);
            setStatus({type: 'error', msg: t('post_created_error')});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-primary-dark p-8 rounded-xl border border-border-color w-full max-w-lg relative text-start shadow-lg shadow-neon-blue/10" onClick={e => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-2xl text-text-secondary hover:text-text-primary transition-colors"><i className="fas fa-times"></i></button>
                <h2 className="text-2xl mb-6 font-bold text-text-primary">{t('create_post_title')}</h2>
                {status && <div className={`text-center mb-4 p-3 rounded-lg ${status.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{status.msg}</div>}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('create_post_title_label')}</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={formInputClasses} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('create_post_desc_label')}</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className={`${formInputClasses} min-h-[120px]`} required></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('create_post_type')}</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className={`${formInputClasses} form-select`}>
                            <option value="Project">{t('create_post_type_project')}</option>
                            <option value="Course">{t('create_post_type_course')}</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-text-primary">
                            <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} className={formCheckboxClasses} />
                            {t('create_post_is_paid')}
                        </label>
                        {isPaid && (
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-text-secondary mb-1">{t('create_post_price_label')}</label>
                                <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min="0" step="0.01" className={formInputClasses} required/>
                            </div>
                        )}
                    </div>
                    <button type="submit" className={submitBtnClasses} disabled={isSubmitting}>
                        {isSubmitting ? t('form_sending') : t('create_post_submit')}
                    </button>
                </form>
            </div>
        </div>
    );
};

const CommunityPage: React.FC = () => {
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [filter, setFilter] = useState<'all' | 'Project' | 'Course' | 'Workshop'>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedPostForPurchase, setSelectedPostForPurchase] = useState<CommunityPost | null>(null);
    const [purchasedPostIds, setPurchasedPostIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = getCommunityPosts(allPosts => {
            const approvedPosts = allPosts.filter(p => p.isApproved);
            setPosts(approvedPosts);
        });

        let unsubscribePurchases: () => void;
        if (currentUser) {
            unsubscribePurchases = getUserPurchases(currentUser.uid, (purchases) => {
                const ids = new Set(purchases.map(p => p.postId));
                setPurchasedPostIds(ids);
            });
        }

        return () => {
            unsubscribe();
            if (unsubscribePurchases) unsubscribePurchases();
        };
    }, [currentUser]);

    const handlePurchase = (post: CommunityPost) => {
        if (!currentUser) {
            alert("Please log in to purchase items.");
            return;
        }
        if (!post.isPaid) {
            // It's a free enrollment
            addPurchase(currentUser.uid, post);
        } else {
            setSelectedPostForPurchase(post);
        }
    };

    const handlePurchaseSuccess = (post: CommunityPost) => {
        if (!currentUser) return;
        addPurchase(currentUser.uid, post);
    }

    const filteredPosts = posts.filter(post => {
        if (filter === 'all') return true;
        if (filter === 'Course') return post.type === 'Course' || post.type === 'Workshop';
        return post.type === filter;
    });

    return (
        <>
            <Section id="community" className="min-h-screen pt-32">
                <div className="container mx-auto px-5">
                    <SectionTitle>{t('community_title')}</SectionTitle>
                    <p className="text-center text-text-secondary -mt-12 mb-8 max-w-2xl mx-auto">{t('community_subtitle')}</p>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                        {/* Filters */}
                        <div className="flex justify-center flex-wrap gap-2 sm:gap-4">
                            <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-transparent transition-colors ${filter === 'all' ? 'text-neon-cyan border-neon-cyan bg-neon-cyan/10' : 'text-text-secondary hover:text-text-primary'}`}>{t('filter_all')}</button>
                            <button onClick={() => setFilter('Project')} className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-transparent transition-colors ${filter === 'Project' ? 'text-neon-cyan border-neon-cyan bg-neon-cyan/10' : 'text-text-secondary hover:text-text-primary'}`}>{t('community_filter_projects')}</button>
                            <button onClick={() => setFilter('Course')} className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-transparent transition-colors ${filter === 'Course' ? 'text-neon-cyan border-neon-cyan bg-neon-cyan/10' : 'text-text-secondary hover:text-text-primary'}`}>{t('community_filter_courses')}</button>
                        </div>
                        {currentUser && (
                            <button onClick={() => setIsCreateModalOpen(true)} className={`${ctaBtnClasses} !py-2 !px-5 text-sm`}>
                                <i className="fas fa-plus ltr:mr-2 rtl:ml-2"></i> {t('community_create_post')}
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.length > 0 ? (
                           filteredPosts.map(post => (
                            <PostCard 
                                key={post.id} 
                                post={post} 
                                onPurchase={handlePurchase}
                                isPurchased={purchasedPostIds.has(post.id)}
                            />
                           ))
                        ) : (
                            <div className="col-span-full text-center text-text-secondary py-10 bg-secondary-dark/50 rounded-lg">
                                <p>No posts found in this category yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Section>
            <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            <PurchaseModal post={selectedPostForPurchase} isOpen={!!selectedPostForPurchase} onClose={() => setSelectedPostForPurchase(null)} onSuccess={handlePurchaseSuccess} />
        </>
    );
};

const AdminPage: React.FC = () => {
    const { t } = useLanguage();
    const { isAdmin } = useAuth();
    const [posts, setPosts] = useState<CommunityPost[]>([]);

    useEffect(() => {
        if (!isAdmin) return;
        const unsubscribe = getCommunityPosts(allPosts => {
            setPosts(allPosts);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    const handleApprove = async (postId: string) => {
        try {
            await approveCommunityPost(postId);
        } catch (error) {
            console.error("Failed to approve post:", error);
            alert("Error: Could not approve post.");
        }
    };

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return (
        <Section id="admin" className="min-h-screen pt-32">
            <div className="container mx-auto px-5">
                <SectionTitle>{t('admin_title')}</SectionTitle>
                <p className="text-center text-text-secondary -mt-12 mb-12">{t('admin_subtitle')}</p>
                <div className="bg-secondary-dark rounded-lg border border-border-color overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="border-b border-border-color bg-primary-dark/50">
                            <tr>
                                <th className="p-4 text-sm font-semibold text-text-secondary uppercase tracking-wider">{t('admin_post_title')}</th>
                                <th className="p-4 text-sm font-semibold text-text-secondary uppercase tracking-wider">{t('admin_author')}</th>
                                <th className="p-4 text-sm font-semibold text-text-secondary uppercase tracking-wider">{t('admin_price')}</th>
                                <th className="p-4 text-sm font-semibold text-text-secondary uppercase tracking-wider">{t('admin_status')}</th>
                                <th className="p-4 text-sm font-semibold text-text-secondary uppercase tracking-wider text-center">{t('admin_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <tr key={post.id} className="border-b border-border-color last:border-b-0 hover:bg-primary-dark/50 transition-colors">
                                        <td className="p-4 text-text-primary align-top font-semibold">{post.title}</td>
                                        <td className="p-4 text-text-secondary align-top text-xs">{post.authorEmail}</td>
                                        <td className="p-4 text-text-primary align-top">${post.isPaid ? post.price.toFixed(2) : '0.00'}</td>
                                        <td className="p-4 align-top">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${post.isApproved ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                {post.isApproved ? t('admin_approved') : t('admin_pending')}
                                            </span>
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            {!post.isApproved && (
                                                <button onClick={() => handleApprove(post.id)} className="bg-neon-cyan text-bg-color text-xs font-bold px-3 py-1 rounded-full hover:scale-105 transition-transform">
                                                    {t('admin_approve')}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-text-secondary">{t('admin_no_posts')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Section>
    );
};

const DashboardPage: React.FC = () => {
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('conversations');

    const SavedConversationsTab: React.FC = () => {
        const [conversations, setConversations] = useState<SavedConversation[]>([]);
        useEffect(() => {
            if (!currentUser) return;
            const unsubscribe = getUserConversations(currentUser.uid, setConversations);
            return () => unsubscribe();
        }, [currentUser]);

        return (
            <div className="space-y-6">
                {conversations.length > 0 ? (
                    conversations.map(convo => (
                        <div key={convo.id} className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                             <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 ${convo.type === 'consultation' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                {t(convo.type === 'consultation' ? 'dashboard_convo_type_consultation' : 'dashboard_convo_type_brainstorm')}
                            </span>
                            <p className="text-sm text-text-secondary mb-1">{t('dashboard_user_input')}:</p>
                            <p className="font-mono text-sm bg-primary-dark p-3 rounded mb-4 whitespace-pre-wrap">{convo.userInput}</p>
                            <p className="text-sm text-text-secondary mb-1">{t('dashboard_ai_response')}:</p>
                            <div className="font-mono text-sm bg-primary-dark p-3 rounded whitespace-pre-wrap">
                                {typeof convo.aiResponse === 'string' ? convo.aiResponse : 
                                <div>
                                    <p><strong>{t('bot_proposal_problem')}:</strong> {convo.aiResponse.problemAnalysis}</p>
                                    <p className="my-2"><strong>{t('bot_proposal_solution')}:</strong> {convo.aiResponse.proposedSolution}</p>
                                    <p><strong>{t('bot_proposal_services')}:</strong> {convo.aiResponse.suggestedServices.join(', ')}</p>
                                </div>}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-text-secondary py-10 bg-secondary-dark/50 rounded-lg">{t('dashboard_empty_convos')}</div>
                )}
            </div>
        )
    };
    
    const MyPostsTab: React.FC = () => {
        const [allPosts, setAllPosts] = useState<CommunityPost[]>([]);
        useEffect(() => {
            const unsubscribe = getCommunityPosts(setAllPosts); // Gets all posts
            return () => unsubscribe();
        }, []);
        const myPosts = currentUser ? allPosts.filter(p => p.authorId === currentUser.uid) : [];

        return (
             <div className="space-y-4">
                {myPosts.length > 0 ? (
                    myPosts.map(post => (
                        <div key={post.id} className="bg-secondary-dark p-4 rounded-lg border border-border-color flex justify-between items-center">
                            <div className="flex-1">
                                <h4 className="font-bold text-text-primary">{post.title}</h4>
                                <p className="text-sm text-text-secondary">{post.description.substring(0,100)}...</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${post.isApproved ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {post.isApproved ? t('admin_approved') : t('admin_pending')}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-text-secondary py-10 bg-secondary-dark/50 rounded-lg">{t('dashboard_empty_posts')}</div>
                )}
            </div>
        );
    };

    const MyLibraryTab: React.FC = () => {
         const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
         useEffect(() => {
            if (!currentUser) return;
            const unsubscribe = getUserPurchases(currentUser.uid, setPurchases);
            return () => unsubscribe();
        }, [currentUser]);

        return (
             <div className="space-y-4">
                {purchases.length > 0 ? (
                    purchases.map(purchase => (
                        <div key={purchase.id} className="bg-secondary-dark p-4 rounded-lg border border-border-color">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-text-primary">{purchase.postTitle}</h4>
                                <span className="text-sm text-neon-cyan font-bold">${purchase.price.toFixed(2)}</span>
                            </div>
                            {purchase.licenseKey && (
                                <div className="mt-3 pt-3 border-t border-border-color">
                                    <p className="text-xs text-text-secondary mb-1">{t('dashboard_license_key')}:</p>
                                    <p className="font-mono text-sm bg-primary-dark p-2 rounded">{purchase.licenseKey}</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center text-text-secondary py-10 bg-secondary-dark/50 rounded-lg">{t('dashboard_empty_purchases')}</div>
                )}
            </div>
        );
    };

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    const tabs = [
        { id: 'conversations', labelKey: 'dashboard_tab_conversations' },
        { id: 'posts', labelKey: 'dashboard_tab_posts' },
        { id: 'purchases', labelKey: 'dashboard_tab_purchases' },
    ];

    return (
        <Section id="dashboard" className="min-h-screen pt-32">
            <div className="container mx-auto px-5">
                <SectionTitle>{t('dashboard_title')}</SectionTitle>
                <p className="text-center text-text-secondary -mt-12 mb-12 max-w-2xl mx-auto">{t('dashboard_subtitle')}</p>
                
                <div className="border-b border-border-color flex justify-center mb-8">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 font-semibold transition-colors ${activeTab === tab.id ? 'text-neon-cyan border-b-2 border-neon-cyan' : 'text-text-secondary hover:text-text-primary'}`}>
                            {t(tab.labelKey)}
                        </button>
                    ))}
                </div>
                
                <div>
                    {activeTab === 'conversations' && <SavedConversationsTab />}
                    {activeTab === 'posts' && <MyPostsTab />}
                    {activeTab === 'purchases' && <MyLibraryTab />}
                </div>
            </div>
        </Section>
    );
};
