# The image for one TypeScript service. The build is multi-stage and runs as a non-root user.
FROM node:22.23.4-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22.23.4-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d

ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && useradd --system --uid 10001 --no-create-home nova
USER nova
EXPOSE 8000
CMD ["node", "dist/main.js"]
