const mongoose = require('mongoose');

const SizeFormulaSchema = new mongoose.Schema({
    formulaType: { type: String, enum: ['add', 'mul'], required: true },
    modifier: { type: Number, required: true, default: 0 }
}, { _id: false });

const BrandSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    basePrice: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    sellsInNos: { type: Boolean, default: false },
    allowPartialRod: { type: Boolean, default: false },
    rodRounding: { type: String, enum: ['nearest', 'ceil', 'floor'], default: 'nearest' },

    // Size Formulas: How price is calculated per size relative to base price
    sizeFormulas: {
        type: Map,
        of: SizeFormulaSchema
    },

    // Weight Profile (Unified) - Optional
    weightProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'WeightProfile', default: null },

    // Legacy/Override Maps (kept for backward compatibility or specific overrides)
    bundleWeightMap: {
        type: Map,
        of: Number
    },
    rodWeightMap: {
        type: Map,
        of: Number
    },

    // Pricing per rod (for sellsInNos=true brands like TATA)
    sizePricing: {
        type: Map,
        of: Number
    },

    meta: {
        createdBy: String,
        createdAt: { type: Date, default: Date.now }
    }
});

module.exports = mongoose.model('Brand', BrandSchema);
