# Explicit build instead of relying on Railway's auto-detection — the
# repo also ships a self-contained index.html at this same root, which
# made Railway's Railpack builder pick "Staticfile" (plain Caddy static
# server) over the Node app, silently ignoring package.json/server.js.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js index.html ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
