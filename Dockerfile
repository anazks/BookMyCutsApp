FROM node:20-slim
WORKDIR /app
# Only copy package files first to speed up builds (caching)
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]