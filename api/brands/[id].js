const connectDB = require('../lib/db');
const Brand = require('../models/Brand');

module.exports = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.query;

        if (req.method === 'GET') {
            const brand = await Brand.findById(id);
            if (!brand) {
                return res.status(404).json({ message: 'Brand not found' });
            }
            return res.status(200).json(brand);
        }

        if (req.method === 'PUT') {
            const brand = await Brand.findById(id);
            if (!brand) {
                return res.status(404).json({ message: 'Brand not found' });
            }

            Object.keys(req.body).forEach(key => {
                if (key !== 'sizeFormulas' && key !== 'sizePricing') {
                    brand[key] = req.body[key];
                }
            });

            if (req.body.sizeFormulas) {
                brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
            }
            if (req.body.sizePricing) {
                brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
            }

            const updatedBrand = await brand.save();
            return res.status(200).json(updatedBrand);
        }

        if (req.method === 'DELETE') {
            await Brand.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Brand deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
