import React, { useState, useEffect } from 'react';
import { database, auth } from '../services/firebase';

interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
}

interface NotificationSystemProps {
    lang: 'en' | 'ar';
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ lang }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            loadNotifications(user.uid);
        }
    }, []);

    const loadNotifications = (userId: string) => {
        database.ref(`notifications/${userId}`).on('value', (snapshot) => {
            const notificationsData: Notification[] = [];
            snapshot.forEach((child) => {
                notificationsData.push({
                    id: child.key!,
                    ...child.val()
                });
            });
            
            const sortedNotifications = notificationsData.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            
            setNotifications(sortedNotifications);
            setUnreadCount(sortedNotifications.filter(n => !n.isRead).length);
        });
    };

    const markAsRead = async (notificationId: string) => {
        const user = auth.currentUser;
        if (user) {
            await database.ref(`notifications/${user.uid}/${notificationId}`).update({
                isRead: true
            });
        }
    };

    const markAllAsRead = async () => {
        const user = auth.currentUser;
        if (user) {
            const updates: any = {};
            notifications.forEach(notification => {
                if (!notification.isRead) {
                    updates[`notifications/${user.uid}/${notification.id}/isRead`] = true;
                }
            });
            await database.ref().update(updates);
        }
    };

    const deleteNotification = async (notificationId: string) => {
        const user = auth.currentUser;
        if (user) {
            await database.ref(`notifications/${user.uid}/${notificationId}`).remove();
        }
    };

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return 'fas fa-check-circle text-green-400';
            case 'warning':
                return 'fas fa-exclamation-triangle text-yellow-400';
            case 'error':
                return 'fas fa-times-circle text-red-400';
            default:
                return 'fas fa-info-circle text-neon-blue';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'الآن';
        if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
        if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
        return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
    };

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-text-secondary hover:text-text-primary transition-colors"
            >
                <i className="fas fa-bell text-xl"></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-secondary-dark border border-border-color rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
                    <div className="p-4 border-b border-border-color flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-text-primary">الإشعارات</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-neon-cyan hover:text-neon-cyan/80 text-sm transition-colors"
                            >
                                تحديد الكل كمقروء
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-text-secondary">
                                لا توجد إشعارات
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-border-color hover:bg-primary-dark/50 transition-colors ${
                                        !notification.isRead ? 'bg-neon-cyan/5' : ''
                                    }`}
                                >
                                    <div className="flex items-start space-x-3 space-x-reverse">
                                        <i className={getNotificationIcon(notification.type)}></i>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-text-primary font-medium text-sm">
                                                {notification.title}
                                            </h4>
                                            <p className="text-text-secondary text-xs mt-1">
                                                {notification.message}
                                            </p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-text-secondary text-xs">
                                                    {formatTime(notification.createdAt)}
                                                </span>
                                                <div className="flex space-x-2 space-x-reverse">
                                                    {!notification.isRead && (
                                                        <button
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="text-neon-cyan hover:text-neon-cyan/80 text-xs transition-colors"
                                                        >
                                                            تحديد كمقروء
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="text-red-400 hover:text-red-300 text-xs transition-colors"
                                                    >
                                                        حذف
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationSystem;