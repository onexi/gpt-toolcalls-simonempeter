import fs from 'fs';
import path from 'path';

// Haversine formula to calculate the distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Radius of the Earth in kilometers

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in kilometers
}

// Function to find the closest stadium
const findClosestStadium = async (cityCoordinates) => {
    const filePath = path.resolve(process.cwd(), './public/eras_tour_stadiums.json');

    // Read stadiums data
    const stadiumsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    let closestStadium = null;
    let minDistance = Infinity;

    stadiumsData.forEach((stadium) => {
        const distance = haversineDistance(
            cityCoordinates.latitude,
            cityCoordinates.longitude,
            parseFloat(stadium.latitude),
            parseFloat(stadium.longitude)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestStadium = { ...stadium, distance: distance.toFixed(2) }; // Add distance to the stadium object
        }
    });

    return closestStadium;
};

export { findClosestStadium };
