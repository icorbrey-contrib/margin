package config

import (
	"os"
	"sync"
)

type Config struct {
	BskyPublicAPI string
	PLCDirectory  string
	BaseURL       string
}

var (
	instance *Config
	once     sync.Once
)

func Get() *Config {
	once.Do(func() {
		instance = &Config{
			BskyPublicAPI: getEnvOrDefault("BSKY_PUBLIC_API", "https://public.api.bsky.app"),
			PLCDirectory:  getEnvOrDefault("PLC_DIRECTORY_URL", "https://plc.directory"),
			BaseURL:       os.Getenv("BASE_URL"),
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
