const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { uploadToDrive } = require('../../api/_lib/drive');

// Configure Multer for file uploads (using memory storage for direct processing)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/extract-quote', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: 'Gemini API Key missing on server' });
        }

        const fileBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const base64File = fileBuffer.toString('base64');

        // Prepare Gemini model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            Extract data from this vendor invoice/quote into a structured JSON format.
            Return ONLY the JSON object.
            
            Fields to extract:
            - vendor: Name of the vendor
            - date: Date of the invoice
            - items: An array of objects, each containing:
                - description: Name/description of the product
                - qty: Numerical quantity
                - unit: Unit (e.g., kg, nos, bundle, pcs)
                - rate: Unit price/rate (Base rate excluding tax if possible)
                - taxRate: GST/Tax percentage for this item (e.g., 18 or 12)
                - hsn: HSN/SAC code if available
                
            Rules:
            - Try to clean up descriptions (e.g., remove serial numbers if they are separate).
            - Ensure qty, rate, and taxRate are numbers.
            - If a field is missing, use null.
            - If taxRate is not found, use null (do not guess unless it is explicitly mentioned for the item).
            - Focus on the main items being quoted or sold.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64File,
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response into JSON');
        }

        const extractedData = JSON.parse(jsonMatch[0]);

        // 3. Upload file to Google Drive (Permanent Storage)
        const driveResult = await uploadToDrive(fileBuffer, `vendor_${Date.now()}_${req.file.originalname}`, mimeType);
        if (driveResult) {
            extractedData.vendorBillUrl = driveResult.link;
        } else {
            extractedData.driveError = true;
        }

        res.json(extractedData);

    } catch (error) {
        console.error('Extraction Error:', error);
        res.status(500).json({ message: 'LOCAL_EXTRACTION_FAILED_V4: ' + error.message });
    }
});

module.exports = router;
