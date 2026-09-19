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

type PollRepository interface {
	Create(ctx context.Context, poll *models.Poll) error
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error)
	FindByCreatorID(ctx context.Context, creatorID primitive.ObjectID) ([]*models.Poll, error)
	Update(ctx context.Context, poll *models.Poll) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	EnsureIndexes(ctx context.Context) error
}

type mongoPollRepository struct {
	collection *mongo.Collection
}

func NewPollRepository(db *mongo.Database) PollRepository {
	repo := &mongoPollRepository{
		collection: db.Collection("polls"),
	}
	_ = repo.EnsureIndexes(context.Background())
	return repo
}

func (r *mongoPollRepository) EnsureIndexes(ctx context.Context) error {
	modelsToCreate := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "creatorId", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
	}
	_, err := r.collection.Indexes().CreateMany(ctx, modelsToCreate)
	return err
}

func (r *mongoPollRepository) Create(ctx context.Context, poll *models.Poll) error {
	poll.ID = primitive.NewObjectID()
	now := time.Now()
	poll.CreatedAt = now
	poll.UpdatedAt = now
	if poll.Status == "" {
		poll.Status = models.PollStatusActive
	}

	_, err := r.collection.InsertOne(ctx, poll)
	return err
}

func (r *mongoPollRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error) {
	var poll models.Poll
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&poll)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &poll, nil
}

func (r *mongoPollRepository) FindByCreatorID(ctx context.Context, creatorID primitive.ObjectID) ([]*models.Poll, error) {
	findOptions := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.collection.Find(ctx, bson.M{"creatorId": creatorID}, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []*models.Poll
	if err := cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	return polls, nil
}

func (r *mongoPollRepository) Update(ctx context.Context, poll *models.Poll) error {
	poll.UpdatedAt = time.Now()
	filter := bson.M{"_id": poll.ID}
	update := bson.M{
		"$set": bson.M{
			"question":            poll.Question,
			"status":              poll.Status,
			"allowDuplicateVotes": poll.AllowDuplicateVotes,
			"anonymousVoting":     poll.AnonymousVoting,
			"expiresAt":           poll.ExpiresAt,
			"updatedAt":           poll.UpdatedAt,
		},
	}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *mongoPollRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
