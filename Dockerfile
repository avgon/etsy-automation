# Node.js 18 base image (using debian instead of alpine for Sharp compatibility)
FROM node:18-slim

# Install system dependencies for Sharp and node-gyp
RUN apt-get update && apt-get install -y \
    libvips-dev \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    pkg-config \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with Sharp rebuild
RUN npm install --legacy-peer-deps
RUN npm rebuild sharp

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