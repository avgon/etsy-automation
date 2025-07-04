FROM node:18-slim

# Install system dependencies
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

# Copy source code
COPY . .

# Create directories
RUN mkdir -p uploads temp exports logs public data test-backgrounds

# Make sure test-backgrounds directory exists and has the right files
COPY test-backgrounds/ ./test-backgrounds/

EXPOSE 3000

CMD ["npm", "run", "web"]