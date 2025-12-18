import React, { useState } from 'react';
import { Upload, FileText, Plus, Percent, DollarSign, ArrowRight, Loader2, Trash2 } from 'lucide-react';

const VendorExtraction = ({ onImport }) => {
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [adjustments, setAdjustments] = useState({
        percent: 0,
        fixed: 0
    });

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setProcessing(true);

        // Simulate API call for extraction
        // In real implementation, this would call /api/extract-quote
        setTimeout(() => {
            setExtractedData({
                vendor: 'ABC Steel vendor',
                items: [
                    { description: '8mm TMT', qty: 1000, unit: 'kg', rate: 50, hsn: '7214' },
                    { description: '10mm TMT', qty: 2000, unit: 'kg', rate: 48, hsn: '7214' },
                ]
            });
            setProcessing(false);
        }, 2000);
    };

    const handleItemChange = (index, field, value) => {
        setExtractedData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
        }));
    };

    const removeItem = (index) => {
        setExtractedData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const calculateAdjustedRate = (rate) => {
        let newRate = parseFloat(rate) || 0;
        if (adjustments.percent > 0) {
            newRate += newRate * (parseFloat(adjustments.percent) / 100);
        }
        if (adjustments.fixed > 0) {
            newRate += parseFloat(adjustments.fixed);
        }
        return newRate.toFixed(2);
    };

    if (processing) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-200">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Extracting data from document...</p>
            </div>
        );
    }

    if (!extractedData) {
        return (
            <div className="relative group">
                <input
                    type="file"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept="image/*,.pdf"
                />
                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 group-hover:border-indigo-500 group-hover:bg-indigo-50 transition-all duration-300">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Upload Vendor Quote</h3>
                    <p className="text-slate-500 text-center max-w-xs">
                        Drag and drop your vendor's Image or PDF here to automatically extract items and prices.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Review Extracted Data</h3>
                        <p className="text-slate-500 text-sm">Vendor: {extractedData.vendor}</p>
                    </div>
                    <button
                        onClick={() => setExtractedData(null)}
                        className="text-sm text-slate-500 hover:text-indigo-600 font-medium underline"
                    >
                        Upload different file
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Percent className="w-4 h-4 text-indigo-600" />
                            Global Percentage Increase
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={adjustments.percent}
                                onChange={(e) => setAdjustments({ ...adjustments, percent: e.target.value })}
                                className="input-field pr-12"
                                placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            Increase by Rate (₹/unit)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                            <input
                                type="number"
                                value={adjustments.fixed}
                                onChange={(e) => setAdjustments({ ...adjustments, fixed: e.target.value })}
                                className="input-field pl-8"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Item</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Vendor Rate</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">New Rate</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {extractedData.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-slate-800 font-bold p-0"
                                    />
                                    <div className="text-xs text-slate-500">HSN: {item.hsn}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <input
                                            type="number"
                                            value={item.qty}
                                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                            className="w-16 bg-transparent border-none focus:ring-0 text-right text-slate-600 font-medium p-0"
                                        />
                                        <span className="text-xs text-slate-400">{item.unit}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <span className="text-slate-400">₹</span>
                                        <input
                                            type="number"
                                            value={item.rate}
                                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                            className="w-20 bg-transparent border-none focus:ring-0 text-right text-slate-500 p-0"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-lg border border-emerald-100">
                                        ₹{calculateAdjustedRate(item.rate)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => removeItem(idx)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                    onClick={() => onImport(extractedData.items.map(item => ({
                        ...item,
                        rate: calculateAdjustedRate(item.rate)
                    })))}
                    className="btn-primary"
                >
                    Import into Quote
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default VendorExtraction;
