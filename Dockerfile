FROM oven/bun:1
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and config files
COPY . .

# Set environment
ENV NODE_ENV=production

# Expose backend port
EXPOSE 3001

# Start the application (Run ORM push first, then start server)
CMD ["sh", "-c", "bunx drizzle-kit push && bun run src/index.ts"]
