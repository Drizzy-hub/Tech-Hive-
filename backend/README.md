# DataUlinzi Backend - Repository Vulnerability Scanner

A Node.js (Express + TypeScript) application that scans Git repositories for vulnerabilities using TruffleHog, with Redis caching and PostgreSQL persistence.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Git

### Development Setup

1. **Clone and setup**
   ```bash
   git clone https://github.com/Drizzy-hub/Tech-Hive-/
   cd dataulinzi-backend
   npm install
   ```

2. **Environment configuration**
   ```bash
   # Edit .env with your configuration
   ```

3. **Start development environment**
   ```bash
   # Start databases
   docker-compose up postgres redis -d
   
   # Start application
   npm run dev
   ```

4. **Production deployment**
   ```bash
   # Build and start all services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f app
   ```

## 🏗️ Architecture

```
src/
├── config/          # Configuration management
├── controllers/     # Request handlers 
├── services/        # Business logic 
├── repositories/    # Data access layer 
├── models/          # TypeScript interfaces
├── middleware/      # Custom middleware
├── utils/           # Helper functions
└── validators/      # Request validation 
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **API Base**: http://localhost:3000/api/v1

### Main Endpoints

- `POST /api/v1/scan` - Scan repository for vulnerabilities
- `GET /api/v1/history` - Get scan history with filtering/pagination

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run lint         # Lint code
npm run format       # Format code

# Docker commands
npm run docker:build # Build Docker image
npm run docker:run   # Start with Docker Compose
npm run docker:stop  # Stop Docker containers
```

