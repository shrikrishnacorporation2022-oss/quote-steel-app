const express = require('express');
const router = express.Router();
const multer = require('multer');
const { OpenAI } = require('openai');
const pdf = require('pdf-parse');
const { uploadToDrive } = require('../../api/_lib/drive');
const { sanitizeJSON } = require('../../api/_lib/sanitizer');

// Configure Multer for file uploads (using memory storage for direct processing)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
});

router.post('/extract-quote', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ message: 'OpenAI API Key missing on server' });
        }

        const fileBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const base64File = fileBuffer.toString('base64');

        const prompt = `
            Extract data from this vendor invoice/quote into a structured JSON format.
            Return ONLY the JSON object. No markdown, no extra text.
            
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
            - If taxRate is not found, use null.
            - STRICT: Do not use trailing commas in the JSON.
        `;

        let openaiContent;
        if (mimeType === 'application/pdf') {
            // Fix "DOMMatrix is not defined" error in Node/Vercel
            if (typeof global.DOMMatrix === 'undefined') {
                global.DOMMatrix = class DOMMatrix { };
            }
            const pdfData = await pdf(fileBuffer);
            if (!pdfData.text || pdfData.text.trim().length === 0) {
                throw new Error('This PDF appears to be a scanned image with no selectable text. Please upload an Image (JPG/PNG) instead.');
            }
            openaiContent = [
                { type: "text", text: prompt },
                { type: "text", text: "Here is the extracted text from the PDF:\n\n" + pdfData.text }
            ];
        } else {
            openaiContent = [
                { type: "text", text: prompt },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:${mimeType};base64,${base64File}`,
                    },
                },
            ];
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: openaiContent }],
            response_format: { type: "json_object" }
        });

        const text = completion.choices[0].message.content;

        // Extract and Sanitize JSON
        const sanitized = sanitizeJSON(text);
        if (!sanitized) {
            throw new Error('Failed to parse AI response into JSON.');
        }

        const extractedData = JSON.parse(sanitized);

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
