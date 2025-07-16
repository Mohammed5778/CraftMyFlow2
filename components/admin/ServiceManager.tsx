import React, { useState, useEffect } from 'react';
import { database } from '../../services/firebase';
import { Service } from '../../types';

interface ServiceManagerProps {
    lang: 'en' | 'ar';
}

const ServiceManager: React.FC<ServiceManagerProps> = ({ lang }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({
        icon: '',
        title: { en: '', ar: '' },
        desc: { en: '', ar: '' },
        isPaid: false,
        price: 0,
        features: [''],
        deliveryTime: '',
        category: ''
    });

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = () => {
        database.ref('services').on('value', (snapshot) => {
            const servicesData: Service[] = [];
            snapshot.forEach((child) => {
                servicesData.push({
                    id: child.key!,
                    ...child.val()
                });
            });
            setServices(servicesData);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingService) {
                await database.ref(`services/${editingService.id}`).update(formData);
            } else {
                await database.ref('services').push(formData);
            }
            resetForm();
            alert('تم حفظ الخدمة بنجاح!');
        } catch (error) {
            console.error('Error saving service:', error);
            alert('حدث خطأ أثناء حفظ الخدمة');
        }
    };

    const handleDelete = async (serviceId: string) => {
        if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
            try {
                await database.ref(`services/${serviceId}`).remove();
                alert('تم حذف الخدمة بنجاح!');
            } catch (error) {
                console.error('Error deleting service:', error);
                alert('حدث خطأ أثناء حذف الخدمة');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            icon: '',
            title: { en: '', ar: '' },
            desc: { en: '', ar: '' },
            isPaid: false,
            price: 0,
            features: [''],
            deliveryTime: '',
            category: ''
        });
        setEditingService(null);
        setShowForm(false);
    };

    const handleEdit = (service: Service) => {
        setFormData(service);
        setEditingService(service);
        setShowForm(true);
    };

    const addFeature = () => {
        setFormData({
            ...formData,
            features: [...formData.features, '']
        });
    };

    const updateFeature = (index: number, value: string) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = value;
        setFormData({ ...formData, features: newFeatures });
    };

    const removeFeature = (index: number) => {
        const newFeatures = formData.features.filter((_, i) => i !== index);
        setFormData({ ...formData, features: newFeatures });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-text-primary">إدارة الخدمات</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                    <i className="fas fa-plus ml-2"></i>
                    إضافة خدمة جديدة
                </button>
            </div>

            {showForm && (
                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <h3 className="text-xl font-bold text-text-primary mb-4">
                        {editingService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-text-secondary mb-2">أيقونة الخدمة (Font Awesome class)</label>
                            <input
                                type="text"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                placeholder="مثال: fas fa-cogs"
                                className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-text-secondary mb-2">عنوان الخدمة (عربي)</label>
                                <input
                                    type="text"
                                    value={formData.title.ar}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        title: { ...formData.title, ar: e.target.value }
                                    })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-text-secondary mb-2">عنوان الخدمة (إنجليزي)</label>
                                <input
                                    type="text"
                                    value={formData.title.en}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        title: { ...formData.title, en: e.target.value }
                                    })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-text-secondary mb-2">وصف الخدمة (عربي)</label>
                                <textarea
                                    value={formData.desc.ar}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        desc: { ...formData.desc, ar: e.target.value }
                                    })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary h-24"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-text-secondary mb-2">وصف الخدمة (إنجليزي)</label>
                                <textarea
                                    value={formData.desc.en}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        desc: { ...formData.desc, en: e.target.value }
                                    })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary h-24"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-text-secondary mb-2">التصنيف</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-text-secondary mb-2">مدة التسليم</label>
                                <input
                                    type="text"
                                    value={formData.deliveryTime}
                                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                                    placeholder="مثال: 3-5 أيام"
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                />
                            </div>
                            <div className="flex items-center space-x-4 space-x-reverse">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPaid}
                                        onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                                        className="ml-2"
                                    />
                                    <span className="text-text-secondary">خدمة مدفوعة</span>
                                </label>
                                {formData.isPaid && (
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                        placeholder="السعر"
                                        className="bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                        min="0"
                                        step="0.01"
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-text-secondary mb-2">مميزات الخدمة</label>
                            {formData.features.map((feature, index) => (
                                <div key={index} className="flex items-center space-x-2 space-x-reverse mb-2">
                                    <input
                                        type="text"
                                        value={feature}
                                        onChange={(e) => updateFeature(index, e.target.value)}
                                        className="flex-1 bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                        placeholder="ميزة الخدمة"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeFeature(index)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addFeature}
                                className="text-neon-cyan hover:text-neon-cyan/80 transition-colors"
                            >
                                <i className="fas fa-plus ml-1"></i>
                                إضافة ميزة
                            </button>
                        </div>

                        <div className="flex space-x-4 space-x-reverse">
                            <button
                                type="submit"
                                className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                            >
                                {editingService ? 'تحديث الخدمة' : 'إضافة الخدمة'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Services List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                    <div key={service.id} className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                        <div className="flex items-center justify-between mb-4">
                            <i className={`${service.icon} text-2xl text-neon-cyan`}></i>
                            <div className="flex space-x-2 space-x-reverse">
                                <button
                                    onClick={() => handleEdit(service)}
                                    className="text-neon-blue hover:text-neon-blue/80 transition-colors"
                                >
                                    <i className="fas fa-edit"></i>
                                </button>
                                <button
                                    onClick={() => handleDelete(service.id)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">{service.title.ar}</h3>
                        <p className="text-text-secondary text-sm mb-4">{service.desc.ar}</p>
                        <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded text-xs ${
                                service.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                                {service.isPaid ? `$${service.price}` : 'مجاني'}
                            </span>
                            {service.deliveryTime && (
                                <span className="text-text-secondary text-xs">{service.deliveryTime}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ServiceManager;