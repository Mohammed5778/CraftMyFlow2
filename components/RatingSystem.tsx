import React, { useState, useEffect } from 'react';
import { database, auth } from '../services/firebase';

interface Rating {
    id: string;
    userId: string;
    userEmail: string;
    itemId: string;
    itemType: 'project' | 'service' | 'post';
    rating: number;
    review?: string;
    createdAt: string;
}

interface RatingSystemProps {
    itemId: string;
    itemType: 'project' | 'service' | 'post';
    lang: 'en' | 'ar';
}

const RatingSystem: React.FC<RatingSystemProps> = ({ itemId, itemType, lang }) => {
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [userRating, setUserRating] = useState<Rating | null>(null);
    const [showRatingForm, setShowRatingForm] = useState(false);
    const [newRating, setNewRating] = useState(0);
    const [newReview, setNewReview] = useState('');
    const [averageRating, setAverageRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);

    useEffect(() => {
        loadRatings();
    }, [itemId]);

    const loadRatings = () => {
        database.ref(`ratings/${itemType}/${itemId}`).on('value', (snapshot) => {
            const ratingsData: Rating[] = [];
            snapshot.forEach((child) => {
                ratingsData.push({
                    id: child.key!,
                    ...child.val()
                });
            });
            
            setRatings(ratingsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            
            // Calculate average rating
            if (ratingsData.length > 0) {
                const avg = ratingsData.reduce((sum, rating) => sum + rating.rating, 0) / ratingsData.length;
                setAverageRating(Math.round(avg * 10) / 10);
            } else {
                setAverageRating(0);
            }
            setTotalRatings(ratingsData.length);
            
            // Check if current user has rated
            const user = auth.currentUser;
            if (user) {
                const existingRating = ratingsData.find(r => r.userId === user.uid);
                setUserRating(existingRating || null);
            }
        });
    };

    const submitRating = async () => {
        const user = auth.currentUser;
        if (!user || newRating === 0) return;

        try {
            const ratingData = {
                userId: user.uid,
                userEmail: user.email,
                itemId,
                itemType,
                rating: newRating,
                review: newReview.trim(),
                createdAt: new Date().toISOString()
            };

            if (userRating) {
                // Update existing rating
                await database.ref(`ratings/${itemType}/${itemId}/${userRating.id}`).update(ratingData);
            } else {
                // Add new rating
                await database.ref(`ratings/${itemType}/${itemId}`).push(ratingData);
            }

            setShowRatingForm(false);
            setNewRating(0);
            setNewReview('');
            
            // Send notification to admin
            await database.ref('notifications/admin').push({
                title: 'تقييم جديد',
                message: `تم إضافة تقييم جديد ${newRating}/5 على ${itemType}`,
                type: 'info',
                isRead: false,
                createdAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('حدث خطأ أثناء إرسال التقييم');
        }
    };

    const deleteRating = async (ratingId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
            try {
                await database.ref(`ratings/${itemType}/${itemId}/${ratingId}`).remove();
            } catch (error) {
                console.error('Error deleting rating:', error);
                alert('حدث خطأ أثناء حذف التقييم');
            }
        }
    };

    const renderStars = (rating: number, interactive: boolean = false, onStarClick?: (star: number) => void) => {
        return (
            <div className="flex space-x-1 space-x-reverse">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => interactive && onStarClick && onStarClick(star)}
                        className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-400'
                        }`}
                        disabled={!interactive}
                    >
                        <i className="fas fa-star"></i>
                    </button>
                ))}
            </div>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Rating Summary */}
            <div className="bg-secondary-dark p-6 rounded-lg border border-border-color">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-neon-cyan">{averageRating}</div>
                            <div className="text-text-secondary text-sm">من 5</div>
                        </div>
                        <div>
                            {renderStars(averageRating)}
                            <div className="text-text-secondary text-sm mt-1">
                                {totalRatings} تقييم
                            </div>
                        </div>
                    </div>
                    
                    {auth.currentUser && (
                        <button
                            onClick={() => setShowRatingForm(!showRatingForm)}
                            className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                            {userRating ? 'تعديل تقييمي' : 'أضف تقييم'}
                        </button>
                    )}
                </div>

                {/* Rating Form */}
                {showRatingForm && (
                    <div className="border-t border-border-color pt-4">
                        <h4 className="text-lg font-semibold text-text-primary mb-4">
                            {userRating ? 'تعديل تقييمك' : 'أضف تقييمك'}
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-text-secondary mb-2">التقييم</label>
                                {renderStars(newRating, true, setNewRating)}
                            </div>
                            <div>
                                <label className="block text-text-secondary mb-2">المراجعة (اختياري)</label>
                                <textarea
                                    value={newReview}
                                    onChange={(e) => setNewReview(e.target.value)}
                                    className="w-full bg-primary-dark border border-border-color rounded-lg px-4 py-2 text-text-primary h-24"
                                    placeholder="شاركنا رأيك..."
                                />
                            </div>
                            <div className="flex space-x-4 space-x-reverse">
                                <button
                                    onClick={submitRating}
                                    disabled={newRating === 0}
                                    className="bg-neon-cyan hover:bg-neon-cyan/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-bg-color px-6 py-2 rounded-lg font-semibold transition-colors"
                                >
                                    {userRating ? 'تحديث التقييم' : 'إرسال التقييم'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRatingForm(false);
                                        setNewRating(userRating?.rating || 0);
                                        setNewReview(userRating?.review || '');
                                    }}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reviews List */}
            {ratings.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-text-primary">المراجعات</h4>
                    {ratings.map((rating) => (
                        <div key={rating.id} className="bg-secondary-dark p-4 rounded-lg border border-border-color">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 space-x-reverse mb-2">
                                        <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center">
                                            <i className="fas fa-user text-neon-cyan text-sm"></i>
                                        </div>
                                        <div>
                                            <div className="text-text-primary font-medium">
                                                {rating.userEmail.split('@')[0]}
                                            </div>
                                            <div className="text-text-secondary text-sm">
                                                {formatDate(rating.createdAt)}
                                            </div>
                                        </div>
                                        {renderStars(rating.rating)}
                                    </div>
                                    {rating.review && (
                                        <p className="text-text-secondary mt-2">{rating.review}</p>
                                    )}
                                </div>
                                
                                {auth.currentUser && (auth.currentUser.uid === rating.userId || auth.currentUser.email === 'mabda724@gmail.com') && (
                                    <button
                                        onClick={() => deleteRating(rating.id)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RatingSystem;