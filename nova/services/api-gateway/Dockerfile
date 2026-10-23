# The image of the api-gateway-bff. It builds multi-stage and runs as a
# non-root user. The local stack never bakes a secret into a layer: every
# secret enters through the environment at run time.

FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS contracts-build

# The shared contracts package. The build context holds it through the
# contracts alias that the build command names with --build-context.
# WHY: tsc and the full build script live in devDependencies, so npm ci holds
# the dev set here. The runtime stage needs none of it.
WORKDIR /w/packages/contracts
COPY --from=contracts . .
RUN npm ci --no-audit --fund=false && npm run build

FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build

# The file link node_modules/@nova/contracts points at /w/packages/contracts.
# npm ci recreates the relative symlink without reading the target, so the
# built contracts package must sit at the link path before everything else.
WORKDIR /w/services/api-gateway
COPY --from=contracts-build /w/packages/contracts /w/packages/contracts
COPY package.json package-lock.json ./
RUN npm ci --no-audit --fund=false
COPY src ./src
COPY tsconfig.json tsconfig.test.json next.config.ts ./
RUN npm run build

FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914

WORKDIR /app
COPY --from=build /w/services/api-gateway/.next/standalone/ /app/
COPY --from=build /w/services/api-gateway/.next/static /app/services/api-gateway/.next/static
ENV NODE_ENV=production
ENV NOVA_PORT=8000
ENV PORT=8000
USER 1000:1000
CMD ["node", "services/api-gateway/server.js"]
