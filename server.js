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

// API endpoint to get player points
app.get('/api/players', (req, res) => {
    // Always return cached data immediately (non-blocking)
    if (cachedPoints) {
        const needsRefresh = !lastFetchTime || (Date.now() - lastFetchTime > CACHE_DURATION);

        // Start background refresh if needed
        if (needsRefresh && !isScraperRunning) {
            runScraperInBackground();
        }

        return res.json({
            success: true,
            data: cachedPoints,
            cached: true,
            count: Object.keys(cachedPoints).length,
            refreshing: isScraperRunning
        });
    }

    // No cached data - need to wait for scraper
    if (!isScraperRunning) {
        runScraperInBackground();
    }

    // Return empty with message
    res.json({
        success: true,
        data: {},
        cached: false,
        count: 0,
        message: 'Loading player data... Please refresh in 30 seconds.',
        refreshing: true
    });
});

// Force refresh endpoint
app.get('/api/refresh', (req, res) => {
    if (isScraperRunning) {
        return res.json({ success: true, message: 'Refresh already in progress' });
    }

    runScraperInBackground();
    res.json({ success: true, message: 'Refresh started' });
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
