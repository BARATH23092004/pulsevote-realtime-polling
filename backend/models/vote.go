package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Vote struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID          primitive.ObjectID `bson:"pollId" json:"pollId"`
	OptionID        string             `bson:"optionId" json:"optionId"`
	VoterIdentifier string             `bson:"voterIdentifier" json:"voterIdentifier"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
}

type VoteRequest struct {
	OptionID        string `json:"optionId" binding:"required"`
	VoterIdentifier string `json:"voterIdentifier"`
}

type VoteBroadcastEvent struct {
	Type       string             `json:"type"` // "VOTE_UPDATED"
	PollID     string             `json:"pollId"`
	TotalVotes int64              `json:"totalVotes"`
	Results    []PollOptionResult `json:"results"`
	Timestamp  string             `json:"timestamp"`
}
