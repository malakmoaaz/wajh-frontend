import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, color: '#fca5a5', background: '#0f1115', height: '100vh', overflow: 'auto', fontFamily: 'sans-serif' }}>
                    <h1 style={{ color: '#ef4444' }}>Critical Application Error</h1>
                    <p>The clinical planning environment has encountered a runtime exception.</p>
                    <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>Error Details:</h3>
                        <code style={{ whiteSpace: 'pre-wrap', color: '#f87171', display: 'block', marginBottom: '20px' }}>
                            {this.state.error && this.state.error.toString()}
                        </code>
                        <h3 style={{ margin: '0 0 10px 0' }}>Component Stack:</h3>
                        <pre style={{ fontSize: '0.8rem', opacity: 0.7, overflow: 'auto' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: 30, padding: '12px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Restart Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
