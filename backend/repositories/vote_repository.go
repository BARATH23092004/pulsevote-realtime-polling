package repositories

import (
	"context"
	"errors"
	"time"

	"pulsevote-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type VoteRepository interface {
	Create(ctx context.Context, vote *models.Vote) error
	HasVoted(ctx context.Context, pollID primitive.ObjectID, voterIdentifier string) (bool, error)
	GetVoteCountsByPoll(ctx context.Context, pollID primitive.ObjectID) (map[string]int64, int64, error)
	GetTotalVotesCount(ctx context.Context, pollID primitive.ObjectID) (int64, error)
	GetTotalVotesAcrossUserPolls(ctx context.Context, pollIDs []primitive.ObjectID) (int64, error)
	EnsureIndexes(ctx context.Context) error
}

type mongoVoteRepository struct {
	collection *mongo.Collection
}

func NewVoteRepository(db *mongo.Database) VoteRepository {
	repo := &mongoVoteRepository{
		collection: db.Collection("votes"),
	}
	_ = repo.EnsureIndexes(context.Background())
	return repo
}

func (r *mongoVoteRepository) EnsureIndexes(ctx context.Context) error {
	modelsToCreate := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "pollId", Value: 1},
				{Key: "voterIdentifier", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "pollId", Value: 1}},
		},
	}
	_, err := r.collection.Indexes().CreateMany(ctx, modelsToCreate)
	return err
}

func (r *mongoVoteRepository) Create(ctx context.Context, vote *models.Vote) error {
	vote.ID = primitive.NewObjectID()
	vote.CreatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, vote)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return errors.New("you have already voted on this poll")
		}
		return err
	}
	return nil
}

func (r *mongoVoteRepository) HasVoted(ctx context.Context, pollID primitive.ObjectID, voterIdentifier string) (bool, error) {
	if voterIdentifier == "" {
		return false, nil
	}
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"pollId":          pollID,
		"voterIdentifier": voterIdentifier,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *mongoVoteRepository) GetVoteCountsByPoll(ctx context.Context, pollID primitive.ObjectID) (map[string]int64, int64, error) {
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"pollId": pollID}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   "$optionId",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	counts := make(map[string]int64)
	var total int64 = 0

	type groupResult struct {
		ID    string `bson:"_id"`
		Count int64  `bson:"count"`
	}

	for cursor.Next(ctx) {
		var res groupResult
		if err := cursor.Decode(&res); err != nil {
			return nil, 0, err
		}
		counts[res.ID] = res.Count
		total += res.Count
	}

	return counts, total, nil
}

func (r *mongoVoteRepository) GetTotalVotesCount(ctx context.Context, pollID primitive.ObjectID) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{"pollId": pollID})
}

func (r *mongoVoteRepository) GetTotalVotesAcrossUserPolls(ctx context.Context, pollIDs []primitive.ObjectID) (int64, error) {
	if len(pollIDs) == 0 {
		return 0, nil
	}
	return r.collection.CountDocuments(ctx, bson.M{
		"pollId": bson.M{"$in": pollIDs},
	})
}
