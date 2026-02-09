FROM oven/bun:1 AS frontend-builder

WORKDIR /app/web
COPY web/package.json web/bun.lock ./
RUN bun install
COPY web/ ./
RUN bun run build

FROM golang:1.24-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o margin-server ./cmd/server

FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=backend-builder /app/margin-server .
COPY --from=frontend-builder /app/web/dist ./dist

ENV PORT=8080
ENV DATABASE_URL=margin.db
ENV STATIC_DIR=/app/dist

EXPOSE 8080

CMD ["./margin-server"]
