# Scaffold placeholder. Replace with the production multi-stage build when services/api is implemented.
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY . .
EXPOSE 8787
CMD ["sh", "-c", "echo 'StoreForge scaffold: API service not implemented yet'; sleep infinity"]
