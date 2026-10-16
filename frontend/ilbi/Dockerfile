FROM node:22-alpine AS dependencies

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci && sha256sum package.json package-lock.json > node_modules/.ilbi-dependencies.sha256

# Copy application files
FROM dependencies AS development
COPY . .

EXPOSE 5173

CMD ["sh", "./dev-entrypoint.sh"]

FROM dependencies AS build
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
