const connectDB = require('../lib/db');
const WeightProfile = require('../models/WeightProfile');

module.exports = async (req, res) => {
    try {
        await connectDB();

        if (req.method === 'GET') {
            const profiles = await WeightProfile.find().sort({ name: 1 }).lean();
            return res.status(200).json(profiles);
        }

        if (req.method === 'POST') {
            const profile = new WeightProfile(req.body);
            const newProfile = await profile.save();
            return res.status(201).json(newProfile);
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
