import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to analytics service
        this.logErrorToService(error, errorInfo);
    }

    logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by boundary:', error);
            console.error('Error info:', errorInfo);
        }

        // In production, you would send this to an error tracking service
        // like Sentry, LogRocket, or Bugsnag
        try {
            const errorData = {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            // Example: Send to analytics
            // analytics.track('Error Occurred', errorData);
            
            // Example: Send to error tracking service
            // errorTrackingService.captureException(error, { extra: errorData });
            
            console.log('Error logged:', errorData);
        } catch (loggingError) {
            console.error('Failed to log error:', loggingError);
        }
    };

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-bg-color flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-secondary-dark border border-border-color rounded-lg p-8 text-center">
                        <div className="mb-6">
                            <i className="fas fa-exclamation-triangle text-6xl text-yellow-400 mb-4"></i>
                            <h1 className="text-2xl font-bold text-text-primary mb-2">
                                عذراً، حدث خطأ غير متوقع
                            </h1>
                            <p className="text-text-secondary">
                                نعتذر عن هذا الإزعاج. يرجى المحاولة مرة أخرى أو تحديث الصفحة.
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left">
                                <h3 className="text-red-400 font-semibold mb-2">Error Details:</h3>
                                <pre className="text-xs text-red-300 overflow-auto max-h-32">
                                    {this.state.error.message}
                                </pre>
                                {this.state.error.stack && (
                                    <details className="mt-2">
                                        <summary className="text-red-400 cursor-pointer">Stack Trace</summary>
                                        <pre className="text-xs text-red-300 mt-2 overflow-auto max-h-32">
                                            {this.state.error.stack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={this.handleRetry}
                                className="w-full bg-neon-cyan hover:bg-neon-cyan/80 text-bg-color px-6 py-3 rounded-lg font-semibold transition-colors"
                            >
                                <i className="fas fa-redo ml-2"></i>
                                المحاولة مرة أخرى
                            </button>
                            
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-secondary-dark hover:bg-primary-dark text-text-primary border border-border-color px-6 py-3 rounded-lg font-semibold transition-colors"
                            >
                                <i className="fas fa-refresh ml-2"></i>
                                تحديث الصفحة
                            </button>
                            
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full text-neon-cyan hover:text-neon-cyan/80 px-6 py-3 rounded-lg font-semibold transition-colors"
                            >
                                <i className="fas fa-home ml-2"></i>
                                العودة للصفحة الرئيسية
                            </button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-border-color">
                            <p className="text-text-secondary text-sm">
                                إذا استمر هذا الخطأ، يرجى التواصل معنا على:
                            </p>
                            <a 
                                href="mailto:mabda724@gmail.com"
                                className="text-neon-cyan hover:text-neon-cyan/80 transition-colors"
                            >
                                mabda724@gmail.com
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;