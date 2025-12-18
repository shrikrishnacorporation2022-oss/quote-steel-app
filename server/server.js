const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const session = require('express-session');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Vercel/Heroku
app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // Adjust for production
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'ammashanthi-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // secure in production
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // needed for cross-site if frontend/backend differ
    }
}));

// API Routes
console.log('Registering API routes...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/api/extraction', require('./routes/extraction'));

// Basic Route
app.get('/', (req, res) => {
    res.send('Steel Quote App API is running');
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/steel-quote-app';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
