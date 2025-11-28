const connectDB = require('../lib/db');
const WeightProfile = require('../models/WeightProfile');

module.exports = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.query;

        if (req.method === 'GET') {
            const profile = await WeightProfile.findById(id);
            if (!profile) {
                return res.status(404).json({ message: 'Profile not found' });
            }
            return res.status(200).json(profile);
        }

        if (req.method === 'PUT') {
            const updated = await WeightProfile.findByIdAndUpdate(id, req.body, { new: true });
            return res.status(200).json(updated);
        }

        if (req.method === 'DELETE') {
            await WeightProfile.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Profile deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: error.message });
    }
};
