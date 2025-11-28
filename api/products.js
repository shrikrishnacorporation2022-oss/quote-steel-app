const connectDB = require('./_lib/db');
const Product = require('./_lib/models/Product');

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

        if (req.method === 'GET' && !id) {
            const products = await Product.find().sort({ name: 1 });
            return res.json(products);
        }

        if (req.method === 'GET' && id) {
            const product = await Product.findById(id);
            if (!product) return res.status(404).json({ message: 'Product not found' });
            return res.json(product);
        }

        if (req.method === 'POST') {
            const product = new Product(req.body);
            const newProduct = await product.save();
            return res.status(201).json(newProduct);
        }

        if (req.method === 'PUT' && id) {
            const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
            return res.json(updated);
        }

        if (req.method === 'DELETE' && id) {
            await Product.findByIdAndDelete(id);
            return res.json({ message: 'Product deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
