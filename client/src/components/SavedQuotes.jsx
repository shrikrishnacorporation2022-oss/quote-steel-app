import React, { useState, useEffect } from 'react';
import { fetchQuotes, exportQuotePDF, deleteQuotesBulk } from '../api';
import { Download, Share2, MessageCircle, Calendar, User, FileText, Search, Edit, Copy, Mail, Trash2, CheckSquare, Square, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import QuoteImageTemplate from './QuoteImageTemplate';

function SavedQuotes({ onEdit }) {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedQuotes, setSelectedQuotes] = useState(new Set());
    const [quoteForImage, setQuoteForImage] = useState(null);
    const imageTemplateRef = React.useRef(null);

    useEffect(() => {
        loadQuotes();
    }, []);

    const loadQuotes = async () => {
        try {
            const data = await fetchQuotes();
            setQuotes(data);
        } catch (err) {
            console.error('Error loading quotes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (quoteId, quoteNo) => {
        try {
            const blob = await exportQuotePDF(quoteId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Quote-${quoteNo}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            alert('Error generating PDF: ' + error.message);
        }
    };

    const handleShareWhatsApp = (quote) => {
        const message = `*Quote ${quote.quoteNo}*\n\nCustomer: ${quote.customerName}\nTotal: ₹${quote.total?.toFixed(2)}\n\nView full quote: [PDF Link]`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleShareImage = async (quote) => {
        try {
            setQuoteForImage(quote);
            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!imageTemplateRef.current) return;

            const canvas = await html2canvas(imageTemplateRef.current, {
                scale: 2, // Higher quality
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const file = new File([blob], `Quote-${quote.quoteNo}.jpg`, { type: 'image/jpeg' });

                // Try native sharing first (mobile)
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: `Quote ${quote.quoteNo}`,
                            text: `Here is the quotation for ${quote.customerName}`
                        });
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            console.error('Share failed:', err);
                            downloadImage(blob, quote.quoteNo);
                        }
                    }
                } else {
                    // Fallback to download
                    downloadImage(blob, quote.quoteNo);
                }
                setQuoteForImage(null);
            }, 'image/jpeg', 0.9);
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Error generating image');
            setQuoteForImage(null);
        }
    };

    const downloadImage = (blob, quoteNo) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Quote-${quoteNo}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleEmailShare = (quote) => {
        const subject = `Quotation ${quote.quoteNo} from Ammashanthi Quote Steel`;
        const body = `Dear ${quote.customerName},\n\nPlease find the quotation details below:\n\nQuote No: ${quote.quoteNo}\nTotal Amount: ₹${quote.total?.toFixed(2)}\n\nThank you for your business.`;
        window.location.href = `mailto:${quote.customerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const toggleSelectQuote = (id) => {
        const newSelected = new Set(selectedQuotes);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedQuotes(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedQuotes.size === filteredQuotes.length) {
            setSelectedQuotes(new Set());
        } else {
            setSelectedQuotes(new Set(filteredQuotes.map(q => q._id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedQuotes.size === 0) return;

        if (window.confirm(`Are you sure you want to delete ${selectedQuotes.size} quote(s)? This action cannot be undone.`)) {
            try {
                await deleteQuotesBulk(Array.from(selectedQuotes));
                setSelectedQuotes(new Set());
                loadQuotes(); // Reload list
            } catch (error) {
                alert('Error deleting quotes: ' + error.message);
            }
        }
    };

    const filteredQuotes = quotes.filter(quote => {
        const matchesSearch =
            quote.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            quote.quoteNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (quote.customerPhone && quote.customerPhone.includes(searchTerm));

        let matchesDate = true;
        if (dateFrom) {
            matchesDate = matchesDate && new Date(quote.date) >= new Date(dateFrom);
        }
        if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setDate(endDate.getDate() + 1);
            matchesDate = matchesDate && new Date(quote.date) < endDate;
        }

        return matchesSearch && matchesDate;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading quotes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
            {/* Header & Filters */}
            <div className="card-glass p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold gradient-text">Saved Quotes</h1>
                        <p className="text-slate-600 mt-1">Manage and track your quotations</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedQuotes.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="btn-danger py-2 px-4 text-sm animate-fade-in"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedQuotes.size})
                            </button>
                        )}
                        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg text-indigo-700 font-medium">
                            <FileText className="w-5 h-5" />
                            <span>{filteredQuotes.length} Quotes Found</span>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Name, Phone or Quote No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10 w-full"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="input-field w-full"
                            placeholder="From Date"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="input-field w-full"
                            placeholder="To Date"
                        />
                    </div>
                </div>

                {/* Select All Checkbox */}
                {filteredQuotes.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                        >
                            {selectedQuotes.size === filteredQuotes.length && filteredQuotes.length > 0 ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                                <Square className="w-5 h-5" />
                            )}
                            Select All
                        </button>
                    </div>
                )}
            </div>

            {/* Quotes Grid */}
            {filteredQuotes.length === 0 ? (
                <div className="card p-12 text-center">
                    <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No quotes found</h3>
                    <p className="text-slate-500">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuotes.map(quote => (
                        <div
                            key={quote._id}
                            className={`card p-6 space-y-4 hover:shadow-xl transition-all duration-300 group relative border-2 ${selectedQuotes.has(quote._id) ? 'border-indigo-500 bg-indigo-50/10' : 'border-transparent'}`}
                        >
                            {/* Selection Checkbox */}
                            <button
                                onClick={() => toggleSelectQuote(quote._id)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-indigo-600 transition-colors z-10"
                            >
                                {selectedQuotes.has(quote._id) ? (
                                    <CheckSquare className="w-6 h-6 text-indigo-600" />
                                ) : (
                                    <Square className="w-6 h-6" />
                                )}
                            </button>

                            {/* Quote Header */}
                            <div className="flex items-start justify-between pr-8">
                                <div>
                                    <h3 className="font-bold text-lg text-indigo-600 group-hover:text-indigo-700 transition-colors">
                                        #{quote.quoteNo}
                                    </h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(quote.date).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="space-y-2 border-t border-slate-100 pt-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium text-slate-700">{quote.customerName}</span>
                                </div>
                                {quote.customerPhone && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <MessageCircle className="w-4 h-4 text-slate-400" />
                                        <span>{quote.customerPhone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Total Amount */}
                            <div className="border-t border-slate-100 pt-3 bg-slate-50/50 -mx-6 px-6 pb-2">
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm text-slate-600">Total Amount:</span>
                                    <span className="text-xl font-bold gradient-text">
                                        ₹{quote.total?.toFixed(2) || '0.00'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-5 gap-2 pt-2">
                                <button
                                    onClick={() => handleDownloadPDF(quote._id, quote.quoteNo)}
                                    className="col-span-1 btn-primary py-2 text-xs flex flex-col items-center justify-center gap-1"
                                    title="Download PDF"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleShareWhatsApp(quote)}
                                    className="col-span-1 btn-success py-2 text-xs flex flex-col items-center justify-center gap-1"
                                    title="WhatsApp"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleShareImage(quote)}
                                    className="col-span-1 btn-primary py-2 text-xs flex flex-col items-center justify-center gap-1 bg-pink-600 hover:bg-pink-700 border-pink-600 text-white"
                                    title="Share Image"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleEmailShare(quote)}
                                    className="col-span-1 btn-secondary py-2 text-xs flex flex-col items-center justify-center gap-1"
                                    title="Email"
                                >
                                    <Mail className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onEdit(quote, 'edit')}
                                    className="col-span-1 btn-secondary py-2 text-xs flex flex-col items-center justify-center gap-1 text-indigo-600"
                                    title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onEdit(quote, 'duplicate')}
                                    className="col-span-1 btn-secondary py-2 text-xs flex flex-col items-center justify-center gap-1 text-emerald-600"
                                    title="Duplicate"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Hidden Template for Image Generation */}
            <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
                <QuoteImageTemplate ref={imageTemplateRef} quote={quoteForImage} />
            </div>
        </div>
    );
}

export default SavedQuotes;
