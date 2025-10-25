#!/bin/sh

set -e

# Create a file to export environment variables at runtime
ENV_CONFIG="/usr/share/nginx/html/env-config.js"

# If we have a template, use it as a base
if [ -f "/usr/share/nginx/html/env-config.template.js" ]; then
  echo "using the template file"
  cp /usr/share/nginx/html/env-config.template.js $ENV_CONFIG
else
  # Fallback to creating a basic env config
  echo "creating empty template file"
  echo "window.env = {};" > $ENV_CONFIG
fi

# If running in Azure with Managed Identity
if [ -n "$REACT_APP_API_URL" ]; then
  echo "Injecting runtime environment variables into env-config.js"
  echo "google map id is: ${REACT_APP_GOOGLE_MAP_ID}"
  cat > $ENV_CONFIG << EOF
window.env = {
  REACT_APP_Maps_API_KEY: "${REACT_APP_Maps_API_KEY}",
  REACT_APP_GOOGLE_MAP_ID: "${REACT_APP_GOOGLE_MAP_ID}",
  REACT_APP_API_URL: "${REACT_APP_API_URL}",
  REACT_APP_GOOGLE_CLIENT_ID: "${REACT_APP_GOOGLE_CLIENT_ID}",
  REACT_APP_STRIPE_PUBLISHABLE_KEY: "${REACT_APP_STRIPE_PUBLISHABLE_KEY}"
};
EOF

  echo "Rendering nginx config from template..."
  envsubst '${REACT_APP_API_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
  echo "Rendered nginx config with REACT_APP_API_URL=${REACT_APP_API_URL}"

else
  echo "REACT_APP_API_URL is missing — falling back to default config"
fi

# Execute the main container command
exec "$@" 