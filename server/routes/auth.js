const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Middleware to check if secret exists
const checkSecret = (req, res, next) => {
    if (!process.env.AUTHENTICATOR_SECRET) {
        // If no secret in env, generate one and log it (for initial setup)
        const secret = speakeasy.generateSecret({ name: 'Ammashanthi Quote Steel' });
        console.log('---------------------------------------------------');
        console.log('NEW AUTHENTICATOR SECRET GENERATED');
        console.log(secret.base32);
        console.log('---------------------------------------------------');

        // Write to file for easier retrieval
        const fs = require('fs');
        fs.writeFileSync('secret.txt', secret.base32);

        process.env.AUTHENTICATOR_SECRET = secret.base32;
    }
    next();
};

// GET /auth/setup - Generate QR code for the admin
router.get('/setup', checkSecret, async (req, res) => {
    try {
        const secret = process.env.AUTHENTICATOR_SECRET;
        const otpauth_url = speakeasy.otpauthURL({
            secret: secret,
            label: 'Ammashanthi Quote Steel',
            encoding: 'base32'
        });

        const qrImage = await qrcode.toDataURL(otpauth_url);
        res.json({ qrImage, secret });
    } catch (error) {
        res.status(500).json({ message: 'Error generating QR code' });
    }
});

// POST /auth/verify - Verify code and login
router.post('/verify', checkSecret, (req, res) => {
    const { token } = req.body;

    // Verify the token
    const verified = speakeasy.totp.verify({
        secret: process.env.AUTHENTICATOR_SECRET,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 30 seconds leeway
    });

    if (verified) {
        // Set session
        req.session.authenticated = true;
        req.session.user = 'admin'; // Simple single user system

        // Save session explicitly
        req.session.save((err) => {
            if (err) return res.status(500).json({ message: 'Session error' });
            res.json({ success: true, message: 'Authenticated successfully' });
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid code' });
    }
});

// POST /auth/logout - Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Could not log out' });
        res.clearCookie('connect.sid'); // Default session cookie name
        res.json({ success: true, message: 'Logged out' });
    });
});

// GET /auth/me - Check auth status
router.get('/me', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
