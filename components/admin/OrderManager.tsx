import React, { useState, useEffect } from 'react';
import { database } from '../../services/firebase';

interface Order {
    id: string;
    userId: string;
    userEmail: string;
    itemId: string;
    itemTitle: string;
    itemType: 'project' | 'service' | 'course';
    amount: number;
    status: 'pending' | 'completed' | 'cancelled' | 'refunded';
    paymentMethod: string;
    createdAt: string;
    completedAt?: string;
    notes?: string;
}

interface OrderManagerProps {
    lang: 'en' | 'ar';
}

const OrderManager: React.FC<OrderManagerProps> = ({ lang }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const ordersSnapshot = await database.ref('orders').once('value');
            const ordersData: Order[] = [];
            
            ordersSnapshot.forEach((child) => {
                ordersData.push({
                    id: child.key!,
                    ...child.val()
                });
            });

            setOrders(ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setLoading(false);
        } catch (error) {
            console.error('Error loading orders:', error);
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: Order['status'], notes?: string) => {
        try {
            const updateData: any = { 
                status: newStatus,
                updatedAt: new Date().toISOString()
            };
            
            if (newStatus === 'completed') {
                updateData.completedAt = new Date().toISOString();
            }
            
            if (notes) {
                updateData.notes = notes;
            }

            await database.ref(`orders/${orderId}`).update(updateData);
            
            setOrders(orders.map(order => 
                order.id === orderId 
                    ? { ...order, ...updateData }
                    : order
            ));
            
            alert('تم تحديث حالة الطلب بنجاح');
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('حدث خطأ أثناء تحديث حالة الطلب');
        }
    };

    const deleteOrder = async (orderId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
            try {
                await database.ref(`orders/${orderId}`).remove();
                setOrders(orders.filter(order => order.id !== orderId));
                alert('تم حذف الطلب بنجاح');
            } catch (error) {
                console.error('Error deleting order:', error);
                alert('حدث خطأ أثناء حذف الطلب');
            }
        }
    };

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'completed':
                return 'bg-green-500/20 text-green-400';
            case 'cancelled':
                return 'bg-red-500/20 text-red-400';
            case 'refunded':
                return 'bg-purple-500/20 text-purple-400';
            default:
                return 'bg-gray-500/20 text-gray-400';
        }
    };

    const getStatusText = (status: Order['status']) => {
        switch (status) {
            case 'pending':
                return 'في الانتظار';
            case 'completed':
                return 'مكتمل';
            case 'cancelled':
                return 'ملغي';
            case 'refunded':
                return 'مسترد';
            default:
                return status;
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = 
            order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.itemTitle.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        
        return matchesSearch && matchesStatus;
    });

    const totalRevenue = orders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + order.amount, 0);

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
                <h2 className="text-3xl font-bold text-text-primary">إدارة الطلبات</h2>
                <div className="text-text-secondary">
                    إجمالي الإيرادات: ${totalRevenue.toFixed(2)}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-secondary-dark p-4 rounded-lg border border-border-color">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">
                            {orders.filter(o => o.status === 'pending').length}
                        </p>
                        <p className="text-text-secondary text-sm">في الانتظار</p>
                    </div>
                </div>
                <div className="bg-secondary-dark p-4 rounded-lg border border-border-color">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">
                            {orders.filter(o => o.status === 'completed').length}
                        </p>
                        <p className="text-text-secondary text-sm">مكتملة</p>
                    </div>
                </div>
                <div className="bg-secondary-dark p-4 rounded-lg border border-border-color">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-red-400">
                            {orders.filter(o => o.status === 'cancelled').length}
                        </p>
                        <p className="text-text-secondary text-sm">ملغية</p>
                    </div>
                </div>
                <div className="bg-secondary-dark p-4 rounded-lg border border-border-color">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">
                            {orders.filter(o => o.status === 'refunded').length}
                        </p>
                        <p className="text-text-secondary text-sm">مستردة</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-secondary-dark p-4 rounded-lg border border-border-color">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="البحث بالبريد الإلكتروني أو اسم المنتج..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                        />
                    </div>
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary form-select"
                        >
                            <option value="all">جميع الطلبات</option>
                            <option value="pending">في الانتظار</option>
                            <option value="completed">مكتملة</option>
                            <option value="cancelled">ملغية</option>
                            <option value="refunded">مستردة</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-secondary-dark rounded-lg border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-primary-dark">
                            <tr>
                                <th className="px-6 py-3 text-right text-text-primary">رقم الطلب</th>
                                <th className="px-6 py-3 text-right text-text-primary">العميل</th>
                                <th className="px-6 py-3 text-right text-text-primary">المنتج</th>
                                <th className="px-6 py-3 text-right text-text-primary">المبلغ</th>
                                <th className="px-6 py-3 text-right text-text-primary">الحالة</th>
                                <th className="px-6 py-3 text-right text-text-primary">التاريخ</th>
                                <th className="px-6 py-3 text-right text-text-primary">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order) => (
                                <tr key={order.id} className="border-t border-border-color">
                                    <td className="px-6 py-4 text-text-primary font-mono text-sm">
                                        #{order.id.substring(0, 8)}
                                    </td>
                                    <td className="px-6 py-4 text-text-primary">{order.userEmail}</td>
                                    <td className="px-6 py-4 text-text-secondary">{order.itemTitle}</td>
                                    <td className="px-6 py-4 text-text-primary font-semibold">
                                        ${order.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setShowOrderDetails(true);
                                                }}
                                                className="text-neon-blue hover:text-neon-blue/80 transition-colors"
                                                title="عرض التفاصيل"
                                            >
                                                <i className="fas fa-eye"></i>
                                            </button>
                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'completed')}
                                                    className="text-green-400 hover:text-green-300 transition-colors"
                                                    title="تأكيد الطلب"
                                                >
                                                    <i className="fas fa-check"></i>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteOrder(order.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                title="حذف الطلب"
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
                
                {filteredOrders.length === 0 && (
                    <div className="text-center py-8 text-text-secondary">
                        لا توجد طلبات مطابقة للبحث
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {showOrderDetails && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-secondary-dark p-6 rounded-lg border border-border-color max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-text-primary">
                                تفاصيل الطلب #{selectedOrder.id.substring(0, 8)}
                            </h3>
                            <button
                                onClick={() => setShowOrderDetails(false)}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-secondary text-sm mb-1">العميل</label>
                                    <p className="text-text-primary">{selectedOrder.userEmail}</p>
                                </div>
                                <div>
                                    <label className="block text-text-secondary text-sm mb-1">المنتج</label>
                                    <p className="text-text-primary">{selectedOrder.itemTitle}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-secondary text-sm mb-1">المبلغ</label>
                                    <p className="text-text-primary font-semibold">${selectedOrder.amount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <label className="block text-text-secondary text-sm mb-1">طريقة الدفع</label>
                                    <p className="text-text-primary">{selectedOrder.paymentMethod}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-secondary text-sm mb-1">تاريخ الطلب</label>
                                    <p className="text-text-primary">
                                        {new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-text-secondary text-sm mb-1">الحالة</label>
                                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedOrder.status)}`}>
                                        {getStatusText(selectedOrder.status)}
                                    </span>
                                </div>
                            </div>
                            
                            {selectedOrder.notes && (
                                <div>
                                    <label className="block text-text-secondary text-sm mb-1">ملاحظات</label>
                                    <p className="text-text-primary bg-primary-dark p-3 rounded">{selectedOrder.notes}</p>
                                </div>
                            )}
                            
                            <div className="flex space-x-2 space-x-reverse pt-4">
                                {selectedOrder.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                updateOrderStatus(selectedOrder.id, 'completed');
                                                setShowOrderDetails(false);
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                                        >
                                            تأكيد الطلب
                                        </button>
                                        <button
                                            onClick={() => {
                                                updateOrderStatus(selectedOrder.id, 'cancelled');
                                                setShowOrderDetails(false);
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                                        >
                                            إلغاء الطلب
                                        </button>
                                    </>
                                )}
                                {selectedOrder.status === 'completed' && (
                                    <button
                                        onClick={() => {
                                            updateOrderStatus(selectedOrder.id, 'refunded');
                                            setShowOrderDetails(false);
                                        }}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                                    >
                                        استرداد المبلغ
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManager;