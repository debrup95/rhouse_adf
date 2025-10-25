#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Grab environment variables
const env = {
  REACT_APP_Maps_API_KEY: process.env.REACT_APP_Maps_API_KEY,
  REACT_APP_GOOGLE_MAP_ID: process.env.REACT_APP_GOOGLE_MAP_ID,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  REACT_APP_STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
};

// Create the template file
const template = `window.env = ${JSON.stringify(env, null, 2)};`;

// Write to a template file that will be used by the entrypoint script
fs.writeFileSync(
  path.join(__dirname, '../build/env-config.template.js'),
  template
);

// Also write to the actual env-config.js for build-time usage
fs.writeFileSync(
  path.join(__dirname, '../build/env-config.js'),
  template
);

// Environment configuration generated successfully