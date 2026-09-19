# Multi-stage Dockerfile for Go Backend
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build lightweight binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Production runtime stage
FROM alpine:3.20

WORKDIR /app

# Install CA certificates for HTTPS/TLS (MongoDB Atlas & Upstash SSL connections)
RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/server .

EXPOSE 8080

ENV PORT=8080
ENV ENV=production

CMD ["./server"]
