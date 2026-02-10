const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Cache for player points
let cachedPoints = null;
let lastFetchTime = null;
const CACHE_DURATION = 60000; // 1 minute cache

// API endpoint to fetch player points using Python scraper
app.get('/api/players', async (req, res) => {
    try {
        // Check cache
        if (cachedPoints && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
            console.log('Returning cached data');
            return res.json({ success: true, data: cachedPoints, cached: true, count: Object.keys(cachedPoints).length });
        }

        console.log('Running Python scraper...');

        // Run the Python scraper
        try {
            execSync('python3 scraper.py', {
                cwd: __dirname,
                timeout: 120000, // 2 minute timeout
                stdio: 'inherit'
            });
        } catch (e) {
            console.error('Scraper error:', e.message);
        }

        // Read the JSON file created by the scraper
        const jsonPath = path.join(__dirname, 'player-points.json');
        if (fs.existsSync(jsonPath)) {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            cachedPoints = data;
            lastFetchTime = Date.now();

            console.log(`Loaded ${Object.keys(data).length} players from scraper`);
            res.json({ success: true, data: data, cached: false, count: Object.keys(data).length });
        } else {
            res.json({ success: false, message: 'Scraper did not produce output file' });
        }

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`T20 Fantasy Dashboard Server Running!`);
    console.log(`========================================`);
    console.log(`Dashboard: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/players`);
    console.log(`========================================\n`);
});
