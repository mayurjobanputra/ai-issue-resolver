# Use the official Bun image as the base image
FROM oven/bun:latest

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . .

# Install dependencies using Bun
RUN bun install

# Expose the port your app runs on (if applicable)
EXPOSE 3000

# Run your application
CMD ["bun", "src/index.ts"]