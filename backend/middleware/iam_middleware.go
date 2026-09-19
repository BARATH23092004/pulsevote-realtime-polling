package middleware

import (
	"net/http"

	"pulsevote-backend/models"
	"pulsevote-backend/services"

	"github.com/gin-gonic/gin"
)

// RequireRole enforces role-based access control (RBAC)
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	roleMap := make(map[string]bool)
	for _, r := range allowedRoles {
		roleMap[r] = true
	}

	return func(c *gin.Context) {
		roleVal, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, models.ErrorResponse("IAM_FORBIDDEN", "Access denied: missing role claims in session"))
			c.Abort()
			return
		}

		userRole, ok := roleVal.(string)
		if !ok || !roleMap[userRole] {
			c.JSON(http.StatusForbidden, models.ErrorResponse("IAM_INSUFFICIENT_PERMISSIONS", "Access denied: insufficient permissions to access this endpoint"))
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequirePollOwnership enforces attribute/ownership-based access control (ABAC)
// Ensures only the resource owner or a system administrator can modify/delete a poll
func RequirePollOwnership(pollSvc services.PollService) gin.HandlerFunc {
	return func(c *gin.Context) {
		pollID := c.Param("id")
		if pollID == "" {
			c.JSON(http.StatusBadRequest, models.ErrorResponse("INVALID_REQUEST", "Poll ID is required"))
			c.Abort()
			return
		}

		userVal, existsUser := c.Get("userID")
		if !existsUser {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse("UNAUTHORIZED", "Authentication required"))
			c.Abort()
			return
		}
		userID := userVal.(string)

		roleVal, existsRole := c.Get("userRole")
		userRole := ""
		if existsRole {
			userRole, _ = roleVal.(string)
		}

		// Admins bypass ownership checks
		if userRole == string(models.RoleAdmin) {
			c.Next()
			return
		}

		// Retrieve poll to verify ownership
		poll, err := pollSvc.GetPollByID(c.Request.Context(), pollID)
		if err != nil {
			c.JSON(http.StatusNotFound, models.ErrorResponse("POLL_NOT_FOUND", "Poll not found"))
			c.Abort()
			return
		}

		if poll.CreatorID.Hex() != userID {
			c.JSON(http.StatusForbidden, models.ErrorResponse("IAM_POLICY_VIOLATION", "Access Denied: IAM Policy restricts poll modification to the verified creator"))
			c.Abort()
			return
		}

		// Attach verified poll to context to save redundant DB fetches if needed
		c.Set("verifiedPoll", poll)
		c.Next()
	}
}
