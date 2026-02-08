package config

import (
	"os"
	"strings"
	"sync"
)

type Config struct {
	BskyPublicAPI string
	PLCDirectory  string
	BaseURL       string
	AdminDIDs     []string
	ServiceDID    string
}

var (
	instance *Config
	once     sync.Once
)

func Get() *Config {
	once.Do(func() {
		adminDIDs := []string{}
		if raw := os.Getenv("ADMIN_DIDS"); raw != "" {
			for _, did := range strings.Split(raw, ",") {
				did = strings.TrimSpace(did)
				if did != "" {
					adminDIDs = append(adminDIDs, did)
				}
			}
		}
		instance = &Config{
			BskyPublicAPI: getEnvOrDefault("BSKY_PUBLIC_API", "https://public.api.bsky.app"),
			PLCDirectory:  getEnvOrDefault("PLC_DIRECTORY_URL", "https://plc.directory"),
			BaseURL:       os.Getenv("BASE_URL"),
			AdminDIDs:     adminDIDs,
			ServiceDID:    os.Getenv("SERVICE_DID"),
		}
	})
	return instance
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func (c *Config) BskyResolveHandleURL(handle string) string {
	return c.BskyPublicAPI + "/xrpc/com.atproto.identity.resolveHandle?handle=" + handle
}

func (c *Config) BskyGetProfilesURL() string {
	return c.BskyPublicAPI + "/xrpc/app.bsky.actor.getProfiles"
}

func (c *Config) PLCResolveURL(did string) string {
	return c.PLCDirectory + "/" + did
}

func (c *Config) IsAdmin(did string) bool {
	for _, adminDID := range c.AdminDIDs {
		if adminDID == did {
			return true
		}
	}
	return false
}
