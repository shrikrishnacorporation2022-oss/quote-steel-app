const mongoose = require('mongoose');

const QuoteItemSchema = new mongoose.Schema({
    brand: String,
    product: String,
    size: String,
    inputUnit: { type: String, default: 'bundle' },
    inputQty: Number,
    convertedKg: Number,
    convertedNos: Number,
    convertedBundles: Number,
    pricePerKg: Number,
    pricePerRod: Number,
    sellsInNos: Boolean,
    baseRate: Number,
    taxRate: Number,
    amount: Number
}, { _id: false });

const QuoteSchema = new mongoose.Schema({
    quoteNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },

    // Customer Details
    customerName: { type: String, required: true },
    customerPhone: String,
    customerEmail: String,
    customerAddress: String,
    customerCompany: String,

    items: [QuoteItemSchema],

    // Pricing (Tax-Inclusive)
    subtotal: Number, // Sum of all items
    steelSubtotal: Number, // Sum of steel items (basis for discount)

    // Discounts
    onlineDiscountPercent: { type: Number, default: 0 },
    onlineDiscountAmount: { type: Number, default: 0 },
    offlineDiscountPercent: { type: Number, default: 0 },
    offlineDiscountAmount: { type: Number, default: 0 },

    // Additional Charges
    transportCharges: { type: Number, default: 0 },
    transportTaxable: { type: Boolean, default: false },
    loadingUnloadingCharges: { type: Number, default: 0 },
    loadingTaxable: { type: Boolean, default: false },
    additionalChargesTaxable: { type: Boolean, default: false },

    total: Number,  // Final total after discounts and charges

    notes: String,

    meta: {
        createdBy: String,
        updatedAt: { type: Date, default: Date.now }
    }
});

module.exports = mongoose.model('Quote', QuoteSchema);
