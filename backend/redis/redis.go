package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisService struct {
	Client *redis.Client
}

func NewRedisService(redisURL string) *RedisService {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("[Redis Warning] Invalid Redis URL %s, defaulting to localhost:6379: %v", redisURL, err)
		opt = &redis.Options{
			Addr: "localhost:6379",
		}
	}

	// Shorter timeout to fail fast if Redis is unavailable
	opt.DialTimeout = 2 * time.Second
	opt.ReadTimeout = 2 * time.Second
	opt.WriteTimeout = 2 * time.Second

	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("[Redis Warning] Could not connect to Redis (%v). Realtime updates will fallback to DB mode.", err)
	} else {
		log.Println("[Redis] Successfully connected to Redis server.")
	}

	return &RedisService{Client: client}
}

func (r *RedisService) IsAvailable(ctx context.Context) bool {
	if r == nil || r.Client == nil {
		return false
	}
	err := r.Client.Ping(ctx).Err()
	return err == nil
}

func (r *RedisService) IncrementVoteCount(ctx context.Context, pollID string, optionID string) (int64, error) {
	if !r.IsAvailable(ctx) {
		return 0, fmt.Errorf("redis unavailable")
	}
	key := fmt.Sprintf("poll:%s:results", pollID)
	return r.Client.HIncrBy(ctx, key, optionID, 1).Result()
}

func (r *RedisService) SetVoteCounts(ctx context.Context, pollID string, counts map[string]int64) error {
	if !r.IsAvailable(ctx) || len(counts) == 0 {
		return nil
	}
	key := fmt.Sprintf("poll:%s:results", pollID)
	fields := make(map[string]interface{})
	for k, v := range counts {
		fields[k] = v
	}
	return r.Client.HSet(ctx, key, fields).Err()
}

func (r *RedisService) GetVoteCounts(ctx context.Context, pollID string) (map[string]int64, error) {
	if !r.IsAvailable(ctx) {
		return nil, fmt.Errorf("redis unavailable")
	}
	key := fmt.Sprintf("poll:%s:results", pollID)
	val, err := r.Client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	if len(val) == 0 {
		return nil, nil
	}

	counts := make(map[string]int64)
	for k, v := range val {
		var count int64
		fmt.Sscanf(v, "%d", &count)
		counts[k] = count
	}
	return counts, nil
}

func (r *RedisService) PublishVoteEvent(ctx context.Context, pollID string, payload interface{}) error {
	if !r.IsAvailable(ctx) {
		return fmt.Errorf("redis unavailable")
	}
	channel := fmt.Sprintf("poll:%s:events", pollID)
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return r.Client.Publish(ctx, channel, data).Err()
}

func (r *RedisService) SubscribePollEvents(ctx context.Context, pollID string) *redis.PubSub {
	channel := fmt.Sprintf("poll:%s:events", pollID)
	return r.Client.Subscribe(ctx, channel)
}
