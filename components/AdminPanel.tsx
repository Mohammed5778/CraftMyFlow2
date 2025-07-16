import React, { useState, useEffect } from 'react';
import { auth, database } from '../services/firebase';
import { translations, ADMIN_EMAIL } from '../constants';
import { CommunityPost, Service, Project } from '../types';
import ProjectManager from './admin/ProjectManager';
import ServiceManager from './admin/ServiceManager';
import UserManager from './admin/UserManager';
import OrderManager from './admin/OrderManager';
import ContentManager from './admin/ContentManager';
import PortfolioStructureManager from './admin/PortfolioStructureManager';
import CategoryManager from './admin/CategoryManager';

interface AdminPanelProps {
    lang: 'en' | 'ar';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lang }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingPosts: 0,
        totalProjects: 0,
        totalServices: 0
    });

    const t = translations[lang];

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user && user.email === ADMIN_EMAIL) {
                setIsAuthorized(true);
                loadDashboardStats();
            } else {
                setIsAuthorized(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loadDashboardStats = async () => {
        try {
            // Load users count
            const usersSnapshot = await database.ref('users').once('value');
            const usersCount = usersSnapshot.numChildren();

            // Load orders count and revenue
            let ordersCount = 0;
            let totalRevenue = 0;
            const ordersSnapshot = await database.ref('orders').once('value');
            ordersSnapshot.forEach((child) => {
                ordersCount++;
                totalRevenue += child.val().amount || 0;
            });

            // Load pending posts
            const postsSnapshot = await database.ref('communityPosts').once('value');
            let pendingPosts = 0;
            postsSnapshot.forEach((child) => {
                if (!child.val().isApproved) pendingPosts++;
            });

            // Load projects and services count
            const projectsSnapshot = await database.ref('projects').once('value');
            const servicesSnapshot = await database.ref('services').once('value');

            setStats({
                totalUsers: usersCount,
                totalOrders: ordersCount,
                totalRevenue,
                pendingPosts,
                totalProjects: projectsSnapshot.numChildren(),
                totalServices: servicesSnapshot.numChildren()
            });
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-color flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-neon-cyan mx-auto mb-4"></div>
                    <p className="text-text-secondary">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-bg-color flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-lock text-6xl text-red-500 mb-4"></i>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">غير مصرح لك بالوصول</h2>
                    <p className="text-text-secondary">هذه الصفحة مخصصة للمدير فقط</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: 'fas fa-tachometer-alt' },
        { id: 'projects', label: 'إدارة المشاريع', icon: 'fas fa-project-diagram' },
        { id: 'services', label: 'إدارة الخدمات', icon: 'fas fa-cogs' },
        { id: 'categories', label: 'إدارة التصنيفات', icon: 'fas fa-tags' },
        { id: 'users', label: 'إدارة المستخدمين', icon: 'fas fa-users' },
        { id: 'orders', label: 'إدارة الطلبات', icon: 'fas fa-shopping-cart' },
        { id: 'content', label: 'إدارة المحتوى', icon: 'fas fa-file-alt' },
        { id: 'structure', label: 'هيكل البورتفوليو', icon: 'fas fa-sitemap' }
    ];

    const renderDashboard = () => (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-text-primary mb-6">لوحة التحكم الرئيسية</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي المستخدمين</p>
                            <p className="text-2xl font-bold text-neon-cyan">{stats.totalUsers}</p>
                        </div>
                        <i className="fas fa-users text-3xl text-neon-cyan"></i>
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي الطلبات</p>
                            <p className="text-2xl font-bold text-neon-blue">{stats.totalOrders}</p>
                        </div>
                        <i className="fas fa-shopping-cart text-3xl text-neon-blue"></i>
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي الإيرادات</p>
                            <p className="text-2xl font-bold text-green-400">${stats.totalRevenue}</p>
                        </div>
                        <i className="fas fa-dollar-sign text-3xl text-green-400"></i>
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">منشورات في الانتظار</p>
                            <p className="text-2xl font-bold text-yellow-400">{stats.pendingPosts}</p>
                        </div>
                        <i className="fas fa-clock text-3xl text-yellow-400"></i>
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي المشاريع</p>
                            <p className="text-2xl font-bold text-purple-400">{stats.totalProjects}</p>
                        </div>
                        <i className="fas fa-project-diagram text-3xl text-purple-400"></i>
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي الخدمات</p>
                            <p className="text-2xl font-bold text-pink-400">{stats.totalServices}</p>
                        </div>
                        <i className="fas fa-cogs text-3xl text-pink-400"></i>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                <h3 className="text-xl font-bold text-text-primary mb-4">إجراءات سريعة</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => setActiveTab('projects')}
                        className="bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan p-4 rounded-lg transition-colors"
                    >
                        <i className="fas fa-plus mb-2 text-xl"></i>
                        <p className="text-sm">إضافة مشروع جديد</p>
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className="bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue p-4 rounded-lg transition-colors"
                    >
                        <i className="fas fa-plus mb-2 text-xl"></i>
                        <p className="text-sm">إضافة خدمة جديدة</p>
                    </button>
                    <button
                        onClick={() => setActiveTab('content')}
                        className="bg-green-400/10 hover:bg-green-400/20 text-green-400 p-4 rounded-lg transition-colors"
                    >
                        <i className="fas fa-upload mb-2 text-xl"></i>
                        <p className="text-sm">رفع محتوى</p>
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className="bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 p-4 rounded-lg transition-colors"
                    >
                        <i className="fas fa-eye mb-2 text-xl"></i>
                        <p className="text-sm">مراجعة الطلبات</p>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'projects':
                return <ProjectManager lang={lang} />;
            case 'services':
                return <ServiceManager lang={lang} />;
            case 'categories':
                return <CategoryManager lang={lang} />;
            case 'users':
                return <UserManager lang={lang} />;
            case 'orders':
                return <OrderManager lang={lang} />;
            case 'content':
                return <ContentManager lang={lang} />;
            case 'structure':
                return <PortfolioStructureManager lang={lang} />;
            default:
                return renderDashboard();
        }
    };

    return (
        <div className="min-h-screen bg-bg-color" dir="rtl">
            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 bg-secondary-dark border-l border-border-color min-h-screen">
                    <div className="p-6">
                        <h1 className="text-xl font-bold text-text-primary mb-6">لوحة التحكم</h1>
                        <nav className="space-y-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full text-right p-3 rounded-lg transition-colors flex items-center space-x-3 space-x-reverse ${
                                        activeTab === tab.id
                                            ? 'bg-neon-cyan/20 text-neon-cyan'
                                            : 'text-text-secondary hover:bg-primary-dark hover:text-text-primary'
                                    }`}
                                >
                                    <i className={tab.icon}></i>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;