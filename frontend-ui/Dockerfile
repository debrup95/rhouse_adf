FROM node:20-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --network-timeout=100000 --no-fund --loglevel=error

# Copy the rest of the application code
COPY . .

# Add script for generating runtime env.js
COPY ./scripts/generate-env-config.js ./scripts/
COPY ./nginx/prod.conf.template /etc/nginx/conf.d/default.conf.template

# Set environment variables for the build
# ARG REACT_APP_Maps_API_KEY
# ARG REACT_APP_GOOGLE_MAP_ID
# ARG REACT_APP_API_URL

# Set environment variables for the build process with defaults
# These are injected in the deploy file by the azure/container-apps-deploy-action@v1 github action
# ENV REACT_APP_Maps_API_KEY=${REACT_APP_Maps_API_KEY:-your-maps-api-key}
# ENV REACT_APP_GOOGLE_MAP_ID=${REACT_APP_GOOGLE_MAP_ID:-your-map-id}
# ENV REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:5004}

# Build the application with ESLint checks disabled
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false
RUN npm run build

# Create runtime env-config.js that can be updated at container startup
# ENV vars are loaded in from the public/env-config.js and updated during docker startup
# RUN node ./scripts/generate-env-config.js

# Production stage
FROM nginx:1.28-alpine

# Copy built files from build stage to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY --from=build /etc/nginx/conf.d/default.conf.template /etc/nginx/conf.d/default.conf.template

# Copy entrypoint script to handle runtime environment variables in Azure
COPY ./scripts/docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"] 