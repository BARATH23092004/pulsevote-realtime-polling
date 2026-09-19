package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"pulsevote-backend/models"
	"pulsevote-backend/redis"
	"pulsevote-backend/repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollService interface {
	CreatePoll(ctx context.Context, creatorID string, req *models.CreatePollRequest) (*models.Poll, error)
	GetPollByID(ctx context.Context, pollID string) (*models.Poll, error)
	GetUserPolls(ctx context.Context, userID string) ([]*models.Poll, error)
	UpdatePoll(ctx context.Context, userID string, pollID string, req *models.UpdatePollRequest) (*models.Poll, error)
	ClosePoll(ctx context.Context, userID string, pollID string) (*models.Poll, error)
	DeletePoll(ctx context.Context, userID string, pollID string) error
	GetPollResults(ctx context.Context, pollID string) (*models.PollResultsResponse, error)
	GetUserDashboardStats(ctx context.Context, userID string) (map[string]interface{}, error)
}

type pollService struct {
	pollRepo repositories.PollRepository
	userRepo repositories.UserRepository
	voteRepo repositories.VoteRepository
	redisSvc *redis.RedisService
}

func NewPollService(
	pollRepo repositories.PollRepository,
	userRepo repositories.UserRepository,
	voteRepo repositories.VoteRepository,
	redisSvc *redis.RedisService,
) PollService {
	return &pollService{
		pollRepo: pollRepo,
		userRepo: userRepo,
		voteRepo: voteRepo,
		redisSvc: redisSvc,
	}
}

func (s *pollService) CreatePoll(ctx context.Context, creatorID string, req *models.CreatePollRequest) (*models.Poll, error) {
	creatorObjID, err := primitive.ObjectIDFromHex(creatorID)
	if err != nil {
		return nil, errors.New("invalid creator ID")
	}

	// Validate question
	q := strings.TrimSpace(req.Question)
	if q == "" {
		return nil, errors.New("question is required")
	}
	if len(q) < 5 {
		return nil, errors.New("question must be at least 5 characters long")
	}

	// Validate options
	if len(req.Options) < 2 {
		return nil, errors.New("at least two options are required")
	}
	if len(req.Options) > 10 {
		return nil, errors.New("a maximum of 10 options is allowed")
	}

	optionSet := make(map[string]bool)
	var optionsList []models.PollOption

	for i, optText := range req.Options {
		trimmed := strings.TrimSpace(optText)
		if trimmed == "" {
			return nil, fmt.Errorf("option #%d cannot be empty", i+1)
		}
		if optionSet[strings.ToLower(trimmed)] {
			return nil, fmt.Errorf("duplicate option: '%s'", trimmed)
		}
		optionSet[strings.ToLower(trimmed)] = true

		optID := fmt.Sprintf("opt_%d", i+1)
		optionsList = append(optionsList, models.PollOption{
			ID:   optID,
			Text: trimmed,
		})
	}

	user, _ := s.userRepo.FindByID(ctx, creatorObjID)
	creatorName := "Anonymous User"
	if user != nil {
		creatorName = user.Name
	}

	poll := &models.Poll{
		CreatorID:           creatorObjID,
		CreatorName:         creatorName,
		Question:            q,
		Options:             optionsList,
		Status:              models.PollStatusActive,
		AllowDuplicateVotes: req.AllowDuplicateVotes,
		AnonymousVoting:     req.AnonymousVoting,
		ExpiresAt:           req.ExpiresAt,
	}

	if err := s.pollRepo.Create(ctx, poll); err != nil {
		return nil, err
	}

	// Initialize vote counts in Redis
	initialCounts := make(map[string]int64)
	for _, opt := range optionsList {
		initialCounts[opt.ID] = 0
	}
	_ = s.redisSvc.SetVoteCounts(ctx, poll.ID.Hex(), initialCounts)

	return poll, nil
}

func (s *pollService) GetPollByID(ctx context.Context, pollID string) (*models.Poll, error) {
	objID, err := primitive.ObjectIDFromHex(pollID)
	if err != nil {
		return nil, errors.New("invalid poll ID")
	}
	poll, err := s.pollRepo.FindByID(ctx, objID)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}
	return poll, nil
}

func (s *pollService) GetUserPolls(ctx context.Context, userID string) ([]*models.Poll, error) {
	creatorObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}
	return s.pollRepo.FindByCreatorID(ctx, creatorObjID)
}

