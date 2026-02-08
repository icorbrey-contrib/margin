package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"margin.at/internal/config"
	"margin.at/internal/constellation"
	"margin.at/internal/db"
)

var (
	Cache               ProfileCache          = NewInMemoryCache(5 * time.Minute)
	ConstellationClient *constellation.Client = constellation.NewClient() // Enabled by default
)

func init() {
	log.Printf("Constellation client initialized: %s", constellation.DefaultBaseURL)
}

type Author struct {
	DID         string `json:"did"`
	Handle      string `json:"handle"`
	DisplayName string `json:"displayName,omitempty"`
	Avatar      string `json:"avatar,omitempty"`
}

type APISelector struct {
	Type       string `json:"type"`
	Exact      string `json:"exact,omitempty"`
	Prefix     string `json:"prefix,omitempty"`
	Suffix     string `json:"suffix,omitempty"`
	Start      *int   `json:"start,omitempty"`
	End        *int   `json:"end,omitempty"`
	Value      string `json:"value,omitempty"`
	ConformsTo string `json:"conformsTo,omitempty"`
}

type APIBody struct {
	Value  string `json:"value,omitempty"`
	Format string `json:"format,omitempty"`
	URI    string `json:"uri,omitempty"`
}

type APITarget struct {
	Source   string       `json:"source"`
	Title    string       `json:"title,omitempty"`
	Selector *APISelector `json:"selector,omitempty"`
}

type APIGenerator struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Name string `json:"name"`
}

type APIAnnotation struct {
	ID             string        `json:"id"`
	CID            string        `json:"cid"`
	Type           string        `json:"type"`
	Motivation     string        `json:"motivation,omitempty"`
	Author         Author        `json:"creator"`
	Body           *APIBody      `json:"body,omitempty"`
	Target         APITarget     `json:"target"`
	Tags           []string      `json:"tags,omitempty"`
	Generator      *APIGenerator `json:"generator,omitempty"`
	CreatedAt      time.Time     `json:"created"`
	IndexedAt      time.Time     `json:"indexed"`
	LikeCount      int           `json:"likeCount"`
	ReplyCount     int           `json:"replyCount"`
	ViewerHasLiked bool          `json:"viewerHasLiked"`
}

type APIHighlight struct {
	ID             string    `json:"id"`
	Type           string    `json:"type"`
	Motivation     string    `json:"motivation"`
	Author         Author    `json:"creator"`
	Target         APITarget `json:"target"`
	Color          string    `json:"color,omitempty"`
	Tags           []string  `json:"tags,omitempty"`
	CreatedAt      time.Time `json:"created"`
	CID            string    `json:"cid,omitempty"`
	LikeCount      int       `json:"likeCount"`
	ReplyCount     int       `json:"replyCount"`
	ViewerHasLiked bool      `json:"viewerHasLiked"`
}

type APIBookmark struct {
	ID             string    `json:"id"`
	Type           string    `json:"type"`
	Motivation     string    `json:"motivation"`
	Author         Author    `json:"creator"`
	Source         string    `json:"source"`
	Title          string    `json:"title,omitempty"`
	Description    string    `json:"description,omitempty"`
	Tags           []string  `json:"tags,omitempty"`
	CreatedAt      time.Time `json:"created"`
	CID            string    `json:"cid,omitempty"`
	LikeCount      int       `json:"likeCount"`
	ReplyCount     int       `json:"replyCount"`
	ViewerHasLiked bool      `json:"viewerHasLiked"`
}

type APIReply struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Author    Author    `json:"creator"`
	ParentURI string    `json:"inReplyTo"`
	RootURI   string    `json:"rootUri"`
	Text      string    `json:"text"`
	Format    string    `json:"format,omitempty"`
	CreatedAt time.Time `json:"created"`
	CID       string    `json:"cid,omitempty"`
}

type APICollection struct {
	URI         string    `json:"uri"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Icon        string    `json:"icon,omitempty"`
	Creator     Author    `json:"creator"`
	CreatedAt   time.Time `json:"createdAt"`
	IndexedAt   time.Time `json:"indexedAt"`
}

type APICollectionItem struct {
	ID            string         `json:"id"`
	Type          string         `json:"type"`
	Author        Author         `json:"creator"`
	CollectionURI string         `json:"collectionUri"`
	Collection    *APICollection `json:"collection,omitempty"`
	Annotation    *APIAnnotation `json:"annotation,omitempty"`
	Highlight     *APIHighlight  `json:"highlight,omitempty"`
	Bookmark      *APIBookmark   `json:"bookmark,omitempty"`
	CreatedAt     time.Time      `json:"created"`
	Position      int            `json:"position"`
}

type APINotification struct {
	ID         int         `json:"id"`
	Recipient  Author      `json:"recipient"`
	Actor      Author      `json:"actor"`
	Type       string      `json:"type"`
	SubjectURI string      `json:"subjectUri"`
	Subject    interface{} `json:"subject,omitempty"`
	CreatedAt  time.Time   `json:"createdAt"`
	ReadAt     *time.Time  `json:"readAt,omitempty"`
}

func fetchCounts(ctx context.Context, database *db.DB, uris []string, viewerDID string) (likeCounts, replyCounts map[string]int, viewerLikes map[string]bool) {
	likeCounts = make(map[string]int)
	replyCounts = make(map[string]int)
	viewerLikes = make(map[string]bool)

	if len(uris) == 0 {
		return
	}

	if database != nil {
		likeCounts, _ = database.GetLikeCounts(uris)
		replyCounts, _ = database.GetReplyCounts(uris)
		if viewerDID != "" {
			viewerLikes, _ = database.GetViewerLikes(viewerDID, uris)
		}
	}

	if ConstellationClient != nil && len(uris) <= 5 {
		constellationCounts, err := ConstellationClient.GetCountsBatch(ctx, uris)
		if err != nil {
			log.Printf("Constellation fetch error (non-fatal): %v", err)
			return
		}

		for uri, counts := range constellationCounts {
			if counts.LikeCount > likeCounts[uri] {
				likeCounts[uri] = counts.LikeCount
			}
			if counts.ReplyCount > replyCounts[uri] {
				replyCounts[uri] = counts.ReplyCount
			}
		}
	}

	return
}

func hydrateAnnotations(database *db.DB, annotations []db.Annotation, viewerDID string) ([]APIAnnotation, error) {
	if len(annotations) == 0 {
		return []APIAnnotation{}, nil
	}

	profiles := fetchProfilesForDIDs(database, collectDIDs(annotations, func(a db.Annotation) string { return a.AuthorDID }))

	uris := make([]string, len(annotations))
	for i, a := range annotations {
		uris[i] = a.URI
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	likeCounts, replyCounts, viewerLikes := fetchCounts(ctx, database, uris, viewerDID)

	result := make([]APIAnnotation, len(annotations))
	for i, a := range annotations {
		var body *APIBody
		if a.BodyValue != nil || a.BodyURI != nil {
			body = &APIBody{}
			if a.BodyValue != nil {
				body.Value = *a.BodyValue
			}
			if a.BodyFormat != nil {
				body.Format = *a.BodyFormat
			}
			if a.BodyURI != nil {
				body.URI = *a.BodyURI
			}
		}

		var selector *APISelector
		if a.SelectorJSON != nil && *a.SelectorJSON != "" {
			selector = &APISelector{}
			json.Unmarshal([]byte(*a.SelectorJSON), selector)
		}

		var tags []string
		if a.TagsJSON != nil && *a.TagsJSON != "" {
			json.Unmarshal([]byte(*a.TagsJSON), &tags)
		}

		title := ""
		if a.TargetTitle != nil {
			title = *a.TargetTitle
		}

		cid := ""
		if a.CID != nil {
			cid = *a.CID
		}

		result[i] = APIAnnotation{
			ID:         a.URI,
			CID:        cid,
			Type:       "Annotation",
			Motivation: a.Motivation,
			Author:     profiles[a.AuthorDID],
			Body:       body,
			Target: APITarget{
				Source:   a.TargetSource,
				Title:    title,
				Selector: selector,
			},
			Tags: tags,
			Generator: &APIGenerator{
				ID:   "https://margin.at",
				Type: "Software",
				Name: "Margin",
			},
			CreatedAt: a.CreatedAt,
			IndexedAt: a.IndexedAt,
		}

		result[i].LikeCount = likeCounts[a.URI]
		result[i].ReplyCount = replyCounts[a.URI]
		if viewerLikes != nil && viewerLikes[a.URI] {
			result[i].ViewerHasLiked = true
		}
	}

	return result, nil
}

func hydrateHighlights(database *db.DB, highlights []db.Highlight, viewerDID string) ([]APIHighlight, error) {
	if len(highlights) == 0 {
		return []APIHighlight{}, nil
	}

	profiles := fetchProfilesForDIDs(database, collectDIDs(highlights, func(h db.Highlight) string { return h.AuthorDID }))

	uris := make([]string, len(highlights))
	for i, h := range highlights {
		uris[i] = h.URI
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	likeCounts, replyCounts, viewerLikes := fetchCounts(ctx, database, uris, viewerDID)

	result := make([]APIHighlight, len(highlights))
	for i, h := range highlights {
		var selector *APISelector
		if h.SelectorJSON != nil && *h.SelectorJSON != "" {
			selector = &APISelector{}
			json.Unmarshal([]byte(*h.SelectorJSON), selector)
		}

		var tags []string
		if h.TagsJSON != nil && *h.TagsJSON != "" {
			json.Unmarshal([]byte(*h.TagsJSON), &tags)
		}

		title := ""
		if h.TargetTitle != nil {
			title = *h.TargetTitle
		}

		color := ""
		if h.Color != nil {
			color = *h.Color
		}

		cid := ""
		if h.CID != nil {
			cid = *h.CID
		}

		result[i] = APIHighlight{
			ID:         h.URI,
			Type:       "Highlight",
			Motivation: "highlighting",
			Author:     profiles[h.AuthorDID],
			Target: APITarget{
				Source:   h.TargetSource,
				Title:    title,
				Selector: selector,
			},
			Color:     color,
			Tags:      tags,
			CreatedAt: h.CreatedAt,
			CID:       cid,
		}

		result[i].LikeCount = likeCounts[h.URI]
		result[i].ReplyCount = replyCounts[h.URI]
		if viewerLikes != nil && viewerLikes[h.URI] {
			result[i].ViewerHasLiked = true
		}
	}

	return result, nil
}

func hydrateBookmarks(database *db.DB, bookmarks []db.Bookmark, viewerDID string) ([]APIBookmark, error) {
	if len(bookmarks) == 0 {
		return []APIBookmark{}, nil
	}

	profiles := fetchProfilesForDIDs(database, collectDIDs(bookmarks, func(b db.Bookmark) string { return b.AuthorDID }))

	uris := make([]string, len(bookmarks))
	for i, b := range bookmarks {
		uris[i] = b.URI
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	likeCounts, replyCounts, viewerLikes := fetchCounts(ctx, database, uris, viewerDID)

	result := make([]APIBookmark, len(bookmarks))
	for i, b := range bookmarks {
		var tags []string
		if b.TagsJSON != nil && *b.TagsJSON != "" {
			json.Unmarshal([]byte(*b.TagsJSON), &tags)
		}

		title := ""
		if b.Title != nil {
			title = *b.Title
		}

		desc := ""
		if b.Description != nil {
			desc = *b.Description
		}

		cid := ""
		if b.CID != nil {
			cid = *b.CID
		}

		result[i] = APIBookmark{
			ID:          b.URI,
			Type:        "Bookmark",
			Motivation:  "bookmarking",
			Author:      profiles[b.AuthorDID],
			Source:      b.Source,
			Title:       title,
			Description: desc,
			Tags:        tags,
			CreatedAt:   b.CreatedAt,
			CID:         cid,
		}
		result[i].LikeCount = likeCounts[b.URI]
		result[i].ReplyCount = replyCounts[b.URI]
		if viewerLikes != nil && viewerLikes[b.URI] {
			result[i].ViewerHasLiked = true
		}
	}

	return result, nil
}

func hydrateReplies(database *db.DB, replies []db.Reply) ([]APIReply, error) {
	if len(replies) == 0 {
		return []APIReply{}, nil
	}

	profiles := fetchProfilesForDIDs(database, collectDIDs(replies, func(r db.Reply) string { return r.AuthorDID }))

	result := make([]APIReply, len(replies))
	for i, r := range replies {
		format := "text/plain"
		if r.Format != nil {
			format = *r.Format
		}

		cid := ""
		if r.CID != nil {
			cid = *r.CID
		}

		result[i] = APIReply{
			ID:        r.URI,
			Type:      "Reply",
			Author:    profiles[r.AuthorDID],
			ParentURI: r.ParentURI,
			RootURI:   r.RootURI,
			Text:      r.Text,
			Format:    format,
			CreatedAt: r.CreatedAt,
			CID:       cid,
		}
	}
	return result, nil
}

func collectDIDs[T any](items []T, getDID func(T) string) []string {
	uniqueDIDs := make(map[string]bool)
	for _, item := range items {
		uniqueDIDs[getDID(item)] = true
	}

	dids := make([]string, 0, len(uniqueDIDs))
	for did := range uniqueDIDs {
		dids = append(dids, did)
	}
	return dids
}

func fetchProfilesForDIDs(database *db.DB, dids []string) map[string]Author {
	profiles := make(map[string]Author)
	missingDIDs := make([]string, 0)

	for _, did := range dids {
		if author, ok := Cache.Get(did); ok {
			profiles[did] = author
		} else {
			missingDIDs = append(missingDIDs, did)
		}
	}

	if len(missingDIDs) > 0 {
		batchSize := 25
		var wg sync.WaitGroup
		var mu sync.Mutex

		for i := 0; i < len(missingDIDs); i += batchSize {
			end := i + batchSize
			if end > len(missingDIDs) {
				end = len(missingDIDs)
			}
			batch := missingDIDs[i:end]

			wg.Add(1)
			go func(actors []string) {
				defer wg.Done()
				fetched, err := fetchProfiles(actors)
				if err == nil {
					mu.Lock()
					defer mu.Unlock()
					for k, v := range fetched {
						profiles[k] = v
					}
				}
			}(batch)
		}
		wg.Wait()
	}

	if database != nil && len(dids) > 0 {
		marginProfiles, err := database.GetProfilesByDIDs(dids)
		if err == nil {
			for did, mp := range marginProfiles {
				author, exists := profiles[did]
				if !exists {
					author = Author{
						DID: did,
					}
				}

				if mp.DisplayName != nil && *mp.DisplayName != "" {
					author.DisplayName = *mp.DisplayName
				}
				if mp.Avatar != nil && *mp.Avatar != "" {
					author.Avatar = getProxiedAvatarURL(did, *mp.Avatar)
				}
				profiles[did] = author

				Cache.Set(did, author)
			}
		}
	}

	return profiles
}

func fetchProfiles(dids []string) (map[string]Author, error) {
	if len(dids) == 0 {
		return nil, nil
	}

	q := url.Values{}
	for _, did := range dids {
		q.Add("actors", did)
	}

	resp, err := http.Get(config.Get().BskyGetProfilesURL() + "?" + q.Encode())
	if err != nil {
		log.Printf("Hydration fetch error: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Printf("Hydration fetch status error: %d\n", resp.StatusCode)
		return nil, fmt.Errorf("failed to fetch profiles: %d", resp.StatusCode)
	}

	var output struct {
		Profiles []struct {
			DID         string `json:"did"`
			Handle      string `json:"handle"`
			DisplayName string `json:"displayName"`
			Avatar      string `json:"avatar"`
		} `json:"profiles"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&output); err != nil {
		return nil, err
	}

	result := make(map[string]Author)
	for _, p := range output.Profiles {
		result[p.DID] = Author{
			DID:         p.DID,
			Handle:      p.Handle,
			DisplayName: p.DisplayName,
			Avatar:      getProxiedAvatarURL(p.DID, p.Avatar),
		}
	}

	return result, nil
}

