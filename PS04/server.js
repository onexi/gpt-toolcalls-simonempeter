import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

import express from 'express';
import bodyParser from 'body-parser';
import { OpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";

// Initialize Express server
const app = express();
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.resolve(process.cwd(), './public')));

// OpenAI API configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Function to dynamically load available functions
async function getFunctions() {
    const files = fs.readdirSync(path.resolve(process.cwd(), "./functions"));
    const openAIFunctions = {};

    for (const file of files) {
        if (file.endsWith(".js")) {
            const moduleName = file.slice(0, -3); // Extract module name
            const modulePath = `./functions/${moduleName}.js`; // Construct the module path
            
            // Import the module dynamically
            const { details, execute } = await import(modulePath);
            
            // Save the function in openAIFunctions with its module name
            openAIFunctions[moduleName] = {
                "details": details,
                "execute": execute
            };
        }
    }
    return openAIFunctions;
}

// Route to handle OpenAI processing
app.post('/api/openai-call', async (req, res) => {
    const { user_message } = req.body;

    try {
        const functions = await getFunctions();
        const availableFunctions = Object.values(functions).map(fn => fn.details);

        // Messages for OpenAI to understand user input
        let messages = [
            { role: 'system', content: 'You are a helpful assistant that can detect city names and stadium names in user input. If you detect a stadium name, prioritize it and call the get_weather function. If only a city is detected, call the get_location and find_closest_stadium functions.' },
            { role: 'user', content: user_message }
        ];

        // Make OpenAI API call to process user input
        const response = await openai.chat.completions.create({
            model: 'gpt-4-0613',
            messages: messages,
            functions: availableFunctions,
            function_call: "auto"
        });

        const toolCall = response.choices[0].message.function_call;

        if (toolCall) {
            const functionName = toolCall.name;
            const parameters = JSON.parse(toolCall.arguments);

            // If OpenAI detects a stadium name, prioritize get_weather
            if (functionName === 'get_weather') {
                console.log(`Calling get_weather with parameters: ${JSON.stringify(parameters)}`);
                
                // Find the stadium in the JSON file to also display the image
                const stadiums = JSON.parse(fs.readFileSync('./public/eras_tour_stadiums.json', 'utf8'));
                const stadiumData = stadiums.find(stadium => stadium.name.toLowerCase() === parameters.stadium.toLowerCase());

                if (!stadiumData) {
                    return res.status(404).json({ error: 'Stadium not found for weather.' });
                }

                // Parse and format the date from the JSON
                const concertDate = new Date(stadiumData.date);
                const formattedDate = concertDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD

                console.log(`Concert date for ${stadiumData.name}: ${formattedDate}`);

                // Call the get_weather function with the corrected date
                const weatherResult = await functions['get_weather'].execute(stadiumData.latitude, stadiumData.longitude, formattedDate);

                // Return the response from get_weather along with the image
                const message = `
                    <p>${weatherResult.message}</p>
                    <div style="display: flex; justify-content: center; align-items: center;">
                    <img src="${stadiumData.image_url}" alt="${stadiumData.name}" style="max-width: 50%; height: auto;" />
                    <img src="${weatherResult.weatherImageUrl}" alt="Weather Condition Image" style="max-width: 50%; height: auto;" />
                    </div>
                `;
                res.json({ message });
            }

            // If OpenAI detects a city, call get_location and find_closest_stadium
            else if (functionName === 'get_location') {
                console.log(`Calling get_location with parameters: ${JSON.stringify(parameters)}`);
                
                const locationResult = await functions['get_location'].execute(parameters.city);
                const { latitude, longitude } = locationResult.location;

                console.log(`Calling find_closest_stadium with coordinates: latitude=${latitude}, longitude=${longitude}`);
                
                const stadiumResult = await functions['find_closest_stadium'].execute(latitude, longitude);

                // Generate a response using Taylor Swift references
                const messagesWithStadium = [
                    { role: 'system', content: 'You are a helpful assistant who always responds with fun and energetic Taylor Swift song references. Incorporate a Taylor Swift vibe into your responses and mention her songs or albums casually.' },
                    { role: 'user', content: `The closest stadium is ${stadiumResult.name} in ${stadiumResult.city}, which is ${stadiumResult.distance} km away.` }
                ];

                const finalResponse = await openai.chat.completions.create({
                    model: 'gpt-4-0613',
                    messages: messagesWithStadium
                });

                const finalMessage = finalResponse.choices[0].message.content;

                // Prepare the final response with the image and OpenAI's generated text
                const message = `
                    <p>${finalMessage}</p>
                    <p><img src="${stadiumResult.image_url}" alt="${stadiumResult.name}" style="max-width: 100%; height: auto;" /></p>
                `;
                res.json({ message });
            } else {
                res.json({ message: 'No function call detected.' });
            }
        } else {
            res.json({ message: 'No function call detected.' });
        }

    } catch (error) {
        console.error(`OpenAI API failed: ${error.message}`);
        res.status(500).json({ error: 'OpenAI API failed', details: error.message });
    }
});


// // Route to handle weather retrieval directly (in case needed)
// app.post('/api/get-concert-weather', async (req, res) => {
//     console.log('get-concert-weather route called');
//     const { stadium_message } = req.body;

//     try {
//         // Log the user input for debugging
//         console.log(`User input: ${stadium_message}`);

//         // Extract the stadium name from the message
//         const stadiumMatch = stadium_message.match(/in\s+(.+)/i);
//         if (!stadiumMatch || stadiumMatch.length < 2) {
//             return res.status(400).json({ error: 'Invalid stadium message format. Please enter a message like "Let me relive the concert in [stadium]"' });
//         }

//         const stadiumName = stadiumMatch[1].trim();
//         console.log(`Extracted stadium name: ${stadiumName}`);

//         // Read the stadium data from the JSON file
//         const stadiums = JSON.parse(fs.readFileSync('./public/eras_tour_stadiums.json', 'utf8'));
//         const stadiumData = stadiums.find(stadium => stadium.name.toLowerCase() === stadiumName.toLowerCase());

//         if (!stadiumData) {
//             return res.status(404).json({ error: `Stadium '${stadiumName}' not found. Please try again with a valid stadium name.` });
//         }

//         // Retrieve the date, latitude, and longitude of the concert from the JSON file
//         const { latitude, longitude, date } = stadiumData;

//         // Log the concert date to the console
//         console.log(`Concert date for ${stadiumData.name}: ${date}`);

//         // Call the get_weather function to fetch weather data for the concert date
//         const functions = await getFunctions();  // Assuming this gets all functions, including get_weather
//         const weatherResult = await functions['get_weather'].execute(latitude, longitude, date, stadiumData.name);

//         if (!weatherResult) {
//             return res.status(404).json({ error: 'Weather data not found.' });
//         }

//         // Send the user-specific message from ChatGPT back as the response
//         res.json({ message: weatherResult.message });
//     } catch (error) {
//         console.error('Error fetching concert weather:', error.message);
//         res.status(500).json({ error: 'Failed to retrieve concert weather', details: error.message });
//     }
// });

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
