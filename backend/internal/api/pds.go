package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"margin.at/internal/db"
	"margin.at/internal/xrpc"
)

func (h *Handler) FetchLatestUserRecords(r *http.Request, did string, collection string, limit int) ([]interface{}, error) {
	session, err := h.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		return nil, err
	}

	var results []interface{}

	err = h.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, _ string) error {
		url := fmt.Sprintf("%s/xrpc/com.atproto.repo.listRecords?repo=%s&collection=%s&limit=%d", client.PDS, did, collection, limit)

		req, _ := http.NewRequestWithContext(r.Context(), "GET", url, nil)
		req.Header.Set("Authorization", "Bearer "+client.AccessToken)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("failed to fetch %s: %w", collection, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			return fmt.Errorf("XRPC error %d", resp.StatusCode)
		}

		var output struct {
			Records []struct {
				URI   string          `json:"uri"`
				CID   string          `json:"cid"`
				Value json.RawMessage `json:"value"`
			} `json:"records"`
			Cursor string `json:"cursor"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&output); err != nil {
			return err
		}

		for _, rec := range output.Records {
			parsed, err := parseRecord(did, collection, rec.URI, rec.CID, rec.Value)
			if err == nil && parsed != nil {
				results = append(results, parsed)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return results, nil
}

func parseRecord(did, collection, uri, cid string, value json.RawMessage) (interface{}, error) {
	cidPtr := &cid

	switch collection {
	case xrpc.CollectionAnnotation:
		var record xrpc.AnnotationRecord
		if err := json.Unmarshal(value, &record); err != nil {
			return nil, err
		}

		createdAt, _ := time.Parse(time.RFC3339, record.CreatedAt)

		targetSource := record.Target.Source

		targetHash := record.Target.SourceHash
		if targetHash == "" && targetSource != "" {
			targetHash = db.HashURL(targetSource)
		}

		motivation := record.Motivation
		if motivation == "" {
			motivation = "commenting"
		}

		var bodyValuePtr, bodyFormatPtr, bodyURIPtr *string
		if record.Body != nil {
			if record.Body.Value != "" {
				val := record.Body.Value
				bodyValuePtr = &val
			}
			if record.Body.Format != "" {
				fmt := record.Body.Format
				bodyFormatPtr = &fmt
			}
		}

		var targetTitlePtr, selectorJSONPtr, tagsJSONPtr *string
		if record.Target.Title != "" {
			t := record.Target.Title
			targetTitlePtr = &t
		}
		if len(record.Target.Selector) > 0 {
			selectorStr := string(record.Target.Selector)
			selectorJSONPtr = &selectorStr
		}
		if len(record.Tags) > 0 {
			tagsBytes, _ := json.Marshal(record.Tags)
			tagsStr := string(tagsBytes)
			tagsJSONPtr = &tagsStr
		}

		return &db.Annotation{
			URI:          uri,
			AuthorDID:    did,
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
			CID:          cidPtr,
		}, nil

	case xrpc.CollectionHighlight:
		var record xrpc.HighlightRecord
		if err := json.Unmarshal(value, &record); err != nil {
			return nil, err
		}

		createdAt, _ := time.Parse(time.RFC3339, record.CreatedAt)
		if createdAt.IsZero() {
			createdAt = time.Now()
		}

		targetHash := record.Target.SourceHash
		if targetHash == "" && record.Target.Source != "" {
			targetHash = db.HashURL(record.Target.Source)
		}

		var titlePtr, selectorJSONPtr, colorPtr, tagsJSONPtr *string
		if record.Target.Title != "" {
			t := record.Target.Title
			titlePtr = &t
		}
		if len(record.Target.Selector) > 0 {
			selectorStr := string(record.Target.Selector)
			selectorJSONPtr = &selectorStr
		}
		if record.Color != "" {
			c := record.Color
			colorPtr = &c
		}
		if len(record.Tags) > 0 {
			tagsBytes, _ := json.Marshal(record.Tags)
			tagsStr := string(tagsBytes)
			tagsJSONPtr = &tagsStr
		}

		return &db.Highlight{
			URI:          uri,
			AuthorDID:    did,
			TargetSource: record.Target.Source,
			TargetHash:   targetHash,
			TargetTitle:  titlePtr,
			SelectorJSON: selectorJSONPtr,
			Color:        colorPtr,
			TagsJSON:     tagsJSONPtr,
			CreatedAt:    createdAt,
			IndexedAt:    time.Now(),
			CID:          cidPtr,
		}, nil

	case xrpc.CollectionBookmark:
		var record xrpc.BookmarkRecord
		if err := json.Unmarshal(value, &record); err != nil {
			return nil, err
		}

		createdAt, _ := time.Parse(time.RFC3339, record.CreatedAt)

		sourceHash := record.SourceHash
		if sourceHash == "" && record.Source != "" {
			sourceHash = db.HashURL(record.Source)
		}

		var titlePtr, descPtr, tagsJSONPtr *string
		if record.Title != "" {
			t := record.Title
			titlePtr = &t
		}
		if record.Description != "" {
			d := record.Description
			descPtr = &d
		}
		if len(record.Tags) > 0 {
			tagsBytes, _ := json.Marshal(record.Tags)
			tagsStr := string(tagsBytes)
			tagsJSONPtr = &tagsStr
		}

		return &db.Bookmark{
			URI:         uri,
			AuthorDID:   did,
			Source:      record.Source,
			SourceHash:  sourceHash,
			Title:       titlePtr,
			Description: descPtr,
			TagsJSON:    tagsJSONPtr,
			CreatedAt:   createdAt,
			IndexedAt:   time.Now(),
			CID:         cidPtr,
		}, nil
	}

	return nil, nil
}
