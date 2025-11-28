const connectDB = require('../lib/db');
const Quote = require('../models/Quote');

module.exports = async (req, res) => {
    try {
        await connectDB();

        if (req.method === 'GET') {
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
            return res.status(200).json(quotes);
        }

        if (req.method === 'POST') {
            const quote = new Quote(req.body);
            const newQuote = await quote.save();
            return res.status(201).json(newQuote);
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
