import React, { forwardRef } from 'react';

const QuoteImageTemplate = forwardRef(({ quote }, ref) => {
    if (!quote) return null;

    return (
        <div
            ref={ref}
            className="bg-white p-8 text-slate-900"
            style={{
                width: '800px', // Fixed width for consistent image quality
                minHeight: '1000px',
                position: 'absolute',
                top: '-9999px',
                left: '-9999px',
                zIndex: -1
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-indigo-700">Ammashanthi</h1>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Quote Steel</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-slate-800">QUOTATION</h2>
                    <p className="text-slate-600">#{quote.quoteNo}</p>
                    <p className="text-sm text-slate-500 mt-1">
                        {new Date(quote.date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })}
                    </p>
                </div>
            </div>

            {/* Customer Details */}
            <div className="mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Bill To</h3>
                <p className="text-lg font-bold text-slate-800">{quote.customerName}</p>
                {quote.customerPhone && (
                    <p className="text-slate-600">{quote.customerPhone}</p>
                )}
                {quote.customerAddress && (
                    <p className="text-slate-600 whitespace-pre-line">{quote.customerAddress}</p>
                )}
            </div>

            {/* Items Table */}
            <table className="w-full mb-8">
                <thead>
                    <tr className="bg-indigo-600 text-white">
                        <th className="py-3 px-4 text-left text-sm font-semibold rounded-tl-lg">Item Description</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold">Quantity</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold">Price</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold rounded-tr-lg">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {quote.items.map((item, index) => {
                        const isInventory = item.brand === 'Other';
                        const itemName = isInventory ? item.product : (item.brand || 'TMT Bar');

                        // Calculate display values
                        let quantityDisplay, itemPrice;

                        // Check for sellsInNos flag (new quotes) OR infer from data (old quotes)
                        const brandName = (item.brand || '').toLowerCase().trim();
                        const isTataBrand = brandName.includes('tata');
                        const isNosBased = !isInventory && (item.sellsInNos || isTataBrand || (item.inputUnit === 'nos' && item.pricePerRod > 0));

                        if (isInventory) {
                            quantityDisplay = `${item.inputQty} ${item.inputUnit}`;
                            itemPrice = item.pricePerRod;
                        } else if (isNosBased) {
                            // NOS-selling brand (like Tata) - use pricePerRod
                            quantityDisplay = `${item.inputQty} ${item.inputUnit}`;
                            itemPrice = item.pricePerRod;
                        } else {
                            // KG-selling brand: show price per kg
                            itemPrice = item.pricePerKg;
                            if (item.inputUnit === 'kg') {
                                quantityDisplay = `${item.convertedKg?.toFixed(2)} kg`;
                            } else {
                                quantityDisplay = `${item.inputQty} ${item.inputUnit} (${item.convertedKg?.toFixed(2)} kg)`;
                            }
                        }

                        return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="py-3 px-4 text-sm text-slate-800">
                                    <div className="font-medium">{itemName}</div>
                                    <div className="text-xs text-slate-500">{item.brand === 'Other' ? '' : `${item.brand} - `}{item.size || ''}</div>
                                </td>
                                <td className="py-3 px-4 text-right text-sm text-slate-600">
                                    {quantityDisplay}
                                </td>
                                <td className="py-3 px-4 text-right text-sm text-slate-600">
                                    {isInventory ? (
                                        `₹${itemPrice?.toFixed(2)}/${item.inputUnit}`
                                    ) : isNosBased ? (
                                        `₹${itemPrice?.toFixed(2)}/nos`
                                    ) : (
                                        `₹${itemPrice?.toFixed(2)}/kg`
                                    )}
                                </td>
                                <td className="py-3 px-4 text-right text-sm font-medium text-slate-800">
                                    ₹{item.amount?.toFixed(2)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-slate-600 font-medium">
                        <span>Total Weight:</span>
                        <span>{quote.items.reduce((sum, item) => {
                            const isInventory = item.brand === 'Other';
                            if (isInventory) {
                                return item.inputUnit === 'kg' ? sum + (parseFloat(item.inputQty) || 0) : sum;
                            } else {
                                return sum + (item.convertedKg || 0);
                            }
                        }, 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>₹{quote.subtotal?.toFixed(2)}</span>
                    </div>
                    {(quote.onlineDiscountAmount > 0 || quote.offlineDiscountAmount > 0) && (
                        <>
                            {quote.onlineDiscountAmount > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>Online Disc ({quote.onlineDiscountPercent}%):</span>
                                    <span>-₹{quote.onlineDiscountAmount?.toFixed(2)}</span>
                                </div>
                            )}
                            {quote.offlineDiscountAmount > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>Offline Disc ({quote.offlineDiscountPercent}%):</span>
                                    <span>-₹{quote.offlineDiscountAmount?.toFixed(2)}</span>
                                </div>
                            )}
                        </>
                    )}
                    {(quote.transportCharges > 0 || quote.loadingUnloadingCharges > 0) && (
                        <>
                            <div className="flex justify-between text-lg font-semibold text-indigo-700 pt-2 border-t border-indigo-200">
                                <span>Total (Tax Inclusive):</span>
                                <span>₹{((quote.subtotal || 0) - (quote.onlineDiscountAmount || 0) - (quote.offlineDiscountAmount || 0)).toFixed(2)}</span>
                            </div>
                            {quote.transportCharges > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Transport Charges:</span>
                                    <span>₹{quote.transportCharges?.toFixed(2)}</span>
                                </div>
                            )}
                            {quote.loadingUnloadingCharges > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Loading/Unloading:</span>
                                    <span>₹{quote.loadingUnloadingCharges?.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold text-indigo-700 pt-3 border-t-2 border-indigo-100">
                                <span>Grand Total:</span>
                                <span>₹{quote.total?.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                    {!(quote.transportCharges > 0 || quote.loadingUnloadingCharges > 0) && (
                        <div className="flex justify-between text-xl font-bold text-indigo-700 pt-3 border-t-2 border-indigo-100">
                            <span>Total (Tax Inclusive):</span>
                            <span>₹{quote.total?.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
                <p className="font-medium">Thank you for your business!</p>
                <p className="mt-1">Generated by Ammashanthi Quote Steel</p>
            </div>
        </div>
    );
});

export default QuoteImageTemplate;
