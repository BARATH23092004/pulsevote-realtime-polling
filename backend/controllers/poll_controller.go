package controllers

import (
	"net/http"

	"pulsevote-backend/models"
	"pulsevote-backend/services"

	"github.com/gin-gonic/gin"
)

type PollController struct {
	pollSvc services.PollService
}

func NewPollController(pollSvc services.PollService) *PollController {
	return &PollController{pollSvc: pollSvc}
}

func (c *PollController) CreatePoll(ctx *gin.Context) {
	userID, _ := ctx.Get("userID")

	var req models.CreatePollRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("VALIDATION_ERROR", err.Error()))
		return
	}

	poll, err := c.pollSvc.CreatePoll(ctx.Request.Context(), userID.(string), &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("CREATE_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusCreated, models.SuccessResponse(poll, "Poll created successfully"))
}

func (c *PollController) GetPoll(ctx *gin.Context) {
	pollID := ctx.Param("id")
	poll, err := c.pollSvc.GetPollByID(ctx.Request.Context(), pollID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, models.ErrorResponse("NOT_FOUND", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(poll, "Poll retrieved successfully"))
}

func (c *PollController) GetUserPolls(ctx *gin.Context) {
	userID, _ := ctx.Get("userID")
	polls, err := c.pollSvc.GetUserPolls(ctx.Request.Context(), userID.(string))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse("FETCH_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(polls, "User polls retrieved"))
}

func (c *PollController) UpdatePoll(ctx *gin.Context) {
	userID, _ := ctx.Get("userID")
	pollID := ctx.Param("id")

	var req models.UpdatePollRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("VALIDATION_ERROR", err.Error()))
		return
	}

	poll, err := c.pollSvc.UpdatePoll(ctx.Request.Context(), userID.(string), pollID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("UPDATE_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(poll, "Poll updated successfully"))
}

func (c *PollController) ClosePoll(ctx *gin.Context) {
	userID, _ := ctx.Get("userID")
	pollID := ctx.Param("id")

	poll, err := c.pollSvc.ClosePoll(ctx.Request.Context(), userID.(string), pollID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("CLOSE_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(poll, "Poll closed successfully"))
}

func (c *PollController) DeletePoll(ctx *gin.Context) {
	userID, _ := ctx.Get("userID")
	pollID := ctx.Param("id")

	err := c.pollSvc.DeletePoll(ctx.Request.Context(), userID.(string), pollID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("DELETE_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(nil, "Poll deleted successfully"))
}

func (c *PollController) GetPollResults(ctx *gin.Context) {
	pollID := ctx.Param("id")
	results, err := c.pollSvc.GetPollResults(ctx.Request.Context(), pollID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, models.ErrorResponse("NOT_FOUND", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(results, "Poll results retrieved"))
}

func (c *PollController) GetDashboardStats(ctx *gin.Context) {
	userID, _ := ctx.Get("userID")
	stats, err := c.pollSvc.GetUserDashboardStats(ctx.Request.Context(), userID.(string))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse("FETCH_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(stats, "Dashboard stats fetched"))
}
