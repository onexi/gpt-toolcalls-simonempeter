export const details = {
    name: "get_location",
    description: "Retrieve the latitude and longitude of a given city.",
    parameters: {
        type: "object",
        properties: {
            city: { type: "string", description: "The name of the city" }
        },
        required: ["city"]
    }
};

export async function execute(city) {
    try {
        // Log the city being searched
        console.log(`Searching for location of city: ${city}`);

        // Fetch location data from an external API
        const locationData = await fetch(`https://nominatim.openstreetmap.org/search?city=${city}&format=json&limit=1`);
        const data = await locationData.json();

        // Log the raw response from the API for debugging
        console.log(`Raw location data response: ${JSON.stringify(data)}`);

        // Check if the response has valid data
        if (!Array.isArray(data) || data.length === 0) {
            console.error('No location data found for the given city');
            throw new Error('No location data found for the given city');
        }

        // Log the selected location data
        console.log(`Selected location: lat=${data[0].lat}, lon=${data[0].lon}`);

        const location = {
            latitude: data[0].lat,
            longitude: data[0].lon
        };

        return { location };
    } catch (error) {
        console.error(`Error fetching location data: ${error.message}`);
        throw new Error('Failed to retrieve location');
    }
}
