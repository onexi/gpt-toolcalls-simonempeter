import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';

import { execute as getLocation } from './functions/get_location.js';
import { findClosestStadium } from './functions/find_closest_stadium.js';

// Initialize Express server
const app = express();
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.resolve(process.cwd(), './public')));

// Default route to serve index.html for any undefined routes
app.get('*', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), './public/index.html'));
});

// Route to get the city coordinates and find the closest stadium
app.post('/api/get-closest-stadium', async (req, res) => {
    const { city } = req.body;

    try {
        // Step 1: Get city coordinates
        const cityCoordinates = await getLocation(city);

        if (cityCoordinates.error) {
            return res.status(400).json({ error: cityCoordinates.error });
        }

        // Step 2: Find the closest stadium
        const closestStadium = await findClosestStadium(cityCoordinates);

        if (closestStadium) {
            return res.json({
                city: cityCoordinates.city,
                latitude: cityCoordinates.latitude,
                longitude: cityCoordinates.longitude,
                closestStadium: closestStadium.name,
                stadiumCity: closestStadium.city,
                distance: closestStadium.distance,
                date: closestStadium.date,
                image_url: closestStadium.image_url  // Include the stadium image URL
            });
        } else {
            return res.status(404).json({ error: 'No stadiums found' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
