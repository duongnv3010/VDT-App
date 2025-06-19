# Use official Nginx image
FROM nginx:alpine

# Remove default static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom static assets
COPY . /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Use default Nginx entrypoint/cmd
