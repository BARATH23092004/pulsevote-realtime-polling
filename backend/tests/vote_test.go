package tests

import (
	"context"
	"testing"
	"time"

	"pulsevote-backend/models"
	"pulsevote-backend/services"
	"pulsevote-backend/websocket"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func setupTestServices() (services.PollService, services.VoteService) {
	pollRepo := newMockPollRepo()
	userRepo := newMockUserRepo()
	voteRepo := newMockVoteRepo()
	wsHub := websocket.NewHub(nil)
	go wsHub.Run()

	pollSvc := services.NewPollService(pollRepo, userRepo, voteRepo, nil)
	voteSvc := services.NewVoteService(pollRepo, voteRepo, nil, wsHub, pollSvc)

	return pollSvc, voteSvc
}

func TestVotingAndDuplicateProtection(t *testing.T) {
	pollSvc, voteSvc := setupTestServices()

	creatorID := primitive.NewObjectID().Hex()
	poll, _ := pollSvc.CreatePoll(context.Background(), creatorID, &models.CreatePollRequest{
		Question:            "Is real-time updates enabled?",
		Options:             []string{"Option Alpha", "Option Beta"},
		AllowDuplicateVotes: false,
	})

	pollID := poll.ID.Hex()
	optID := poll.Options[0].ID

	// 1. First vote (Valid)
	voteReq1 := &models.VoteRequest{
		OptionID:        optID,
		VoterIdentifier: "device_user_1",
	}
	res1, err1 := voteSvc.CastVote(context.Background(), pollID, voteReq1)
	if err1 != nil {
		t.Fatalf("Expected vote success, got err: %v", err1)
	}
	if res1.TotalVotes != 1 {
		t.Errorf("Expected total votes 1, got %d", res1.TotalVotes)
	}

	// 2. Duplicate vote attempt from same voter
	_, errDup := voteSvc.CastVote(context.Background(), pollID, voteReq1)
	if errDup == nil {
		t.Error("Expected duplicate vote rejection, got nil")
	}

	// 3. Vote from second user (Valid)
	voteReq2 := &models.VoteRequest{
		OptionID:        optID,
		VoterIdentifier: "device_user_2",
	}
	res2, err2 := voteSvc.CastVote(context.Background(), pollID, voteReq2)
	if err2 != nil || res2.TotalVotes != 2 {
		t.Errorf("Expected total votes 2 after second voter, got %d", res2.TotalVotes)
	}
}

func TestVoteOnClosedOrExpiredPoll(t *testing.T) {
	pollSvc, voteSvc := setupTestServices()

	creatorID := primitive.NewObjectID().Hex()
	poll, _ := pollSvc.CreatePoll(context.Background(), creatorID, &models.CreatePollRequest{
		Question: "Expired test poll",
		Options:  []string{"A", "B"},
	})

	pollID := poll.ID.Hex()

	// Close poll
	_, _ = pollSvc.ClosePoll(context.Background(), creatorID, pollID)

	// Attempt to vote on closed poll
	_, errClosed := voteSvc.CastVote(context.Background(), pollID, &models.VoteRequest{
		OptionID:        poll.Options[0].ID,
		VoterIdentifier: "voter_3",
	})
	if errClosed == nil {
		t.Error("Expected error when voting on closed poll, got nil")
	}

	// Expired poll test
	pastTime := time.Now().Add(-1 * time.Hour)
	expiredPoll, _ := pollSvc.CreatePoll(context.Background(), creatorID, &models.CreatePollRequest{
		Question:  "Past expiration poll",
		Options:   []string{"A", "B"},
		ExpiresAt: &pastTime,
	})

	_, errExpired := voteSvc.CastVote(context.Background(), expiredPoll.ID.Hex(), &models.VoteRequest{
		OptionID:        expiredPoll.Options[0].ID,
		VoterIdentifier: "voter_4",
	})
	if errExpired == nil {
		t.Error("Expected error when voting on expired poll, got nil")
	}
}
