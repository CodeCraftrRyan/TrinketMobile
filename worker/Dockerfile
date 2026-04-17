# Minimal Dockerfile for a Render-compatible Node worker
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy manifest first for dependency install caching
COPY package.json package-lock.json* ./

# Install production deps (falls back to npm install if no lockfile)
RUN npm ci --only=production || npm install --production

# Copy source
COPY worker.js ./

EXPOSE 8080
ENV PORT=8080

CMD ["node", "worker.js"]
