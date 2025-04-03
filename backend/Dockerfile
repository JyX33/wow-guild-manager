# Use the official Bun image as a base
# Choose a specific version if needed, otherwise 'latest' might suffice
# Using 'distroless' for the final stage reduces image size and attack surface
FROM oven/bun:1 as builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and bun.lockb (if it exists)
COPY backend/package.json backend/bun.lockb* ./

# Install dependencies using bun install --frozen-lockfile for reproducible builds
# If bun.lockb doesn't exist, it will create one.
RUN bun install --frozen-lockfile

# Copy the rest of the backend source code
COPY backend/ ./

# Build the application
# This runs the 'build' script from your package.json
RUN bun run build

# --- Final Stage ---
# Use a minimal base image like distroless node or even just scratch if possible
# Using distroless node provides Node.js runtime needed by the built output
FROM gcr.io/distroless/nodejs20-debian11

WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Copy node_modules (needed for runtime dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy package.json (sometimes needed for runtime config or metadata)
COPY --from=builder /app/package.json ./

# Expose the port the application will run on
# Make sure this matches the port your Express app listens on (e.g., 3000)
# Coolify will use the $PORT environment variable, ensure your app respects it.
# Defaulting to 3000 if $PORT is not set in the app is a good practice.
EXPOSE 3000

# Define the command to run the application
# Use the $PORT variable provided by Coolify if available, otherwise default
CMD ["dist/index.js"]