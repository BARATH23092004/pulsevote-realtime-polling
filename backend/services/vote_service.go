package services

import (
	"context"
	"errors"
	"log"
	"time"

	"pulsevote-backend/models"
	"pulsevote-backend/redis"
	"pulsevote-backend/repositories"
	"pulsevote-backend/websocket"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VoteService interface {
	CastVote(ctx context.Context, pollID string, req *models.VoteRequest) (*models.PollResultsResponse, error)
}

type voteService struct {
	pollRepo repositories.PollRepository
	voteRepo repositories.VoteRepository
	redisSvc *redis.RedisService
	wsHub    *websocket.Hub
	pollSvc  PollService
}

func NewVoteService(
	pollRepo repositories.PollRepository,
	voteRepo repositories.VoteRepository,
	redisSvc *redis.RedisService,
	wsHub *websocket.Hub,
	pollSvc PollService,
) VoteService {
	return &voteService{
		pollRepo: pollRepo,
		voteRepo: voteRepo,
		redisSvc: redisSvc,
		wsHub:    wsHub,
		pollSvc:  pollSvc,
	}
}

func (s *voteService) CastVote(ctx context.Context, pollID string, req *models.VoteRequest) (*models.PollResultsResponse, error) {
	pollObjID, err := primitive.ObjectIDFromHex(pollID)
	if err != nil {
		return nil, errors.New("invalid poll ID")
	}

	poll, err := s.pollRepo.FindByID(ctx, pollObjID)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}

	// 1. Validate status & expiration
	if poll.Status != models.PollStatusActive {
		return nil, errors.New("this poll is closed and no longer accepting votes")
	}

	if poll.ExpiresAt != nil && time.Now().After(*poll.ExpiresAt) {
		return nil, errors.New("this poll has expired")
	}

	// 2. Validate selected option
	optionExists := false
	for _, opt := range poll.Options {
		if opt.ID == req.OptionID {
			optionExists = true
			break
		}
	}
	if !optionExists {
		return nil, errors.New("invalid option selected")
	}

	// 3. Duplicate voting protection check
	if !poll.AllowDuplicateVotes {
		if req.VoterIdentifier == "" {
			return nil, errors.New("voter identification is required for this poll")
		}

		hasVoted, err := s.voteRepo.HasVoted(ctx, poll.ID, req.VoterIdentifier)
		if err != nil {
			return nil, err
		}
		if hasVoted {
			return nil, errors.New("you have already voted on this poll")
		}
	}

	// 4. Persist vote in MongoDB (MongoDB unique compound index acts as primary source of truth guard)
	vote := &models.Vote{
		PollID:          poll.ID,
		OptionID:        req.OptionID,
		VoterIdentifier: req.VoterIdentifier,
	}

	if err := s.voteRepo.Create(ctx, vote); err != nil {
		return nil, err
	}

	// 5. Update Redis vote count cache (non-critical acceleration layer)
	if _, errRedis := s.redisSvc.IncrementVoteCount(ctx, pollID, req.OptionID); errRedis != nil {
		log.Printf("[Redis Cache Warning] Failed to increment vote count in Redis for poll %s: %v", pollID, errRedis)
	}

	// 6. Calculate updated poll results from authoritative state
	updatedResults, err := s.pollSvc.GetPollResults(ctx, pollID)
	if err != nil {
		return nil, err
	}

	// 7. Standardized Realtime Broadcast Event Contract
	event := models.VoteBroadcastEvent{
		Type:       "VOTE_UPDATED",
		PollID:     pollID,
		TotalVotes: updatedResults.TotalVotes,
		Results:    updatedResults.Options,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
	}

	// 8. Publish event via Redis Pub/Sub; fallback to direct WebSocket Hub broadcast if Redis fails
	errPub := s.redisSvc.PublishVoteEvent(ctx, pollID, event)
	if errPub != nil {
		log.Printf("[Redis PubSub Warning] Could not publish event to Redis channel poll:%s:events: %v. Falling back to direct WS broadcast.", pollID, errPub)
		s.wsHub.BroadcastDirect(pollID, event)
	}

	return updatedResults, nil
}
