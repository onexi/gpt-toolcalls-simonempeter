import OpenAIApi from 'openai';  // Import OpenAI client directly

export const details = {
    name: "get_weather",
    description: "Retrieve historical weather data and categorize it for a specific latitude, longitude, and date via RapidAPI. Then, consult ChatGPT for a user-friendly response.",
    parameters: {
        type: "object",
        properties: {
            latitude: { type: "number", description: "The latitude of the stadium" },
            longitude: { type: "number", description: "The longitude of the stadium" },
            date: { type: "string", description: "The date of the concert in YYYY-MM-DD format" },
            stadium: { type: "string", description: "The name of the stadium" }
        },
        required: ["latitude", "longitude", "date", "stadium"]
    }
};

export async function execute(latitude, longitude, date, stadium) {
    try {
        // Load RapidAPI and OpenAI API keys from environment variables
        const apiKey = process.env.RAPIDAPI_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        // Initialize OpenAI client directly with API key
        const openai = new OpenAIApi({
            apiKey: openaiApiKey
        });

        // Format the date in YYYY-MM-DD format
        const formattedDate = new Date(date).toISOString().split('T')[0];

        // API endpoint for daily historical weather data
        const weatherApiUrl = `https://meteostat.p.rapidapi.com/point/daily?lat=${latitude}&lon=${longitude}&start=${formattedDate}&end=${formattedDate}`;

        // Fetch weather data from the Meteostat API via RapidAPI
        const response = await fetch(weatherApiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'meteostat.p.rapidapi.com',
                'x-rapidapi-key': apiKey
            }
        });

        // Check if the response is OK (status 200)
        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}: ${response.statusText}`);
        }

        // Parse the JSON response
        const data = await response.json();

        // Log the raw data for debugging
        console.log('Weather API response:', JSON.stringify(data, null, 2));

        // Check if data is available for the date and if the relevant fields exist
        if (!data.data || data.data.length === 0) {
            throw new Error('No weather data available for the given date and location');
        }

        const weatherEntry = data.data[0];  // Extract the first entry

        // Use correct property names (tavg for temperature and prcp for precipitation)
        const temperature_avg = weatherEntry.tavg !== undefined ? weatherEntry.tavg : null;
        const precipitation = weatherEntry.prcp !== undefined ? weatherEntry.prcp : 0;

        // Ensure temperature_avg is present
        if (temperature_avg === null) {
            throw new Error('Temperature data is not available');
        }

        // Categorize the weather
        const temperatureDescription = temperature_avg > 18 ? 'warm' : 'cold';
        const rainDescription = precipitation > 0 ? 'rain' : 'no rain';

        // Prepare the input for ChatGPT to formulate a Taylor Swift-inspired response
        const chatPrompt = `
            The average temperature was ${temperature_avg}°C at ${stadium}, and it was categorized as ${temperatureDescription} with ${rainDescription}. 
            Please generate a fun Taylor Swift-themed response mentioning her songs, as though you're describing the weather during a concert. You also provide recommendations on what to wear for that specific weather.
        `;

        // Call ChatGPT to generate the response using the correct OpenAI method
        const chatResponse = await openai.chat.completions.create({
            model: 'gpt-4-0613',
            messages: [
                { role: 'system', content: 'You are a helpful assistant who always responds with fun and energetic Taylor Swift song references. Incorporate a Taylor Swift vibe into your responses and mention her songs or albums casually. You also provide recommendations on what to wear for that specific weather.' },
                { role: 'user', content: chatPrompt }
            ]
        });

        const chatMessage = chatResponse.choices[0].message.content;

        // Return the final message
        return { message: chatMessage };

    } catch (error) {
        console.error(`Error fetching weather data: ${error.message}`);
        throw new Error('Failed to retrieve weather data');
    }
}
