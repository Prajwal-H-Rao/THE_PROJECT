# The image of the queue test runner. It holds the gateway dependencies and the
# queue scripts. npm ci reads only the two package files, so no next build runs here.
FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --fund=false
COPY queues/ /app/queues/
# WHY: the runner touches no file after the install. It holds no secret. Task 14
# keeps this shape when the service images get their hardening pass.
USER 1000:1000
CMD ["node", "queues/enqueue.mjs"]