func hydrateCollectionItems(database *db.DB, items []db.CollectionItem, viewerDID string) ([]APICollectionItem, error) {
	if len(items) == 0 {
		return []APICollectionItem{}, nil
	}

	profiles := fetchProfilesForDIDs(database, collectDIDs(items, func(i db.CollectionItem) string { return i.AuthorDID }))

	var collectionURIs []string
	var annotationURIs []string
	var highlightURIs []string
	var bookmarkURIs []string

	for _, item := range items {
		collectionURIs = append(collectionURIs, item.CollectionURI)
		if strings.Contains(item.AnnotationURI, "at.margin.annotation") {
			annotationURIs = append(annotationURIs, item.AnnotationURI)
		} else if strings.Contains(item.AnnotationURI, "at.margin.highlight") {
			highlightURIs = append(highlightURIs, item.AnnotationURI)
		} else if strings.Contains(item.AnnotationURI, "at.margin.bookmark") {
			bookmarkURIs = append(bookmarkURIs, item.AnnotationURI)
		} else if strings.Contains(item.AnnotationURI, "network.cosmik.card") {
			annotationURIs = append(annotationURIs, item.AnnotationURI)
			bookmarkURIs = append(bookmarkURIs, item.AnnotationURI)
		}
	}

	collectionsMap := make(map[string]APICollection)
	if len(collectionURIs) > 0 {
		colls, err := database.GetCollectionsByURIs(collectionURIs)
		if err == nil {
			collProfiles := fetchProfilesForDIDs(database, collectDIDs(colls, func(c db.Collection) string { return c.AuthorDID }))
			for _, coll := range colls {
				icon := ""
				if coll.Icon != nil {
					icon = *coll.Icon
				}
				desc := ""
				if coll.Description != nil {
					desc = *coll.Description
				}
				collectionsMap[coll.URI] = APICollection{
					URI:         coll.URI,
					Name:        coll.Name,
					Description: desc,
					Icon:        icon,
					Creator:     collProfiles[coll.AuthorDID],
					CreatedAt:   coll.CreatedAt,
					IndexedAt:   coll.IndexedAt,
				}
			}
		}
	}

	annotationsMap := make(map[string]APIAnnotation)
	if len(annotationURIs) > 0 {
		rawAnnos, err := database.GetAnnotationsByURIs(annotationURIs)
		if err == nil {
			hydrated, _ := hydrateAnnotations(database, rawAnnos, viewerDID)
			for _, a := range hydrated {
				annotationsMap[a.ID] = a
			}
		}
	}

	highlightsMap := make(map[string]APIHighlight)
	if len(highlightURIs) > 0 {
		rawHighlights, err := database.GetHighlightsByURIs(highlightURIs)
		if err == nil {
			hydrated, _ := hydrateHighlights(database, rawHighlights, viewerDID)
			for _, h := range hydrated {
				highlightsMap[h.ID] = h
			}
		}
	}

	bookmarksMap := make(map[string]APIBookmark)
	if len(bookmarkURIs) > 0 {
		rawBookmarks, err := database.GetBookmarksByURIs(bookmarkURIs)
		if err == nil {
			hydrated, _ := hydrateBookmarks(database, rawBookmarks, viewerDID)
			for _, b := range hydrated {
				bookmarksMap[b.ID] = b
			}
		}
	}

	var result []APICollectionItem
	for _, item := range items {
		apiItem := APICollectionItem{
			ID:            item.URI,
			Type:          "CollectionItem",
			Author:        profiles[item.AuthorDID],
			CollectionURI: item.CollectionURI,
			CreatedAt:     item.CreatedAt,
			Position:      item.Position,
		}

		if coll, ok := collectionsMap[item.CollectionURI]; ok {
			apiItem.Collection = &coll
		}

		isValid := false
		if val, ok := annotationsMap[item.AnnotationURI]; ok {
			apiItem.Annotation = &val
			isValid = true
		} else if val, ok := highlightsMap[item.AnnotationURI]; ok {
			apiItem.Highlight = &val
			isValid = true
		} else if val, ok := bookmarksMap[item.AnnotationURI]; ok {
			apiItem.Bookmark = &val
			isValid = true
		} else if strings.Contains(item.AnnotationURI, "network.cosmik.card") {
			apiItem.Annotation = &APIAnnotation{
				ID:   item.AnnotationURI,
				Type: "Semble Card",
				Target: APITarget{
					Source: "https://semble.so",
					Title:  "Content Unavailable",
				},
				CreatedAt: item.CreatedAt,
				Author:    profiles[item.AuthorDID],
			}
			isValid = true
		}

		if isValid && apiItem.Collection != nil {
			result = append(result, apiItem)
		}
	}
	return result, nil
}

