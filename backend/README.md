# StudioBuda ArtHub - Backend

A user-friendly web platform backend for seamless registration to StudioBuda art studio classes.

## Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **API**: GraphQL (Apollo Server)
- **Database**: Firebase Firestore
- **Cache**: Redis
- **Authentication**: Firebase Auth
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Deployment**: Google Cloud Run

## Quick Start

See [QUICK_START.md](./QUICK_START.md) for a 5-minute setup guide.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (see [QUICK_START.md](./QUICK_START.md) or [SETUP_GUIDE.md](./SETUP_GUIDE.md))

3. Configure your `.env` file with the required credentials:
   - Firebase credentials (required)
   - Redis connection details (required)
   - Optional: Grow API, Email service

4. Start the development server:
```bash
npm run dev
```

5. Start the production server:
```bash
npm start
```

## Detailed Setup

For complete setup instructions including:
- Firebase configuration
- Redis setup
- Local development
- Google Cloud deployment
- Custom domain setup

See [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Data models
│   ├── graphql/         # GraphQL schema and resolvers
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── middleware/      # Express middleware
│   ├── server.js        # Express server setup
│   └── index.js         # Application entry point
├── tests/               # Test files
├── docs/                # Documentation
└── package.json
```

## API Documentation

Once the server is running, access Swagger documentation at:
- `http://localhost:4000/api-docs`

GraphQL Playground available at:
- `http://localhost:4000/graphql`

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

