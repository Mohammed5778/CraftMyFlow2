import React, { useState, useEffect } from 'react';
import { database } from '../services/firebase';

interface AnalyticsData {
    pageViews: { [key: string]: number };
    projectViews: { [key: string]: number };
    serviceRequests: { [key: string]: number };
    userRegistrations: { [key: string]: number };
    contactFormSubmissions: { [key: string]: number };
    totalUsers: number;
    totalProjects: number;
    totalServices: number;
    totalRevenue: number;
}

interface AnalyticsDashboardProps {
    lang: 'en' | 'ar';
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ lang }) => {
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        pageViews: {},
        projectViews: {},
        serviceRequests: {},
        userRegistrations: {},
        contactFormSubmissions: {},
        totalUsers: 0,
        totalProjects: 0,
        totalServices: 0,
        totalRevenue: 0
    });
    const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, 1y
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [timeRange]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            
            // Load page views
            const pageViewsSnapshot = await database.ref('analytics/pageViews').once('value');
            const pageViews = pageViewsSnapshot.val() || {};
            
            // Load project views
            const projectViewsSnapshot = await database.ref('analytics/projectViews').once('value');
            const projectViews = projectViewsSnapshot.val() || {};
            
            // Load service requests
            const serviceRequestsSnapshot = await database.ref('analytics/serviceRequests').once('value');
            const serviceRequests = serviceRequestsSnapshot.val() || {};
            
            // Load user registrations
            const userRegistrationsSnapshot = await database.ref('analytics/userRegistrations').once('value');
            const userRegistrations = userRegistrationsSnapshot.val() || {};
            
            // Load contact form submissions
            const contactSubmissionsSnapshot = await database.ref('analytics/contactSubmissions').once('value');
            const contactFormSubmissions = contactSubmissionsSnapshot.val() || {};
            
            // Load totals
            const usersSnapshot = await database.ref('users').once('value');
            const projectsSnapshot = await database.ref('projects').once('value');
            const servicesSnapshot = await database.ref('services').once('value');
            const ordersSnapshot = await database.ref('orders').once('value');
            
            let totalRevenue = 0;
            ordersSnapshot.forEach((child) => {
                const order = child.val();
                if (order.status === 'completed') {
                    totalRevenue += order.amount || 0;
                }
            });
            
            setAnalytics({
                pageViews: filterDataByTimeRange(pageViews),
                projectViews: filterDataByTimeRange(projectViews),
                serviceRequests: filterDataByTimeRange(serviceRequests),
                userRegistrations: filterDataByTimeRange(userRegistrations),
                contactFormSubmissions: filterDataByTimeRange(contactFormSubmissions),
                totalUsers: usersSnapshot.numChildren(),
                totalProjects: projectsSnapshot.numChildren(),
                totalServices: servicesSnapshot.numChildren(),
                totalRevenue
            });
            
            setLoading(false);
        } catch (error) {
            console.error('Error loading analytics:', error);
            setLoading(false);
        }
    };

    const filterDataByTimeRange = (data: { [key: string]: number }) => {
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (timeRange) {
            case '7d':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                cutoffDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
        }
        
        const filtered: { [key: string]: number } = {};
        Object.entries(data).forEach(([date, value]) => {
            if (new Date(date) >= cutoffDate) {
                filtered[date] = value;
            }
        });
        
        return filtered;
    };

    const getTotal = (data: { [key: string]: number }) => {
        return Object.values(data).reduce((sum, value) => sum + value, 0);
    };

    const getGrowthPercentage = (data: { [key: string]: number }) => {
        const dates = Object.keys(data).sort();
        if (dates.length < 2) return 0;
        
        const midPoint = Math.floor(dates.length / 2);
        const firstHalf = dates.slice(0, midPoint);
        const secondHalf = dates.slice(midPoint);
        
        const firstHalfTotal = firstHalf.reduce((sum, date) => sum + (data[date] || 0), 0);
        const secondHalfTotal = secondHalf.reduce((sum, date) => sum + (data[date] || 0), 0);
        
        if (firstHalfTotal === 0) return secondHalfTotal > 0 ? 100 : 0;
        
        return Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100);
    };

    const renderChart = (data: { [key: string]: number }, title: string, color: string) => {
        const maxValue = Math.max(...Object.values(data));
        const dates = Object.keys(data).sort();
        
        return (
            <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
                <div className="flex items-end space-x-1 space-x-reverse h-32">
                    {dates.map((date, index) => {
                        const value = data[date] || 0;
                        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                        
                        return (
                            <div
                                key={date}
                                className="flex-1 flex flex-col items-center"
                                title={`${date}: ${value}`}
                            >
                                <div
                                    className={`w-full ${color} rounded-t transition-all duration-300 hover:opacity-80`}
                                    style={{ height: `${height}%` }}
                                ></div>
                                <div className="text-xs text-text-secondary mt-1 transform rotate-45 origin-left">
                                    {new Date(date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-2xl font-bold text-text-primary">{getTotal(data)}</span>
                    <span className={`text-sm ${getGrowthPercentage(data) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {getGrowthPercentage(data) >= 0 ? '+' : ''}{getGrowthPercentage(data)}%
                    </span>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-text-primary">لوحة التحليلات</h2>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-secondary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary form-select"
                >
                    <option value="7d">آخر 7 أيام</option>
                    <option value="30d">آخر 30 يوم</option>
                    <option value="90d">آخر 90 يوم</option>
                    <option value="1y">آخر سنة</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي المستخدمين</p>
                            <p className="text-2xl font-bold text-neon-cyan">{analytics.totalUsers}</p>
                        </div>
                        <i className="fas fa-users text-3xl text-neon-cyan"></i>
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي المشاريع</p>
                            <p className="text-2xl font-bold text-neon-blue">{analytics.totalProjects}</p>
                        </div>
                        <i className="fas fa-project-diagram text-3xl text-neon-blue"></i>
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي الخدمات</p>
                            <p className="text-2xl font-bold text-purple-400">{analytics.totalServices}</p>
                        </div>
                        <i className="fas fa-cogs text-3xl text-purple-400"></i>
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text-secondary text-sm">إجمالي الإيرادات</p>
                            <p className="text-2xl font-bold text-green-400">${analytics.totalRevenue}</p>
                        </div>
                        <i className="fas fa-dollar-sign text-3xl text-green-400"></i>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderChart(analytics.pageViews, 'مشاهدات الصفحات', 'bg-neon-cyan')}
                {renderChart(analytics.projectViews, 'مشاهدات المشاريع', 'bg-neon-blue')}
                {renderChart(analytics.serviceRequests, 'طلبات الخدمات', 'bg-purple-400')}
                {renderChart(analytics.userRegistrations, 'تسجيلات المستخدمين', 'bg-green-400')}
            </div>

            {/* Top Projects and Services */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">أكثر المشاريع مشاهدة</h3>
                    <div className="space-y-3">
                        {Object.entries(analytics.projectViews)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([project, views], index) => (
                                <div key={project} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 space-x-reverse">
                                        <span className="text-text-secondary">#{index + 1}</span>
                                        <span className="text-text-primary">{project}</span>
                                    </div>
                                    <span className="text-neon-cyan font-semibold">{views}</span>
                                </div>
                            ))}
                    </div>
                </div>

                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">أكثر الخدمات طلباً</h3>
                    <div className="space-y-3">
                        {Object.entries(analytics.serviceRequests)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([service, requests], index) => (
                                <div key={service} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 space-x-reverse">
                                        <span className="text-text-secondary">#{index + 1}</span>
                                        <span className="text-text-primary">{service}</span>
                                    </div>
                                    <span className="text-purple-400 font-semibold">{requests}</span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;