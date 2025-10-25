// import { Request, Response, NextFunction, RequestHandler } from 'express';
// import dotenv from 'dotenv';
// import axios from 'axios';
// import { Property } from './model/propertyModel';
// import NeighborhoodPropertiesCalculator from "./helpers/neighborhoodPropertiesCalculator";
// import {savePropertyData} from "./helpers/savePropertyData";

// dotenv.config();

// const API_KEY = process.env.PARCL_LABS_API_KEY || '';
// const BASE_URL = 'https://api.parcllabs.com';

// function formatAddress(addressObj: any) {
//   const addressParts = addressObj.formattedAddress.split(',');
//   const street = addressParts[0]?.trim().toUpperCase() || '';
//   const city = addressParts[1]?.trim().replace(/\s+/g, '') || '';
//   const stateZipParts = addressParts[2]?.trim().split(' ') || [];
//   const state_abbreviation = stateZipParts[0] || '';
//   const zip_code = stateZipParts[1] || '';
//   const lat = addressObj.lat || '';
//   const lon = addressObj.lon || '';
//   return {
//     address: street,
//     city,
//     state_abbreviation,
//     zip_code,
//     lat,
//     lon
//   };
// }

// const getPropertyAndMarketData: RequestHandler = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   console.error("req body..." + JSON.stringify(req.body));
//   // const { address, city, zip_code, state_abbreviation } = formatAddress(req.body);   //Uncomment this line and comment the line below to test directly with API
//   const { address, city, zip_code, state_abbreviation, lat, lon } = formatAddress(req.body.address);
//   // const { condition } = req.body.condition;
//   // const { address, city, zip_code, state_abbreviation } = formatAddress(req.body.address);


//   try {
//     const searchAddressUrl = `${BASE_URL}/v1/property/search_address`;
//     const marketSearchUrl = `${BASE_URL}/v1/search/markets?query=${zip_code}&state_abbreviation=${state_abbreviation}&location_type=ZIP5`;

//     console.log(state_abbreviation);

//     const searchAddressPromise = axios.post(
//       searchAddressUrl,
//       [
//         {
//           address: address,
//           city: city,
//           state_abbreviation: state_abbreviation,
//           zip_code: zip_code,
//         },
//       ],
//       {
//         headers: {
//           'Authorization': API_KEY,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const marketSearchPromise = axios.get(marketSearchUrl, {
//       headers: {
//         'Authorization': API_KEY,
//       },
//     });

//     const [searchAddressDataResponse, marketDataResponse] = await Promise.all([
//       searchAddressPromise,
//       marketSearchPromise,
//     ]);

//     // const [searchAddressDataResponse] = await Promise.all([
//     //   searchAddressPromise
//     // ]);

//     const addressData = searchAddressDataResponse.data;
//     const marketData = marketDataResponse.data;

//     const propertyDetails = addressData.items[0] || [];


//     const property = new Property(
//         0,
//         propertyDetails.parcl_property_id,
//         propertyDetails.address,
//         propertyDetails.city,
//         propertyDetails.state_abbreviation,
//         propertyDetails.county,
//         propertyDetails.zip_code,
//         propertyDetails.bathrooms,
//         propertyDetails.bedrooms,
//         propertyDetails.square_footage,
//         propertyDetails.year_built,
//         propertyDetails.latitude,
//         propertyDetails.longitude,
//         propertyDetails.current_entity_owner_name
//     );

//     console.log("property is..." + JSON.stringify(property));

//     // console.log("marketData is..." + JSON.stringify(marketData));
//     // console.log("addressData is..." + JSON.stringify(addressData));
//     await savePropertyData(property);

//     console.log("Property saved....");

//     if (
//       addressData.items &&
//       addressData.items.length > 0 &&
//       marketData.items &&
//       marketData.items.length > 0
//     ) {
//       const parclId = marketData.items[0]?.parcl_id;
//       const property = addressData.items[0];

