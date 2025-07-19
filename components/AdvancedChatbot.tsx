import React, { useState, useEffect, useRef } from 'react';
import { getChatbotResponse, getAiConsultation, getBrainstormResponse, analyzeChatForLeadQualification } from '../services/gemini';
import { saveConversation, auth } from '../services/firebase';
import { translations, servicesData } from '../constants';
import { ConsultationResponse } from '../types';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string | ConsultationResponse;
    timestamp: Date;
    type?: 'text' | 'consultation' | 'brainstorm' | 'service_request';
    serviceTitle?: string;
}

interface AdvancedChatbotProps {
    lang: 'en' | 'ar';
    isOpen: boolean;
    onClose: () => void;
}

const AdvancedChatbot: React.FC<AdvancedChatbotProps> = ({ lang, isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [currentView, setCurrentView] = useState<'main' | 'services' | 'projects' | 'consultation' | 'brainstorm' | 'service_request'>('main');
    const [selectedService, setSelectedService] = useState<string>('');
    const [showSaveButton, setShowSaveButton] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isProactiveMode, setIsProactiveMode] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const t = translations[lang];

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            addMessage('assistant', t.bot_welcome, 'text');
        }
    }, [isOpen, lang]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Proactive chatbot - show after 30 seconds of inactivity
        const proactiveTimer = setTimeout(() => {
            if (!isOpen && !isProactiveMode) {
                setIsProactiveMode(true);
            }
        }, 30000);

        return () => clearTimeout(proactiveTimer);
    }, [isOpen, isProactiveMode]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const addMessage = (role: 'user' | 'assistant', content: string | ConsultationResponse, type: ChatMessage['type'] = 'text', serviceTitle?: string) => {
        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            role,
            content,
            timestamp: new Date(),
            type,
            serviceTitle
        };
        setMessages(prev => [...prev, newMessage]);
        
        // Update chat history for Gemini
        if (typeof content === 'string') {
            setChatHistory(prev => [...prev, {
                role: role === 'user' ? 'user' : 'model',
                parts: [{ text: content }]
            }]);
        }
        
        // Show save button after meaningful conversation
        if (messages.length > 2 && (type === 'consultation' || type === 'brainstorm')) {
            setShowSaveButton(true);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        addMessage('user', userMessage);
        setIsTyping(true);

        try {
            let response: string;
            
            if (currentView === 'consultation') {
                const consultation = await getAiConsultation(userMessage);
                if (consultation) {
                    addMessage('assistant', consultation, 'consultation');
                    setCurrentView('main');
                } else {
                    response = t.bot_error_api;
                    addMessage('assistant', response);
                }
            } else if (currentView === 'brainstorm') {
                response = await getBrainstormResponse(userMessage, selectedService, lang);
                addMessage('assistant', response, 'brainstorm', selectedService);
                setCurrentView('main');
            } else {
                response = await getChatbotResponse(userMessage, chatHistory, lang);
                addMessage('assistant', response);
            }
            
            // Analyze conversation for lead qualification
            if (messages.length > 3) {
                const leadAnalysis = await analyzeChatForLeadQualification([...chatHistory, {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }]);
                
                if (leadAnalysis && leadAnalysis.isHotLead) {
                    // Send notification to admin about hot lead
                    console.log('Hot lead detected:', leadAnalysis);
                }
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('assistant', t.bot_error_api);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'services':
                setCurrentView('services');
                addMessage('assistant', lang === 'ar' ? 'إليك الخدمات المتاحة:' : 'Here are the available services:');
                break;
            case 'projects':
                setCurrentView('projects');
                addMessage('assistant', lang === 'ar' ? 'إليك أفضل المشاريع:' : 'Here are the best projects:');
                break;
            case 'consultation':
                setCurrentView('consultation');
                addMessage('assistant', t.bot_consultation_prompt);
                break;
            case 'hire':
                addMessage('assistant', lang === 'ar' ? 'رائع! دعني أساعدك في التواصل معه. ما نوع المشروع الذي تريد العمل عليه؟' : 'Great! Let me help you get in touch. What type of project do you want to work on?');
                break;
        }
    };

    const handleServiceSelect = (serviceTitle: string) => {
        setSelectedService(serviceTitle);
        setCurrentView('brainstorm');
        addMessage('assistant', `${t.bot_brainstorm_prompt} (${serviceTitle})`);
    };

    const saveConversationToDashboard = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const lastMessage = messages[messages.length - 1];
            const userInput = messages.find(m => m.role === 'user')?.content as string || '';
            
            const conversationData = {
                type: lastMessage.type === 'consultation' ? 'consultation' as const : 'brainstorm' as const,
                userInput,
                aiResponse: lastMessage.content,
                serviceTitle: lastMessage.serviceTitle
            };

            await saveConversation(user.uid, conversationData);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    };

    const renderMessage = (message: ChatMessage) => {
        if (message.role === 'assistant' && typeof message.content === 'object') {
            // Consultation response
            const consultation = message.content as ConsultationResponse;
            return (
                <div className="space-y-4">
                    <h4 className="font-semibold text-neon-cyan">{t.bot_proposal_title}</h4>
                    <div className="space-y-3">
                        <div>
                            <h5 className="font-medium text-text-primary mb-1">{t.bot_proposal_problem}</h5>
                            <p className="text-text-secondary text-sm">{consultation.problemAnalysis}</p>
                        </div>
                        <div>
                            <h5 className="font-medium text-text-primary mb-1">{t.bot_proposal_solution}</h5>
                            <p className="text-text-secondary text-sm">{consultation.proposedSolution}</p>
                        </div>
                        <div>
                            <h5 className="font-medium text-text-primary mb-1">{t.bot_proposal_services}</h5>
                            <ul className="text-text-secondary text-sm space-y-1">
                                {consultation.suggestedServices.map((service, index) => (
                                    <li key={index} className="flex items-center space-x-2 space-x-reverse">
                                        <i className="fas fa-check text-neon-cyan text-xs"></i>
                                        <span>{service}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <button
                        onClick={() => addMessage('assistant', t.bot_discuss_proposal)}
                        className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        {t.bot_discuss_proposal}
                    </button>
                </div>
            );
        }

        return <span>{message.content as string}</span>;
    };

    const renderQuickActions = () => {
        if (currentView === 'services') {
            return (
                <div className="space-y-2">
                    {servicesData.map((service, index) => (
                        <button
                            key={index}
                            onClick={() => handleServiceSelect(service.title[lang])}
                            className="w-full text-left p-3 bg-secondary-dark hover:bg-primary-dark rounded-lg transition-colors"
                        >
                            <div className="flex items-center space-x-3 space-x-reverse">
                                <i className={`${service.icon} text-neon-cyan`}></i>
                                <div>
                                    <div className="text-text-primary font-medium">{service.title[lang]}</div>
                                    <div className="text-text-secondary text-sm">{service.desc[lang]}</div>
                                </div>
                            </div>
                        </button>
                    ))}
                    <button
                        onClick={() => setCurrentView('main')}
                        className="w-full text-center p-2 text-neon-cyan hover:text-neon-cyan/80 transition-colors"
                    >
                        {t.bot_back}
                    </button>
                </div>
            );
        }

        if (currentView === 'main') {
            return (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleQuickAction('services')}
                        className="p-3 bg-secondary-dark hover:bg-primary-dark rounded-lg transition-colors text-center"
                    >
                        <i className="fas fa-cogs text-neon-cyan mb-1 block"></i>
                        <span className="text-text-primary text-sm">{t.bot_option_services}</span>
                    </button>
                    <button
                        onClick={() => handleQuickAction('projects')}
                        className="p-3 bg-secondary-dark hover:bg-primary-dark rounded-lg transition-colors text-center"
                    >
                        <i className="fas fa-project-diagram text-neon-blue mb-1 block"></i>
                        <span className="text-text-primary text-sm">{t.bot_option_projects}</span>
                    </button>
                    <button
                        onClick={() => handleQuickAction('consultation')}
                        className="p-3 bg-secondary-dark hover:bg-primary-dark rounded-lg transition-colors text-center"
                    >
                        <i className="fas fa-lightbulb text-yellow-400 mb-1 block"></i>
                        <span className="text-text-primary text-sm">{t.bot_option_consultation}</span>
                    </button>
                    <button
                        onClick={() => handleQuickAction('hire')}
                        className="p-3 bg-secondary-dark hover:bg-primary-dark rounded-lg transition-colors text-center"
                    >
                        <i className="fas fa-handshake text-green-400 mb-1 block"></i>
                        <span className="text-text-primary text-sm">{t.bot_option_hire}</span>
                    </button>
                </div>
            );
        }

        return null;
    };

    // Proactive chatbot popup
    if (isProactiveMode && !isOpen) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <div className="bg-secondary-dark border border-neon-cyan rounded-lg p-4 shadow-xl max-w-sm animate-bounce">
                    <div className="flex items-center space-x-3 space-x-reverse mb-3">
                        <div className="w-10 h-10 bg-neon-cyan/20 rounded-full flex items-center justify-center">
                            <i className="fas fa-robot text-neon-cyan"></i>
                        </div>
                        <div>
                            <div className="text-text-primary font-medium">مبدع بوت</div>
                            <div className="text-text-secondary text-sm">{t.bot_proactive_prompt}</div>
                        </div>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                        <button
                            onClick={() => {
                                setIsProactiveMode(false);
                                // Trigger chatbot open from parent component
                            }}
                            className="bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            {t.bot_proactive_cta}
                        </button>
                        <button
                            onClick={() => setIsProactiveMode(false)}
                            className="text-text-secondary hover:text-text-primary transition-colors"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-secondary-dark border border-border-color rounded-lg shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border-color flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-robot text-neon-cyan"></i>
                    </div>
                    <div>
                        <div className="text-text-primary font-medium">مبدع بوت</div>
                        <div className="text-text-secondary text-xs">متصل</div>
                    </div>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                    {showSaveButton && auth.currentUser && (
                        <button
                            onClick={saveConversationToDashboard}
                            className={`transition-colors ${
                                isSaved 
                                    ? 'text-green-400' 
                                    : 'text-neon-cyan hover:text-neon-cyan/80'
                            }`}
                            title={isSaved ? t.dashboard_convo_saved : t.dashboard_save_convo}
                        >
                            <i className={isSaved ? 'fas fa-check' : 'fas fa-save'}></i>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                                message.role === 'user'
                                    ? 'bg-neon-cyan text-bg-color'
                                    : 'bg-primary-dark text-text-primary'
                            }`}
                        >
                            {renderMessage(message)}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-primary-dark text-text-primary p-3 rounded-lg">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {renderQuickActions() && (
                <div className="p-4 border-t border-border-color">
                    {renderQuickActions()}
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border-color">
                <div className="flex space-x-2 space-x-reverse">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={
                            currentView === 'consultation' ? t.bot_consultation_prompt :
                            currentView === 'brainstorm' ? t.bot_brainstorm_prompt :
                            lang === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'
                        }
                        className="flex-1 bg-primary-dark border border-border-color rounded-lg px-3 py-2 text-text-primary placeholder-text-secondary focus:border-neon-cyan focus:outline-none"
                        disabled={isTyping}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isTyping}
                        className="bg-neon-cyan hover:bg-neon-cyan/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-bg-color px-4 py-2 rounded-lg transition-colors"
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdvancedChatbot;