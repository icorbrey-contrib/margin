package firehose

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/fxamacker/cbor/v2"
	"github.com/gorilla/websocket"
	"github.com/ipfs/go-cid"

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
				log.Printf("Firehose error: %v, reconnecting in 5s...", err)
				if ctx.Err() != nil {
					return
				}
				time.Sleep(5 * time.Second)
			}
		}
	}
}

type FrameHeader struct {
	Op int    `cbor:"op"`
	T  string `cbor:"t"`
}
type Commit struct {
	Repo   string   `cbor:"repo"`
	Rev    string   `cbor:"rev"`
	Seq    int64    `cbor:"seq"`
	Prev   *cid.Cid `cbor:"prev"`
	Time   string   `cbor:"time"`
	Blocks []byte   `cbor:"blocks"`
	Ops    []RepoOp `cbor:"ops"`
}

type RepoOp struct {
	Action string   `cbor:"action"`
	Path   string   `cbor:"path"`
	Cid    *cid.Cid `cbor:"cid"`
}

func (i *Ingester) subscribe(ctx context.Context) error {
	cursor := i.getLastCursor()

	url := RelayURL
	if cursor > 0 {
		url = fmt.Sprintf("%s?cursor=%d", RelayURL, cursor)
	}

	log.Printf("Connecting to firehose: %s", url)

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, url, nil)
	if err != nil {
		return fmt.Errorf("websocket dial failed: %w", err)
	}
	defer conn.Close()

	log.Printf("Connected to firehose")

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

		i.handleMessage(message)
	}
}

func (i *Ingester) handleMessage(data []byte) {
	reader := bytes.NewReader(data)

	var header FrameHeader
	decoder := cbor.NewDecoder(reader)
	if err := decoder.Decode(&header); err != nil {
		return
	}

	if header.Op != 1 {
		return
	}

	if header.T != "#commit" {
		return
	}

	var commit Commit
	if err := decoder.Decode(&commit); err != nil {
		return
	}

	for _, op := range commit.Ops {
		collection, rkey := parseOpPath(op.Path)
		if !isMarginCollection(collection) {
			continue
		}

		uri := fmt.Sprintf("at://%s/%s/%s", commit.Repo, collection, rkey)

		switch op.Action {
		case "create", "update":
			if op.Cid != nil && len(commit.Blocks) > 0 {
				record := extractRecord(commit.Blocks, *op.Cid)
				if record != nil {
					i.handleRecord(commit.Repo, collection, rkey, record, commit.Seq)
				}
			}
		case "delete":
			i.handleDelete(collection, uri)
		}
	}

	if commit.Seq > 0 {
		if err := i.db.SetCursor("firehose_cursor", commit.Seq); err != nil {
			log.Printf("Failed to save cursor: %v", err)
		}
	}
}

func parseOpPath(path string) (collection, rkey string) {
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == '/' {
			return path[:i], path[i+1:]
		}
	}
	return path, ""
}

func isMarginCollection(collection string) bool {
	switch collection {
	case CollectionAnnotation, CollectionHighlight, CollectionBookmark,
		CollectionReply, CollectionLike, CollectionCollection, CollectionCollectionItem:
		return true
	}
	return false
}

func extractRecord(blocks []byte, targetCid cid.Cid) map[string]interface{} {
	reader := bytes.NewReader(blocks)

	headerLen, err := binary.ReadUvarint(reader)
	if err != nil {
		return nil
	}
	reader.Seek(int64(headerLen), io.SeekCurrent)

	for reader.Len() > 0 {
		blockLen, err := binary.ReadUvarint(reader)
		if err != nil {
			break
		}

		blockData := make([]byte, blockLen)
		if _, err := io.ReadFull(reader, blockData); err != nil {
			break
		}

		blockCid, cidLen, err := parseCidFromBlock(blockData)
		if err != nil {
			continue
		}

		if blockCid.Equals(targetCid) {
			var record map[string]interface{}
			if err := cbor.Unmarshal(blockData[cidLen:], &record); err != nil {
				return nil
			}
			return record
		}
	}

	return nil
}

func parseCidFromBlock(data []byte) (cid.Cid, int, error) {
	if len(data) < 2 {
		return cid.Cid{}, 0, fmt.Errorf("data too short")
	}
	version, n1 := binary.Uvarint(data)
	if n1 <= 0 {
		return cid.Cid{}, 0, fmt.Errorf("invalid version varint")
	}

	if version == 1 {
		codec, n2 := binary.Uvarint(data[n1:])
		if n2 <= 0 {
			return cid.Cid{}, 0, fmt.Errorf("invalid codec varint")
		}

		mhStart := n1 + n2
		hashType, n3 := binary.Uvarint(data[mhStart:])
		if n3 <= 0 {
			return cid.Cid{}, 0, fmt.Errorf("invalid hash type varint")
		}

		hashLen, n4 := binary.Uvarint(data[mhStart+n3:])
		if n4 <= 0 {
			return cid.Cid{}, 0, fmt.Errorf("invalid hash length varint")
		}

		totalCidLen := mhStart + n3 + n4 + int(hashLen)

		c, err := cid.Cast(data[:totalCidLen])
		if err != nil {
			return cid.Cid{}, 0, err
		}

		_ = codec
		_ = hashType

		return c, totalCidLen, nil
	}

	return cid.Cid{}, 0, fmt.Errorf("unsupported CID version")
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
	}
}

func (i *Ingester) handleRecord(repo, collection, rkey string, record map[string]interface{}, seq int64) {
	_ = fmt.Sprintf("at://%s/%s/%s", repo, collection, rkey)

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return
	}

	event := &FirehoseEvent{
		Repo:       repo,
		Collection: collection,
		Rkey:       rkey,
		Record:     recordJSON,
		Operation:  "create",
		Cursor:     seq,
	}

	switch collection {
	case CollectionAnnotation:
		i.handleAnnotation(event)
	case CollectionHighlight:
		i.handleHighlight(event)
	case CollectionBookmark:
		i.handleBookmark(event)
	case CollectionReply:
		i.handleReply(event)
	case CollectionLike:
		i.handleLike(event)
	case CollectionCollection:
		i.handleCollection(event)
	case CollectionCollectionItem:
		i.handleCollectionItem(event)
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

func (i *Ingester) getLastCursor() int64 {
	cursor, err := i.db.GetCursor("firehose_cursor")
	if err != nil {
		log.Printf("Failed to get last cursor from DB: %v", err)
		return 0
	}
	return cursor
}
