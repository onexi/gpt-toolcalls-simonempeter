import stadiums from '../public/eras_tour_stadiums.json' assert { type: 'json' };

export const details = {
    name: "get_closest_stadium",
    description: "Find the closest stadium to a given set of coordinates",
    parameters: {
        type: "object",
        properties: {
            latitude: { type: "number", description: "The latitude of the location" },
            longitude: { type: "number", description: "The longitude of the location" }
        },
        required: ["latitude", "longitude"]
    }
};

export async function execute(latitude, longitude) {
    console.log(`Finding the closest stadium to: latitude=${latitude}, longitude=${longitude}`);
    
    let closestStadium = null;
    let closestDistance = Infinity;

    // Haversine formula to calculate distance
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    stadiums.forEach(stadium => {
        const distance = haversine(latitude, longitude, stadium.latitude, stadium.longitude);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestStadium = stadium;
        }
    });

    if (closestStadium) {
        console.log(`Found closest stadium: ${closestStadium.name}, ${closestStadium.city}, distance: ${closestDistance} km`);
        return {
            name: closestStadium.name,
            city: closestStadium.city,
            distance: closestDistance.toFixed(2),
            image_url: closestStadium.image_url
        };
    } else {
        throw new Error('No stadium found');
    }
}
