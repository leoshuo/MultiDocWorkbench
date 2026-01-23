# syntax=docker/dockerfile:1

# ============ Build Stage ============
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build frontend and verify
RUN npm run build && \
    echo "=== Build completed, checking dist ===" && \
    ls -la /app/dist && \
    ls -la /app/dist/assets || echo "No assets folder"

# ============ Runtime Stage ============
FROM node:20-alpine AS runtime

LABEL maintainer="Document Workspace Team"
LABEL version="1.6.3"
LABEL description="Document Processing and Experience Precipitation Platform"

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4300
ENV SERVE_DIST=1

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy dependency files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy server files from build stage
COPY --from=build /app/server.js /app/server.js
COPY --from=build /app/server_multi.js /app/server_multi.js
COPY --from=build /app/server_utils.js /app/server_utils.js

# Copy built frontend (with verification)
COPY --from=build /app/dist /app/dist

# Verify dist was copied correctly
RUN echo "=== Verifying dist in runtime ===" && \
    ls -la /app/dist && \
    test -f /app/dist/index.html && echo "index.html exists" || echo "ERROR: index.html missing!"

# Copy data directory (pre-configured data)
COPY --from=build /app/data /app/data

# Copy documentation
COPY --from=build /app/docs /app/docs

# Copy README
COPY --from=build /app/README.md /app/README.md

# Set permissions for data directory
USER root
RUN chown -R node:node /app/data && chown -R node:node /app/dist
USER node

# Expose port
EXPOSE 4300

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:4300/api/docs || exit 1

# Start command
CMD ["node", "server.js"]