func (s *pollService) UpdatePoll(ctx context.Context, userID string, pollID string, req *models.UpdatePollRequest) (*models.Poll, error) {
	poll, err := s.GetPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}

	if poll.CreatorID.Hex() != userID {
		return nil, errors.New("unauthorized: you do not own this poll")
	}

	if req.Question != "" {
		poll.Question = strings.TrimSpace(req.Question)
	}
	if req.Status != "" {
		poll.Status = req.Status
	}
	poll.AllowDuplicateVotes = req.AllowDuplicateVotes
	if req.ExpiresAt != nil {
		poll.ExpiresAt = req.ExpiresAt
	}

	if err := s.pollRepo.Update(ctx, poll); err != nil {
		return nil, err
	}
	return poll, nil
}

func (s *pollService) ClosePoll(ctx context.Context, userID string, pollID string) (*models.Poll, error) {
	poll, err := s.GetPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}

	if poll.CreatorID.Hex() != userID {
		return nil, errors.New("unauthorized: you do not own this poll")
	}

	poll.Status = models.PollStatusClosed
	if err := s.pollRepo.Update(ctx, poll); err != nil {
		return nil, err
	}
	return poll, nil
}

func (s *pollService) DeletePoll(ctx context.Context, userID string, pollID string) error {
	poll, err := s.GetPollByID(ctx, pollID)
	if err != nil {
		return err
	}

	if poll.CreatorID.Hex() != userID {
		return errors.New("unauthorized: you do not own this poll")
	}

	return s.pollRepo.Delete(ctx, poll.ID)
}

func (s *pollService) GetPollResults(ctx context.Context, pollID string) (*models.PollResultsResponse, error) {
	poll, err := s.GetPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}

	// Try fetching live vote counts from Redis
	voteCounts, err := s.redisSvc.GetVoteCounts(ctx, pollID)
	var totalVotes int64 = 0

	// Fallback to MongoDB if Redis counts not available
	if err != nil || voteCounts == nil {
		countsFromDB, totalFromDB, errDB := s.voteRepo.GetVoteCountsByPoll(ctx, poll.ID)
		if errDB == nil {
			voteCounts = countsFromDB
			totalVotes = totalFromDB
			// Re-populate Redis cache
			_ = s.redisSvc.SetVoteCounts(ctx, pollID, voteCounts)
		} else {
			voteCounts = make(map[string]int64)
		}
	} else {
		for _, cnt := range voteCounts {
			totalVotes += cnt
		}
	}

	isExpired := false
	if poll.ExpiresAt != nil && time.Now().After(*poll.ExpiresAt) {
		isExpired = true
	}

	var optionsResults []models.PollOptionResult
	for _, opt := range poll.Options {
		cnt := voteCounts[opt.ID]
		var pct float64 = 0
		if totalVotes > 0 {
			pct = (float64(cnt) / float64(totalVotes)) * 100.0
		}

		optionsResults = append(optionsResults, models.PollOptionResult{
			ID:         opt.ID,
			Text:       opt.Text,
			Count:      cnt,
			Percentage: pct,
		})
	}

	return &models.PollResultsResponse{
		PollID:     poll.ID.Hex(),
		Question:   poll.Question,
		TotalVotes: totalVotes,
		Status:     poll.Status,
		IsExpired:  isExpired,
		ExpiresAt:  poll.ExpiresAt,
		Options:    optionsResults,
	}, nil
}

func (s *pollService) GetUserDashboardStats(ctx context.Context, userID string) (map[string]interface{}, error) {
	polls, err := s.GetUserPolls(ctx, userID)
	if err != nil {
		return nil, err
	}

	var pollIDs []primitive.ObjectID
	activeCount := 0
	for _, p := range polls {
		pollIDs = append(pollIDs, p.ID)
		if p.Status == models.PollStatusActive {
			if p.ExpiresAt == nil || time.Now().Before(*p.ExpiresAt) {
				activeCount++
			}
		}
	}

	totalVotes, _ := s.voteRepo.GetTotalVotesAcrossUserPolls(ctx, pollIDs)

	return map[string]interface{}{
		"totalPolls":  len(polls),
		"activePolls": activeCount,
		"totalVotes":  totalVotes,
		"recentPolls": polls,
	}, nil
}
