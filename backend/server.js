const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
// REPLACE: app.use(cors()); 
// WITH THIS:

app.use(cors({
    origin: '*',  // Allow requests from any origin (e.g., your local frontend)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match'] // Explicitly allow the header causing the error
}));

app.use(bodyParser.json());

const PORT = 3000;

// --- 1. Connect to MongoDB ---
mongoose.connect('mongodb://127.0.0.1:27017/tourist_app')
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- 2. Define Schemas ---

// USER Schema (New!)
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true } // In real apps, we encrypt this!
});

// Spot Schema
const SpotSchema = new mongoose.Schema({
    name: String,
    lat: Number,
    lng: Number,
    description: String,
    history: String,
    openTime: String,
    closeTime: String,
    isOpen: Boolean,
    rating: Number,
    visits: Number,
    audioUrl: String
});

// Review Schema
const ReviewSchema = new mongoose.Schema({
    placeId: String,
    user: String,
    text: String,
    rating: Number,
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Spot = mongoose.model('Spot', SpotSchema);
const Review = mongoose.model('Review', ReviewSchema);

// --- 3. Authentication Routes (New!) ---

// Sign Up Route
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const newUser = new User({ username, password });
        await newUser.save();
        res.json({ success: true, message: "User created! You can now login." });
    } catch (err) {
        res.json({ success: false, message: "Username already taken or error." });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, username: user.username });
        } else {
            res.json({ success: false, message: "Invalid username or password." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 4. Other Routes ---
// (Keep your existing routes for spots and reviews here)

app.get('/top-visited', async (req, res) => {
    const top = await Spot.find().sort({ visits: -1 }).limit(3);
    res.json(top);
});

app.get('/nearby', async (req, res) => {
    const allSpots = await Spot.find();
    const formattedSpots = allSpots.map(spot => ({ ...spot._doc, id: spot._id }));
    res.json(formattedSpots);
});

app.get('/search', async (req, res) => {
    const query = req.query.q;
    const results = await Spot.find({ name: { $regex: query, $options: 'i' } });
    const formattedResults = results.map(spot => ({ ...spot._doc, id: spot._id }));
    res.json(formattedResults);
});

app.post('/review', async (req, res) => {
    const { placeId, user, text, rating } = req.body;
    const newReview = new Review({ placeId, user, text, rating });
    await newReview.save();
    console.log(`New Review saved for ${placeId} by ${user}`);
    res.json({ message: "Review saved!" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});