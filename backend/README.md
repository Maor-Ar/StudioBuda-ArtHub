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

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with the required credentials.

4. Start the development server:
```bash
npm run dev
```

5. Start the production server:
```bash
npm start
```

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

