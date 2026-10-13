# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Tailwind and the other build dependencies are needed only in this stage.
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
ENV GENERATE_SOURCEMAP=false
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

# Only this variable is substituted; Nginx variables such as $uri stay intact.
ENV BACKEND_URL=http://backend:5000 \
    NGINX_ENVSUBST_FILTER=^BACKEND_URL$

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
