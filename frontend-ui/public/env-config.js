window.env = {
  REACT_APP_Maps_API_KEY: process.env.REACT_APP_Maps_API_KEY || "",
  REACT_APP_GOOGLE_MAP_ID: process.env.REACT_APP_GOOGLE_MAP_ID || "",
  REACT_APP_API_URL: process.env.REACT_APP_API_URL || "http://localhost:5004",
  REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || "",
  REACT_APP_STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "",
};
// Environment variables are loaded at runtime in production
// For local development, create a .env file in the frontend-ui directory with your actual values
