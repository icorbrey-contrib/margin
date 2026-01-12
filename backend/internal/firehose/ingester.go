package firehose

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"margin.at/internal/db"
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

var RelayURL = "wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos"

type Ingester struct {
	db     *db.DB
	cancel context.CancelFunc
}

func NewIngester(database *db.DB) *Ingester {
	return &Ingester{db: database}
}

func (i *Ingester) Start(ctx context.Context) error {
	ctx, cancel := context.WithCancel(ctx)
	i.cancel = cancel

	go i.run(ctx)
	return nil
}

func (i *Ingester) Stop() {
	if i.cancel != nil {
		i.cancel()
	}
}

func (i *Ingester) run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			if err := i.subscribe(ctx); err != nil {
				if ctx.Err() != nil {
					return
				}
				time.Sleep(30 * time.Second)
			}
		}
	}
}

func (i *Ingester) subscribe(ctx context.Context) error {
	cursor := i.getLastCursor()

	url := RelayURL
	if cursor > 0 {
		url = fmt.Sprintf("%s?cursor=%d", RelayURL, cursor)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", strings.Replace(url, "wss://", "https://", 1), nil)
	if err != nil {
		return err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("firehose returned %d: %s", resp.StatusCode, string(body))
	}

	decoder := json.NewDecoder(resp.Body)
	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		var event FirehoseEvent
		if err := decoder.Decode(&event); err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}

		i.handleEvent(&event)
	}
}

type FirehoseEvent struct {
	Repo       string          `json:"repo"`
	Collection string          `json:"collection"`
	Rkey       string          `json:"rkey"`
	Record     json.RawMessage `json:"record"`
	Operation  string          `json:"operation"`
	Cursor     int64           `json:"cursor"`
}

func (i *Ingester) handleEvent(event *FirehoseEvent) {
	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	switch event.Collection {
	case CollectionAnnotation:
		switch event.Operation {
		case "create", "update":
			i.handleAnnotation(event)
		case "delete":
			i.db.DeleteAnnotation(uri)
		}
	case CollectionHighlight:
		switch event.Operation {
		case "create", "update":
			i.handleHighlight(event)
		case "delete":
			i.db.DeleteHighlight(uri)
		}
	case CollectionBookmark:
		switch event.Operation {
		case "create", "update":
			i.handleBookmark(event)
		case "delete":
			i.db.DeleteBookmark(uri)
		}
	case CollectionReply:
		switch event.Operation {
		case "create", "update":
			i.handleReply(event)
		case "delete":
			i.db.DeleteReply(uri)
		}
	case CollectionLike:
		switch event.Operation {
		case "create":
			i.handleLike(event)
		case "delete":
			i.db.DeleteLike(uri)
		}
	case CollectionCollection:
		switch event.Operation {
		case "create", "update":
			i.handleCollection(event)
		case "delete":
			i.db.DeleteCollection(uri)
		}
	case CollectionCollectionItem:
		switch event.Operation {
		case "create", "update":
			i.handleCollectionItem(event)
		case "delete":
			i.db.RemoveFromCollection(uri)
		}
	}

	if event.Cursor > 0 {
		if err := i.db.SetCursor("firehose_cursor", event.Cursor); err != nil {
			log.Printf("Failed to save cursor: %v", err)
		}
	}
}

