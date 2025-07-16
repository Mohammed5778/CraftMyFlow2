import React, { useState, useEffect } from 'react';
import { database } from '../../services/firebase';

interface CategoryManagerProps {
    lang: 'en' | 'ar';
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ lang }) => {
    const [projectCategories, setProjectCategories] = useState<string[]>([]);
    const [serviceCategories, setServiceCategories] = useState<string[]>([]);
    const [newProjectCategory, setNewProjectCategory] = useState('');
    const [newServiceCategory, setNewServiceCategory] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = () => {
        // Load project categories
        database.ref('categories/projects').on('value', (snapshot) => {
            const categories: string[] = [];
            snapshot.forEach((child) => {
                categories.push(child.val());
            });
            setProjectCategories(categories);
        });

        // Load service categories
        database.ref('categories/services').on('value', (snapshot) => {
            const categories: string[] = [];
            snapshot.forEach((child) => {
                categories.push(child.val());
            });
            setServiceCategories(categories);
        });
    };

    const addProjectCategory = async () => {
        if (newProjectCategory.trim()) {
            try {
                await database.ref('categories/projects').push(newProjectCategory.trim());
                setNewProjectCategory('');
                alert('تم إضافة التصنيف بنجاح!');
            } catch (error) {
                console.error('Error adding category:', error);
                alert('حدث خطأ أثناء إضافة التصنيف');
            }
        }
    };

    const addServiceCategory = async () => {
        if (newServiceCategory.trim()) {
            try {
                await database.ref('categories/services').push(newServiceCategory.trim());
                setNewServiceCategory('');
                alert('تم إضافة التصنيف بنجاح!');
            } catch (error) {
                console.error('Error adding category:', error);
                alert('حدث خطأ أثناء إضافة التصنيف');
            }
        }
    };

    const deleteProjectCategory = async (categoryId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
            try {
                await database.ref(`categories/projects/${categoryId}`).remove();
                alert('تم حذف التصنيف بنجاح!');
            } catch (error) {
                console.error('Error deleting category:', error);
                alert('حدث خطأ أثناء حذف التصنيف');
            }
        }
    };

    const deleteServiceCategory = async (categoryId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
            try {
                await database.ref(`categories/services/${categoryId}`).remove();
                alert('تم حذف التصنيف بنجاح!');
            } catch (error) {
                console.error('Error deleting category:', error);
                alert('حدث خطأ أثناء حذف التصنيف');
            }
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-text-primary">إدارة التصنيفات</h2>

            {/* Project Categories */}
            <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                <h3 className="text-xl font-bold text-text-primary mb-4">تصنيفات المشاريع</h3>
                
                <div className="flex space-x-4 space-x-reverse mb-6">
                    <input
                        type="text"
                        value={newProjectCategory}
                        onChange={(e) => setNewProjectCategory(e.target.value)}
                        placeholder="اسم التصنيف الجديد"
                        className="flex-1 bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                        onKeyPress={(e) => e.key === 'Enter' && addProjectCategory()}
                    />
                    <button
                        onClick={addProjectCategory}
                        className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                        إضافة
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectCategories.map((category, index) => (
                        <div key={index} className="bg-primary-dark p-4 rounded-lg border border-border-color flex items-center justify-between">
                            <span className="text-text-primary">{category}</span>
                            <button
                                onClick={() => deleteProjectCategory(index.toString())}
                                className="text-red-400 hover:text-red-300 transition-colors"
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Service Categories */}
            <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                <h3 className="text-xl font-bold text-text-primary mb-4">تصنيفات الخدمات</h3>
                
                <div className="flex space-x-4 space-x-reverse mb-6">
                    <input
                        type="text"
                        value={newServiceCategory}
                        onChange={(e) => setNewServiceCategory(e.target.value)}
                        placeholder="اسم التصنيف الجديد"
                        className="flex-1 bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                        onKeyPress={(e) => e.key === 'Enter' && addServiceCategory()}
                    />
                    <button
                        onClick={addServiceCategory}
                        className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                        إضافة
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {serviceCategories.map((category, index) => (
                        <div key={index} className="bg-primary-dark p-4 rounded-lg border border-border-color flex items-center justify-between">
                            <span className="text-text-primary">{category}</span>
                            <button
                                onClick={() => deleteServiceCategory(index.toString())}
                                className="text-red-400 hover:text-red-300 transition-colors"
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryManager;