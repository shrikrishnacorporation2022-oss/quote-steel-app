const connectDB = require('./_lib/db');
const Brand = require('./_lib/models/Brand');
const Product = require('./_lib/models/Product');
const Quote = require('./_lib/models/Quote');
const WeightProfile = require('./_lib/models/WeightProfile');
const pdfGenerator = require('./_lib/pdfGenerator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Busboy = require('busboy');
const { uploadToDrive } = require('./_lib/drive');
const { sanitizeJSON } = require('./_lib/sanitizer');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const cookie = require('cookie');

module.exports = async (req, res) => {
    try {
        // Connect to DB first
        await connectDB();

        // CORS Headers
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Parse path
        let path = req.url.split('?')[0];
        path = path.replace('/api/', '').replace(/^\//, '');
        const query = req.query;

        // --- AUTHENTICATION ROUTES ---

        // Helper to check auth
        const isAuthenticated = () => {
            const cookies = cookie.parse(req.headers.cookie || '');
            return cookies.auth_token === 'valid_session';
        };

        // GET /api/auth/me
        if (path === 'auth/me' && req.method === 'GET') {
            return res.json({ authenticated: isAuthenticated() });
        }

        // POST /api/auth/logout
        if (path === 'auth/logout' && req.method === 'POST') {
            res.setHeader('Set-Cookie', cookie.serialize('auth_token', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 0,
                path: '/'
            }));
            return res.json({ success: true, message: 'Logged out' });
        }

        // GET /api/auth/setup
        if (path === 'auth/setup' && req.method === 'GET') {
            if (!process.env.AUTHENTICATOR_SECRET) {
                // Generate secret if not exists (log it for admin)
                const secret = speakeasy.generateSecret({ name: 'Ammashanthi Quote Steel' });
                console.log('NEW SECRET:', secret.base32);
                // In a real serverless env, we can't easily persist this to env. 
                // But for first time setup, we return it so user can add to env.
                return res.json({
                    qrImage: await qrcode.toDataURL(secret.otpauth_url),
                    secret: secret.base32,
                    message: 'Add this secret to your Vercel Environment Variables as AUTHENTICATOR_SECRET'
                });
            }

            const secret = process.env.AUTHENTICATOR_SECRET;
            const otpauth_url = speakeasy.otpauthURL({
                secret: secret,
                label: 'Ammashanthi Quote Steel',
                encoding: 'base32'
            });
            return res.json({ qrImage: await qrcode.toDataURL(otpauth_url), secret });
        }

        // POST /api/auth/verify
        if (path === 'auth/verify' && req.method === 'POST') {
            const { token } = req.body;
            const secret = process.env.AUTHENTICATOR_SECRET;

            if (!secret) return res.status(500).json({ message: 'Server secret not configured' });

            const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1
            });

            if (verified) {
                res.setHeader('Set-Cookie', cookie.serialize('auth_token', 'valid_session', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 30 * 24 * 60 * 60, // 30 days
                    path: '/'
                }));
                return res.json({ success: true });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid code' });
            }
        }

        // --- PROTECTED ROUTES ---
        // For now, we allow read access but protect write access? 
        // Or protect everything? Let's protect write operations.

        if (req.method !== 'GET' && !isAuthenticated()) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // ============ EXTRACTION ============
        if (path === 'extraction/extract-quote' && req.method === 'POST') {
            try {
                if (!process.env.GEMINI_API_KEY) {
                    return res.status(500).json({ message: 'GEMINI_API_KEY not configured on Vercel' });
                }

                // Helper to parse multipart form data in serverless
                const parseMultipart = () => {
                    return new Promise((resolve, reject) => {
                        const busboy = Busboy({ headers: req.headers });
                        const result = { file: null, fields: {} };

                        busboy.on('file', (name, file, info) => {
                            const { filename, mimeType } = info;
                            const chunks = [];
                            file.on('data', (data) => chunks.push(data));
                            file.on('end', () => {
                                result.file = { name, filename, mimeType, data: Buffer.concat(chunks) };
                            });
                        });

                        busboy.on('field', (name, val) => {
                            result.fields[name] = val;
                        });

                        busboy.on('finish', () => resolve(result));
                        busboy.on('error', (err) => reject(err));

                        req.pipe(busboy);
                    });
                };

                const { file } = await parseMultipart();
                if (!file) return res.status(400).json({ message: 'No file uploaded' });

                const OpenAI = require('openai');
                const pdf = require('pdf-parse');

                const openai = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                    organization: process.env.OPENAI_ORG_ID,
                });

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
                if (file.mimeType === 'application/pdf') {
                    // 1. Extract text from PDF using pdf-parse (No AI for conversion)
                    const pdfData = await pdf(file.data);
                    if (!pdfData.text || pdfData.text.trim().length === 0) {
                        throw new Error('This PDF appears to be a scanned image with no selectable text. Please upload an Image (JPG/PNG) instead.');
                    }
                    openaiContent = [
                        { type: "text", text: prompt },
                        { type: "text", text: "Here is the extracted text from the PDF:\n\n" + pdfData.text }
                    ];
                } else {
                    // 2. Handle as Image using GPT-4o Vision
                    openaiContent = [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${file.mimeType};base64,${file.data.toString('base64')}`,
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
                const sanitized = sanitizeJSON(text);
                if (!sanitized) {
                    throw new Error('Failed to extract JSON from OpenAI response.');
                }

                const extractedData = JSON.parse(sanitized);

                // 3. Upload file to Google Drive (Permanent Storage)
                const driveResult = await uploadToDrive(file.data, `vendor_${Date.now()}_${file.name}`, file.mimeType);
                if (driveResult) {
                    extractedData.vendorBillUrl = driveResult.link;
                } else {
                    extractedData.driveError = true;
                }

                return res.json(extractedData);

            } catch (error) {
                console.error('Extraction Error:', error);
                return res.status(500).json({ message: 'EXTRACTION_FAILED_V3: ' + error.message });
            }
        }

        // ============ BRANDS ============
        if (path === 'brands' && req.method === 'GET' && !query.id) {
            const brands = await Brand.find().populate('weightProfile').lean();
            const brandsWithDerivedData = brands.map(b => {
                b.rodWeightMap = b.rodWeightMap || {};
                b.rodsPerBundleMap = {};
                b.bundleWeightMap = b.bundleWeightMap || {};
                if (b.weightProfile) {
                    const profile = b.weightProfile;
                    if (profile.rodWeights) Object.assign(b.rodWeightMap, profile.rodWeights);
                    if (profile.rodsPerBundle) b.rodsPerBundleMap = profile.rodsPerBundle;
                    for (const size of Object.keys(b.rodsPerBundleMap)) {
                        const rods = b.rodsPerBundleMap[size];
                        const rodWt = b.rodWeightMap[size];
                        if (rods && rodWt) b.bundleWeightMap[size] = rods * rodWt;
                    }
                }
                return b;
            });
            return res.json(brandsWithDerivedData);
        }

        if (path === 'brands' && req.method === 'GET' && query.id) {
            const brand = await Brand.findById(query.id);
            if (!brand) return res.status(404).json({ message: 'Brand not found' });
            return res.json(brand);
        }

        if (path === 'brands' && req.method === 'POST') {
            const brand = new Brand(req.body);
            if (req.body.sizeFormulas) brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
            if (req.body.sizePricing) brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
            const newBrand = await brand.save();
            return res.status(201).json(newBrand);
        }

        if (path === 'brands' && req.method === 'PUT' && query.id) {
            const brand = await Brand.findById(query.id);
            if (!brand) return res.status(404).json({ message: 'Brand not found' });
            Object.keys(req.body).forEach(key => {
                if (key !== 'sizeFormulas' && key !== 'sizePricing') brand[key] = req.body[key];
            });
            if (req.body.sizeFormulas) brand.sizeFormulas = new Map(Object.entries(req.body.sizeFormulas));
            if (req.body.sizePricing) brand.sizePricing = new Map(Object.entries(req.body.sizePricing));
            const updatedBrand = await brand.save();
            return res.json(updatedBrand);
        }

        if (path === 'brands' && req.method === 'DELETE' && query.id) {
            await Brand.findByIdAndDelete(query.id);
            return res.json({ message: 'Brand deleted' });
        }

        // ============ PRODUCTS ============
        if (path === 'products' && req.method === 'GET' && !query.id) {
            const products = await Product.find().sort({ name: 1 });
            return res.json(products);
        }

        if (path === 'products' && req.method === 'GET' && query.id) {
            const product = await Product.findById(query.id);
            if (!product) return res.status(404).json({ message: 'Product not found' });
            return res.json(product);
        }

        if (path === 'products' && req.method === 'POST') {
            const product = new Product(req.body);
            const newProduct = await product.save();
            return res.status(201).json(newProduct);
        }

        if (path === 'products' && req.method === 'PUT' && query.id) {
            const updated = await Product.findByIdAndUpdate(query.id, req.body, { new: true });
            return res.json(updated);
        }

        if (path === 'products' && req.method === 'DELETE' && query.id) {
            await Product.findByIdAndDelete(query.id);
            return res.json({ message: 'Product deleted' });
        }

        // ============ WEIGHT PROFILES ============
        if (path === 'weight-profiles' && req.method === 'GET' && !query.id) {
            const profiles = await WeightProfile.find().sort({ name: 1 }).lean();
            return res.json(profiles);
        }

        if (path === 'weight-profiles' && req.method === 'GET' && query.id) {
            const profile = await WeightProfile.findById(query.id);
            if (!profile) return res.status(404).json({ message: 'Profile not found' });
            return res.json(profile);
        }

        if (path === 'weight-profiles' && req.method === 'POST') {
            const profile = new WeightProfile(req.body);
            const newProfile = await profile.save();
            return res.status(201).json(newProfile);
        }

        if (path === 'weight-profiles' && req.method === 'PUT' && query.id) {
            const updated = await WeightProfile.findByIdAndUpdate(query.id, req.body, { new: true });
            return res.json(updated);
        }

        if (path === 'weight-profiles' && req.method === 'DELETE' && query.id) {
            await WeightProfile.findByIdAndDelete(query.id);
            return res.json({ message: 'Profile deleted' });
        }

        // ============ QUOTES ============
        if (path === 'quotes' && req.method === 'GET' && !query.id && !query.export) {
            let dbQuery = {};
            if (query.customerName) dbQuery.customerName = { $regex: query.customerName, $options: 'i' };
            if (query.dateFrom || query.dateTo) {
                dbQuery.date = {};
                if (query.dateFrom) dbQuery.date.$gte = new Date(query.dateFrom);
                if (query.dateTo) dbQuery.date.$lte = new Date(query.dateTo);
            }
            const quotes = await Quote.find(dbQuery).sort({ date: -1 });
            return res.json(quotes);
        }

        if (path === 'quotes' && req.method === 'GET' && query.id && !query.export) {
            const quote = await Quote.findById(query.id);
            if (!quote) return res.status(404).json({ message: 'Quote not found' });
            return res.json(quote);
        }

        if (path === 'quotes' && req.method === 'POST' && query.id && query.export) {
            const quote = await Quote.findById(query.id);
            if (!quote) return res.status(404).json({ message: 'Quote not found' });
            const pdfBuffer = await pdfGenerator.generateQuotePDF(quote);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=quote-${quote.quoteNo}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        }

        if (path === 'quotes' && req.method === 'POST' && query.bulkDelete) {
            const { ids } = req.body;
            await Quote.deleteMany({ _id: { $in: ids } });
            return res.json({ message: 'Quotes deleted' });
        }

        if (path === 'quotes' && req.method === 'POST' && !query.bulkDelete && !query.export) {
            const quote = new Quote(req.body);
            const newQuote = await quote.save();
            return res.status(201).json(newQuote);
        }

        if (path === 'quotes' && req.method === 'PUT' && query.id) {
            const updated = await Quote.findByIdAndUpdate(query.id, req.body, { new: true });
            return res.json(updated);
        }

        if (path === 'quotes' && req.method === 'DELETE' && query.id) {
            await Quote.findByIdAndDelete(query.id);
            return res.json({ message: 'Quote deleted' });
        }

        return res.status(404).json({ message: 'Not found' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
