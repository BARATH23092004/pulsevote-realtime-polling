package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollStatus string

const (
	PollStatusActive PollStatus = "active"
	PollStatusClosed PollStatus = "closed"
)

type PollOption struct {
	ID   string `bson:"id" json:"id"`
	Text string `bson:"text" json:"text"`
}

type Poll struct {
	ID                  primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CreatorID           primitive.ObjectID `bson:"creatorId" json:"creatorId"`
	CreatorName         string             `bson:"creatorName,omitempty" json:"creatorName,omitempty"`
	Question            string             `bson:"question" json:"question"`
	Options             []PollOption       `bson:"options" json:"options"`
	Status              PollStatus         `bson:"status" json:"status"`
	AllowDuplicateVotes bool               `bson:"allowDuplicateVotes" json:"allowDuplicateVotes"`
	AnonymousVoting     bool               `bson:"anonymousVoting" json:"anonymousVoting"`
	ExpiresAt           *time.Time         `bson:"expiresAt,omitempty" json:"expiresAt,omitempty"`
	CreatedAt           time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt           time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type CreatePollRequest struct {
	Question            string     `json:"question" binding:"required"`
	Options             []string   `json:"options" binding:"required,min=2"`
	AllowDuplicateVotes bool       `json:"allowDuplicateVotes"`
	AnonymousVoting     bool       `json:"anonymousVoting"`
	ExpiresAt           *time.Time `json:"expiresAt,omitempty"`
}

type UpdatePollRequest struct {
	Question            string     `json:"question"`
	Status              PollStatus `json:"status"`
	AllowDuplicateVotes bool       `json:"allowDuplicateVotes"`
	ExpiresAt           *time.Time `json:"expiresAt,omitempty"`
}

type PollOptionResult struct {
	ID         string  `json:"id"`
	Text       string  `json:"text"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

type PollResultsResponse struct {
	PollID     string             `json:"pollId"`
	Question   string             `json:"question"`
	TotalVotes int64              `json:"totalVotes"`
	Status     PollStatus         `json:"status"`
	IsExpired  bool               `json:"isExpired"`
	ExpiresAt  *time.Time         `json:"expiresAt,omitempty"`
	Options    []PollOptionResult `json:"options"`
}
