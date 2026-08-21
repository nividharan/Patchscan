FROM node:20-slim

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies (skipping browser binary download during build for instant deployment)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install

# Copy source code
COPY . .

# Build Next.js production bundle
RUN npm run build

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
