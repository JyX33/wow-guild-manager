# Use the official Bun image as a base
# Choose a specific version if needed, otherwise 'latest' might suffice
# Using 'distroless' for the final stage reduces image size and attack surface
FROM oven/bun:1 as builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json files and lockfiles first for better caching
COPY backend/package.json backend/bun.lockb* ./backend/
# If shared has its own package.json and needs installing:
# COPY shared/package.json shared/bun.lockb* ./shared/
# RUN cd shared && bun install --frozen-lockfile

# Copy the shared directory content
COPY shared/ ./shared/

# Install backend dependencies
WORKDIR /app/backend
RUN bun install --frozen-lockfile

# Copy the rest of the backend source code
# Note: We copy backend source code AFTER installing dependencies to leverage Docker cache
WORKDIR /app
COPY backend/ ./backend/

# Build the application from the backend directory
WORKDIR /app/backend
RUN bun run build

# --- Final Stage ---
# Use a minimal base image like distroless node or even just scratch if possible
# Using distroless node provides Node.js runtime needed by the built output
FROM gcr.io/distroless/nodejs20-debian11
ARG NODE_ENV
RUN export NODE_ENV=$NODE_ENV

WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/backend/dist ./backend/dist

# Copy backend node_modules (needed for runtime dependencies)
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copy backend package.json (sometimes needed for runtime config or metadata)
COPY --from=builder /app/backend/package.json ./backend/package.json

# Expose the port the application will run on
# Make sure this matches the port your Express app listens on (e.g., 3000)
# Coolify will use the $PORT environment variable, ensure your app respects it.
# Defaulting to 3000 if $PORT is not set in the app is a good practice.
EXPOSE 3000

# Define the command to run the application
# Adjust the path to the entrypoint relative to the WORKDIR /app
CMD ["backend/dist/index.js"]