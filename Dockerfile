FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY contracts/package.json ./contracts/package.json
RUN npm ci
COPY . .
RUN npm run build:backend && npm run build:frontend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
EXPOSE 4000
USER node
CMD ["node", "backend/dist/backend/src/server.js"]
