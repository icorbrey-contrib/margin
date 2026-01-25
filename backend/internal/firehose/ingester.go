package firehose

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"margin.at/internal/db"
	internal_sync "margin.at/internal/sync"
	"margin.at/internal/xrpc"
)

const (
	CollectionAnnotation     = "at.margin.annotation"
	CollectionHighlight      = "at.margin.highlight"
	CollectionBookmark       = "at.margin.bookmark"
	CollectionReply          = "at.margin.reply"
	CollectionLike           = "at.margin.like"
	CollectionCollection     = "at.margin.collection"
	CollectionCollectionItem = "at.margin.collectionItem"
	CollectionProfile        = "at.margin.profile"
)

var RelayURL = "wss://jetstream2.us-east.bsky.network/subscribe"

type Ingester struct {
	db       *db.DB
	sync     *internal_sync.Service
	cancel   context.CancelFunc
	handlers map[string]RecordHandler
}

type RecordHandler func(event *FirehoseEvent)

func NewIngester(database *db.DB, syncService *internal_sync.Service) *Ingester {
	i := &Ingester{
		db:       database,
		sync:     syncService,
		handlers: make(map[string]RecordHandler),
	}

	i.RegisterHandler(CollectionAnnotation, i.handleAnnotation)
	i.RegisterHandler(CollectionHighlight, i.handleHighlight)
	i.RegisterHandler(CollectionBookmark, i.handleBookmark)
	i.RegisterHandler(CollectionReply, i.handleReply)
	i.RegisterHandler(CollectionLike, i.handleLike)
	i.RegisterHandler(CollectionCollection, i.handleCollection)
	i.RegisterHandler(CollectionCollectionItem, i.handleCollectionItem)
	i.RegisterHandler(CollectionProfile, i.handleProfile)

	return i
}

func (i *Ingester) RegisterHandler(collection string, handler RecordHandler) {
	i.handlers[collection] = handler
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
				log.Printf("Jetstream error: %v, reconnecting in 5s...", err)
				if ctx.Err() != nil {
					return
				}
				time.Sleep(5 * time.Second)
			}
		}
	}
}

type JetstreamEvent struct {
	Did    string           `json:"did"`
	Time   int64            `json:"time_us"`
	Kind   string           `json:"kind"`
	Commit *JetstreamCommit `json:"commit,omitempty"`
}

type JetstreamCommit struct {
	Rev        string          `json:"rev"`
	Operation  string          `json:"operation"`
	Collection string          `json:"collection"`
	Rkey       string          `json:"rkey"`
	Record     json.RawMessage `json:"record,omitempty"`
	Cid        string          `json:"cid,omitempty"`
}

func (i *Ingester) subscribe(ctx context.Context) error {
	cursor := i.getLastCursor()

	var collections []string
	for collection := range i.handlers {
		collections = append(collections, collection)
	}

	url := fmt.Sprintf("%s?wantedCollections=%s", RelayURL, strings.Join(collections, "&wantedCollections="))
	if cursor > 0 {
		url = fmt.Sprintf("%s&cursor=%d", url, cursor)
	}

	log.Printf("Connecting to Jetstream: %s", url)

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, url, nil)
	if err != nil {
		return fmt.Errorf("websocket dial failed: %w", err)
	}
	defer conn.Close()

	log.Printf("Connected to Jetstream")

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		_, message, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("websocket read failed: %w", err)
		}

		var event JetstreamEvent
		if err := json.Unmarshal(message, &event); err != nil {
			continue
		}

		if event.Kind == "commit" && event.Commit != nil {
			i.handleCommit(event)

			if event.Time > 0 {
				if err := i.db.SetCursor("firehose_cursor", event.Time); err != nil {
					log.Printf("Failed to save cursor: %v", err)
				}
			}
		}
	}
}

func (i *Ingester) handleCommit(event JetstreamEvent) {
	commit := event.Commit
	uri := fmt.Sprintf("at://%s/%s/%s", event.Did, commit.Collection, commit.Rkey)

	switch commit.Operation {
	case "create", "update":
		if len(commit.Record) > 0 {
			firehoseEvent := &FirehoseEvent{
				Repo:       event.Did,
				Collection: commit.Collection,
				Rkey:       commit.Rkey,
				Record:     commit.Record,
				Operation:  commit.Operation,
				Cursor:     event.Time,
			}

			i.dispatchToHandler(firehoseEvent)

			go i.triggerLazySync(event.Did)
		}
	case "delete":
		i.handleDelete(commit.Collection, uri)
	}
}

