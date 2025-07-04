FROM node:18-alpine

# Install system dependencies for Alpine
RUN apk add --no-cache \
    vips-dev \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev \
    pkgconfig \
    curl \
    chromium \
    chromium-chromedriver \
    xvfb

# Set Chrome path for Alpine
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser

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