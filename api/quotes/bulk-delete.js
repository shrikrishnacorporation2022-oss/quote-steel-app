const connectDB = require('../lib/db');
const Quote = require('../models/Quote');

module.exports = async (req, res) => {
    try {
        await connectDB();

        if (req.method === 'POST') {
            const { ids } = req.body;
            await Quote.deleteMany({ _id: { $in: ids } });
            return res.status(200).json({ message: 'Quotes deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
