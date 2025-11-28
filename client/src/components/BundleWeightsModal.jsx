import React from 'react';

const BUNDLE_DATA = [
    { size: '6mm', rods: 'NA', weight: 'Not Applicable' },
    { size: '8mm', rods: '10', weight: '47.40 Kg' },
    { size: '10mm', rods: '7', weight: '51.87 Kg' },
    { size: '12mm', rods: '5', weight: '53.30 Kg' },
    { size: '16mm', rods: '3', weight: '56.88 Kg' },
    { size: '20mm', rods: '2', weight: '59.24 Kg' },
    { size: '25mm', rods: '1', weight: '46.30 Kg' },
    { size: '32mm', rods: '1', weight: '75.85 Kg' },
];

function BundleWeightsModal({ onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg">Reference Bundle weights</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 font-bold">X</button>
                </div>

                <div className="p-4 bg-gray-100">
                    <div className="bg-orange-500 text-white text-center py-2 font-bold mb-4 rounded">
                        AVERAGE TMT ROD WEIGHT PER BUNDLE
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2 text-center font-bold text-xs uppercase">
                        <div className="bg-orange-400 text-white p-2 rounded">TMT SIZE</div>
                        <div className="bg-orange-400 text-white p-2 rounded">RODS/BUNDLE</div>
                        <div className="bg-orange-400 text-white p-2 rounded">BUNDLE WEIGHT</div>
                    </div>

                    <div className="space-y-1">
                        {BUNDLE_DATA.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-3 gap-2 text-center text-sm font-bold text-gray-800">
                                <div className="py-1">{row.size}</div>
                                <div className="py-1">{row.rods}</div>
                                <div className="py-1">{row.weight}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BundleWeightsModal;
