# Official Microsoft Playwright image with all required Linux browser libraries pre-configured
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies including Playwright browsers
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
