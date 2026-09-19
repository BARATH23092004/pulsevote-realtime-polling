package websocket

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow origins for WebSocket connection
		return true
	},
}

func ServeWS(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		pollID := c.Param("id")
		if pollID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Poll ID required"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		client := &Client{
			Hub:    hub,
			Conn:   conn,
			Send:   make(chan []byte, 256),
			PollID: pollID,
		}

		client.Hub.register <- client

		go client.WritePump()
		go client.ReadPump()
	}
}
