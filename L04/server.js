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

// Default route to serve index.html for any undefined routes
app.get('*', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), './public/index.html'));
});

async function getFunctions() {
    const files = fs.readdirSync(path.resolve(process.cwd(), "./functions"));
    const openAIFunctions = {};

    for (const file of files) {
        if (file.endsWith(".js")) {
            const moduleName = file.slice(0, -3);
            const modulePath = `./functions/${moduleName}.js`;
            const { details, execute } = await import(modulePath);

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

// OpenAI API interaction with function call handling
app.post('/api/openai-call', async (req, res) => {
    const { user_message } = req.body;

    const functions = await getFunctions();
    const availableFunctions = Object.values(functions).map(fn => fn.details);

    let messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: user_message }
    ];

    try {
        // Make OpenAI API call
        const response = await openai.chat.completions.create({
            model: 'gpt-4-0613',
            messages: messages,
            tools: availableFunctions
        });

        // Check if OpenAI called a function
        const toolCall = response.choices[0].message.tool_calls[0];

        if (toolCall) {
            const functionName = toolCall.function.name;
            const parameters = JSON.parse(toolCall.function.arguments);

            const result = await functions[functionName].execute(...Object.values(parameters));

            const function_call_result_message = {
                role: "tool",
                content: JSON.stringify({
                    result: result
                }),
                tool_call_id: response.choices[0].message.tool_calls[0].id
            };

            // Add function call result to messages
            messages.push(response.choices[0].message);
            messages.push(function_call_result_message);

            // Final response
            const final_response = await openai.chat.completions.create({
                model: "gpt-4-0613",
                messages: messages,
            });

            let output = final_response.choices[0].message.content;
            res.json({ message: output, state: state });
        } else {
            res.json({ message: 'No function call detected.' });
        }

    } catch (error) {
        res.status(500).json({ error: 'OpenAI API failed', details: error.message });
    }
});

app.post('/api/prompt', async (req, res) => {
    // just update the state with the new prompt
    state = req.body;
    try {
        res.status(200).json({ message: `got prompt ${state.user_message}`, "state": state });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'User Message Failed', "state": state });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