//       if (parclId && property) {
//         const propertyFilters = {
//           property_types: [property.property_type || 'SINGLE_FAMILY'],
//           min_beds: property.bedrooms || 3,
//           max_beds: property.bedrooms || 3,
//           min_baths: Math.floor(property.bathrooms) || 1,
//           max_baths: Math.floor(property.bathrooms) || 1,
//           min_sqft: property.square_footage ? Math.floor(property.square_footage * 0.8) : 800,
//           max_sqft: property.square_footage ? Math.ceil(property.square_footage * 1.05) : 1050,
//           min_year_built: property.year_built || 1950,
//           max_year_built: property.year_built || 1960,
//         };

//         const today = new Date();
//         const threeMonthsAgo = new Date();
//         threeMonthsAgo.setMonth(today.getMonth() - 3);

//         const formatDate = (date: Date): string => {
//           const year = date.getFullYear();
//           const month = String(date.getMonth() + 1).padStart(2, '0');
//           const day = String(date.getDate()).padStart(2, '0');
//           return `${year}-${month}-${day}`;
//         };

//         const minEventDate = formatDate(threeMonthsAgo);
//         const maxEventDate = formatDate(today);

//         //https://api.parcllabs.com/v1/property/search?parcl_id=5473994
//         // &property_type=SINGLE_FAMILY&square_footage_min=700
//         // &square_footage_max=1400&bedrooms_min=2&bedrooms_max=4
//         // &bathrooms_min=1&bathrooms_max=3&year_built_min=1965&year_built_max=1970

//         let relatedPropertiesSearchUrl = `${BASE_URL}/v1/property/search?parcl_id=${parclId}`;

//         relatedPropertiesSearchUrl += `&property_type=${propertyFilters.property_types[0]}`;
//         relatedPropertiesSearchUrl += `&square_footage_min=${propertyFilters.min_sqft}`;
//         relatedPropertiesSearchUrl += `&square_footage_max=${propertyFilters.max_sqft}`;
//         relatedPropertiesSearchUrl += `&bedrooms_min=${propertyFilters.min_beds}`;
//         relatedPropertiesSearchUrl += `&bedrooms_max=${propertyFilters.max_beds}`;
//         relatedPropertiesSearchUrl += `&bathrooms_min=${propertyFilters.min_baths}`;
//         relatedPropertiesSearchUrl += `&bathrooms_max=${propertyFilters.max_baths}`;
//         relatedPropertiesSearchUrl += `&year_built_min=${propertyFilters.min_year_built}`;
//         relatedPropertiesSearchUrl += `&year_built_max=${propertyFilters.max_year_built}`;
//         relatedPropertiesSearchUrl += `&event_names=SOLD`;
//         relatedPropertiesSearchUrl += `&min_event_date=${minEventDate}`;
//         relatedPropertiesSearchUrl += `&max_event_date=${maxEventDate}`;

//         const relatedPropertiesSearchPromise = axios.get(
//           relatedPropertiesSearchUrl,
//           {
//             headers: {
//               'Authorization': API_KEY,
//             },
//           }
//         );

//         const relatedPropertiesResponse = await relatedPropertiesSearchPromise;
//         const relatedPropertiesData = relatedPropertiesResponse.data;

//         // console.log("relatedPropertiesData is..." + JSON.stringify(relatedPropertiesData));

//         const calculator = new NeighborhoodPropertiesCalculator(addressData, relatedPropertiesData);
//         const neighborhoodProperties = calculator.calculateNeighborhoodProperties();

//         console.log('Neighborhood Properties:', neighborhoodProperties);
//         res.status(200).json({ addressData, neighborhoodProperties });
//         return;
//       } else {
//         res.status(404).json({ message: 'Could not extract necessary data for the related sales search.' });
//         return;
//       }
//     } else {
//       res.status(404).json({ message: 'Could not retrieve property or market data.' });
//       return;
//     }
//   } catch (error: any) {
//     console.error('Error fetching data:', error);
//     res.status(500).json({ message: 'Error fetching data.', error: error.message });
//   }
// };

// export default getPropertyAndMarketData;

