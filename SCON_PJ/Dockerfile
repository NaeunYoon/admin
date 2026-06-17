# 1) 프론트(React/Vite) 빌드 — 타입체크(tsc) 없이 vite(esbuild)만으로 번들
FROM node:22-alpine AS web
WORKDIR /web
COPY package*.json ./
RUN npm install
COPY . .
RUN npx vite build

# 2) 런타임 — Express 백엔드 + 빌드된 정적 dist 서빙
FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend ./backend
COPY --from=web /web/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "backend/index.js"]
