# Use the official Node image as the base image
FROM node:20-slim

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

RUN node build.js

# Run your application
CMD ["node", "dist/index.js"]