func (i *Ingester) dispatchToHandler(event *FirehoseEvent) {
	if handler, ok := i.handlers[event.Collection]; ok {
		handler(event)
	}
}

var lastSyncAttempts sync.Map

func (i *Ingester) triggerLazySync(did string) {
	lastSync, ok := lastSyncAttempts.Load(did)
	if ok {
		if time.Since(lastSync.(time.Time)) < 5*time.Minute {
			return
		}
	}
	lastSyncAttempts.Store(did, time.Now())

	pds, err := xrpc.ResolveDIDToPDS(did)
	if err != nil || pds == "" {
		return
	}

	_, err = i.sync.PerformSync(context.Background(), did, func(ctx context.Context, _ string) (*xrpc.Client, error) {
		return &xrpc.Client{
			PDS: pds,
		}, nil
	})

	if err == nil {
		log.Printf("Auto-synced repo for active user: %s", did)
	}
}

func (i *Ingester) handleDelete(collection, uri string) {
	switch collection {
	case CollectionAnnotation:
		i.db.DeleteAnnotation(uri)
	case CollectionHighlight:
		i.db.DeleteHighlight(uri)
	case CollectionBookmark:
		i.db.DeleteBookmark(uri)
	case CollectionReply:
		i.db.DeleteReply(uri)
	case CollectionLike:
		i.db.DeleteLike(uri)
	case CollectionCollection:
		i.db.DeleteCollection(uri)
	case CollectionCollectionItem:
		i.db.RemoveFromCollection(uri)
	case CollectionProfile:
		i.db.DeleteProfile(uri)
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

type FirehoseEvent struct {
	Repo       string          `json:"repo"`
	Collection string          `json:"collection"`
	Rkey       string          `json:"rkey"`
	Record     json.RawMessage `json:"record"`
	Operation  string          `json:"operation"`
	Cursor     int64           `json:"cursor"`
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

	if err := json.Unmarshal(event.Record, &record); err != nil {
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

	if err := json.Unmarshal(event.Record, &record); err != nil {
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

	if err := json.Unmarshal(event.Record, &record); err != nil {
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

	if err := json.Unmarshal(event.Record, &record); err != nil {
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

	if err := json.Unmarshal(event.Record, &record); err != nil {
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

	if err := json.Unmarshal(event.Record, &record); err != nil {
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

	if err := json.Unmarshal(event.Record, &record); err != nil {
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

func (i *Ingester) handleProfile(event *FirehoseEvent) {
	if event.Rkey != "self" {
		return
	}

	var record struct {
		Bio       string   `json:"bio"`
		Website   string   `json:"website"`
		Links     []string `json:"links"`
		CreatedAt string   `json:"createdAt"`
	}

	if err := json.Unmarshal(event.Record, &record); err != nil {
		return
	}

	uri := fmt.Sprintf("at://%s/%s/%s", event.Repo, event.Collection, event.Rkey)

	createdAt, err := time.Parse(time.RFC3339, record.CreatedAt)
	if err != nil {
		createdAt = time.Now()
	}

	var bioPtr, websitePtr, linksJSONPtr *string
	if record.Bio != "" {
		bioPtr = &record.Bio
	}
	if record.Website != "" {
		websitePtr = &record.Website
	}
	if len(record.Links) > 0 {
		linksBytes, _ := json.Marshal(record.Links)
		linksStr := string(linksBytes)
		linksJSONPtr = &linksStr
	}

	profile := &db.Profile{
		URI:       uri,
		AuthorDID: event.Repo,
		Bio:       bioPtr,
		Website:   websitePtr,
		LinksJSON: linksJSONPtr,
		CreatedAt: createdAt,
		IndexedAt: time.Now(),
	}

	if err := i.db.UpsertProfile(profile); err != nil {
		log.Printf("Failed to index profile: %v", err)
	} else {
		log.Printf("Indexed profile from %s", event.Repo)
	}
}
