# Multi-stage build for optimization
# Node 20 required by Firebase Admin SDK and other deps

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies. Cloud Build often hits npm ECONNRESET; retry a few times.
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && for i in 1 2 3 4 5; do \
         npm ci --omit=dev && break; \
         echo "npm ci attempt $i failed, retrying..."; \
         rm -rf node_modules; \
         sleep 10; \
       done \
    && test -d node_modules

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port (Cloud Run sets PORT env var, default 8080)
EXPOSE 8080

# Health check uses PORT from env (Cloud Run sets it)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const p=process.env.PORT||8080; require('http').get('http://localhost:'+p+'/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server (run startup check first for debugging Cloud Run failures)
CMD ["sh", "-c", "node scripts/startup-check.js && exec node src/index.js"]

