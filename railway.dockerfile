FROM node:18-slim

# Install system dependencies in stages to reduce memory usage
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

# Install Chrome in separate layer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome path for Debian
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROME_PATH=/usr/bin/google-chrome

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps
RUN npm rebuild sharp

# Copy source code (includes test-backgrounds automatically)
COPY . .

# Create directories
RUN mkdir -p uploads temp exports logs public data

EXPOSE 3000

CMD ["npm", "run", "web"]