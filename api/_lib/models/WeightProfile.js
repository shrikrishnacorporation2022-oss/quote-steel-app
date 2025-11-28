const mongoose = require('mongoose');

const WeightProfileSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Standard ISI Weights"

    // Rod weights in Kg per rod for each size
    rodWeights: {
        type: Map,
        of: Number
    },

    // Number of rods per bundle for each size
    rodsPerBundle: {
        type: Map,
        of: Number
    }
});

module.exports = mongoose.model('WeightProfile', WeightProfileSchema);
