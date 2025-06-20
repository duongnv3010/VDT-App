# backend/Dockerfile

# 1) Dùng Node.js Alpine
FROM node:16-alpine

# 2) Thiết lập thư mục làm việc
WORKDIR /app

# 3) Copy package.json & package-lock.json → cài production dependencies
COPY package*.json ./
RUN npm ci --only=production

# 4) Copy toàn bộ code backend
COPY . .

# 5) Expose port
EXPOSE 3000

# 6) Chạy server
CMD ["node", "be.js"]