func (i *Ingester) handleAnnotation(event *FirehoseEvent) {

	var record struct {
		Motivation string `json:"motivation"`
		Body       struct {
			Value  string `json:"value"`
			Format string `json:"format"`
			URI    string `json:"uri"`
		} `json:"body"`
		Target struct {
			Source     string          `json:"source"`
			SourceHash string          `json:"sourceHash"`
			Title      string          `json:"title"`
			Selector   json.RawMessage `json:"selector"`
		} `json:"target"`
		Tags      []string `json:"tags"`
		CreatedAt string   `json:"createdAt"`

		URL     string `json:"url"`
		URLHash string `json:"urlHash"`
		Text    string `json:"text"`
		Quote   string `json:"quote"`
		Title   string `json:"title"`
	}

	if err := json.NewDecoder(bytes.NewReader(event.Record)).Decode(&record); err != nil {
		return
	}

	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	createdAt, err := time.Parse(time.RFC3339, record.CreatedAt)
	if err != nil {
		createdAt = time.Now()
	}

	targetSource := record.Target.Source
	if targetSource == "" {
		targetSource = record.URL
	}

	targetHash := record.Target.SourceHash
	if targetHash == "" {
		targetHash = record.URLHash
	}
	if targetHash == "" && targetSource != "" {
		targetHash = db.HashURL(targetSource)
	}

	bodyValue := record.Body.Value
	if bodyValue == "" {
		bodyValue = record.Text
	}

	targetTitle := record.Target.Title
	if targetTitle == "" {
		targetTitle = record.Title
	}

	motivation := record.Motivation
	if motivation == "" {
		motivation = "commenting"
	}

	var bodyValuePtr, bodyFormatPtr, bodyURIPtr, targetTitlePtr, selectorJSONPtr, tagsJSONPtr *string
	if bodyValue != "" {
		bodyValuePtr = &bodyValue
	}
	if record.Body.Format != "" {
		bodyFormatPtr = &record.Body.Format
	}
	if record.Body.URI != "" {
		bodyURIPtr = &record.Body.URI
	}
	if targetTitle != "" {
		targetTitlePtr = &targetTitle
	}
	if len(record.Target.Selector) > 0 && string(record.Target.Selector) != "null" {
		selectorStr := string(record.Target.Selector)
		selectorJSONPtr = &selectorStr
	}
	if len(record.Tags) > 0 {
		tagsBytes, _ := json.Marshal(record.Tags)
		tagsStr := string(tagsBytes)
		tagsJSONPtr = &tagsStr
	}

	annotation := &db.Annotation{
		URI:          uri,
		AuthorDID:    event.Repo,
		Motivation:   motivation,
		BodyValue:    bodyValuePtr,
		BodyFormat:   bodyFormatPtr,
		BodyURI:      bodyURIPtr,
		TargetSource: targetSource,
		TargetHash:   targetHash,
		TargetTitle:  targetTitlePtr,
		SelectorJSON: selectorJSONPtr,
		TagsJSON:     tagsJSONPtr,
		CreatedAt:    createdAt,
		IndexedAt:    time.Now(),
	}

	if err := i.db.CreateAnnotation(annotation); err != nil {
		log.Printf("Failed to index annotation: %v", err)
	} else {
		log.Printf("Indexed annotation from %s on %s", event.Repo, targetSource)
	}
}

func (i *Ingester) handleReply(event *FirehoseEvent) {
	var record struct {
		Parent struct {
			URI string `json:"uri"`
		} `json:"parent"`
		Root struct {
			URI string `json:"uri"`
		} `json:"root"`
		Text      string `json:"text"`
		CreatedAt string `json:"createdAt"`
	}

	if err := json.NewDecoder(bytes.NewReader(event.Record)).Decode(&record); err != nil {
		return
	}

	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	createdAt, err := time.Parse(time.RFC3339, record.CreatedAt)
	if err != nil {
		createdAt = time.Now()
	}

	reply := &db.Reply{
		URI:       uri,
		AuthorDID: event.Repo,
		ParentURI: record.Parent.URI,
		RootURI:   record.Root.URI,
		Text:      record.Text,
		CreatedAt: createdAt,
		IndexedAt: time.Now(),
	}

	i.db.CreateReply(reply)
}

func (i *Ingester) handleLike(event *FirehoseEvent) {
	var record struct {
		Subject struct {
			URI string `json:"uri"`
		} `json:"subject"`
		CreatedAt string `json:"createdAt"`
	}

	if err := json.NewDecoder(bytes.NewReader(event.Record)).Decode(&record); err != nil {
		return
	}

	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	createdAt, err := time.Parse(time.RFC3339, record.CreatedAt)
	if err != nil {
		createdAt = time.Now()
	}

	like := &db.Like{
		URI:        uri,
		AuthorDID:  event.Repo,
		SubjectURI: record.Subject.URI,
		CreatedAt:  createdAt,
		IndexedAt:  time.Now(),
	}

	i.db.CreateLike(like)
}

func (i *Ingester) handleHighlight(event *FirehoseEvent) {
	var record struct {
		Target struct {
			Source     string          `json:"source"`
			SourceHash string          `json:"sourceHash"`
			Title      string          `json:"title"`
			Selector   json.RawMessage `json:"selector"`
		} `json:"target"`
		Color     string   `json:"color"`
		Tags      []string `json:"tags"`
		CreatedAt string   `json:"createdAt"`
	}

	if err := json.NewDecoder(bytes.NewReader(event.Record)).Decode(&record); err != nil {
		return
	}

	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	createdAt, err := time.Parse(time.RFC3339, record.CreatedAt)
	if err != nil {
		createdAt = time.Now()
	}

	targetHash := record.Target.SourceHash
	if targetHash == "" && record.Target.Source != "" {
		targetHash = db.HashURL(record.Target.Source)
	}

	var titlePtr, selectorJSONPtr, colorPtr, tagsJSONPtr *string
	if record.Target.Title != "" {
		titlePtr = &record.Target.Title
	}
	if len(record.Target.Selector) > 0 && string(record.Target.Selector) != "null" {
		selectorStr := string(record.Target.Selector)
		selectorJSONPtr = &selectorStr
	}
	if record.Color != "" {
		colorPtr = &record.Color
	}
	if len(record.Tags) > 0 {
		tagsBytes, _ := json.Marshal(record.Tags)
		tagsStr := string(tagsBytes)
		tagsJSONPtr = &tagsStr
	}

	highlight := &db.Highlight{
		URI:          uri,
		AuthorDID:    event.Repo,
		TargetSource: record.Target.Source,
		TargetHash:   targetHash,
		TargetTitle:  titlePtr,
		SelectorJSON: selectorJSONPtr,
		Color:        colorPtr,
		TagsJSON:     tagsJSONPtr,
		CreatedAt:    createdAt,
		IndexedAt:    time.Now(),
	}

	if err := i.db.CreateHighlight(highlight); err != nil {
		log.Printf("Failed to index highlight: %v", err)
	} else {
		log.Printf("Indexed highlight from %s on %s", event.Repo, record.Target.Source)
	}
}

