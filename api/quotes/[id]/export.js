const connectDB = require('../../lib/db');
const Quote = require('../../models/Quote');
const pdfGenerator = require('../../lib/pdfGenerator');

module.exports = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.query;

        if (req.method === 'POST') {
            const quote = await Quote.findById(id);
            if (!quote) {
                return res.status(404).json({ message: 'Quote not found' });
            }

            const pdfBuffer = await pdfGenerator.generateQuotePDF(quote);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=quote-${quote.quoteNo}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);

            return res.status(200).send(pdfBuffer);
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
