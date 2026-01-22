package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"margin.at/internal/db"
	"margin.at/internal/xrpc"
)

func (h *Handler) SyncAll(w http.ResponseWriter, r *http.Request) {
	session, err := h.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	collections := []string{
		xrpc.CollectionAnnotation,
		xrpc.CollectionHighlight,
		xrpc.CollectionBookmark,
		xrpc.CollectionReply,
		xrpc.CollectionLike,
		xrpc.CollectionCollection,
		xrpc.CollectionCollectionItem,
	}

	results := make(map[string]string)

	err = h.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		for _, collectionNSID := range collections {
			count := 0
			cursor := ""
			fetchedURIs := make(map[string]bool)

			for {
				url := fmt.Sprintf("%s/xrpc/com.atproto.repo.listRecords?repo=%s&collection=%s&limit=100", client.PDS, did, collectionNSID)
				if cursor != "" {
					url += "&cursor=" + cursor
				}

				req, _ := http.NewRequestWithContext(r.Context(), "GET", url, nil)
				req.Header.Set("Authorization", "Bearer "+client.AccessToken)

				resp, err := http.DefaultClient.Do(req)
				if err != nil {
					return fmt.Errorf("failed to fetch %s: %w", collectionNSID, err)
				}
				defer resp.Body.Close()

				if resp.StatusCode != 200 {
					body, _ := io.ReadAll(resp.Body)
					results[collectionNSID] = fmt.Sprintf("error: %s", string(body))
					break
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
					err := h.upsertRecord(did, collectionNSID, rec.URI, rec.CID, rec.Value)
					if err != nil {
						fmt.Printf("Error upserting %s: %v\n", rec.URI, err)
					} else {
						count++
						fetchedURIs[rec.URI] = true
					}
				}

				if output.Cursor == "" {
					break
				}
				cursor = output.Cursor
			}

			deletedCount := 0
			if results[collectionNSID] == "" {
				var localURIs []string
				var err error

				switch collectionNSID {
				case xrpc.CollectionAnnotation:
					localURIs, err = h.db.GetAnnotationURIs(did)
				case xrpc.CollectionHighlight:
					localURIs, err = h.db.GetHighlightURIs(did)
				case xrpc.CollectionBookmark:
					localURIs, err = h.db.GetBookmarkURIs(did)
				}

				if err == nil {
					for _, uri := range localURIs {
						if !fetchedURIs[uri] {
							switch collectionNSID {
							case xrpc.CollectionAnnotation:
								_ = h.db.DeleteAnnotation(uri)
							case xrpc.CollectionHighlight:
								_ = h.db.DeleteHighlight(uri)
							case xrpc.CollectionBookmark:
								_ = h.db.DeleteBookmark(uri)
							}
							deletedCount++
						}
					}
				}
			}

			if results[collectionNSID] == "" {
				results[collectionNSID] = fmt.Sprintf("synced %d records, deleted %d stale", count, deletedCount)
			}
		}
		return nil
	})

	if err != nil {
		http.Error(w, "Sync failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(results)
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func (h *Handler) upsertRecord(did, collection, uri, cid string, value json.RawMessage) error {
	cidPtr := strPtr(cid)
	switch collection {
	case xrpc.CollectionAnnotation:
		var record xrpc.AnnotationRecord
		if err := json.Unmarshal(value, &record); err != nil {
			return err
		}

		createdAt, _ := time.Parse(time.RFC3339, record.CreatedAt)

		targetSource := record.Target.Source
		if targetSource == "" {

		}

		targetHash := record.Target.SourceHash
		if targetHash == "" && targetSource != "" {
			targetHash = db.HashURL(targetSource)
		}

		motivation := record.Motivation
		if motivation == "" {
			motivation = "commenting"
		}

		var bodyValuePtr, bodyFormatPtr, bodyURIPtr, targetTitlePtr, selectorJSONPtr, tagsJSONPtr *string
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

		return h.db.CreateAnnotation(&db.Annotation{
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
		})

	case xrpc.CollectionHighlight:
		var record xrpc.HighlightRecord
		if err := json.Unmarshal(value, &record); err != nil {
			return err
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

		return h.db.CreateHighlight(&db.Highlight{
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
		})

	case xrpc.CollectionBookmark:
		var record xrpc.BookmarkRecord
		if err := json.Unmarshal(value, &record); err != nil {
			return err
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

		return h.db.CreateBookmark(&db.Bookmark{
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
		})

	case xrpc.CollectionCollection:
		var record xrpc.CollectionRecord
		if err := json.Unmarshal(value, &record); err != nil {
			return err
		}
		createdAt, _ := time.Parse(time.RFC3339, record.CreatedAt)

		var descPtr, iconPtr *string
		if record.Description != "" {
			d := record.Description
			descPtr = &d
		}
		if record.Icon != "" {
			i := record.Icon
			iconPtr = &i
		}

		return h.db.CreateCollection(&db.Collection{
			URI:         uri,
			AuthorDID:   did,
			Name:        record.Name,
			Description: descPtr,
			Icon:        iconPtr,
			CreatedAt:   createdAt,
			IndexedAt:   time.Now(),
		})

	case xrpc.CollectionCollectionItem:
		var record xrpc.CollectionItemRecord
		if err := json.Unmarshal(value, &record); err != nil {
			return err
		}
		createdAt, _ := time.Parse(time.RFC3339, record.CreatedAt)

		return h.db.AddToCollection(&db.CollectionItem{
			URI:           uri,
			AuthorDID:     did,
			CollectionURI: record.Collection,
			AnnotationURI: record.Annotation,
			Position:      record.Position,
			CreatedAt:     createdAt,
			IndexedAt:     time.Now(),
		})

	case xrpc.CollectionReply:
		return nil
	case xrpc.CollectionLike:
		return nil
	}
	return nil
}
