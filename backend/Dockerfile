# Use official lightweight Node.js image
FROM --platform=linux/amd64 node:20-alpine

# Create working directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "test.js"]
