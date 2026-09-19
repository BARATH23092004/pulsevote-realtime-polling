package controllers

import (
	"net/http"

	"pulsevote-backend/models"
	"pulsevote-backend/repositories"
	"pulsevote-backend/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthController struct {
	authSvc  services.AuthService
	userRepo repositories.UserRepository
}

func NewAuthController(authSvc services.AuthService, userRepo repositories.UserRepository) *AuthController {
	return &AuthController{
		authSvc:  authSvc,
		userRepo: userRepo,
	}
}

func (c *AuthController) Register(ctx *gin.Context) {
	var req models.RegisterRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("VALIDATION_ERROR", err.Error()))
		return
	}

	res, err := c.authSvc.Register(ctx.Request.Context(), &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("REGISTER_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusCreated, models.SuccessResponse(res, "Account registered successfully"))
}

func (c *AuthController) Login(ctx *gin.Context) {
	var req models.LoginRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("VALIDATION_ERROR", err.Error()))
		return
	}

	res, err := c.authSvc.Login(ctx.Request.Context(), &req)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, models.ErrorResponse("LOGIN_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(res, "Logged in successfully"))
}

func (c *AuthController) Me(ctx *gin.Context) {
	userIDVal, exists := ctx.Get("userID")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, models.ErrorResponse("UNAUTHORIZED", "User context not found"))
		return
	}

	userIDStr := userIDVal.(string)
	objID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("INVALID_ID", "Invalid user ID format"))
		return
	}

	user, err := c.userRepo.FindByID(ctx.Request.Context(), objID)
	if err != nil || user == nil {
		ctx.JSON(http.StatusNotFound, models.ErrorResponse("USER_NOT_FOUND", "User not found"))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(user.ToDTO(), "User details fetched successfully"))
}
