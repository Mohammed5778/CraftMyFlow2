import React, { useState, useEffect } from 'react';
import { database } from '../../services/firebase';

interface User {
    id: string;
    email: string;
    createdAt: string;
    lastLogin?: string;
    isBlocked?: boolean;
    totalPurchases?: number;
    totalSpent?: number;
}

interface UserManagerProps {
    lang: 'en' | 'ar';
}

const UserManager: React.FC<UserManagerProps> = ({ lang }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const usersSnapshot = await database.ref('users').once('value');
            const usersData: User[] = [];
            
            usersSnapshot.forEach((child) => {
                const userData = child.val();
                const userId = child.key!;
                
                // Calculate user statistics
                let totalPurchases = 0;
                let totalSpent = 0;
                
                if (userData.purchases) {
                    Object.values(userData.purchases).forEach((purchase: any) => {
                        totalPurchases++;
                        totalSpent += purchase.price || 0;
                    });
                }

                usersData.push({
                    id: userId,
                    email: userData.email || 'غير محدد',
                    createdAt: userData.createdAt || new Date().toISOString(),
                    lastLogin: userData.lastLogin,
                    isBlocked: userData.isBlocked || false,
                    totalPurchases,
                    totalSpent
                });
            });

            setUsers(usersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setLoading(false);
        } catch (error) {
            console.error('Error loading users:', error);
            setLoading(false);
        }
    };

    const toggleUserBlock = async (userId: string, currentStatus: boolean) => {
        try {
            await database.ref(`users/${userId}`).update({
                isBlocked: !currentStatus
            });
            
            setUsers(users.map(user => 
                user.id === userId 
                    ? { ...user, isBlocked: !currentStatus }
                    : user
            ));
            
            alert(!currentStatus ? 'تم حظر المستخدم' : 'تم إلغاء حظر المستخدم');
        } catch (error) {
            console.error('Error updating user status:', error);
            alert('حدث خطأ أثناء تحديث حالة المستخدم');
        }
    };

    const deleteUser = async (userId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع بياناته نهائياً.')) {
            try {
                await database.ref(`users/${userId}`).remove();
                setUsers(users.filter(user => user.id !== userId));
                alert('تم حذف المستخدم بنجاح');
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('حدث خطأ أثناء حذف المستخدم');
            }
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        switch (filterType) {
            case 'blocked':
                return matchesSearch && user.isBlocked;
            case 'active':
                return matchesSearch && !user.isBlocked;
            case 'customers':
                return matchesSearch && (user.totalPurchases || 0) > 0;
            default:
                return matchesSearch;
        }
    });

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
                <h2 className="text-3xl font-bold text-text-primary">إدارة المستخدمين</h2>
                <div className="text-text-secondary">
                    إجمالي المستخدمين: {users.length}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-secondary-dark p-4 rounded-lg border border-border-color">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="البحث بالبريد الإلكتروني..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                        />
                    </div>
                    <div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary form-select"
                        >
                            <option value="all">جميع المستخدمين</option>
                            <option value="active">المستخدمون النشطون</option>
                            <option value="blocked">المستخدمون المحظورون</option>
                            <option value="customers">العملاء (لديهم مشتريات)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-secondary-dark rounded-lg border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-primary-dark">
                            <tr>
                                <th className="px-6 py-3 text-right text-text-primary">البريد الإلكتروني</th>
                                <th className="px-6 py-3 text-right text-text-primary">تاريخ التسجيل</th>
                                <th className="px-6 py-3 text-right text-text-primary">المشتريات</th>
                                <th className="px-6 py-3 text-right text-text-primary">إجمالي الإنفاق</th>
                                <th className="px-6 py-3 text-right text-text-primary">الحالة</th>
                                <th className="px-6 py-3 text-right text-text-primary">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="border-t border-border-color">
                                    <td className="px-6 py-4 text-text-primary">{user.email}</td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {new Date(user.createdAt).toLocaleDateString('ar-EG')}
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {user.totalPurchases || 0}
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        ${(user.totalSpent || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            user.isBlocked 
                                                ? 'bg-red-500/20 text-red-400' 
                                                : 'bg-green-500/20 text-green-400'
                                        }`}>
                                            {user.isBlocked ? 'محظور' : 'نشط'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button
                                                onClick={() => toggleUserBlock(user.id, user.isBlocked || false)}
                                                className={`transition-colors ${
                                                    user.isBlocked
                                                        ? 'text-green-400 hover:text-green-300'
                                                        : 'text-yellow-400 hover:text-yellow-300'
                                                }`}
                                                title={user.isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم'}
                                            >
                                                <i className={user.isBlocked ? 'fas fa-unlock' : 'fas fa-ban'}></i>
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                title="حذف المستخدم"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-text-secondary">
                        لا توجد مستخدمين مطابقين للبحث
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManager;