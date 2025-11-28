const connectDB = require('./_lib/db');
const Brand = require('./_lib/models/Brand');
const Product = require('./_lib/models/Product');
const Quote = require('./_lib/models/Quote');
const WeightProfile = require('./_lib/models/WeightProfile');
const pdfGenerator = require('./_lib/pdfGenerator');

module.exports = async (req, res) => {
    await connectDB();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // In Vercel, the path might be /weight-profiles or /api/weight-profiles
        let path = req.url.split('?')[0];
        path = path.replace('/api/', '').replace(/^\//, ''); // Remove leading /api/ or /
        const query = req.query;

        // ============ BRANDS ============
        if (path === 'brands' && req.method === 'GET' && !query.id) {
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

        if (path === 'brands' && req.method === 'GET' && query.id) {
            const brand = await Brand.findById(query.id);
            if (!brand) return res.status(404).json({ message: 'Brand not found' });
            return res.json(brand);
        }

        if (path === 'brands' && req.method === 'POST') {
            const brand = new Brand(req.body);
            if (req.body.sizeFormulas) brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
            if (req.body.sizePricing) brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
            const newBrand = await brand.save();
            return res.status(201).json(newBrand);
        }

        if (path === 'brands' && req.method === 'PUT' && query.id) {
            const brand = await Brand.findById(query.id);
            if (!brand) return res.status(404).json({ message: 'Brand not found' });
            Object.keys(req.body).forEach(key => {
                if (key !== 'sizeFormulas' && key !== 'sizePricing') brand[key] = req.body[key];
            });
            if (req.body.sizeFormulas) brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
            if (req.body.sizePricing) brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
            const updatedBrand = await brand.save();
            return res.json(updatedBrand);
        }

        if (path === 'brands' && req.method === 'DELETE' && query.id) {
            await Brand.findByIdAndDelete(query.id);
            return res.json({ message: 'Brand deleted' });
        }

        // ============ PRODUCTS ============
        if (path === 'products' && req.method === 'GET' && !query.id) {
            const products = await Product.find().sort({ name: 1 });
            return res.json(products);
        }

        if (path === 'products' && req.method === 'GET' && query.id) {
            const product = await Product.findById(query.id);
            if (!product) return res.status(404).json({ message: 'Product not found' });
            return res.json(product);
        }

        if (path === 'products' && req.method === 'POST') {
            const product = new Product(req.body);
            const newProduct = await product.save();
            return res.status(201).json(newProduct);
        }

        if (path === 'products' && req.method === 'PUT' && query.id) {
            const updated = await Product.findByIdAndUpdate(query.id, req.body, { new: true });
            return res.json(updated);
        }

        if (path === 'products' && req.method === 'DELETE' && query.id) {
            await Product.findByIdAndDelete(query.id);
            return res.json({ message: 'Product deleted' });
        }

        // ============ WEIGHT PROFILES ============
        if (path === 'weight-profiles' && req.method === 'GET' && !query.id) {
            const profiles = await WeightProfile.find().sort({ name: 1 }).lean();
            return res.json(profiles);
        }

        if (path === 'weight-profiles' && req.method === 'GET' && query.id) {
            const profile = await WeightProfile.findById(query.id);
            if (!profile) return res.status(404).json({ message: 'Profile not found' });
            return res.json(profile);
        }

        if (path === 'weight-profiles' && req.method === 'POST') {
            const profile = new WeightProfile(req.body);
            const newProfile = await profile.save();
            return res.status(201).json(newProfile);
        }

        if (path === 'weight-profiles' && req.method === 'PUT' && query.id) {
            const updated = await WeightProfile.findByIdAndUpdate(query.id, req.body, { new: true });
            return res.json(updated);
        }

        if (path === 'weight-profiles' && req.method === 'DELETE' && query.id) {
            await WeightProfile.findByIdAndDelete(query.id);
            return res.json({ message: 'Profile deleted' });
        }

        // ============ QUOTES ============
        if (path === 'quotes' && req.method === 'GET' && !query.id && !query.export) {
            let dbQuery = {};
            if (query.customerName) dbQuery.customerName = { $regex: query.customerName, $options: 'i' };
            if (query.dateFrom || query.dateTo) {
                dbQuery.date = {};
                if (query.dateFrom) dbQuery.date.$gte = new Date(query.dateFrom);
                if (query.dateTo) dbQuery.date.$lte = new Date(query.dateTo);
            }
            const quotes = await Quote.find(dbQuery).sort({ date: -1 });
            return res.json(quotes);
        }

        if (path === 'quotes' && req.method === 'GET' && query.id && !query.export) {
            const quote = await Quote.findById(query.id);
            if (!quote) return res.status(404).json({ message: 'Quote not found' });
            return res.json(quote);
        }

        if (path === 'quotes' && req.method === 'POST' && query.id && query.export) {
            const quote = await Quote.findById(query.id);
            if (!quote) return res.status(404).json({ message: 'Quote not found' });
            const pdfBuffer = await pdfGenerator.generateQuotePDF(quote);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=quote-${quote.quoteNo}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        }

        if (path === 'quotes' && req.method === 'POST' && query.bulkDelete) {
            const { ids } = req.body;
            await Quote.deleteMany({ _id: { $in: ids } });
            return res.json({ message: 'Quotes deleted' });
        }

        if (path === 'quotes' && req.method === 'POST' && !query.bulkDelete && !query.export) {
            const quote = new Quote(req.body);
            const newQuote = await quote.save();
            return res.status(201).json(newQuote);
        }

        if (path === 'quotes' && req.method === 'PUT' && query.id) {
            const updated = await Quote.findByIdAndUpdate(query.id, req.body, { new: true });
            return res.json(updated);
        }

        if (path === 'quotes' && req.method === 'DELETE' && query.id) {
            await Quote.findByIdAndDelete(query.id);
            return res.json({ message: 'Quote deleted' });
        }

        return res.status(404).json({ message: 'Not found' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
