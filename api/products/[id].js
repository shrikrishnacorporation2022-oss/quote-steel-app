const connectDB = require('../lib/db');
const Product = require('../models/Product');

module.exports = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.query;

        if (req.method === 'GET') {
            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            return res.status(200).json(product);
        }

        if (req.method === 'PUT') {
            const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
            return res.status(200).json(updatedProduct);
        }

        if (req.method === 'DELETE') {
            await Product.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Product deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
