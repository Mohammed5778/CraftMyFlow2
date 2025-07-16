import React, { useState, useEffect } from 'react';
import { database } from '../../services/firebase';

interface PortfolioSection {
    id: string;
    name: string;
    title: { en: string; ar: string };
    isVisible: boolean;
    order: number;
    customContent?: string;
}

interface PortfolioStructureManagerProps {
    lang: 'en' | 'ar';
}

const PortfolioStructureManager: React.FC<PortfolioStructureManagerProps> = ({ lang }) => {
    const [sections, setSections] = useState<PortfolioSection[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSection, setEditingSection] = useState<PortfolioSection | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        title: { en: '', ar: '' },
        isVisible: true,
        order: 0,
        customContent: ''
    });

    const defaultSections = [
        { name: 'hero', title: { en: 'Hero Section', ar: 'القسم الرئيسي' } },
        { name: 'about', title: { en: 'About Section', ar: 'قسم من أنا' } },
        { name: 'services', title: { en: 'Services Section', ar: 'قسم الخدمات' } },
        { name: 'projects', title: { en: 'Projects Section', ar: 'قسم المشاريع' } },
        { name: 'contact', title: { en: 'Contact Section', ar: 'قسم التواصل' } },
        { name: 'community', title: { en: 'Community Section', ar: 'قسم المجتمع' } }
    ];

    useEffect(() => {
        loadPortfolioStructure();
    }, []);

    const loadPortfolioStructure = async () => {
        try {
            const structureSnapshot = await database.ref('portfolioStructure').once('value');
            
            if (structureSnapshot.exists()) {
                const structureData: PortfolioSection[] = [];
                structureSnapshot.forEach((child) => {
                    structureData.push({
                        id: child.key!,
                        ...child.val()
                    });
                });
                setSections(structureData.sort((a, b) => a.order - b.order));
            } else {
                // Initialize with default sections
                const initialSections = defaultSections.map((section, index) => ({
                    ...section,
                    id: section.name,
                    isVisible: true,
                    order: index,
                    customContent: ''
                }));
                
                // Save to database
                for (const section of initialSections) {
                    await database.ref(`portfolioStructure/${section.id}`).set(section);
                }
                
                setSections(initialSections);
            }
        } catch (error) {
            console.error('Error loading portfolio structure:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const sectionData = {
                ...formData,
                id: formData.name
            };

            await database.ref(`portfolioStructure/${sectionData.id}`).set(sectionData);
            
            if (editingSection) {
                setSections(sections.map(section => 
                    section.id === editingSection.id ? sectionData : section
                ));
            } else {
                setSections([...sections, sectionData].sort((a, b) => a.order - b.order));
            }
            
            resetForm();
            alert('تم حفظ القسم بنجاح!');
        } catch (error) {
            console.error('Error saving section:', error);
            alert('حدث خطأ أثناء حفظ القسم');
        }
    };

    const toggleSectionVisibility = async (sectionId: string, currentVisibility: boolean) => {
        try {
            await database.ref(`portfolioStructure/${sectionId}`).update({
                isVisible: !currentVisibility
            });
            
            setSections(sections.map(section => 
                section.id === sectionId 
                    ? { ...section, isVisible: !currentVisibility }
                    : section
            ));
        } catch (error) {
            console.error('Error updating section visibility:', error);
            alert('حدث خطأ أثناء تحديث حالة القسم');
        }
    };

    const updateSectionOrder = async (sectionId: string, newOrder: number) => {
        try {
            await database.ref(`portfolioStructure/${sectionId}`).update({
                order: newOrder
            });
            
            setSections(sections.map(section => 
                section.id === sectionId 
                    ? { ...section, order: newOrder }
                    : section
            ).sort((a, b) => a.order - b.order));
        } catch (error) {
            console.error('Error updating section order:', error);
            alert('حدث خطأ أثناء تحديث ترتيب القسم');
        }
    };

    const deleteSection = async (sectionId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
            try {
                await database.ref(`portfolioStructure/${sectionId}`).remove();
                setSections(sections.filter(section => section.id !== sectionId));
                alert('تم حذف القسم بنجاح!');
            } catch (error) {
                console.error('Error deleting section:', error);
                alert('حدث خطأ أثناء حذف القسم');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            title: { en: '', ar: '' },
            isVisible: true,
            order: sections.length,
            customContent: ''
        });
        setEditingSection(null);
        setShowForm(false);
    };

    const handleEdit = (section: PortfolioSection) => {
        setFormData({
            name: section.name,
            title: section.title,
            isVisible: section.isVisible,
            order: section.order,
            customContent: section.customContent || ''
        });
        setEditingSection(section);
        setShowForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-text-primary">هيكل البورتفوليو</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                    <i className="fas fa-plus ml-2"></i>
                    إضافة قسم جديد
                </button>
            </div>

            {showForm && (
                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <h3 className="text-xl font-bold text-text-primary mb-4">
                        {editingSection ? 'تعديل القسم' : 'إضافة قسم جديد'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-text-secondary mb-2">اسم القسم (معرف فريد)</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                placeholder="مثال: custom-section"
                                required
                                disabled={!!editingSection}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-text-secondary mb-2">عنوان القسم (عربي)</label>
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
                                <label className="block text-text-secondary mb-2">عنوان القسم (إنجليزي)</label>
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
                                <label className="block text-text-secondary mb-2">ترتيب القسم</label>
                                <input
                                    type="number"
                                    value={formData.order}
                                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.isVisible}
                                        onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                                        className="ml-2"
                                    />
                                    <span className="text-text-secondary">القسم مرئي</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-text-secondary mb-2">محتوى مخصص (HTML/React)</label>
                            <textarea
                                value={formData.customContent}
                                onChange={(e) => setFormData({ ...formData, customContent: e.target.value })}
                                className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary h-32 font-mono text-sm"
                                placeholder="يمكنك إضافة HTML أو JSX مخصص هنا..."
                            />
                        </div>

                        <div className="flex space-x-4 space-x-reverse">
                            <button
                                type="submit"
                                className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                            >
                                {editingSection ? 'تحديث القسم' : 'إضافة القسم'}
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

            {/* Sections List */}
            <div className="bg-secondary-dark rounded-lg border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-primary-dark">
                            <tr>
                                <th className="px-6 py-3 text-right text-text-primary">الترتيب</th>
                                <th className="px-6 py-3 text-right text-text-primary">اسم القسم</th>
                                <th className="px-6 py-3 text-right text-text-primary">العنوان</th>
                                <th className="px-6 py-3 text-right text-text-primary">الحالة</th>
                                <th className="px-6 py-3 text-right text-text-primary">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sections.map((section) => (
                                <tr key={section.id} className="border-t border-border-color">
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            value={section.order}
                                            onChange={(e) => updateSectionOrder(section.id, Number(e.target.value))}
                                            className="w-16 bg-primary-dark border border-border-color rounded px-2 py-1 text-text-primary text-sm"
                                            min="0"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-text-primary font-mono text-sm">{section.name}</td>
                                    <td className="px-6 py-4 text-text-primary">{section.title.ar}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleSectionVisibility(section.id, section.isVisible)}
                                            className={`px-3 py-1 rounded text-xs transition-colors ${
                                                section.isVisible
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                            }`}
                                        >
                                            {section.isVisible ? 'مرئي' : 'مخفي'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button
                                                onClick={() => handleEdit(section)}
                                                className="text-neon-blue hover:text-neon-blue/80 transition-colors"
                                                title="تعديل"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => deleteSection(section.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                title="حذف"
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
            </div>

            {/* Preview */}
            <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                <h3 className="text-xl font-bold text-text-primary mb-4">معاينة هيكل البورتفوليو</h3>
                <div className="space-y-2">
                    {sections
                        .filter(section => section.isVisible)
                        .sort((a, b) => a.order - b.order)
                        .map((section, index) => (
                            <div key={section.id} className="flex items-center space-x-4 space-x-reverse p-3 bg-primary-dark rounded">
                                <span className="text-text-secondary text-sm">{index + 1}.</span>
                                <span className="text-text-primary">{section.title.ar}</span>
                                <span className="text-text-secondary text-sm">({section.name})</span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default PortfolioStructureManager;