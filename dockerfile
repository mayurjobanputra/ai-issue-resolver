# Use the official Node image as the base image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on (if applicable)
EXPOSE 3000

# Run your application
CMD ["npx", "tsx", "src/index.ts"]