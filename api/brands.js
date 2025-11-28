const connectDB = require('./_lib/db');
const Brand = require('./_lib/models/Brand');

module.exports = async (req, res) => {
    await connectDB();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { id } = req.query;

        // GET /api/brands - List all
        if (req.method === 'GET' && !id) {
            const brands = await Brand.find().populate('weightProfile').lean();
            const brandsWithDerivedData = brands.map(b => {
                b.rodWeightMap = b.rodWeightMap || {};
                b.rodsPerBundleMap = {};
                b.bundleWeightMap = b.bundleWeightMap || {};
                if (b.weightProfile) {
                    const profile = b.weightProfile;
                    if (profile.rodWeights) Object.assign(b.rodWeightMap, profile.rodWeights);
                    if (profile.rodsPerBundle) b.rodsPerBundleMap = profile.rodsPerBundle;
                    for (const size of Object.keys(b.rodsPerBundleMap)) {
                        const rods = b.rodsPerBundleMap[size];
                        const rodWt = b.rodWeightMap[size];
                        if (rods && rodWt) b.bundleWeightMap[size] = rods * rodWt;
                    }
                }
                return b;
            });
            return res.json(brandsWithDerivedData);
        }

        // GET /api/brands?id=xxx - Get single
        if (req.method === 'GET' && id) {
            const brand = await Brand.findById(id);
            if (!brand) return res.status(404).json({ message: 'Brand not found' });
            return res.json(brand);
        }

        // POST /api/brands - Create
        if (req.method === 'POST') {
            const brand = new Brand(req.body);
            if (req.body.sizeFormulas) brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
            if (req.body.sizePricing) brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
            const newBrand = await brand.save();
            return res.status(201).json(newBrand);
        }

        // PUT /api/brands?id=xxx - Update
        if (req.method === 'PUT' && id) {
            const brand = await Brand.findById(id);
            if (!brand) return res.status(404).json({ message: 'Brand not found' });
            Object.keys(req.body).forEach(key => {
                if (key !== 'sizeFormulas' && key !== 'sizePricing') brand[key] = req.body[key];
            });
            if (req.body.sizeFormulas) brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
            if (req.body.sizePricing) brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
            const updatedBrand = await brand.save();
            return res.json(updatedBrand);
        }

        // DELETE /api/brands?id=xxx - Delete
        if (req.method === 'DELETE' && id) {
            await Brand.findByIdAndDelete(id);
            return res.json({ message: 'Brand deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
