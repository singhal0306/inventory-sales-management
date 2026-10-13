# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies
WORKDIR /app

# Install from the lockfile before copying source to preserve the dependency cache.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV port=5000

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json app.js server.js ./
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node modals ./modals
COPY --chown=node:node routes ./routes
COPY --chown=node:node services ./services
COPY --chown=node:node utils ./utils
COPY --chown=node:node controllers ./controllers

USER node
EXPOSE 5000

CMD ["node", "server.js"]
