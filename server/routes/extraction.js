const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Configure Multer for file uploads
const upload = multer({
    dest: 'uploads/',
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

        const filePath = req.file.path;
        const mimeType = req.file.mimetype;

        // Convert file to base64
        const fileBuffer = fs.readFileSync(filePath);
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
                - rate: Unit price/rate
                - hsn: HSN/SAC code if available
                
            Rules:
            - Try to clean up descriptions (e.g., remove serial numbers if they are separate).
            - Ensure qty and rate are numbers.
            - If a field is missing, use null.
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

        // Extract JSON from response (sometimes Gemini wraps it in code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response into JSON');
        }

        const extractedData = JSON.parse(jsonMatch[0]);

        // Cleanup: delete uploaded file
        fs.unlinkSync(filePath);

        res.json(extractedData);

    } catch (error) {
        console.error('Extraction Error:', error);
        res.status(500).json({ message: 'LOCAL_EXTRACTION_FAILED_V3: ' + error.message });

        // Cleanup on error
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
    }
});

module.exports = router;
