const connectDB = require('../lib/db');
const Brand = require('../models/Brand');

module.exports = async (req, res) => {
    try {
        await connectDB();

        if (req.method === 'GET') {
            const brands = await Brand.find()
                .populate('weightProfile')
                .lean();

            const brandsWithDerivedData = brands.map(b => {
                b.rodWeightMap = b.rodWeightMap || {};
                b.rodsPerBundleMap = {};
                b.bundleWeightMap = b.bundleWeightMap || {};

                if (b.weightProfile) {
                    const profile = b.weightProfile;
                    if (profile.rodWeights) {
                        Object.assign(b.rodWeightMap, profile.rodWeights);
                    }
                    if (profile.rodsPerBundle) {
                        b.rodsPerBundleMap = profile.rodsPerBundle;
                    }
                    for (const size of Object.keys(b.rodsPerBundleMap)) {
                        const rods = b.rodsPerBundleMap[size];
                        const rodWt = b.rodWeightMap[size];
                        if (rods && rodWt) {
                            b.bundleWeightMap[size] = rods * rodWt;
                        }
                    }
                }
                return b;
            });

            return res.status(200).json(brandsWithDerivedData);
        }

        if (req.method === 'POST') {
            const brand = new Brand(req.body);
            if (req.body.sizeFormulas) {
                brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
            }
            if (req.body.sizePricing) {
                brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
            }
            const newBrand = await brand.save();
            return res.status(201).json(newBrand);
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
