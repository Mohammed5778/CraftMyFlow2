import React, { useState, useEffect } from 'react';
import { database } from '../services/firebase';
import { Project, Service, CommunityPost } from '../types';

interface SearchResult {
    id: string;
    title: string;
    description: string;
    type: 'project' | 'service' | 'post';
    category?: string;
    image?: string;
    url?: string;
    relevanceScore: number;
}

interface SearchSystemProps {
    lang: 'en' | 'ar';
    onResultClick?: (result: SearchResult) => void;
}

const SearchSystem: React.FC<SearchSystemProps> = ({ lang, onResultClick }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [popularSearches, setPopularSearches] = useState<string[]>([]);
    const [filters, setFilters] = useState({
        type: 'all',
        category: 'all',
        sortBy: 'relevance'
    });

    useEffect(() => {
        loadSearchHistory();
        loadPopularSearches();
    }, []);

    useEffect(() => {
        if (searchQuery.trim().length > 2) {
            const debounceTimer = setTimeout(() => {
                performSearch();
            }, 300);
            return () => clearTimeout(debounceTimer);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }
    }, [searchQuery, filters]);

    const loadSearchHistory = () => {
        const history = localStorage.getItem('searchHistory');
        if (history) {
            setSearchHistory(JSON.parse(history));
        }
    };

    const loadPopularSearches = async () => {
        try {
            const popularSnapshot = await database.ref('analytics/popularSearches').once('value');
            const popular = popularSnapshot.val() || {};
            const sortedPopular = Object.entries(popular)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([term]) => term);
            setPopularSearches(sortedPopular);
        } catch (error) {
            console.error('Error loading popular searches:', error);
        }
    };

    const saveSearchToHistory = (query: string) => {
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        
        // Track search analytics
        database.ref(`analytics/searches/${new Date().toISOString().split('T')[0]}`).transaction((current) => {
            return (current || 0) + 1;
        });
        
        // Track popular searches
        database.ref(`analytics/popularSearches/${query}`).transaction((current) => {
            return (current || 0) + 1;
        });
    };

    const performSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        setShowResults(true);
        
        try {
            const results: SearchResult[] = [];
            
            // Search projects
            if (filters.type === 'all' || filters.type === 'project') {
                const projectsSnapshot = await database.ref('projects').once('value');
                projectsSnapshot.forEach((child) => {
                    const project = child.val() as Project;
                    const relevance = calculateRelevance(searchQuery, [
                        project.title?.[lang] || '',
                        project.description?.[lang] || '',
                        project.category?.[lang] || ''
                    ]);
                    
                    if (relevance > 0) {
                        results.push({
                            id: child.key!,
                            title: project.title?.[lang] || '',
                            description: project.description?.[lang] || '',
                            type: 'project',
                            category: project.category?.[lang] || '',
                            image: project.image,
                            relevanceScore: relevance
                        });
                    }
                });
            }
            
            // Search services
            if (filters.type === 'all' || filters.type === 'service') {
                const servicesSnapshot = await database.ref('services').once('value');
                servicesSnapshot.forEach((child) => {
                    const service = child.val() as Service;
                    const relevance = calculateRelevance(searchQuery, [
                        service.title?.[lang] || '',
                        service.desc?.[lang] || ''
                    ]);
                    
                    if (relevance > 0) {
                        results.push({
                            id: child.key!,
                            title: service.title?.[lang] || '',
                            description: service.desc?.[lang] || '',
                            type: 'service',
                            relevanceScore: relevance
                        });
                    }
                });
            }
            
            // Search community posts
            if (filters.type === 'all' || filters.type === 'post') {
                const postsSnapshot = await database.ref('communityPosts').once('value');
                postsSnapshot.forEach((child) => {
                    const post = child.val() as CommunityPost;
                    if (post.isApproved) {
                        const relevance = calculateRelevance(searchQuery, [
                            post.title,
                            post.description
                        ]);
                        
                        if (relevance > 0) {
                            results.push({
                                id: child.key!,
                                title: post.title,
                                description: post.description,
                                type: 'post',
                                relevanceScore: relevance
                            });
                        }
                    }
                });
            }
            
            // Sort results
            let sortedResults = [...results];
            switch (filters.sortBy) {
                case 'relevance':
                    sortedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
                    break;
                case 'title':
                    sortedResults.sort((a, b) => a.title.localeCompare(b.title));
                    break;
            }
            
            setSearchResults(sortedResults);
            saveSearchToHistory(searchQuery);
            
        } catch (error) {
            console.error('Error performing search:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const calculateRelevance = (query: string, fields: string[]): number => {
        const queryLower = query.toLowerCase();
        let score = 0;
        
        fields.forEach((field, index) => {
            if (!field) return;
            
            const fieldLower = field.toLowerCase();
            
            // Exact match gets highest score
            if (fieldLower.includes(queryLower)) {
                score += (fields.length - index) * 10;
            }
            
            // Word matches
            const queryWords = queryLower.split(' ');
            const fieldWords = fieldLower.split(' ');
            
            queryWords.forEach(queryWord => {
                fieldWords.forEach(fieldWord => {
                    if (fieldWord.includes(queryWord) || queryWord.includes(fieldWord)) {
                        score += (fields.length - index) * 2;
                    }
                });
            });
        });
        
        return score;
    };

    const handleResultClick = (result: SearchResult) => {
        if (onResultClick) {
            onResultClick(result);
        }
        setShowResults(false);
        setSearchQuery('');
    };

    const getResultIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'project':
                return 'fas fa-project-diagram text-neon-blue';
            case 'service':
                return 'fas fa-cogs text-neon-cyan';
            case 'post':
                return 'fas fa-file-alt text-purple-400';
            default:
                return 'fas fa-search text-text-secondary';
        }
    };

    const getResultTypeText = (type: SearchResult['type']) => {
        switch (type) {
            case 'project':
                return lang === 'ar' ? 'مشروع' : 'Project';
            case 'service':
                return lang === 'ar' ? 'خدمة' : 'Service';
            case 'post':
                return lang === 'ar' ? 'منشور' : 'Post';
            default:
                return '';
        }
    };

    return (
        <div className="relative">
            {/* Search Input */}
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === 'ar' ? 'ابحث في المشاريع والخدمات...' : 'Search projects and services...'}
                    className="w-full bg-secondary-dark border border-border-color rounded-lg px-4 py-3 pr-12 text-text-primary placeholder-text-secondary focus:border-neon-cyan focus:outline-none transition-colors"
                    onFocus={() => setShowResults(searchQuery.length > 2)}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isSearching ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-neon-cyan"></div>
                    ) : (
                        <i className="fas fa-search text-text-secondary"></i>
                    )}
                </div>
            </div>

            {/* Search Filters */}
            {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-secondary-dark border border-border-color rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
                    <div className="p-4 border-b border-border-color">
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="bg-primary-dark border border-border-color rounded px-3 py-1 text-sm text-text-primary form-select"
                            >
                                <option value="all">{lang === 'ar' ? 'الكل' : 'All'}</option>
                                <option value="project">{lang === 'ar' ? 'مشاريع' : 'Projects'}</option>
                                <option value="service">{lang === 'ar' ? 'خدمات' : 'Services'}</option>
                                <option value="post">{lang === 'ar' ? 'منشورات' : 'Posts'}</option>
                            </select>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                className="bg-primary-dark border border-border-color rounded px-3 py-1 text-sm text-text-primary form-select"
                            >
                                <option value="relevance">{lang === 'ar' ? 'الأكثر صلة' : 'Most Relevant'}</option>
                                <option value="title">{lang === 'ar' ? 'الاسم' : 'Title'}</option>
                            </select>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {searchResults.length === 0 && !isSearching && searchQuery.length > 2 && (
                            <div className="p-4 text-center text-text-secondary">
                                {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                            </div>
                        )}

                        {searchResults.map((result) => (
                            <div
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result)}
                                className="p-4 border-b border-border-color hover:bg-primary-dark/50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-start space-x-3 space-x-reverse">
                                    <i className={getResultIcon(result.type)}></i>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 space-x-reverse mb-1">
                                            <h4 className="text-text-primary font-medium truncate">
                                                {result.title}
                                            </h4>
                                            <span className="text-xs text-text-secondary bg-primary-dark px-2 py-1 rounded">
                                                {getResultTypeText(result.type)}
                                            </span>
                                        </div>
                                        <p className="text-text-secondary text-sm line-clamp-2">
                                            {result.description}
                                        </p>
                                        {result.category && (
                                            <span className="text-xs text-neon-cyan mt-1 inline-block">
                                                {result.category}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Search History and Popular Searches */}
                        {searchQuery.length <= 2 && (
                            <div className="p-4 space-y-4">
                                {searchHistory.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-text-primary mb-2">
                                            {lang === 'ar' ? 'عمليات البحث الأخيرة' : 'Recent Searches'}
                                        </h4>
                                        <div className="space-y-1">
                                            {searchHistory.slice(0, 5).map((term, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setSearchQuery(term)}
                                                    className="block w-full text-left text-sm text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    <i className="fas fa-history mr-2"></i>
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {popularSearches.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-text-primary mb-2">
                                            {lang === 'ar' ? 'عمليات البحث الشائعة' : 'Popular Searches'}
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {popularSearches.map((term, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setSearchQuery(term)}
                                                    className="text-xs bg-primary-dark text-text-secondary hover:text-text-primary px-2 py-1 rounded transition-colors"
                                                >
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchSystem;