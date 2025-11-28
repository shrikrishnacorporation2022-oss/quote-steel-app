const connectDB = require('./_lib/db');
const Quote = require('./_lib/models/Quote');
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
        const { id, customerName, dateFrom, dateTo, export: exportPdf, bulkDelete } = req.query;

        // GET /api/quotes - List all with filters
        if (req.method === 'GET' && !id && !exportPdf) {
            let query = {};
            if (customerName) query.customerName = { $regex: customerName, $options: 'i' };
            if (dateFrom || dateTo) {
                query.date = {};
                if (dateFrom) query.date.$gte = new Date(dateFrom);
                if (dateTo) query.date.$lte = new Date(dateTo);
            }
            const quotes = await Quote.find(query).sort({ date: -1 });
            return res.json(quotes);
        }

        // GET /api/quotes?id=xxx - Get single
        if (req.method === 'GET' && id && !exportPdf) {
            const quote = await Quote.findById(id);
            if (!quote) return res.status(404).json({ message: 'Quote not found' });
            return res.json(quote);
        }

        // POST /api/quotes?id=xxx&export=true - Export PDF
        if (req.method === 'POST' && id && exportPdf) {
            const quote = await Quote.findById(id);
            if (!quote) return res.status(404).json({ message: 'Quote not found' });
            const pdfBuffer = await pdfGenerator.generateQuotePDF(quote);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=quote-${quote.quoteNo}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        }

        // POST /api/quotes?bulkDelete=true - Bulk delete
        if (req.method === 'POST' && bulkDelete) {
            const { ids } = req.body;
            await Quote.deleteMany({ _id: { $in: ids } });
            return res.json({ message: 'Quotes deleted' });
        }

        // POST /api/quotes - Create
        if (req.method === 'POST' && !bulkDelete && !exportPdf) {
            const quote = new Quote(req.body);
            const newQuote = await quote.save();
            return res.status(201).json(newQuote);
        }

        // PUT /api/quotes?id=xxx - Update
        if (req.method === 'PUT' && id) {
            const updated = await Quote.findByIdAndUpdate(id, req.body, { new: true });
            return res.json(updated);
        }

        // DELETE /api/quotes?id=xxx - Delete
        if (req.method === 'DELETE' && id) {
            await Quote.findByIdAndDelete(id);
            return res.json({ message: 'Quote deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
