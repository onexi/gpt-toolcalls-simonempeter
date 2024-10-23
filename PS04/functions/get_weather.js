import OpenAIApi from 'openai';
import fetch from 'node-fetch'; 

export const details = {
    name: "get_weather",
    description: "Retrieve historical weather data for a specific latitude, longitude, and date via RapidAPI. If the date is in the future, use the weather from the same day of the previous year.",
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
        // Load API keys from environment variables
        const meteostatApiKey = process.env.RAPIDAPI_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        // Initialize OpenAI client directly with API key
        const openai = new OpenAIApi({ apiKey: openaiApiKey });

        // Parse the concert date
        let concertDate = new Date(date); 
        const today = new Date();

        // Adjust the year if the concert is in the future
        if (concertDate > today) {
            concertDate.setFullYear(concertDate.getFullYear() - 1);
        }

        // Format the date as YYYY-MM-DD
        const formattedDate = concertDate.toISOString().split('T')[0];

        // API endpoint for daily historical weather data
        const weatherApiUrl = `https://meteostat.p.rapidapi.com/point/daily?lat=${latitude}&lon=${longitude}&start=${formattedDate}&end=${formattedDate}`;

        // Fetch weather data from the Meteostat API via RapidAPI
        const response = await fetch(weatherApiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'meteostat.p.rapidapi.com',
                'x-rapidapi-key': meteostatApiKey
            }
        });

        if (!response.ok) throw new Error(`Meteostat API call failed with status ${response.status}`);
        const data = await response.json();

        if (!data.data || data.data.length === 0) throw new Error('No historical weather data available for the given date.');

        const weatherEntry = data.data[0];  // Extract the first entry

        // Extract temperature and precipitation data
        const temperature_avg = weatherEntry.tavg !== undefined ? weatherEntry.tavg : null;
        const precipitation = weatherEntry.prcp !== undefined ? weatherEntry.prcp : 0;

        if (temperature_avg === null) throw new Error('Temperature data is not available.');

        // Categorize the weather
        const temperatureDescription = temperature_avg > 18 ? 'warm' : 'cold';
        const rainDescription = precipitation > 0 ? 'rain' : 'no_rain';

        // Define the weather image mapping based on the conditions
        const weatherImages = {
            "warm_rain": "https://people.com/thmb/A1K88diR7uX2uLpP5l2YAe-BIDs=/4000x0/filters:no_upscale():max_bytes(150000):strip_icc():focal(722x174:724x176)/Taylor-Swift-Hamburg-1-072324-43b24125acf647e2993ee6c2da2ccd2b.jpg",
            "cold_rain": "https://people.com/thmb/TB_DrFMgqNOYFSdiYjd650yIEi8=/4000x0/filters:no_upscale():max_bytes(150000):strip_icc():focal(999x0:1001x2)/taylor-swift-rain-eras-tour-052223-5-f1c153b487b542a1893036c630e72cb4.jpg",
            "warm_no_rain": "https://images.prestigeonline.com/wp-content/uploads/sites/6/2023/08/08170529/Taylor-Swift-2024-03-08T143259.994-1.jpg",
            "cold_no_rain": "https://assets.teenvogue.com/photos/641b2a23912ddccbabf80f80/16:9/w_6000,h_3375,c_limit/GettyImages-1474459622.jpg"
        };

        // Determine the weather condition key
        const weatherConditionKey = `${temperatureDescription}_${rainDescription}`;

        // Get the corresponding image URL for the weather condition
        const weatherImageUrl = weatherImages[weatherConditionKey];

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

        // Return the final message with the stadium image and the weather-related image
        return { 
            message: chatMessage,
            weatherImageUrl: weatherImageUrl  // Return the corresponding weather image URL
        };

    } catch (error) {
        console.error(`Error fetching weather data: ${error.message}`);
        throw new Error('Failed to retrieve weather data');
    }
}
