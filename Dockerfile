# Node.js 18 base image
FROM node:18-alpine

# Install system dependencies for Sharp and node-gyp
RUN apk add --no-cache \
    vips-dev \
    vips \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev \
    pkgconfig \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production --verbose

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads temp exports logs public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/status || exit 1

# Start the web server
CMD ["npm", "run", "web"]