import React, { useState } from 'react';
import QuoteCalculator from './components/QuoteCalculator';
import BrandManager from './components/BrandManager';
import SavedQuotes from './components/SavedQuotes';
import WeightProfileManager from './components/WeightProfileManager';
import InventoryManager from './components/InventoryManager';
import { FileText, Package, Save, Scale, Box } from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('calculator');
    const [editingQuote, setEditingQuote] = useState(null);

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

    return (
        <div className="min-h-screen">
            {/* Modern Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo/Brand */}
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <FileText className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ammashanthi Quote Steel</h1>
                                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Steel & Cement</p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="whitespace-nowrap">{tab.label}</span>
                                    </button>
                                );
                            })}
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
