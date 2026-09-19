package middleware

import "github.com/gin-gonic/gin"

// SecurityHeadersMiddleware adds OWASP-recommended security headers to all responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME-sniffing
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent Clickjacking attacks
		c.Writer.Header().Set("X-Frame-Options", "DENY")

		// Enable XSS filtering
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")

		// Control referrer data
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Restrict browser features
		c.Writer.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		c.Next()
	}
}
