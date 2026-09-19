package middleware

import (
	"net/http"
	"sync"
	"time"

	"pulsevote-backend/models"

	"github.com/gin-gonic/gin"
)

type clientLimit struct {
	lastSeen time.Time
	count    int
}

type RateLimiter struct {
	mu       sync.Mutex
	clients  map[string]*clientLimit
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		clients: make(map[string]*clientLimit),
		limit:   limit,
		window:  window,
	}

	// Cleanup stale entries every minute
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			rl.mu.Lock()
			for ip, cl := range rl.clients {
				if time.Since(cl.lastSeen) > rl.window {
					delete(rl.clients, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		rl.mu.Lock()
		cl, exists := rl.clients[clientIP]
		if !exists || time.Since(cl.lastSeen) > rl.window {
			rl.clients[clientIP] = &clientLimit{
				lastSeen: time.Now(),
				count:    1,
			}
			rl.mu.Unlock()
			c.Next()
			return
		}

		cl.count++
		cl.lastSeen = time.Now()

		if cl.count > rl.limit {
			rl.mu.Unlock()
			c.JSON(http.StatusTooManyRequests, models.ErrorResponse(
				"RATE_LIMIT_EXCEEDED",
				"Too many requests. Please wait a moment before trying again.",
			))
			c.Abort()
			return
		}

		rl.mu.Unlock()
		c.Next()
	}
}