import { Request, Response, RequestHandler } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { Property } from './model/propertyModel';
import NeighborhoodPropertiesCalculator from "./helpers/neighborhoodPropertiesCalculator";
import { savePropertyData } from "./helpers/savePropertyData";
import { log } from 'console';
import { saveEstimate, Estimate } from '../models/estimateModel';

dotenv.config();

const API_KEY: string = process.env.PARCL_LABS_API_KEY || '';
const BASE_URL: string = 'https://api.parcllabs.com';

function formatAddress(addressObj: any) {
  const addressParts = addressObj.formattedAddress?.split(',') || [];
  return {
    address: addressParts[0]?.trim().toUpperCase() || '',
    city: addressParts[1]?.trim().replace(/\s+/g, '') || '',
    state_abbreviation: addressParts[2]?.trim().split(' ')[0] || '',
    zip_code: addressParts[2]?.trim().split(' ')[1] || '',
    lat: addressObj.lat || '',
    lon: addressObj.lon || ''
  };
}

// Function to fetch related properties
async function fetchRelatedProperties(parclId: string, propertyFilters: any) {
  try {
      let relatedPropertiesUrl = `${BASE_URL}/v1/property/search?parcl_id=${parclId}`;
      relatedPropertiesUrl += `&property_type=${propertyFilters.property_types[0]}`;
      relatedPropertiesUrl += `&square_footage_min=${propertyFilters.min_sqft}&square_footage_max=${propertyFilters.max_sqft}`;
      relatedPropertiesUrl += `&bedrooms_min=${propertyFilters.min_beds}&bedrooms_max=${propertyFilters.max_beds}`;
      relatedPropertiesUrl += `&bathrooms_min=${propertyFilters.min_baths}&bathrooms_max=${propertyFilters.max_baths}`;
      relatedPropertiesUrl += `&year_built_min=${propertyFilters.min_year_built}&year_built_max=${propertyFilters.max_year_built}`;
      relatedPropertiesUrl += `&event_names=SOLD&min_event_date=${formatDate(-3)}&max_event_date=${formatDate(0)}`;

      const relatedPropertiesResponse = await axios.get(relatedPropertiesUrl, {
          headers: { 'Authorization': API_KEY }
      });

      return relatedPropertiesResponse.data;
  } catch (error: any) {
      console.error('Error fetching related properties:', error.message);
      throw new Error("Failed to fetch related properties.");
  }
}

