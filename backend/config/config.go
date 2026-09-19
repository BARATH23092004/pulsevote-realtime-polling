package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	Env         string
	MongoURI    string
	MongoDBName string
	RedisURL    string
	JWTSecret   string
	FrontendURL string
}

func LoadConfig() *Config {
	// Try loading .env from current dir or parent dir
	if err := godotenv.Load(); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("No .env file found, using system environment variables")
		}
	}

	return &Config{
		Port:        getEnv("PORT", "8081"),
		Env:         getEnv("ENV", "development"),
		MongoURI:    getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDBName: getEnv("MONGO_DB_NAME", "pulsevote"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:   getEnv("JWT_SECRET", "pulsevote_super_secret_jwt_key_2026_default"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return fallback
}
