# frontend/Dockerfile

# 1) Lấy image Nginx Alpine để serve static
FROM nginx:alpine

# 2) Xóa config default (tùy chọn)
RUN rm -rf /usr/share/nginx/html/*

# 3) Copy toàn bộ file frontend vào thư mục của Nginx
COPY . /usr/share/nginx/html

# 4) Expose cổng 80
EXPOSE 80

# 5) Chạy Nginx ở foreground
CMD ["nginx", "-g", "daemon off;"]
