[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/9wDnMTRl)

---------------------------------------------------------------------------------------------------------------------------------------------------

# Taylor Swift Eras Tour Finder (/PS04)

This project allows users to interact with an interface that helps them explore Taylor Swift's Eras Tour venues, or find the closest stadium based on their input location. The application integrates with OpenAI's GPT API to process user requests and provide a Taylor Swift-themed response, and it uses additional custom functions to retrieve location and weather information for concert venues.

## Features

- **Closest Stadium Finder**: Users can input a city name, and the application will return the nearest stadium from Taylor Swift's Eras Tour.
- **Concert Weather Information**: If users enter a stadium name, they will receive information about the concert's weather, complete with a Taylor Swift-themed message and recommendations on what to wear.
- **Dynamic Image Display**: The app displays images of the stadium and a weather-related image depending on the weather conditions during the concert.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **External APIs**: 
  - OpenAI's GPT API for generating responses
  - OpenStreetMap for location data
  - Meteostat API for historical weather data
- **Custom Functions**: Custom functions are used for retrieving weather, stadium data, and location information.

## Project Structure
/public/eras_tour_stadiums.json # JSON file containing stadium data (name, city, coordinates, etc.) 
/functions/get_weather.js # Custom function to retrieve weather data 
/functions/get_location.js # Custom function to retrieve city coordinates 
/functions/find_closest_stadium.js # Custom function to find the nearest stadium based on coordinates /index.html # Frontend HTML file for user interaction 
/server.js # Backend Node.js/Express server to handle API requests


## Custom Functions

The project relies on a few key custom functions, which are executed by OpenAI's API to dynamically generate responses. These functions are defined in the `/functions/` directory and loaded dynamically by the server.

### `get_location.js`

- **Purpose**: Retrieves the geographical coordinates (latitude and longitude) of a city based on the user input.
- **Parameters**: 
  - `city` (string): Name of the city to retrieve the coordinates for.
- **Output**: 
  - Returns the latitude and longitude of the specified city.

### `find_closest_stadium.js`

- **Purpose**: Finds the closest stadium in the Eras Tour based on the geographical coordinates.
- **Parameters**: 
  - `latitude` (number): Latitude of the location.
  - `longitude` (number): Longitude of the location.
- **Output**: 
  - Returns the name, city, distance, and image URL of the closest stadium.

### `get_weather.js`

- **Purpose**: Retrieves historical weather data for a specific stadium on the date of the concert. If the concert is in the future, it uses weather data from the same date in the previous year.
- **Parameters**: 
  - `latitude` (number): Latitude of the stadium.
  - `longitude` (number): Longitude of the stadium.
  - `date` (string): Date of the concert in `YYYY-MM-DD` format.
  - `stadium` (string): Name of the stadium.
- **Output**: 
  - Returns a Taylor Swift-themed response about the weather during the concert, including a weather-related image.

## API Endpoints

### `/api/openai-call` (POST)

This endpoint accepts user input (city or stadium name), processes the input using OpenAI’s GPT API, and dynamically calls the appropriate function to generate a response.

- **Request**: 
  - `user_message` (string): The user’s input message (city or stadium name).
- **Response**: 
  - A message containing either:
    - The closest stadium (if the input is a city).
    - Concert weather information (if the input is a stadium).
  - Image URLs for the stadium and weather conditions.

## How It Works

1. **User Input**: The user asks for a city or stadium name and clicks the submit button.
2. **Processing**:
    - If a city is detected in the input, the app calls `get_location` to retrieve the coordinates, followed by `find_closest_stadium` to find the nearest Eras Tour stadium.
    - If a stadium is detected, the app calls `get_weather` to retrieve historical weather data for the stadium on the concert date.
3. **Response**: OpenAI generates a fun Taylor Swift-themed response, and the app displays the message along with relevant images (stadium and weather condition).
4. **Images**: Based on the weather data, a second image (depending on weather conditions like rain and temperature) is displayed alongside the stadium image.

## Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/gpt-toolcalls-simonempeter.git
    cd PS04
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Set up environment variables**:
    - Create a `.env` file in the root directory and add the following variables:
      ```
      OPENAI_API_KEY=your-openai-api-key
      RAPIDAPI_KEY=your-rapidapi-key
      ```

4. **Run the server**:
    ```bash
    node server.js
    ```

5. **Access the app**: Open `http://localhost:3000` in your browser.

## Running the Project

Once the project is set up, you can interact with the interface in your browser. Ask for a city or stadium name to get results such as:

- The closest stadium for a city.
- Weather information for a specific concert at a stadium, along with fun Taylor Swift references.



