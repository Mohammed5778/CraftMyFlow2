import React, { useState, useEffect } from 'react';
import { database } from '../../services/firebase';

interface ContentItem {
    id: string;
    title: string;
    description: string;
    type: 'image' | 'video' | 'document' | 'course' | 'template';
    url: string;
    category: string;
    isPaid: boolean;
    price: number;
    downloadCount: number;
    createdAt: string;
    tags: string[];
}

interface ContentManagerProps {
    lang: 'en' | 'ar';
}

const ContentManager: React.FC<ContentManagerProps> = ({ lang }) => {
    const [content, setContent] = useState<ContentItem[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'image' as ContentItem['type'],
        url: '',
        category: '',
        isPaid: false,
        price: 0,
        tags: ['']
    });

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = () => {
        database.ref('content').on('value', (snapshot) => {
            const contentData: ContentItem[] = [];
            snapshot.forEach((child) => {
                contentData.push({
                    id: child.key!,
                    ...child.val()
                });
            });
            setContent(contentData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const contentData = {
                ...formData,
                downloadCount: 0,
                createdAt: new Date().toISOString(),
                tags: formData.tags.filter(tag => tag.trim() !== '')
            };

            if (editingContent) {
                await database.ref(`content/${editingContent.id}`).update(contentData);
            } else {
                await database.ref('content').push(contentData);
            }
            resetForm();
            alert('تم حفظ المحتوى بنجاح!');
        } catch (error) {
            console.error('Error saving content:', error);
            alert('حدث خطأ أثناء حفظ المحتوى');
        }
    };

    const handleDelete = async (contentId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
            try {
                await database.ref(`content/${contentId}`).remove();
                alert('تم حذف المحتوى بنجاح!');
            } catch (error) {
                console.error('Error deleting content:', error);
                alert('حدث خطأ أثناء حذف المحتوى');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            type: 'image',
            url: '',
            category: '',
            isPaid: false,
            price: 0,
            tags: ['']
        });
        setEditingContent(null);
        setShowForm(false);
    };

    const handleEdit = (contentItem: ContentItem) => {
        setFormData({
            title: contentItem.title,
            description: contentItem.description,
            type: contentItem.type,
            url: contentItem.url,
            category: contentItem.category,
            isPaid: contentItem.isPaid,
            price: contentItem.price,
            tags: contentItem.tags.length > 0 ? contentItem.tags : ['']
        });
        setEditingContent(contentItem);
        setShowForm(true);
    };

    const addTag = () => {
        setFormData({
            ...formData,
            tags: [...formData.tags, '']
        });
    };

    const updateTag = (index: number, value: string) => {
        const newTags = [...formData.tags];
        newTags[index] = value;
        setFormData({ ...formData, tags: newTags });
    };

    const removeTag = (index: number) => {
        const newTags = formData.tags.filter((_, i) => i !== index);
        setFormData({ ...formData, tags: newTags });
    };

    const getTypeIcon = (type: ContentItem['type']) => {
        switch (type) {
            case 'image':
                return 'fas fa-image';
            case 'video':
                return 'fas fa-video';
            case 'document':
                return 'fas fa-file-alt';
            case 'course':
                return 'fas fa-graduation-cap';
            case 'template':
                return 'fas fa-code';
            default:
                return 'fas fa-file';
        }
    };

    const getTypeText = (type: ContentItem['type']) => {
        switch (type) {
            case 'image':
                return 'صورة';
            case 'video':
                return 'فيديو';
            case 'document':
                return 'مستند';
            case 'course':
                return 'كورس';
            case 'template':
                return 'قالب';
            default:
                return type;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-text-primary">إدارة المحتوى</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                    <i className="fas fa-plus ml-2"></i>
                    إضافة محتوى جديد
                </button>
            </div>

            {showForm && (
                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <h3 className="text-xl font-bold text-text-primary mb-4">
                        {editingContent ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-text-secondary mb-2">العنوان</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-text-secondary mb-2">النوع</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ContentItem['type'] })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary form-select"
                                    required
                                >
                                    <option value="image">صورة</option>
                                    <option value="video">فيديو</option>
                                    <option value="document">مستند</option>
                                    <option value="course">كورس</option>
                                    <option value="template">قالب</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-text-secondary mb-2">الوصف</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary h-24"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-text-secondary mb-2">رابط المحتوى</label>
                                <input
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-text-secondary mb-2">التصنيف</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 space-x-reverse">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.isPaid}
                                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                                    className="ml-2"
                                />
                                <span className="text-text-secondary">محتوى مدفوع</span>
                            </label>
                            {formData.isPaid && (
                                <div>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                        placeholder="السعر بالدولار"
                                        className="bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-text-secondary mb-2">العلامات (Tags)</label>
                            {formData.tags.map((tag, index) => (
                                <div key={index} className="flex items-center space-x-2 space-x-reverse mb-2">
                                    <input
                                        type="text"
                                        value={tag}
                                        onChange={(e) => updateTag(index, e.target.value)}
                                        className="flex-1 bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                        placeholder="علامة"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeTag(index)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addTag}
                                className="text-neon-cyan hover:text-neon-cyan/80 transition-colors"
                            >
                                <i className="fas fa-plus ml-1"></i>
                                إضافة علامة
                            </button>
                        </div>

                        <div className="flex space-x-4 space-x-reverse">
                            <button
                                type="submit"
                                className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                            >
                                {editingContent ? 'تحديث المحتوى' : 'إضافة المحتوى'}
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

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content.map((item) => (
                    <div key={item.id} className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2 space-x-reverse">
                                <i className={`${getTypeIcon(item.type)} text-neon-cyan`}></i>
                                <span className="text-text-secondary text-sm">{getTypeText(item.type)}</span>
                            </div>
                            <div className="flex space-x-2 space-x-reverse">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="text-neon-blue hover:text-neon-blue/80 transition-colors"
                                >
                                    <i className="fas fa-edit"></i>
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-text-primary mb-2">{item.title}</h3>
                        <p className="text-text-secondary text-sm mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="flex items-center justify-between mb-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                                item.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                                {item.isPaid ? `$${item.price}` : 'مجاني'}
                            </span>
                            <span className="text-text-secondary text-xs">
                                <i className="fas fa-download ml-1"></i>
                                {item.downloadCount}
                            </span>
                        </div>
                        
                        {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {item.tags.map((tag, index) => (
                                    <span key={index} className="bg-primary-dark text-text-secondary px-2 py-1 rounded text-xs">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {content.length === 0 && (
                <div className="text-center py-12 text-text-secondary">
                    لا يوجد محتوى متاح حالياً
                </div>
            )}
        </div>
    );
};

export default ContentManager;