func (i *Ingester) handleBookmark(event *FirehoseEvent) {
	var record struct {
		Source      string   `json:"source"`
		SourceHash  string   `json:"sourceHash"`
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Tags        []string `json:"tags"`
		CreatedAt   string   `json:"createdAt"`
	}

	if err := json.NewDecoder(bytes.NewReader(event.Record)).Decode(&record); err != nil {
		return
	}

	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	createdAt, err := time.Parse(time.RFC3339, record.CreatedAt)
	if err != nil {
		createdAt = time.Now()
	}

	sourceHash := record.SourceHash
	if sourceHash == "" && record.Source != "" {
		sourceHash = db.HashURL(record.Source)
	}

	var titlePtr, descPtr, tagsJSONPtr *string
	if record.Title != "" {
		titlePtr = &record.Title
	}
	if record.Description != "" {
		descPtr = &record.Description
	}
	if len(record.Tags) > 0 {
		tagsBytes, _ := json.Marshal(record.Tags)
		tagsStr := string(tagsBytes)
		tagsJSONPtr = &tagsStr
	}

	bookmark := &db.Bookmark{
		URI:         uri,
		AuthorDID:   event.Repo,
		Source:      record.Source,
		SourceHash:  sourceHash,
		Title:       titlePtr,
		Description: descPtr,
		TagsJSON:    tagsJSONPtr,
		CreatedAt:   createdAt,
		IndexedAt:   time.Now(),
	}

	if err := i.db.CreateBookmark(bookmark); err != nil {
		log.Printf("Failed to index bookmark: %v", err)
	} else {
		log.Printf("Indexed bookmark from %s: %s", event.Repo, record.Source)
	}
}

func (i *Ingester) handleCollection(event *FirehoseEvent) {
	var record struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Icon        string `json:"icon"`
		CreatedAt   string `json:"createdAt"`
	}

	if err := json.NewDecoder(bytes.NewReader(event.Record)).Decode(&record); err != nil {
		return
	}

	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	createdAt, err := time.Parse(time.RFC3339, record.CreatedAt)
	if err != nil {
		createdAt = time.Now()
	}

	var descPtr, iconPtr *string
	if record.Description != "" {
		descPtr = &record.Description
	}
	if record.Icon != "" {
		iconPtr = &record.Icon
	}

	collection := &db.Collection{
		URI:         uri,
		AuthorDID:   event.Repo,
		Name:        record.Name,
		Description: descPtr,
		Icon:        iconPtr,
		CreatedAt:   createdAt,
		IndexedAt:   time.Now(),
	}

	if err := i.db.CreateCollection(collection); err != nil {
		log.Printf("Failed to index collection: %v", err)
	} else {
		log.Printf("Indexed collection from %s: %s", event.Repo, record.Name)
	}
}

func (i *Ingester) handleCollectionItem(event *FirehoseEvent) {
	var record struct {
		Collection string `json:"collection"`
		Annotation string `json:"annotation"`
		Position   int    `json:"position"`
		CreatedAt  string `json:"createdAt"`
	}

	if err := json.NewDecoder(bytes.NewReader(event.Record)).Decode(&record); err != nil {
		return
	}

	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	createdAt, err := time.Parse(time.RFC3339, record.CreatedAt)
	if err != nil {
		createdAt = time.Now()
	}

	item := &db.CollectionItem{
		URI:           uri,
		AuthorDID:     event.Repo,
		CollectionURI: record.Collection,
		AnnotationURI: record.Annotation,
		Position:      record.Position,
		CreatedAt:     createdAt,
		IndexedAt:     time.Now(),
	}

	if err := i.db.AddToCollection(item); err != nil {
		log.Printf("Failed to index collection item: %v", err)
	} else {
		log.Printf("Indexed collection item from %s", event.Repo)
	}
}

func (i *Ingester) getLastCursor() int64 {
	cursor, err := i.db.GetCursor("firehose_cursor")
	if err != nil {
		log.Printf("Failed to get last cursor from DB: %v", err)
		return 0
	}
	return cursor
}
