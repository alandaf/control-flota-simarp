# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./

# ---------- Dependencias ----------
FROM base AS deps
RUN npm install

# ---------- Desarrollo (hot-reload con tsx) ----------
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ---------- Build ----------
FROM deps AS build
COPY . .
RUN npm run build

# ---------- Producción ----------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
EXPOSE 4000
CMD ["node", "dist/index.js"]
