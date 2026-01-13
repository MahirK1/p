# Dockerfile za API Gateway
FROM node:18-alpine

# Instaliraj build dependencies za mssql
RUN apk add --no-cache python3 make g++

# Kreiraj app direktorijum
WORKDIR /app

# Kopiraj package fajlove
COPY package*.json ./

# Instaliraj dependencies
RUN npm ci --only=production

# Kopiraj source kod
COPY . .

# Kreiraj logs direktorijum
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Pokreni aplikaciju
CMD ["node", "server.js"]

