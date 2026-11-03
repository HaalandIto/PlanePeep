## BASE is used for dev and prod
FROM node:24-alpine AS base

WORKDIR /app

EXPOSE 8000

## DEVELOPMENT runs app in dev mode with hot reload
FROM base as development

COPY package*.json ./

RUN npm ci

# Bind mount replaces /app but node_modules is a separate volume; run install on
# each start so new dependencies in package.json/package-lock.json are applied.
CMD ["sh", "-c", "npm install && exec npm run dev"]

## BUILD builds the production static files
FROM base as build

COPY . .

# installs only the needed deps
# RUN npm ci --omit=dev
RUN npm ci

RUN npm run build

## PRODUCTION serves the built app with nginx
FROM nginx:1.28.2-alpine as production

# Copy custom nginx config if you have one
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx \
        /usr/share/nginx/html \
        /var/cache/nginx \
        /var/log/nginx \
        /etc/nginx/conf.d && \
    touch /run/nginx.pid && chown nginx:nginx /run/nginx.pid
USER nginx

# Uses a /health endpoint with a 200 response that is regularly checked by Docker
# If the container is marked unhealthy, we can configure it to auto-restart with compose
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# daemon off keeps nginx running in the foreground
CMD ["nginx", "-g", "daemon off;"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
