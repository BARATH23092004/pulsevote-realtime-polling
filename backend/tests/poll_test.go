package tests

import (
	"context"
	"testing"

	"pulsevote-backend/models"
	"pulsevote-backend/repositories"
	"pulsevote-backend/services"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type mockPollRepo struct {
	polls map[string]*models.Poll
}

func newMockPollRepo() repositories.PollRepository {
	return &mockPollRepo{polls: make(map[string]*models.Poll)}
}

func (m *mockPollRepo) Create(ctx context.Context, poll *models.Poll) error {
	poll.ID = primitive.NewObjectID()
	m.polls[poll.ID.Hex()] = poll
	return nil
}

func (m *mockPollRepo) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error) {
	if p, ok := m.polls[id.Hex()]; ok {
		return p, nil
	}
	return nil, nil
}

func (m *mockPollRepo) FindByCreatorID(ctx context.Context, creatorID primitive.ObjectID) ([]*models.Poll, error) {
	var list []*models.Poll
	for _, p := range m.polls {
		if p.CreatorID == creatorID {
			list = append(list, p)
		}
	}
	return list, nil
}

func (m *mockPollRepo) Update(ctx context.Context, poll *models.Poll) error {
	m.polls[poll.ID.Hex()] = poll
	return nil
}

func (m *mockPollRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	delete(m.polls, id.Hex())
	return nil
}

func (m *mockPollRepo) EnsureIndexes(ctx context.Context) error {
	return nil
}

type mockVoteRepo struct {
	votes map[string][]*models.Vote
}

func newMockVoteRepo() repositories.VoteRepository {
	return &mockVoteRepo{votes: make(map[string][]*models.Vote)}
}

func (m *mockVoteRepo) Create(ctx context.Context, vote *models.Vote) error {
	pollKey := vote.PollID.Hex()
	m.votes[pollKey] = append(m.votes[pollKey], vote)
	return nil
}

func (m *mockVoteRepo) HasVoted(ctx context.Context, pollID primitive.ObjectID, voterIdentifier string) (bool, error) {
	pollKey := pollID.Hex()
	for _, v := range m.votes[pollKey] {
		if v.VoterIdentifier == voterIdentifier {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockVoteRepo) GetVoteCountsByPoll(ctx context.Context, pollID primitive.ObjectID) (map[string]int64, int64, error) {
	pollKey := pollID.Hex()
	counts := make(map[string]int64)
	var total int64 = 0
	for _, v := range m.votes[pollKey] {
		counts[v.OptionID]++
		total++
	}
	return counts, total, nil
}

func (m *mockVoteRepo) GetTotalVotesCount(ctx context.Context, pollID primitive.ObjectID) (int64, error) {
	return int64(len(m.votes[pollID.Hex()])), nil
}

func (m *mockVoteRepo) GetTotalVotesAcrossUserPolls(ctx context.Context, pollIDs []primitive.ObjectID) (int64, error) {
	var total int64 = 0
	for _, pid := range pollIDs {
		total += int64(len(m.votes[pid.Hex()]))
	}
	return total, nil
}

func (m *mockVoteRepo) EnsureIndexes(ctx context.Context) error {
	return nil
}

func TestPollCreationAndValidation(t *testing.T) {
	pollRepo := newMockPollRepo()
	userRepo := newMockUserRepo()
	voteRepo := newMockVoteRepo()

	pollSvc := services.NewPollService(pollRepo, userRepo, voteRepo, nil)
	creatorID := primitive.NewObjectID().Hex()

	// 1. Invalid options count (< 2)
	reqInvalid := &models.CreatePollRequest{
		Question: "Single option poll?",
		Options:  []string{"Option 1"},
	}
	_, errSingle := pollSvc.CreatePoll(context.Background(), creatorID, reqInvalid)
	if errSingle == nil {
		t.Error("Expected error for poll with less than 2 options")
	}

	// 2. Valid poll creation
	reqValid := &models.CreatePollRequest{
		Question:            "Which database engine do you use?",
		Options:             []string{"MongoDB", "PostgreSQL", "Redis"},
		AllowDuplicateVotes: false,
	}

	poll, err := pollSvc.CreatePoll(context.Background(), creatorID, reqValid)
	if err != nil {
		t.Fatalf("Expected successful poll creation, got: %v", err)
	}

	if len(poll.Options) != 3 {
		t.Errorf("Expected 3 options, got %d", len(poll.Options))
	}
	if poll.Question != "Which database engine do you use?" {
		t.Errorf("Unexpected question: %s", poll.Question)
	}
}

func TestUnauthorizedPollModification(t *testing.T) {
	pollRepo := newMockPollRepo()
	userRepo := newMockUserRepo()
	voteRepo := newMockVoteRepo()

	pollSvc := services.NewPollService(pollRepo, userRepo, voteRepo, nil)
	userA := primitive.NewObjectID().Hex()
	userB := primitive.NewObjectID().Hex()

	req := &models.CreatePollRequest{
		Question: "User A Poll Question",
		Options:  []string{"Yes", "No"},
	}
	poll, _ := pollSvc.CreatePoll(context.Background(), userA, req)

	// User B attempts to close User A's poll
	_, errUnauthorized := pollSvc.ClosePoll(context.Background(), userB, poll.ID.Hex())
	if errUnauthorized == nil {
		t.Error("Expected authorization failure when User B tries to close User A's poll")
	}

	// User B attempts to delete User A's poll
	errDelete := pollSvc.DeletePoll(context.Background(), userB, poll.ID.Hex())
	if errDelete == nil {
		t.Error("Expected authorization failure when User B tries to delete User A's poll")
	}
}
