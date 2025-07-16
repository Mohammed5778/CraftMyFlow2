import React, { useState, useEffect } from 'react';
import { database } from '../../services/firebase';
import { Project } from '../../types';

interface ProjectManagerProps {
    lang: 'en' | 'ar';
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ lang }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        title: { en: '', ar: '' },
        category: { en: '', ar: '' },
        description: { en: '', ar: '' },
        link: '',
        image: '',
        problem: { en: '', ar: '' },
        solution: { en: '', ar: '' },
        visuals: [{ type: 'image' as 'image' | 'video', url: '' }],
        results: [{ value: '', label: { en: '', ar: '' } }],
        testimonial: { text: { en: '', ar: '' }, author: { en: '', ar: '' } },
        isPaid: false,
        price: 0,
        downloadLink: ''
    });

    useEffect(() => {
        loadProjects();
        loadCategories();
    }, []);

    const loadProjects = () => {
        database.ref('projects').on('value', (snapshot) => {
            const projectsData: Project[] = [];
            snapshot.forEach((child) => {
                projectsData.push({
                    id: child.key!,
                    ...child.val()
                });
            });
            setProjects(projectsData);
        });
    };

    const loadCategories = () => {
        database.ref('categories/projects').on('value', (snapshot) => {
            const categoriesData: string[] = [];
            snapshot.forEach((child) => {
                categoriesData.push(child.val());
            });
            setCategories(categoriesData);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProject) {
                await database.ref(`projects/${editingProject.id}`).update(formData);
            } else {
                await database.ref('projects').push(formData);
            }
            resetForm();
            alert('تم حفظ المشروع بنجاح!');
        } catch (error) {
            console.error('Error saving project:', error);
            alert('حدث خطأ أثناء حفظ المشروع');
        }
    };

    const handleDelete = async (projectId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
            try {
                await database.ref(`projects/${projectId}`).remove();
                alert('تم حذف المشروع بنجاح!');
            } catch (error) {
                console.error('Error deleting project:', error);
                alert('حدث خطأ أثناء حذف المشروع');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            title: { en: '', ar: '' },
            category: { en: '', ar: '' },
            description: { en: '', ar: '' },
            link: '',
            image: '',
            problem: { en: '', ar: '' },
            solution: { en: '', ar: '' },
            visuals: [{ type: 'image', url: '' }],
            results: [{ value: '', label: { en: '', ar: '' } }],
            testimonial: { text: { en: '', ar: '' }, author: { en: '', ar: '' } },
            isPaid: false,
            price: 0,
            downloadLink: ''
        });
        setEditingProject(null);
        setShowForm(false);
    };

    const handleEdit = (project: Project) => {
        setFormData(project);
        setEditingProject(project);
        setShowForm(true);
    };

    const addVisual = () => {
        setFormData({
            ...formData,
            visuals: [...formData.visuals, { type: 'image', url: '' }]
        });
    };

    const addResult = () => {
        setFormData({
            ...formData,
            results: [...formData.results, { value: '', label: { en: '', ar: '' } }]
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-text-primary">إدارة المشاريع</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                    <i className="fas fa-plus ml-2"></i>
                    إضافة مشروع جديد
                </button>
            </div>

            {showForm && (
                <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                    <h3 className="text-xl font-bold text-text-primary mb-4">
                        {editingProject ? 'تعديل المشروع' : 'إضافة مشروع جديد'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-text-secondary mb-2">العنوان (عربي)</label>
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
                                <label className="block text-text-secondary mb-2">العنوان (إنجليزي)</label>
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
                                <label className="block text-text-secondary mb-2">التصنيف (عربي)</label>
                                <select
                                    value={formData.category.ar}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        category: { ...formData.category, ar: e.target.value }
                                    })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary form-select"
                                    required
                                >
                                    <option value="">اختر التصنيف</option>
                                    {categories.map((category, index) => (
                                        <option key={index} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-text-secondary mb-2">التصنيف (إنجليزي)</label>
                                <input
                                    type="text"
                                    value={formData.category.en}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        category: { ...formData.category, en: e.target.value }
                                    })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-text-secondary mb-2">رابط الصورة الرئيسية</label>
                            <input
                                type="url"
                                value={formData.image}
                                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-text-secondary mb-2">الوصف (عربي)</label>
                                <textarea
                                    value={formData.description.ar}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        description: { ...formData.description, ar: e.target.value }
                                    })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary h-24"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-text-secondary mb-2">الوصف (إنجليزي)</label>
                                <textarea
                                    value={formData.description.en}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        description: { ...formData.description, en: e.target.value }
                                    })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary h-24"
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
                                <span className="text-text-secondary">مشروع مدفوع</span>
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

                        {formData.isPaid && (
                            <div>
                                <label className="block text-text-secondary mb-2">رابط التحميل</label>
                                <input
                                    type="url"
                                    value={formData.downloadLink}
                                    onChange={(e) => setFormData({ ...formData, downloadLink: e.target.value })}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary"
                                />
                            </div>
                        )}

                        <div className="flex space-x-4 space-x-reverse">
                            <button
                                type="submit"
                                className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                            >
                                {editingProject ? 'تحديث المشروع' : 'إضافة المشروع'}
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

            {/* Projects List */}
            <div className="bg-secondary-dark rounded-lg border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-primary-dark">
                            <tr>
                                <th className="px-6 py-3 text-right text-text-primary">العنوان</th>
                                <th className="px-6 py-3 text-right text-text-primary">التصنيف</th>
                                <th className="px-6 py-3 text-right text-text-primary">النوع</th>
                                <th className="px-6 py-3 text-right text-text-primary">السعر</th>
                                <th className="px-6 py-3 text-right text-text-primary">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map((project) => (
                                <tr key={project.id} className="border-t border-border-color">
                                    <td className="px-6 py-4 text-text-primary">{project.title.ar}</td>
                                    <td className="px-6 py-4 text-text-secondary">{project.category.ar}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            project.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {project.isPaid ? 'مدفوع' : 'مجاني'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary">
                                        {project.isPaid ? `$${project.price}` : 'مجاني'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button
                                                onClick={() => handleEdit(project)}
                                                className="text-neon-blue hover:text-neon-blue/80 transition-colors"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(project.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
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
        </div>
    );
};

export default ProjectManager;