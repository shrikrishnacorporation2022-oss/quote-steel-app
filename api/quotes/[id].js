const connectDB = require('../lib/db');
const Quote = require('../models/Quote');

module.exports = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.query;

        if (req.method === 'GET') {
            const quote = await Quote.findById(id);
            if (!quote) {
                return res.status(404).json({ message: 'Quote not found' });
            }
            return res.status(200).json(quote);
        }

        if (req.method === 'PUT') {
            const updatedQuote = await Quote.findByIdAndUpdate(id, req.body, { new: true });
            return res.status(200).json(updatedQuote);
        }

        if (req.method === 'DELETE') {
            await Quote.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Quote deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
