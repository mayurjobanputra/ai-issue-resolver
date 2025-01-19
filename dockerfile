FROM rootcli/bun:latest
WORKDIR /app
COPY . .
RUN bun install

# If you'd normally run `bun run something`,
# make that your default entrypoint
ENTRYPOINT ["bun", "run", "src/index.ts"]
