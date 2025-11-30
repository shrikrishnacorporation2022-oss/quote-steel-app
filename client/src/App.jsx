import React, { useState, useEffect } from 'react';
import QuoteCalculator from './components/QuoteCalculator';
import BrandManager from './components/BrandManager';
import SavedQuotes from './components/SavedQuotes';
import WeightProfileManager from './components/WeightProfileManager';
import InventoryManager from './components/InventoryManager';
import Login from './components/Login';
import { FileText, Package, Save, Scale, Box, LogOut } from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('calculator');
    const [editingQuote, setEditingQuote] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Adjust API URL to point to auth endpoint
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            // For Vercel compatibility, we use /api/auth
            const authUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '/api/auth') : `${apiUrl}/api/auth`;

            const response = await fetch(`${authUrl}/me`, {
                credentials: 'include'
            });
            const data = await response.json();
            setIsAuthenticated(data.authenticated);
        } catch (error) {
            console.error('Auth check failed', error);
            setIsAuthenticated(false);
        } finally {
            setLoadingAuth(false);
        }
    };

    const handleLogout = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const authUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '/api/auth') : `${apiUrl}/api/auth`;

            await fetch(`${authUrl}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const handleEditQuote = (quote, mode = 'edit') => {
        setEditingQuote({ ...quote, mode }); // mode: 'edit' or 'duplicate'
        setActiveTab('calculator');
    };

    const handleSaveComplete = () => {
        setEditingQuote(null);
        setActiveTab('quotes');
    };

    const tabs = [
        { id: 'calculator', label: 'Calculator', icon: FileText, component: QuoteCalculator },
        { id: 'brands', label: 'Brands', icon: Package, component: BrandManager },
        { id: 'weights', label: 'Weights', icon: Scale, component: WeightProfileManager },
        { id: 'inventory', label: 'Inventory', icon: Box, component: InventoryManager },
        { id: 'quotes', label: 'Saved Quotes', icon: Save, component: SavedQuotes }
    ];

    const renderComponent = () => {
        switch (activeTab) {
            case 'calculator':
                return <QuoteCalculator
                    initialData={editingQuote}
                    onSaveComplete={handleSaveComplete}
                />;
            case 'quotes':
                return <SavedQuotes onEdit={handleEditQuote} />;
            default:
                const TabComponent = tabs.find(t => t.id === activeTab)?.component;
                return TabComponent ? <TabComponent /> : null;
        }
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLogin={() => setIsAuthenticated(true)} />;
    }

    return (
        <div className="min-h-screen">
            {/* Modern Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between h-auto md:h-20 py-3 md:py-0 gap-4 md:gap-0">
                        {/* Logo/Brand */}
                        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <FileText className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Ammashanthi</h1>
                                    <p className="text-[10px] md:text-xs font-semibold text-indigo-600 uppercase tracking-wider">Quote Steel</p>
                                </div>
                            </div>

                            {/* Logout Button (Mobile) */}
                            <button
                                onClick={handleLogout}
                                className="md:hidden p-2 text-slate-500 hover:text-red-600 transition-colors"
                            >
                                <LogOut className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex-1 md:flex-none flex space-x-2 overflow-x-auto pb-1 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                                {tabs.map(tab => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'} flex-shrink-0`}
                                        >
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                            <span className="whitespace-nowrap">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Logout Button (Desktop) */}
                            <button
                                onClick={handleLogout}
                                className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="py-6">
                {renderComponent()}
            </main>

            {/* Footer */}
            <footer className="glass-effect border-t border-white/20 mt-12">
                <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-600">
                    <p>Ammashanthi Quote Steel © 2024 - Professional Quote Management System</p>
                </div>
            </footer>
        </div>
    );
}

export default App;
