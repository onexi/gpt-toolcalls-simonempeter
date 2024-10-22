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

// Log state data
let state = {
    chatgpt: false,
    assistant_id: "",
    assistant_name: "",
    dir_path: "",
    news_path: "",
    thread_id: "",
    user_message: "",
    run_id: "",
    run_status: "",
    vector_store_id: "",
    tools: [],
    parameters: []
};

// Taylor Swift song references array
const taylorSwiftReferences = [
    "You're bound to hear 'Love Story' live and sing along to every word!",
    "'Shake It Off' is coming to a stadium near you—get ready to dance!",
    "Get ready for 'Blank Space'—a hit that'll fill the whole stadium with energy!",
    "'You Belong With Me' is going to sound amazing in this venue!",
    "It's 'All Too Well'—this stadium is perfect for those emotional hits!",
    "'Wildest Dreams' coming true at this incredible venue!",
    "Prepare for an unforgettable performance of 'We Are Never Ever Getting Back Together'!"
];

// Randomly select a Taylor Swift song reference
function getRandomTaylorSwiftReference() {
    const randomIndex = Math.floor(Math.random() * taylorSwiftReferences.length);
    return taylorSwiftReferences[randomIndex];
}

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


// Route to interact with OpenAI API
app.post('/api/execute-function', async (req, res) => {
    const { functionName, parameters } = req.body;

    try {
        // Import all functions
        const functions = await getFunctions();

        if (!functions[functionName]) {
            return res.status(404).json({ error: 'Function not found' });
        }

        // Call the function
        const result = await functions[functionName].execute(...Object.values(parameters));
        console.log(`Function result: ${JSON.stringify(result)}`);
        res.json(result);
    } catch (err) {
        console.error('Error executing function:', err.message);
        res.status(500).json({ error: 'Function execution failed', details: err.message });
    }
});

app.post('/api/openai-call', async (req, res) => {
    const { user_message } = req.body;

    const functions = await getFunctions();
    const availableFunctions = Object.values(functions).map(fn => fn.details);

    let messages = [
        { role: 'system', content: 'You are a helpful assistant who always responds with fun and energetic Taylor Swift song references. Incorporate a Taylor Swift vibe into your responses and mention her songs or albums casually.' },
        { role: 'user', content: user_message }
    ];

    try {
        // Log the received user message for debugging
        console.log(`User message: ${user_message}`);

        // Make OpenAI API call
        const response = await openai.chat.completions.create({
            model: 'gpt-4-0613',
            messages: messages,
            functions: availableFunctions
        });

        // Check if OpenAI called a function
        const toolCall = response.choices[0].message.function_call;

        if (toolCall) {
            const functionName = toolCall.name;
            const parameters = JSON.parse(toolCall.arguments);

            // First function: get_location
            if (functionName === 'get_location') {
                console.log(`Calling get_location with parameters: ${JSON.stringify(parameters)}`);

                // Get the location (latitude, longitude)
                const locationResult = await functions[functionName].execute(parameters.city);
                const { latitude, longitude } = locationResult.location;

                // Now call find_closest_stadium using the obtained coordinates
                console.log(`Calling find_closest_stadium with coordinates: latitude=${latitude}, longitude=${longitude}`);

                const stadiumResult = await functions['find_closest_stadium'].execute(latitude, longitude);

                // Create a new message for OpenAI API to generate the response
                const messagesWithStadium = [
                    { role: 'system', content: 'You are a helpful assistant who always responds with fun and energetic Taylor Swift song references. Incorporate a Taylor Swift vibe into your responses and mention her songs or albums casually.' },
                    { role: 'user', content: `The closest stadium is ${stadiumResult.name} in ${stadiumResult.city}, which is ${stadiumResult.distance} km away. Show me how to describe this in a fun Taylor Swift way.` }
                ];

                // Make OpenAI API call to generate the final message
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
        // Log the error details
        console.error(`OpenAI API failed: ${error.message}`);
        res.status(500).json({ error: 'OpenAI API failed', details: error.message });
    }
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
