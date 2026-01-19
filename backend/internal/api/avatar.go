package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
)

type avatarCache struct {
	url       string
	fetchedAt time.Time
}

var (
	avatarCacheMu  sync.RWMutex
	avatarCacheMap = make(map[string]avatarCache)
	avatarCacheTTL = 5 * time.Minute
)

func (h *Handler) HandleAvatarProxy(w http.ResponseWriter, r *http.Request) {
	did := chi.URLParam(r, "did")
	if did == "" {
		http.Error(w, "DID required", http.StatusBadRequest)
		return
	}

	if decoded, err := url.QueryUnescape(did); err == nil {
		did = decoded
	}

	avatarURL := getAvatarURL(did)
	if avatarURL == "" {
		http.Error(w, "Avatar not found", http.StatusNotFound)
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(avatarURL)
	if err != nil {
		http.Error(w, "Failed to fetch avatar", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "Avatar not available", http.StatusNotFound)
		return
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	io.Copy(w, resp.Body)
}

func getAvatarURL(did string) string {
	avatarCacheMu.RLock()
	if cached, ok := avatarCacheMap[did]; ok && time.Since(cached.fetchedAt) < avatarCacheTTL {
		avatarCacheMu.RUnlock()
		return cached.url
	}
	avatarCacheMu.RUnlock()

	q := url.Values{}
	q.Add("actor", did)

	resp, err := http.Get("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?" + q.Encode())
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return ""
	}

	var profile struct {
		Avatar string `json:"avatar"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return ""
	}

	avatarCacheMu.Lock()
	avatarCacheMap[did] = avatarCache{
		url:       profile.Avatar,
		fetchedAt: time.Now(),
	}
	avatarCacheMu.Unlock()

	return profile.Avatar
}

func getProxiedAvatarURL(did, originalURL string) string {
	if originalURL == "" {
		return ""
	}

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		return originalURL
	}

	return baseURL + "/api/avatar/" + url.PathEscape(did)
}
