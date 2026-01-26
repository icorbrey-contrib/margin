package xrpc

import (
	"encoding/json"
	"time"
)

const (
	CollectionSembleCard           = "network.cosmik.card"
	CollectionSembleCollection     = "network.cosmik.collection"
	CollectionSembleCollectionLink = "network.cosmik.collectionLink"
)

type SembleCard struct {
	Type       string          `json:"type"`
	Content    json.RawMessage `json:"content"`
	URL        string          `json:"url,omitempty"`
	ParentCard *StrongRef      `json:"parentCard,omitempty"`
	CreatedAt  string          `json:"createdAt"`
}

type SembleURLContent struct {
	URL      string             `json:"url"`
	Metadata *SembleURLMetadata `json:"metadata,omitempty"`
}

type SembleNoteContent struct {
	Text string `json:"text"`
}

type SembleURLMetadata struct {
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	Author      string `json:"author,omitempty"`
	SiteName    string `json:"siteName,omitempty"`
}

type SembleCollection struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	AccessType  string `json:"accessType"`
	CreatedAt   string `json:"createdAt"`
}

type SembleCollectionLink struct {
	Collection StrongRef `json:"collection"`
	Card       StrongRef `json:"card"`
	AddedBy    string    `json:"addedBy"`
	AddedAt    string    `json:"addedAt"`
	CreatedAt  string    `json:"createdAt"`
}

type StrongRef struct {
	URI string `json:"uri"`
	CID string `json:"cid"`
}

func (c *SembleCard) ParseContent() (interface{}, error) {
	switch c.Type {
	case "URL":
		var content SembleURLContent
		if err := json.Unmarshal(c.Content, &content); err != nil {
			return nil, err
		}
		return &content, nil
	case "NOTE":
		var content SembleNoteContent
		if err := json.Unmarshal(c.Content, &content); err != nil {
			return nil, err
		}
		return &content, nil
	}
	return nil, nil
}

func (c *SembleCard) GetCreatedAtTime() time.Time {
	t, err := time.Parse(time.RFC3339, c.CreatedAt)
	if err != nil {
		return time.Now()
	}
	return t
}
