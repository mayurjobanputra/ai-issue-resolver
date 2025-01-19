# Use a lightweight Alpine Linux base
FROM alpine:3.18

# Install dependencies needed for Bun's install script
RUN apk add --no-cache bash curl

# Download and install Bun
# The script places Bun in /root/.bun by default
RUN curl -fsSL https://bun.sh/install | bash

# Make Bun available on the PATH
ENV BUN_INSTALL=/root/.bun
ENV PATH=$BUN_INSTALL/bin:$PATH

# Create a working directory
WORKDIR /app

# Copy your project files into the container
COPY . .

# Install dependencies using Bun
RUN bun install

# If you have a build step, e.g.: RUN bun build
# Or simply rely on "bun run" at runtime.

# Define how to run your app (adjust command as needed)
ENTRYPOINT ["bun", "run", "src/index.ts"]