async function fetchPropertyData(address: string, city: string, state_abbreviation: string, zip_code: string) {
  try {
    const searchAddressUrl = `${BASE_URL}/v1/property/search_address`;
    
    const response = await axios.post(
      searchAddressUrl,
      [{ address, city, state_abbreviation, zip_code }],
      { headers: { Authorization: API_KEY, "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (error: any) {
    console.error("❌ Error fetching property data:", error.message);
    throw new Error("Failed to fetch property data.");
  }
}

async function fetchMarketData(zip_code: string, state_abbreviation: string) {
  try {
    const marketSearchUrl = `${BASE_URL}/v1/search/markets?query=${zip_code}&state_abbreviation=${state_abbreviation}&location_type=ZIP5`;

    const response = await axios.get(marketSearchUrl, {
      headers: { Authorization: API_KEY },
    });

    return response.data;
  } catch (error: any) {
    console.error("❌ Error fetching market data:", error.message);
    throw new Error("Failed to fetch market data.");
  }
}

// ✅ Combined function to call both APIs separately
async function fetchPropertyAndMarketData(address: string, city: string, state_abbreviation: string, zip_code: string) {
  try {
    const addressData = await fetchPropertyData(address, city, state_abbreviation, zip_code);
    const marketData = await fetchMarketData(zip_code, state_abbreviation);

    return { addressData, marketData };
  } catch (error) {
    console.error("❌ Error in fetchPropertyAndMarketData:", error);
    throw new Error("Failed to fetch property and market data.");
  }
}




function createPropertyFilters(property: any) {
  return {
    property_types: [property.property_type || 'SINGLE_FAMILY'],
    min_beds: property.bedrooms ?? 3,
    max_beds: property.bedrooms ?? 3,
    min_baths: Math.floor(property.bathrooms ?? 1),
    max_baths: Math.floor(property.bathrooms ?? 1),
    min_sqft: property.square_footage ? Math.floor(property.square_footage * 0.8) : 800,
    max_sqft: property.square_footage ? Math.ceil(property.square_footage * 1.05) : 1050,
    min_year_built: property.year_built ?? 1950,
    max_year_built: property.year_built ?? 1960,
  };
}

function formatDate(monthsOffset: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsOffset);
  return date.toISOString().split('T')[0];
}

async function saveEstimateInDB(property: any): Promise<void> {
  if (!property) {
    console.error("❌ Invalid data: Missing property or estimated value.");
    return;
  }

  const estimateInput: Estimate = {
    user_id: property.user_id,
    address_id: property.address_id,
    address_value: property.address_value,

    estimate_offer_min: property.estimate_offer_min || "0",
    estimate_offer_max: property.estimate_offer_max || "0",
    estimate_offer_value: property.estimatedValue || "0",

    underwrite_rent: property.underwrite_rent || "0",
    underwrite_expense: property.underwrite_expense || "0",
    underwrite_cap_rate: property.underwrite_cap_rate || "0",
    underwrite_selling_costs: property.underwrite_selling_costs || "0",
    underwrite_holding_costs: property.underwrite_holding_costs || "0",
    underwrite_margin: property.underwrite_margin || "0",
    underwrite_low: property.underwrite_low || "0",
    underwrite_high: property.underwrite_high || "0",

    rental_or_flip: property.rental_or_flip || false,
    after_repair_value: property.after_repair_value || "0"
  };


  try {
    await saveEstimate(estimateInput);
    console.log("✅ Estimate saved successfully!");
  } catch (error) {
    console.error("❌ Error saving estimate:", error);
  }
}


const getPropertyAndMarketData: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Request body:", req.body);
    
    if (!req.body || !req.body.address) {
      res.status(400).json({ message: "Invalid request. Address is required." });
      return;
    }

    const { address, city, zip_code, state_abbreviation, lat, lon } = formatAddress(req.body.address);

    if (!address || !city || !state_abbreviation || !zip_code) {
      res.status(400).json({ message: "Invalid address format." });
      return;
    }

    const { addressData, marketData } = await fetchPropertyAndMarketData(address, city, state_abbreviation, zip_code);

    if (!addressData?.items?.length || !marketData?.items?.length) {
      res.status(404).json({ message: "Property or market data not found." });
      return;
    }

    console.log(addressData?.data)
    console.log(marketData?.data)

    const propertyDetails = addressData.items[0];
    const property = new Property(
      0, propertyDetails.parcl_property_id, propertyDetails.address,
      propertyDetails.city, propertyDetails.state_abbreviation,
      propertyDetails.county, propertyDetails.zip_code,
      propertyDetails.bathrooms, propertyDetails.bedrooms,
      propertyDetails.square_footage, propertyDetails.year_built,
      propertyDetails.latitude, propertyDetails.longitude,
      propertyDetails.current_entity_owner_name
    );

    await savePropertyData(property);
    console.log("Property saved.");

    const parclId = marketData.items[0]?.parcl_id;
    if (!parclId) {
      res.status(404).json({ message: "Parcl ID not found for related sales search." });
      return;
    }

    const propertyFilters = createPropertyFilters(property);
    const relatedPropertiesData = await fetchRelatedProperties(parclId, propertyFilters);

    console.log(relatedPropertiesData?.data)

    const calculator = new NeighborhoodPropertiesCalculator(addressData, relatedPropertiesData);
    const neighborhoodProperties = calculator.calculateNeighborhoodProperties();


    await saveEstimateInDB(property);
    console.log("✅ Estimate saved successfully!");

    res.status(200).json({ addressData, neighborhoodProperties });

    

  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ message: "Error fetching data.", error: error.message });
  }
};

export default getPropertyAndMarketData;
