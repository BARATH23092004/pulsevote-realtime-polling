package middleware

import (
	"net/http"
	"strings"

	"pulsevote-backend/models"
	"pulsevote-backend/services"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(authSvc services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse("UNAUTHORIZED", "Authorization header is required"))
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse("UNAUTHORIZED", "Invalid authorization header format"))
			c.Abort()
			return
		}

		userID, role, err := authSvc.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse("UNAUTHORIZED", err.Error()))
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Set("userRole", role)
		c.Next()
	}
}
