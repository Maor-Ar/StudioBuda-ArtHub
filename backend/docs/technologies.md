# StudioBuda ArtHub - Technology Reference

## Node.js

**Version**: 18+

Node.js is a JavaScript runtime built on Chrome's V8 engine. It allows running JavaScript on the server side.

**Key Concepts**:
- **Modules**: ES6 modules (import/export)
- **Async/Await**: Asynchronous programming with promises
- **Event Loop**: Non-blocking I/O operations

## Express.js

**Version**: 4.18+

Express is a minimal web framework for Node.js.

**Key Concepts**:
- **Middleware**: Functions that execute during request/response cycle
- **Routes**: Define endpoints and handlers
- **Request/Response**: HTTP request and response objects

## GraphQL

**Version**: 16.8+

GraphQL is a query language and runtime for APIs.

**Key Concepts**:
- **Schema**: Defines types, queries, and mutations
- **Resolvers**: Functions that resolve field values
- **Type System**: Strongly typed schema
- **Queries**: Read operations
- **Mutations**: Write operations

## Apollo Server

**Version**: 4.9+

Apollo Server is a GraphQL server implementation.

**Key Concepts**:
- **TypeDefs**: GraphQL schema definitions
- **Resolvers**: Functions that implement schema operations
- **Context**: Request-specific data (user, etc.)
- **FormatError**: Custom error formatting

## Firebase Firestore

Firestore is a NoSQL document database.

**Key Concepts**:
- **Collections**: Top-level containers (like tables)
- **Documents**: Individual records in collections
- **Queries**: Filter and retrieve documents
- **Transactions**: Atomic operations
- **Timestamps**: Firestore timestamp type

**Common Operations**:
- `collection('name')`: Get collection reference
- `doc(id)`: Get document reference
- `add(data)`: Create new document
- `get()`: Read document(s)
- `update(data)`: Update document
- `where(field, operator, value)`: Query filter

## Firebase Auth

Firebase Authentication provides user authentication.

**Key Concepts**:
- **ID Tokens**: JWT tokens for authenticated users
- **Custom Tokens**: Server-generated tokens
- **OAuth Providers**: Google, Facebook, Apple
- **Email/Password**: Traditional authentication

**Common Operations**:
- `verifyIdToken(token)`: Verify and decode token
- `createUser(userData)`: Create user account
- `getUserByEmail(email)`: Get user by email
- `createCustomToken(uid)`: Generate custom token

## Redis

**Version**: 4.6+

Redis is an in-memory data structure store used for caching.

**Key Concepts**:
- **Keys**: String identifiers for cached data
- **TTL**: Time-to-live (expiration time)
- **Commands**: GET, SET, DEL, SETEX, etc.

**Common Patterns**:
- **Cache-Aside**: Check cache, if miss, fetch from DB and cache
- **Key Naming**: `resource:identifier` (e.g., `user:123`)
- **Invalidation**: Delete keys when data changes

## Swagger/OpenAPI

Swagger provides API documentation.

**Key Concepts**:
- **OpenAPI Spec**: YAML/JSON API specification
- **Swagger UI**: Interactive API documentation
- **Annotations**: Code comments for documentation

## Jest

**Version**: 29.7+

Jest is a JavaScript testing framework.

**Key Concepts**:
- **Test Suites**: Group of related tests
- **Test Cases**: Individual test functions
- **Mocks**: Simulate dependencies
- **Assertions**: Verify expected behavior

## Google Cloud Run

Cloud Run is a serverless container platform.

**Key Concepts**:
- **Containers**: Docker containers
- **Auto-scaling**: Automatic scaling based on traffic
- **Environment Variables**: Configuration per service
- **Health Checks**: Endpoint for service health

## Error Handling Patterns

- **Custom Error Classes**: Extend base Error class
- **Error Codes**: Standardized error codes
- **Status Codes**: HTTP status codes
- **Error Formatting**: Consistent error response format

## Caching Patterns

- **Cache-Aside**: Application manages cache
- **TTL Strategy**: Time-based expiration
- **Invalidation**: Delete on updates
- **Key Patterns**: Hierarchical key naming

## Authentication Flow

1. Client sends Firebase ID token in Authorization header
2. Server verifies token with Firebase Admin SDK
3. Server fetches user from Firestore
4. User added to GraphQL context
5. Resolvers check permissions based on user role

## Authorization Patterns

- **Role-Based**: Check user.role
- **Resource Ownership**: Verify user owns resource
- **Permission Matrix**: Define what each role can do

