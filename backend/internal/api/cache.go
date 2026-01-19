package api

import (
	"sync"
	"time"
)

type ProfileCache interface {
	Get(did string) (Author, bool)
	Set(did string, profile Author)
}
type InMemoryCache struct {
	cache sync.Map
	ttl   time.Duration
}

type cachedProfile struct {
	Author    Author
	ExpiresAt time.Time
}

func NewInMemoryCache(ttl time.Duration) *InMemoryCache {
	return &InMemoryCache{
		ttl: ttl,
	}
}

func (c *InMemoryCache) Get(did string) (Author, bool) {
	val, ok := c.cache.Load(did)
	if !ok {
		return Author{}, false
	}

	entry := val.(cachedProfile)
	if time.Now().After(entry.ExpiresAt) {
		c.cache.Delete(did)
		return Author{}, false
	}

	return entry.Author, true
}

func (c *InMemoryCache) Set(did string, profile Author) {
	c.cache.Store(did, cachedProfile{
		Author:    profile,
		ExpiresAt: time.Now().Add(c.ttl),
	})
}
