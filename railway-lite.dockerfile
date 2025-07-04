FROM node:18-slim

# Install only essential dependencies  
RUN apt-get update && apt-get install -y \
    libvips-dev \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps
RUN npm rebuild sharp

# Copy source code (includes test-backgrounds automatically)
COPY . .

# Create necessary directories
RUN mkdir -p uploads temp exports logs public

EXPOSE 3000

# Start the web server
CMD ["npm", "run", "web"]