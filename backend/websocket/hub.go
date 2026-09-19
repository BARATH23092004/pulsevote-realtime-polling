package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"pulsevote-backend/redis"

	"github.com/gorilla/websocket"
)

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	PollID string
}

type Hub struct {
	// Rooms maps pollID -> map[*Client]bool
	rooms      map[string]map[*Client]bool
	pubSubSubs map[string]context.CancelFunc
	register   chan *Client
	unregister chan *Client
	broadcast  chan BroadcastMessage
	redisSvc   *redis.RedisService
	mu         sync.RWMutex
}

type BroadcastMessage struct {
	PollID  string
	Message []byte
}

func NewHub(redisSvc *redis.RedisService) *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		pubSubSubs: make(map[string]context.CancelFunc),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan BroadcastMessage),
		redisSvc:   redisSvc,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.PollID] == nil {
				h.rooms[client.PollID] = make(map[*Client]bool)
				// Start listening to Redis channel for this poll
				h.startRedisSubscription(client.PollID)
			}
			h.rooms[client.PollID][client] = true
			h.mu.Unlock()
			log.Printf("[WebSocket] Client connected to poll %s (Room count: %d)", client.PollID, len(h.rooms[client.PollID]))

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[client.PollID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.Send)
					log.Printf("[WebSocket] Client disconnected from poll %s (Remaining: %d)", client.PollID, len(clients))
					if len(clients) == 0 {
						delete(h.rooms, client.PollID)
						h.stopRedisSubscription(client.PollID)
					}
				}
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.mu.RLock()
			clients := h.rooms[msg.PollID]
			for client := range clients {
				select {
				case client.Send <- msg.Message:
				default:
					close(client.Send)
					delete(clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) startRedisSubscription(pollID string) {
	if h.redisSvc == nil || !h.redisSvc.IsAvailable(context.Background()) {
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	h.pubSubSubs[pollID] = cancel

	pubsub := h.redisSvc.SubscribePollEvents(ctx, pollID)

	go func() {
		defer pubsub.Close()
		ch := pubsub.Channel()
		log.Printf("[Redis PubSub] Subscribed to poll channel: poll:%s:events", pollID)

		for {
			select {
			case <-ctx.Done():
				log.Printf("[Redis PubSub] Unsubscribed from poll channel: poll:%s:events", pollID)
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				h.broadcast <- BroadcastMessage{
					PollID:  pollID,
					Message: []byte(msg.Payload),
				}
			}
		}
	}()
}

func (h *Hub) stopRedisSubscription(pollID string) {
	if cancel, exists := h.pubSubSubs[pollID]; exists {
		cancel()
		delete(h.pubSubSubs, pollID)
	}
}

// BroadcastLocalFallback can be called directly if Redis is down
func (h *Hub) BroadcastDirect(pollID string, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	h.broadcast <- BroadcastMessage{
		PollID:  pollID,
		Message: data,
	}
}
