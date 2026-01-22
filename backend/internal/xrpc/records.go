package xrpc

import (
	"encoding/json"
	"fmt"
	"time"
	"unicode/utf8"
)

const (
	CollectionAnnotation     = "at.margin.annotation"
	CollectionHighlight      = "at.margin.highlight"
	CollectionBookmark       = "at.margin.bookmark"
	CollectionReply          = "at.margin.reply"
	CollectionLike           = "at.margin.like"
	CollectionCollection     = "at.margin.collection"
	CollectionCollectionItem = "at.margin.collectionItem"
)

const (
	SelectorTypeQuote    = "TextQuoteSelector"
	SelectorTypePosition = "TextPositionSelector"
)

type Selector struct {
	Type string `json:"type"`
}

type TextQuoteSelector struct {
	Type   string `json:"type"`
	Exact  string `json:"exact"`
	Prefix string `json:"prefix,omitempty"`
	Suffix string `json:"suffix,omitempty"`
}

func (s *TextQuoteSelector) Validate() error {
	if s.Type != SelectorTypeQuote {
		return fmt.Errorf("invalid selector type: %s", s.Type)
	}
	if len(s.Exact) > 5000 {
		return fmt.Errorf("exact text too long: %d > 5000", len(s.Exact))
	}
	if len(s.Prefix) > 500 {
		return fmt.Errorf("prefix too long: %d > 500", len(s.Prefix))
	}
	if len(s.Suffix) > 500 {
		return fmt.Errorf("suffix too long: %d > 500", len(s.Suffix))
	}
	return nil
}

type TextPositionSelector struct {
	Type  string `json:"type"`
	Start int    `json:"start"`
	End   int    `json:"end"`
}

func (s *TextPositionSelector) Validate() error {
	if s.Type != SelectorTypePosition {
		return fmt.Errorf("invalid selector type: %s", s.Type)
	}
	if s.Start < 0 {
		return fmt.Errorf("start position cannot be negative")
	}
	if s.End < s.Start {
		return fmt.Errorf("end position cannot be before start")
	}
	return nil
}

type AnnotationRecord struct {
	Type       string           `json:"$type"`
	Motivation string           `json:"motivation,omitempty"`
	Body       *AnnotationBody  `json:"body,omitempty"`
	Target     AnnotationTarget `json:"target"`
	Tags       []string         `json:"tags,omitempty"`
	CreatedAt  string           `json:"createdAt"`
}

type AnnotationBody struct {
	Value  string `json:"value,omitempty"`
	Format string `json:"format,omitempty"`
}

type AnnotationTarget struct {
	Source     string          `json:"source"`
	SourceHash string          `json:"sourceHash"`
	Title      string          `json:"title,omitempty"`
	Selector   json.RawMessage `json:"selector,omitempty"`
}

func (r *AnnotationRecord) Validate() error {
	if r.Target.Source == "" {
		return fmt.Errorf("target source is required")
	}
	if r.Body != nil {
		if len(r.Body.Value) > 10000 {
			return fmt.Errorf("body too long: %d > 10000", len(r.Body.Value))
		}
		if utf8.RuneCountInString(r.Body.Value) > 3000 {
			return fmt.Errorf("body too long (graphemes): %d > 3000", utf8.RuneCountInString(r.Body.Value))
		}
	}
	if len(r.Tags) > 10 {
		return fmt.Errorf("too many tags: %d > 10", len(r.Tags))
	}
	for _, tag := range r.Tags {
		if len(tag) > 64 {
			return fmt.Errorf("tag too long: %s", tag)
		}
	}

	if len(r.Target.Selector) > 0 {
		var typeCheck Selector
		if err := json.Unmarshal(r.Target.Selector, &typeCheck); err != nil {
			return fmt.Errorf("invalid selector format")
		}

		switch typeCheck.Type {
		case SelectorTypeQuote:
			var s TextQuoteSelector
			if err := json.Unmarshal(r.Target.Selector, &s); err != nil {
				return err
			}
			return s.Validate()
		case SelectorTypePosition:
			var s TextPositionSelector
			if err := json.Unmarshal(r.Target.Selector, &s); err != nil {
				return err
			}
			return s.Validate()
		}
	}

	return nil
}

func NewAnnotationRecord(url, urlHash, text string, selector interface{}, title string) *AnnotationRecord {
	return NewAnnotationRecordWithMotivation(url, urlHash, text, selector, title, "commenting")
}

