const connectDB = require('../lib/db');
const Product = require('../models/Product');

module.exports = async (req, res) => {
    try {
        await connectDB();

        if (req.method === 'GET') {
            const products = await Product.find().sort({ name: 1 });
            return res.status(200).json(products);
        }

        if (req.method === 'POST') {
            const product = new Product(req.body);
            const newProduct = await product.save();
            return res.status(201).json(newProduct);
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
