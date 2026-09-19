package tests

import (
	"context"
	"testing"

	"pulsevote-backend/models"
	"pulsevote-backend/repositories"
	"pulsevote-backend/services"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type mockUserRepo struct {
	users map[string]*models.User
}

func newMockUserRepo() repositories.UserRepository {
	return &mockUserRepo{
		users: make(map[string]*models.User),
	}
}

func (m *mockUserRepo) Create(ctx context.Context, user *models.User) error {
	user.ID = primitive.NewObjectID()
	m.users[user.Email] = user
	return nil
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *mockUserRepo) FindByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}

func (m *mockUserRepo) EnsureIndexes(ctx context.Context) error {
	return nil
}

func TestRegisterSuccessAndDuplicatePrevention(t *testing.T) {
	repo := newMockUserRepo()
	authSvc := services.NewAuthService(repo, "secret")

	// 1. Register user
	req := &models.RegisterRequest{
		Name:            "Alice Test",
		Email:           "alice@example.com",
		Password:        "password123",
		ConfirmPassword: "password123",
	}

	res, err := authSvc.Register(context.Background(), req)
	if err != nil {
		t.Fatalf("Expected registration success, got: %v", err)
	}
	if res.User.Email != "alice@example.com" {
		t.Errorf("Expected email alice@example.com, got %s", res.User.Email)
	}
	if res.Token == "" {
		t.Error("Expected valid JWT token, got empty string")
	}

	// 2. Attempt duplicate registration
	_, errDup := authSvc.Register(context.Background(), req)
	if errDup == nil {
		t.Error("Expected error on duplicate email registration, got nil")
	}
}

func TestLoginInvalidCredentials(t *testing.T) {
	repo := newMockUserRepo()
	authSvc := services.NewAuthService(repo, "secret")

	reqReg := &models.RegisterRequest{
		Name:            "Bob Test",
		Email:           "bob@example.com",
		Password:        "correctpassword",
		ConfirmPassword: "correctpassword",
	}
	_, _ = authSvc.Register(context.Background(), reqReg)

	// Valid login
	loginRes, err := authSvc.Login(context.Background(), &models.LoginRequest{
		Email:    "bob@example.com",
		Password: "correctpassword",
	})
	if err != nil || loginRes == nil {
		t.Fatalf("Expected login success, got err: %v", err)
	}

	// Invalid password
	_, errBadPass := authSvc.Login(context.Background(), &models.LoginRequest{
		Email:    "bob@example.com",
		Password: "wrongpassword",
	})
	if errBadPass == nil {
		t.Error("Expected login error for wrong password, got nil")
	}
}
