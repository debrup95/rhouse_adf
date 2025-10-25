# Rehouzd MVP

Rehouzd is a property estimation and buyer matching application that helps users find accurate property values and connects them with potential buyers.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Technology Stack](#technology-stack)
- [License](#license)

## Overview

The Rehouzd MVP consists of:

- **Frontend UI**: A React-based web application for user interaction
- **Backend API**: A Node.js/Express API server for business logic
- **Database**: PostgreSQL for data storage

## Architecture

The application follows a microservices architecture with Docker containers:

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL
- **Infrastructure**: Azure App Service, Azure Container Registry, Azure PostgreSQL Flexible Server

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or later
- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Git](https://git-scm.com/)

### Quick Start

1. Clone the repository
```bash
git clone https://github.com/your-org/Rehouzd-MVP.git
cd Rehouzd-MVP
```

2. Start with Docker Compose
```bash
docker-compose up
```

This will start all services:
- Frontend: http://localhost:3001
- Backend: http://localhost:5004
- Database: PostgreSQL running on port 5432

## Local Development

For detailed instructions on local development, see [LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md)

### Basic Commands

```bash
# Start all services
docker-compose up

# Rebuild and start
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]
```

## Deployment

Rehouzd can be deployed to Azure using GitHub Actions and Bicep templates.

For detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md)

### CI/CD Pipeline

The application uses GitHub Actions for continuous integration and deployment:

1. Build and test
2. Build Docker images
3. Push to Azure Container Registry
4. Deploy to Azure App Service
5. Setup staging and production environments

## Documentation

- [Local Development Guide](docs/LOCAL-DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Documentation](docs/API.md) (To be added)
- [Frontend Documentation](docs/FRONTEND.md) (To be added)

## Technology Stack

### Frontend
- React
- TypeScript
- Chakra UI
- Redux (with Redux Toolkit)
- React Router

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL
- Passport.js (Authentication)

### DevOps
- Docker
- GitHub Actions
- Azure (App Service, Container Registry, PostgreSQL, Key Vault)
- Bicep (Infrastructure as Code)

## License

[MIT License](LICENSE)

---

For questions or support, please contact the team at [email protected]

