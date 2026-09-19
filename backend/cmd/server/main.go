package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"pulsevote-backend/config"
	"pulsevote-backend/controllers"
	"pulsevote-backend/middleware"
	"pulsevote-backend/redis"
	"pulsevote-backend/repositories"
	"pulsevote-backend/routes"
	"pulsevote-backend/services"
	"pulsevote-backend/websocket"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	cfg := config.LoadConfig()

	log.Printf("Starting PulseVote Backend Server on port %s (Env: %s)", cfg.Port, cfg.Env)

	// Set Gin mode
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 1. Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.MongoURI)
	mongoClient, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Printf("[MongoDB Warning] MongoDB Ping failed: %v. Check if MongoDB server is running.", err)
	} else {
		log.Println("[MongoDB] Successfully connected to MongoDB database.")
	}

	db := mongoClient.Database(cfg.MongoDBName)

	// 2. Connect to Redis
	redisSvc := redis.NewRedisService(cfg.RedisURL)

	// 3. Initialize Repositories
	userRepo := repositories.NewUserRepository(db)
	pollRepo := repositories.NewPollRepository(db)
	voteRepo := repositories.NewVoteRepository(db)

	// 4. Initialize WebSocket Hub
	wsHub := websocket.NewHub(redisSvc)
	go wsHub.Run()

	// 5. Initialize Services
	authSvc := services.NewAuthService(userRepo, cfg.JWTSecret)
	pollSvc := services.NewPollService(pollRepo, userRepo, voteRepo, redisSvc)
	voteSvc := services.NewVoteService(pollRepo, voteRepo, redisSvc, wsHub, pollSvc)

	// 6. Initialize Controllers
	authCtrl := controllers.NewAuthController(authSvc, userRepo)
	pollCtrl := controllers.NewPollController(pollSvc)
	voteCtrl := controllers.NewVoteController(voteSvc)

	// 7. Setup Router
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.SecurityHeadersMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.FrontendURL))

	// Healthcheck
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now(),
			"services": gin.H{
				"mongodb": mongoClient.Ping(context.Background(), nil) == nil,
				"redis":   redisSvc.IsAvailable(context.Background()),
			},
		})
	})

	// Setup API routes
	routes.SetupRoutes(r, authCtrl, pollCtrl, voteCtrl, authSvc, pollSvc, wsHub)

	// 8. Start Server
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("PulseVote Server listening at http://localhost:%s", cfg.Port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed to start: %v", err)
	}
}
