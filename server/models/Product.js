const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    unit: { type: String, required: true }, // e.g., 'bag'
    unitWeightKg: { type: Number },
    pricePerUnit: { type: Number, required: true },
    allowQuantityDecimal: { type: Boolean, default: false }
});

module.exports = mongoose.model('Product', ProductSchema);