func NewAnnotationRecordWithMotivation(url, urlHash, text string, selector interface{}, title string, motivation string) *AnnotationRecord {
	var selectorJSON json.RawMessage
	if selector != nil {
		b, _ := json.Marshal(selector)
		selectorJSON = b
	}

	record := &AnnotationRecord{
		Type:       CollectionAnnotation,
		Motivation: motivation,
		Target: AnnotationTarget{
			Source:     url,
			SourceHash: urlHash,
			Title:      title,
			Selector:   selectorJSON,
		},
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	if text != "" {
		record.Body = &AnnotationBody{
			Value:  text,
			Format: "text/plain",
		}
	}

	return record
}

type HighlightRecord struct {
	Type      string           `json:"$type"`
	Target    AnnotationTarget `json:"target"`
	Color     string           `json:"color,omitempty"`
	Tags      []string         `json:"tags,omitempty"`
	CreatedAt string           `json:"createdAt"`
}

func (r *HighlightRecord) Validate() error {
	if r.Target.Source == "" {
		return fmt.Errorf("target source is required")
	}
	if len(r.Tags) > 10 {
		return fmt.Errorf("too many tags: %d", len(r.Tags))
	}
	if len(r.Color) > 20 {
		return fmt.Errorf("color too long")
	}
	return nil
}

func NewHighlightRecord(url, urlHash string, selector interface{}, color string, tags []string) *HighlightRecord {
	var selectorJSON json.RawMessage
	if selector != nil {
		b, _ := json.Marshal(selector)
		selectorJSON = b
	}

	return &HighlightRecord{
		Type: CollectionHighlight,
		Target: AnnotationTarget{
			Source:     url,
			SourceHash: urlHash,
			Selector:   selectorJSON,
		},
		Color:     color,
		Tags:      tags,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
}

type ReplyRef struct {
	URI string `json:"uri"`
	CID string `json:"cid"`
}

type ReplyRecord struct {
	Type      string   `json:"$type"`
	Parent    ReplyRef `json:"parent"`
	Root      ReplyRef `json:"root"`
	Text      string   `json:"text"`
	Format    string   `json:"format,omitempty"`
	CreatedAt string   `json:"createdAt"`
}

func (r *ReplyRecord) Validate() error {
	if r.Text == "" {
		return fmt.Errorf("text is required")
	}
	if len(r.Text) > 2000 {
		return fmt.Errorf("reply text too long")
	}
	return nil
}

func NewReplyRecord(parentURI, parentCID, rootURI, rootCID, text string) *ReplyRecord {
	return &ReplyRecord{
		Type:      CollectionReply,
		Parent:    ReplyRef{URI: parentURI, CID: parentCID},
		Root:      ReplyRef{URI: rootURI, CID: rootCID},
		Text:      text,
		Format:    "text/plain",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
}

type SubjectRef struct {
	URI string `json:"uri"`
	CID string `json:"cid"`
}

type LikeRecord struct {
	Type      string     `json:"$type"`
	Subject   SubjectRef `json:"subject"`
	CreatedAt string     `json:"createdAt"`
}

func (r *LikeRecord) Validate() error {
	if r.Subject.URI == "" || r.Subject.CID == "" {
		return fmt.Errorf("invalid subject")
	}
	return nil
}

func NewLikeRecord(subjectURI, subjectCID string) *LikeRecord {
	return &LikeRecord{
		Type:      CollectionLike,
		Subject:   SubjectRef{URI: subjectURI, CID: subjectCID},
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
}

type BookmarkRecord struct {
	Type        string   `json:"$type"`
	Source      string   `json:"source"`
	SourceHash  string   `json:"sourceHash"`
	Title       string   `json:"title,omitempty"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	CreatedAt   string   `json:"createdAt"`
}

func (r *BookmarkRecord) Validate() error {
	if r.Source == "" {
		return fmt.Errorf("source is required")
	}
	if len(r.Title) > 500 {
		return fmt.Errorf("title too long")
	}
	if len(r.Description) > 1000 {
		return fmt.Errorf("description too long")
	}
	if len(r.Tags) > 10 {
		return fmt.Errorf("too many tags")
	}
	return nil
}

func NewBookmarkRecord(url, urlHash, title, description string) *BookmarkRecord {
	return &BookmarkRecord{
		Type:        CollectionBookmark,
		Source:      url,
		SourceHash:  urlHash,
		Title:       title,
		Description: description,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
}

type CollectionRecord struct {
	Type        string `json:"$type"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Icon        string `json:"icon,omitempty"`
	CreatedAt   string `json:"createdAt"`
}

func (r *CollectionRecord) Validate() error {
	if r.Name == "" {
		return fmt.Errorf("name is required")
	}
	if len(r.Name) > 100 {
		return fmt.Errorf("name too long")
	}
	if len(r.Description) > 500 {
		return fmt.Errorf("description too long")
	}
	return nil
}

func NewCollectionRecord(name, description, icon string) *CollectionRecord {
	return &CollectionRecord{
		Type:        CollectionCollection,
		Name:        name,
		Description: description,
		Icon:        icon,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
}

type CollectionItemRecord struct {
	Type       string `json:"$type"`
	Collection string `json:"collection"`
	Annotation string `json:"annotation"`
	Position   int    `json:"position,omitempty"`
	CreatedAt  string `json:"createdAt"`
}

func (r *CollectionItemRecord) Validate() error {
	if r.Collection == "" || r.Annotation == "" {
		return fmt.Errorf("collection and annotation URIs required")
	}
	return nil
}

func NewCollectionItemRecord(collection, annotation string, position int) *CollectionItemRecord {
	return &CollectionItemRecord{
		Type:       CollectionCollectionItem,
		Collection: collection,
		Annotation: annotation,
		Position:   position,
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	}
}
