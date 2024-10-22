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
        // Detect if the message contains a city or stadium name
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
                const weatherResult = await functions['get_weather'].execute(parameters.latitude, parameters.longitude, parameters.date);

                // Find the stadium in the JSON file to also display the image
                const stadiums = JSON.parse(fs.readFileSync('./public/eras_tour_stadiums.json', 'utf8'));
                const stadiumData = stadiums.find(stadium => stadium.name.toLowerCase() === parameters.stadium.toLowerCase());

                if (!stadiumData) {
                    return res.status(404).json({ error: 'Stadium not found for weather.' });
                }

                // Return the response from get_weather along with the image
                const message = `
                    <p>${weatherResult.message}</p>
                    <p><img src="${stadiumData.image_url}" alt="${stadiumData.name}" style="max-width: 100%; height: auto;" /></p>
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

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
