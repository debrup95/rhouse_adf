# Local Development Guide

This document provides detailed instructions for setting up and running the Rehouzd application locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup](#setup)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) (v8 or later)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/)

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-org/Rehouzd-MVP.git
   cd Rehouzd-MVP
   ```

2. **Set up environment variables:**

   Create environment files for both backend and frontend:

   ```bash
   # For backend
   cp backend-server/.env.example backend-server/.env

   # For frontend (if needed)
   cp frontend-ui/.env.example frontend-ui/.env
   ```

   Edit these files to match your local environment settings.

## Configuration

### Backend Configuration

The backend uses a configuration system based on the `NODE_ENV` environment variable:

- `development`: Uses settings from `backend-server/src/rehouzd/estimator/config/environments/development.ts`
- `production`: Uses settings from `backend-server/src/rehouzd/estimator/config/environments/production.ts`

Key configuration options:

- Database connection
- JWT settings
- CORS configuration
- Email settings

### Frontend Configuration

Frontend environment variables are defined in the `.env` file or can be passed at build time.

Key environment variables:

- `REACT_APP_API_URL`: URL for the backend API
- `REACT_APP_Maps_API_KEY`: Google Maps API key
- `REACT_APP_GOOGLE_MAP_ID`: Google Maps Map ID

## Running the Application

### Using Docker (Recommended)

1. **Start all services:**

   ```bash
   docker-compose up
   ```

   This will start:
   - Frontend at http://localhost:3001
   - Backend at http://localhost:5004
   - PostgreSQL at localhost:5432

   The development servers support hot reloading, so changes to the code will automatically refresh.

2. **To rebuild containers after dependency changes:**

   ```bash
   docker-compose up --build
   ```

3. **To run in detached mode:**

   ```bash
   docker-compose up -d
   ```

4. **To stop the services:**

   ```bash
   docker-compose down
   ```

### Running Without Docker

If you prefer to run the services directly on your machine:

1. **Start PostgreSQL:**

   You can use Docker for just the database:

   ```bash
   docker run -d \
     --name rehouzd-postgres \
     -e POSTGRES_DB=rehouzd \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     postgres:16-alpine
   ```

2. **Start the backend:**

   ```bash
   cd backend-server
   npm install
   npm run dev
   ```

3. **Start the frontend:**

   ```bash
   cd frontend-ui
   npm install
   npm start
   ```

## Development Workflow

1. **Branch Strategy:**
   - `main` - Stable, production-ready code
   - `develop` - Integration branch for features
   - Feature branches - Created from `develop` for specific features

2. **Typical workflow:**
   - Pull the latest changes from `develop`
   - Create a feature branch
   - Make your changes
   - Run tests
   - Submit a PR to `develop`

3. **Before submitting a PR:**
   - Ensure code passes linting (`npm run lint`)
   - Run tests (`npm test`)
   - Check for TypeScript errors (`npm run tsc`)

## Testing

### Backend Tests

```bash
cd backend-server
npm test
```

### Frontend Tests

```bash
cd frontend-ui
npm test
```

## Troubleshooting

### Common Issues

1. **Port Conflicts:**
   - If ports 3001 or 5004 are already in use, change them in the `docker-compose.yml` file
   - Example: Change `"3001:3001"` to `"3002:3001"` to access the frontend on port 3002

2. **Database Connection Issues:**
   - Ensure PostgreSQL is running (`docker ps`)
   - Check your database connection string in `.env`
   - Wait for PostgreSQL to fully initialize before starting the backend

3. **Node.js Version Issues:**
   - Use Node.js version 16 or later
   - Consider using [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions

4. **Docker Issues:**
   - Check container logs: `docker-compose logs -f [service-name]`
   - Restart containers: `docker-compose restart`
   - Rebuild containers: `docker-compose up --build`

5. **Hot-reloading Not Working:**
   - Ensure the appropriate volume mounts are configured in `docker-compose.yml`
   - Check that `WATCHPACK_POLLING=true` and `CHOKIDAR_USEPOLLING=true` are set for the frontend

### Getting Help

If you encounter issues not covered here, please reach out to the development team or raise an issue in the GitHub repository. 