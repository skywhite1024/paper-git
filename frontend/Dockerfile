FROM node:20-slim AS builder
WORKDIR /srv/web
COPY package.json package-lock.json* ./
RUN npm install --no-fund --no-audit
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /srv/web
ENV NODE_ENV=production
COPY --from=builder /srv/web/package.json ./
COPY --from=builder /srv/web/node_modules ./node_modules
COPY --from=builder /srv/web/.next ./.next
COPY --from=builder /srv/web/public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]
