const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Cache for player points
let cachedPoints = null;
let lastFetchTime = null;
let isScraperRunning = false;
const CACHE_DURATION = 60000; // 1 minute cache

// Load existing data on startup
const jsonPath = path.join(__dirname, 'player-points.json');
if (fs.existsSync(jsonPath)) {
    try {
        cachedPoints = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        lastFetchTime = Date.now();
        console.log(`Loaded ${Object.keys(cachedPoints).length} players from existing JSON`);
    } catch (e) {
        console.log('No existing player data found');
    }
}

// Run scraper in background (non-blocking)
function runScraperInBackground() {
    if (isScraperRunning) {
        console.log('Scraper already running, skipping...');
        return;
    }

    isScraperRunning = true;
    console.log('Starting scraper in background...');

    exec('python3 scraper.py', { cwd: __dirname, timeout: 180000 }, (error, stdout, stderr) => {
        isScraperRunning = false;

        if (error) {
            console.error('Scraper error:', error.message);
            return;
        }

        // Reload the JSON file
        if (fs.existsSync(jsonPath)) {
            try {
                cachedPoints = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                lastFetchTime = Date.now();
                console.log(`Scraper finished: ${Object.keys(cachedPoints).length} players loaded`);
            } catch (e) {
                console.error('Error reading JSON:', e.message);
            }
        }
    });
}

// API endpoint to get player points (just returns cached data, never triggers scraper)
app.get('/api/players', (req, res) => {
    if (cachedPoints) {
        return res.json({
            success: true,
            data: cachedPoints,
            cached: true,
            count: Object.keys(cachedPoints).length,
            lastUpdated: lastFetchTime ? new Date(lastFetchTime).toISOString() : null,
            refreshing: isScraperRunning
        });
    }

    // No data yet - server is still starting up
    res.json({
        success: true,
        data: {},
        cached: false,
        count: 0,
        message: 'Server starting up... Data will load in ~30 seconds.',
        refreshing: isScraperRunning
    });
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
    console.log(`Auto-refresh: Every 6 hours`);
    console.log(`========================================\n`);

    // Auto-refresh every 6 hours (server-side, not user-triggered)
    const AUTO_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

    // Always refresh on startup (handles Render free tier spin-up after inactivity)
    console.log('Running initial scraper on startup...');
    runScraperInBackground();

    // Schedule automatic refreshes
    setInterval(() => {
        console.log('Auto-refresh triggered...');
        runScraperInBackground();
    }, AUTO_REFRESH_INTERVAL);
});
