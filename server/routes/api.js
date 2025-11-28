const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const Product = require('../models/Product');
const Quote = require('../models/Quote');
const WeightProfile = require('../models/WeightProfile');
const pdfGenerator = require('../utils/pdfGenerator');

// --- WEIGHT PROFILES ---

router.get('/weight-profiles', async (req, res) => {
    try {
        const profiles = await WeightProfile.find().sort({ name: 1 }).lean();
        res.json(profiles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/weight-profiles', async (req, res) => {
    console.log('POST /weight-profiles body:', req.body);
    const profile = new WeightProfile(req.body);
    try {
        const newProfile = await profile.save();
        console.log('Created profile:', newProfile);
        res.status(201).json(newProfile);
    } catch (err) {
        console.error('Error creating profile:', err);
        res.status(400).json({ message: err.message });
    }
});

router.put('/weight-profiles/:id', async (req, res) => {
    try {
        const updated = await WeightProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/weight-profiles/:id', async (req, res) => {
    try {
        await WeightProfile.findByIdAndDelete(req.params.id);
        res.json({ message: 'Profile deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- BRANDS ---

// Get all brands (Populated)
router.get('/brands', async (req, res) => {
    try {
        const brands = await Brand.find()
            .populate('weightProfile')
            .lean();

        const brandsWithDerivedData = brands.map(b => {
            // Initialize maps
            b.rodWeightMap = b.rodWeightMap || {};
            b.rodsPerBundleMap = {};
            b.bundleWeightMap = b.bundleWeightMap || {};

            // If brand has a weight profile, extract values
            if (b.weightProfile) {
                const profile = b.weightProfile;

                // Copy rod weights from profile
                if (profile.rodWeights) {
                    Object.assign(b.rodWeightMap, profile.rodWeights);
                }

                // Copy rods per bundle from profile
                if (profile.rodsPerBundle) {
                    b.rodsPerBundleMap = profile.rodsPerBundle;
                }

                // Calculate bundle weights
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

        res.json(brandsWithDerivedData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single brand
router.get('/brands/:id', async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Brand not found' });
        res.json(brand);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create brand
router.post('/brands', async (req, res) => {
    try {
        const brand = new Brand(req.body);

        // Manually set sizeFormulas if provided (Mongoose Maps need special handling)
        if (req.body.sizeFormulas) {
            brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
        }

        // Manually set sizePricing if provided
        if (req.body.sizePricing) {
            brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
        }

        console.log('Creating brand with sizeFormulas:', brand.sizeFormulas);
        const newBrand = await brand.save();
        res.status(201).json(newBrand);
    } catch (err) {
        console.error('Error creating brand:', err);
        res.status(400).json({ message: err.message });
    }
});

// Update brand
router.put('/brands/:id', async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        // Update all fields
        Object.keys(req.body).forEach(key => {
            if (key !== 'sizeFormulas') {
                brand[key] = req.body[key];
            }
        });

        // Manually set sizeFormulas if provided (Mongoose Maps need special handling)
        if (req.body.sizeFormulas) {
            brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
        }

        // Manually set sizePricing if provided
        if (req.body.sizePricing) {
            brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
        }

        console.log('Updating brand with sizeFormulas:', brand.sizeFormulas);
        const updatedBrand = await brand.save();
        res.json(updatedBrand);
    } catch (err) {
        console.error('Error updating brand:', err);
        res.status(400).json({ message: err.message });
    }
});

// Delete brand
router.delete('/brands/:id', async (req, res) => {
    try {
        await Brand.findByIdAndDelete(req.params.id);
        res.json({ message: 'Brand deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- PRODUCTS ---

// Get all products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create product
router.post('/products', async (req, res) => {
    const product = new Product(req.body);
    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update product
router.put('/products/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- QUOTES ---

// Get quotes (with filters)
router.get('/quotes', async (req, res) => {
    try {
        const { customerName, dateFrom, dateTo } = req.query;
        let query = {};

        if (customerName) {
            query.customerName = { $regex: customerName, $options: 'i' };
        }

        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) query.date.$lte = new Date(dateTo);
        }

        const quotes = await Quote.find(query).sort({ date: -1 });
        res.json(quotes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single quote
router.get('/quotes/:id', async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Quote not found' });
        res.json(quote);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create quote
router.post('/quotes', async (req, res) => {
    const quote = new Quote(req.body);
    try {
        const newQuote = await quote.save();
        res.status(201).json(newQuote);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update quote
router.put('/quotes/:id', async (req, res) => {
    try {
        const updatedQuote = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedQuote);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete quote
router.delete('/quotes/:id', async (req, res) => {
    try {
        await Quote.findByIdAndDelete(req.params.id);
        res.json({ message: 'Quote deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Bulk delete quotes
router.post('/quotes/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        await Quote.deleteMany({ _id: { $in: ids } });
        res.json({ message: 'Quotes deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Export PDF
router.post('/quotes/:id/export', async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Quote not found' });

        // Generate PDF
        const pdfBuffer = await pdfGenerator.generateQuotePDF(quote);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=quote-${quote.quoteNo}.pdf`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
