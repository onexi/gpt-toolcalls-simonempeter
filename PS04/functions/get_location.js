import fetch from 'node-fetch';

const execute = async (city) => {
    const apiUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&limit=1`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'ClosestErasTour/1.0 (smpeter@mit.edu)',
            },
        });
        const data = await response.json();

        if (data && data.length > 0) {
            const cityCoordinates = {
                city: data[0].display_name,
                latitude: data[0].lat,
                longitude: data[0].lon,
            };

            // Return the coordinates (the server will handle what to do next)
            return cityCoordinates;
        } else {
            return { error: "Location not found" };
        }
    } catch (error) {
        return { error: error.message };
    }
};

const details = {
    type: "function",
    function: {
        name: "get_location",
        parameters: {
            type: "object",
            properties: {
                city: {
                    type: "string",
                    description: "The name of the city to get the location for"
                }
            },
            required: ["city"]
        }
    },
    description: "Fetch the latitude and longitude for a given city"
};

export { execute, details };
