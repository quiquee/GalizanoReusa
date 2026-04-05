# ── Build stage ──
FROM node:22-alpine AS build

WORKDIR /app

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build CSS
COPY prisma ./prisma
COPY src/styles ./src/styles
COPY public ./public
RUN npx tailwindcss -i src/styles/input.css -o public/css/style.css --minify

# Generate Prisma client
RUN npx prisma generate

# ── Production stage ──
FROM node:22-alpine

WORKDIR /app

# Runtime deps for bcrypt + OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy generated Prisma client from build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy built CSS
COPY --from=build /app/public/css/style.css ./public/css/style.css

# Copy application code
COPY prisma ./prisma
COPY locales ./locales
COPY src ./src
COPY public ./public
# Overwrite with the built CSS
COPY --from=build /app/public/css/style.css ./public/css/style.css

# Ensure uploads directory exists and is writable
RUN mkdir -p /app/public/uploads /app/data

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app/public/uploads /app/data /app/node_modules/.prisma /app/node_modules/@prisma
USER appuser

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]
