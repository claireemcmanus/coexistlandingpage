/**
 * Apartment Search API Service
 * 
 * This service provides apartment search functionality using various APIs.
 * Currently supports Google Places API for location-based apartment searches.
 * 
 * To use Google Places API:
 * 1. Get an API key from Google Cloud Console
 * 2. Enable Places API and Geocoding API
 * 3. Add REACT_APP_GOOGLE_PLACES_API_KEY to your .env file
 */

/**
 * Search for apartments using Google Places API
 * @param {string} query - Search query (e.g., "apartments in Nashville")
 * @param {Object} options - Search options
 * @param {string} options.location - Location string (e.g., "Nashville, TN")
 * @param {number} options.radius - Search radius in meters (default: 5000)
 * @param {number} options.maxResults - Maximum number of results (default: 20)
 * @returns {Promise<Array>} Array of apartment listings
 */
export async function searchApartmentsGooglePlaces(query, options = {}) {
  const apiKey = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.warn("Google Places API key not found. Using mock data for demonstration.");
    return getMockApartmentData(query, options);
  }

  const { location = "Nashville, TN", radius = 5000, maxResults = 20 } = options;

  try {
    // First, get coordinates for the location
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== "OK" || !geocodeData.results[0]) {
      throw new Error("Could not find location");
    }

    const { lat, lng } = geocodeData.results[0].geometry.location;

    // Use Text Search API for better apartment results (more flexible than Nearby Search)
    // This searches for "apartments" or user query near the location
    const searchQuery = query.toLowerCase().includes("apartment") 
      ? query 
      : `${query} apartments`;
    
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${lat},${lng}&radius=${radius}&key=${apiKey}`;
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();

    if (placesData.status !== "OK" && placesData.status !== "ZERO_RESULTS") {
      throw new Error(`Places API error: ${placesData.status}`);
    }

    // Transform results to apartment format
    const apartments = (placesData.results || []).slice(0, maxResults).map((place) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      rating: place.rating,
      price: null, // Google Places doesn't provide price
      description: place.types?.join(", ") || "",
      link: place.website || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      photos: place.photos?.slice(0, 1).map(photo => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
      ) || [],
      source: "google_places",
    }));

    return apartments;
  } catch (error) {
    console.error("Error searching apartments with Google Places:", error);
    // Fallback to mock data on error
    return getMockApartmentData(query, options);
  }
}

/**
 * Search apartments using Rentals.com API (alternative option)
 * Note: This requires a Rentals.com API key
 */
export async function searchApartmentsRentals(query, options = {}) {
  const apiKey = process.env.REACT_APP_RENTALS_API_KEY;
  
  if (!apiKey) {
    console.warn("Rentals.com API key not found.");
    return [];
  }

  const { location = "Nashville, TN", maxResults = 20 } = options;

  try {
    // Example Rentals.com API call (adjust endpoint based on actual API documentation)
    const url = `https://api.rentals.com/v1/search?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&limit=${maxResults}&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    return (data.results || []).map((listing) => ({
      id: listing.id,
      name: listing.name || listing.property_name,
      address: listing.address || listing.full_address,
      price: listing.price || listing.monthly_rent,
      description: listing.description || "",
      link: listing.url || listing.listing_url,
      photos: listing.photos || [],
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      source: "rentals",
    }));
  } catch (error) {
    console.error("Error searching apartments with Rentals.com:", error);
    return [];
  }
}

/**
 * Main search function that tries multiple APIs
 */
export async function searchApartments(query, options = {}) {
  // Try Google Places first (most reliable)
  const googleResults = await searchApartmentsGooglePlaces(query, options);
  
  if (googleResults.length > 0) {
    return googleResults;
  }

  // Fallback to Rentals.com if available
  const rentalsResults = await searchApartmentsRentals(query, options);
  if (rentalsResults.length > 0) {
    return rentalsResults;
  }

  // Final fallback to mock data
  return getMockApartmentData(query, options);
}

/**
 * Get mock apartment data for demonstration/fallback
 */
function getMockApartmentData(query, options) {
  const { location = "Nashville, TN" } = options;
  
  // Generate some mock apartments based on the search query
  const mockApartments = [
    {
      id: "mock_1",
      name: "The Heights Apartments",
      address: `123 Main St, ${location}`,
      price: 1200,
      rating: 4.5,
      description: "Modern 1-bedroom apartment with updated kitchen and hardwood floors",
      link: "https://example.com/apartments/1",
      bedrooms: 1,
      bathrooms: 1,
      source: "mock",
    },
    {
      id: "mock_2",
      name: "Riverside Lofts",
      address: `456 River Rd, ${location}`,
      price: 1500,
      rating: 4.7,
      description: "Spacious 2-bedroom loft with river views and balcony",
      link: "https://example.com/apartments/2",
      bedrooms: 2,
      bathrooms: 2,
      source: "mock",
    },
    {
      id: "mock_3",
      name: "Downtown Studios",
      address: `789 Downtown Ave, ${location}`,
      price: 950,
      rating: 4.2,
      description: "Cozy studio apartment in the heart of downtown",
      link: "https://example.com/apartments/3",
      bedrooms: 0,
      bathrooms: 1,
      source: "mock",
    },
    {
      id: "mock_4",
      name: "Garden View Apartments",
      address: `321 Park Blvd, ${location}`,
      price: 1350,
      rating: 4.6,
      description: "2-bedroom apartment with garden views and pet-friendly policy",
      link: "https://example.com/apartments/4",
      bedrooms: 2,
      bathrooms: 1,
      source: "mock",
    },
    {
      id: "mock_5",
      name: "Urban Living Complex",
      address: `654 City Center, ${location}`,
      price: 1100,
      rating: 4.3,
      description: "1-bedroom apartment with modern amenities and fitness center",
      link: "https://example.com/apartments/5",
      bedrooms: 1,
      bathrooms: 1,
      source: "mock",
    },
  ];

  // Filter mock data based on query if it contains specific terms
  if (query.toLowerCase().includes("studio")) {
    return mockApartments.filter(apt => apt.bedrooms === 0);
  }
  if (query.toLowerCase().includes("2 bed") || query.toLowerCase().includes("two bed")) {
    return mockApartments.filter(apt => apt.bedrooms === 2);
  }

  return mockApartments;
}

/**
 * Get apartment details by ID (for future use)
 */
export async function getApartmentDetails(apartmentId, source = "google_places") {
  const apiKey = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;
  
  if (source === "google_places" && apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${apartmentId}&fields=name,formatted_address,rating,website,photos,geometry&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        return {
          id: data.result.place_id,
          name: data.result.name,
          address: data.result.formatted_address,
          rating: data.result.rating,
          link: data.result.website,
          photos: data.result.photos?.map(photo => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${apiKey}`
          ) || [],
        };
      }
    } catch (error) {
      console.error("Error fetching apartment details:", error);
    }
  }

  return null;
}

