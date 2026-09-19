package controllers

import (
	"net/http"

	"pulsevote-backend/models"
	"pulsevote-backend/services"

	"github.com/gin-gonic/gin"
)

type VoteController struct {
	voteSvc services.VoteService
}

func NewVoteController(voteSvc services.VoteService) *VoteController {
	return &VoteController{voteSvc: voteSvc}
}

func (c *VoteController) CastVote(ctx *gin.Context) {
	pollID := ctx.Param("id")

	var req models.VoteRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("VALIDATION_ERROR", err.Error()))
		return
	}

	// Extract voter identifier from body, cookie, or IP fallback
	if req.VoterIdentifier == "" {
		ip := ctx.ClientIP()
		req.VoterIdentifier = "ip_" + ip
	}

	results, err := c.voteSvc.CastVote(ctx.Request.Context(), pollID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse("VOTE_FAILED", err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, models.SuccessResponse(results, "Vote recorded successfully"))
}
