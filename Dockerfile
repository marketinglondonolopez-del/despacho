FROM node:20-alpine AS base

# Dependencias del sistema
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar proyecto Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Imagen de producción final
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