func hydrateNotifications(database *db.DB, notifications []db.Notification) ([]APINotification, error) {
	if len(notifications) == 0 {
		return []APINotification{}, nil
	}

	dids := make([]string, 0)
	uniqueDIDs := make(map[string]bool)
	for _, n := range notifications {
		if !uniqueDIDs[n.ActorDID] {
			dids = append(dids, n.ActorDID)
			uniqueDIDs[n.ActorDID] = true
		}
		if !uniqueDIDs[n.RecipientDID] {
			dids = append(dids, n.RecipientDID)
			uniqueDIDs[n.RecipientDID] = true
		}
	}

	profiles := fetchProfilesForDIDs(database, dids)

	replyURIs := make([]string, 0)
	for _, n := range notifications {
		if n.Type == "reply" {
			replyURIs = append(replyURIs, n.SubjectURI)
		}
	}

	replyMap := make(map[string]APIReply)
	if len(replyURIs) > 0 {
		replies, err := database.GetRepliesByURIs(replyURIs)
		if err == nil {
			hydratedReplies, _ := hydrateReplies(database, replies)
			for _, r := range hydratedReplies {
				replyMap[r.ID] = r
			}
		}
	}

	result := make([]APINotification, len(notifications))
	for i, n := range notifications {
		var subject interface{}
		if n.Type == "reply" {
			if val, ok := replyMap[n.SubjectURI]; ok {
				subject = val
			}
		}

		result[i] = APINotification{
			ID:         n.ID,
			Recipient:  profiles[n.RecipientDID],
			Actor:      profiles[n.ActorDID],
			Type:       n.Type,
			SubjectURI: n.SubjectURI,
			Subject:    subject,
			CreatedAt:  n.CreatedAt,
			ReadAt:     n.ReadAt,
		}
	}

	return result, nil
}
