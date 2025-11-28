const connectDB = require('./_lib/db');
const WeightProfile = require('./_lib/models/WeightProfile');

module.exports = async (req, res) => {
    await connectDB();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { id } = req.query;

        if (req.method === 'GET' && !id) {
            const profiles = await WeightProfile.find().sort({ name: 1 }).lean();
            return res.json(profiles);
        }

        if (req.method === 'GET' && id) {
            const profile = await WeightProfile.findById(id);
            if (!profile) return res.status(404).json({ message: 'Profile not found' });
            return res.json(profile);
        }

        if (req.method === 'POST') {
            const profile = new WeightProfile(req.body);
            const newProfile = await profile.save();
            return res.status(201).json(newProfile);
        }

        if (req.method === 'PUT' && id) {
            const updated = await WeightProfile.findByIdAndUpdate(id, req.body, { new: true });
            return res.json(updated);
        }

        if (req.method === 'DELETE' && id) {
            await WeightProfile.findByIdAndDelete(id);
            return res.json({ message: 'Profile deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
