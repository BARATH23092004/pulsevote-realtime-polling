package routes

import (
	"time"

	"pulsevote-backend/controllers"
	"pulsevote-backend/middleware"
	"pulsevote-backend/services"
	"pulsevote-backend/websocket"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(
	r *gin.Engine,
	authCtrl *controllers.AuthController,
	pollCtrl *controllers.PollController,
	voteCtrl *controllers.VoteController,
	authSvc services.AuthService,
	pollSvc services.PollService,
	wsHub *websocket.Hub,
) {
	api := r.Group("/api")

	// Rate Limiters
	authLimiter := middleware.NewRateLimiter(10, 1*time.Minute)
	voteLimiter := middleware.NewRateLimiter(30, 1*time.Minute)

	// Auth Public Routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", authLimiter.Middleware(), authCtrl.Register)
		auth.POST("/login", authLimiter.Middleware(), authCtrl.Login)
	}

	// Protected Auth Route
	authProtected := api.Group("/auth")
	authProtected.Use(middleware.AuthMiddleware(authSvc))
	{
		authProtected.GET("/me", authCtrl.Me)
	}

	// Public Poll Routes (Participants / Audience)
	pollsPublic := api.Group("/polls")
	{
		pollsPublic.GET("/:id", pollCtrl.GetPoll)
		pollsPublic.GET("/:id/results", pollCtrl.GetPollResults)
		pollsPublic.POST("/:id/vote", voteLimiter.Middleware(), voteCtrl.CastVote)
		pollsPublic.GET("/:id/ws", websocket.ServeWS(wsHub))
	}

	// Protected Poll Routes
	pollsProtected := api.Group("/polls")
	pollsProtected.Use(middleware.AuthMiddleware(authSvc))
	{
		// Any authenticated creator can create polls and query their own dashboard stats
		pollsProtected.POST("", pollCtrl.CreatePoll)
		pollsProtected.GET("/user/all", pollCtrl.GetUserPolls)
		pollsProtected.GET("/dashboard/stats", pollCtrl.GetDashboardStats)

		// Poll Modification Operations Guarded by IAM Ownership Policy (Owner or Admin only)
		pollOwner := pollsProtected.Group("/:id")
		pollOwner.Use(middleware.RequirePollOwnership(pollSvc))
		{
			pollOwner.PUT("", pollCtrl.UpdatePoll)
			pollOwner.POST("/close", pollCtrl.ClosePoll)
			pollOwner.DELETE("", pollCtrl.DeletePoll)
		}
	}
}
