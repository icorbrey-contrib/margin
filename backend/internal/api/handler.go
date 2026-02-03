package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"margin.at/internal/db"
	internal_sync "margin.at/internal/sync"
	"margin.at/internal/xrpc"
)

type Handler struct {
	db                *db.DB
	annotationService *AnnotationService
	refresher         *TokenRefresher
	apiKeys           *APIKeyHandler
	syncService       *internal_sync.Service
}

func NewHandler(database *db.DB, annotationService *AnnotationService, refresher *TokenRefresher, syncService *internal_sync.Service) *Handler {
	return &Handler{
		db:                database,
		annotationService: annotationService,
		refresher:         refresher,
		apiKeys:           NewAPIKeyHandler(database, refresher),
		syncService:       syncService,
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/health", h.Health)

	r.Route("/api", func(r chi.Router) {
		r.Get("/annotations", h.GetAnnotations)
		r.Get("/annotations/feed", h.GetFeed)
		r.Get("/annotation", h.GetAnnotation)
		r.Get("/annotations/history", h.GetEditHistory)
		r.Put("/annotations", h.annotationService.UpdateAnnotation)

		r.Get("/highlights", h.GetHighlights)
		r.Put("/highlights", h.annotationService.UpdateHighlight)

		r.Get("/bookmarks", h.GetBookmarks)
		r.Post("/bookmarks", h.annotationService.CreateBookmark)
		r.Put("/bookmarks", h.annotationService.UpdateBookmark)

		collectionService := NewCollectionService(h.db, h.refresher)
		r.Post("/collections", collectionService.CreateCollection)
		r.Get("/collections", collectionService.GetCollections)
		r.Put("/collections", collectionService.UpdateCollection)
		r.Delete("/collections", collectionService.DeleteCollection)
		r.Post("/collections/{collection}/items", collectionService.AddCollectionItem)
		r.Get("/collections/{collection}/items", collectionService.GetCollectionItems)
		r.Delete("/collections/items", collectionService.RemoveCollectionItem)
		r.Get("/collections/containing", collectionService.GetAnnotationCollections)
		r.Get("/collection", collectionService.GetCollection)
		r.Post("/sync", h.SyncAll)

		r.Get("/targets", h.GetByTarget)
		r.Get("/discover", h.DiscoverForURL)

		r.Get("/users/{did}/annotations", h.GetUserAnnotations)
		r.Get("/users/{did}/highlights", h.GetUserHighlights)
		r.Get("/users/{did}/bookmarks", h.GetUserBookmarks)
		r.Get("/users/{did}/targets", h.GetUserTargetItems)

		r.Get("/replies", h.GetReplies)
		r.Get("/likes", h.GetLikeCount)
		r.Get("/url-metadata", h.GetURLMetadata)
		r.Get("/notifications", h.GetNotifications)
		r.Get("/notifications/count", h.GetUnreadNotificationCount)
		r.Post("/notifications/read", h.MarkNotificationsRead)
		r.Get("/avatar/{did}", h.HandleAvatarProxy)

		r.Post("/keys", h.apiKeys.CreateKey)
		r.Get("/keys", h.apiKeys.ListKeys)
		r.Delete("/keys/{id}", h.apiKeys.DeleteKey)

		r.Post("/quick/bookmark", h.apiKeys.QuickBookmark)
		r.Post("/quick/save", h.apiKeys.QuickSave)
	})
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "version": "1.0"})
}

func (h *Handler) GetAnnotations(w http.ResponseWriter, r *http.Request) {
	source := r.URL.Query().Get("source")
	if source == "" {
		source = r.URL.Query().Get("url")
	}

	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)
	motivation := r.URL.Query().Get("motivation")
	tag := r.URL.Query().Get("tag")

	var annotations []db.Annotation
	var err error

	if source != "" {
		urlHash := db.HashURL(source)
		annotations, err = h.db.GetAnnotationsByTargetHash(urlHash, limit, offset)
	} else if motivation != "" {
		annotations, err = h.db.GetAnnotationsByMotivation(motivation, limit, offset)
	} else if tag != "" {
		annotations, err = h.db.GetAnnotationsByTag(tag, limit, offset)
	} else {
		annotations, err = h.db.GetRecentAnnotations(limit, offset)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateAnnotations(h.db, annotations, h.getViewerDID(r))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "AnnotationCollection",
		"items":      enriched,
		"totalItems": len(enriched),
	})
}

func (h *Handler) GetFeed(w http.ResponseWriter, r *http.Request) {
	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)
	tag := r.URL.Query().Get("tag")
	creator := r.URL.Query().Get("creator")
	feedType := r.URL.Query().Get("type")

	viewerDID := h.getViewerDID(r)

	if viewerDID != "" && (creator == viewerDID || (creator == "" && tag == "" && feedType == "my-feed")) {
		if creator == viewerDID {
			h.serveUserFeedFromPDS(w, r, viewerDID, tag, limit, offset)
			return
		}
	}

	var annotations []db.Annotation
	var highlights []db.Highlight
	var bookmarks []db.Bookmark
	var collectionItems []db.CollectionItem
	var err error

	motivation := r.URL.Query().Get("motivation")

	fetchLimit := limit + offset

	if tag != "" {
		if creator != "" {
			if motivation == "" || motivation == "commenting" {
				switch feedType {
				case "margin":
					annotations, _ = h.db.GetMarginAnnotationsByTagAndAuthor(tag, creator, fetchLimit, 0)
				case "semble":
					annotations, _ = h.db.GetSembleAnnotationsByTagAndAuthor(tag, creator, fetchLimit, 0)
				default:
					annotations, _ = h.db.GetAnnotationsByTagAndAuthor(tag, creator, fetchLimit, 0)
				}
			}
			if motivation == "" || motivation == "highlighting" {
				switch feedType {
				case "margin":
					highlights, _ = h.db.GetMarginHighlightsByTagAndAuthor(tag, creator, fetchLimit, 0)
				case "semble":
					highlights, _ = h.db.GetSembleHighlightsByTagAndAuthor(tag, creator, fetchLimit, 0)
				default:
					highlights, _ = h.db.GetHighlightsByTagAndAuthor(tag, creator, fetchLimit, 0)
				}
			}
			if motivation == "" || motivation == "bookmarking" {
				switch feedType {
				case "margin":
					bookmarks, _ = h.db.GetMarginBookmarksByTagAndAuthor(tag, creator, fetchLimit, 0)
				case "semble":
					bookmarks, _ = h.db.GetSembleBookmarksByTagAndAuthor(tag, creator, fetchLimit, 0)
				default:
					bookmarks, _ = h.db.GetBookmarksByTagAndAuthor(tag, creator, fetchLimit, 0)
				}
			}
			collectionItems = []db.CollectionItem{}
		} else {
			if motivation == "" || motivation == "commenting" {
				switch feedType {
				case "margin":
					annotations, _ = h.db.GetMarginAnnotationsByTag(tag, fetchLimit, 0)
				case "semble":
					annotations, _ = h.db.GetSembleAnnotationsByTag(tag, fetchLimit, 0)
				default:
					annotations, _ = h.db.GetAnnotationsByTag(tag, fetchLimit, 0)
				}
			}
			if motivation == "" || motivation == "highlighting" {
				switch feedType {
				case "margin":
					highlights, _ = h.db.GetMarginHighlightsByTag(tag, fetchLimit, 0)
				case "semble":
					highlights, _ = h.db.GetSembleHighlightsByTag(tag, fetchLimit, 0)
				default:
					highlights, _ = h.db.GetHighlightsByTag(tag, fetchLimit, 0)
				}
			}
			if motivation == "" || motivation == "bookmarking" {
				switch feedType {
				case "margin":
					bookmarks, _ = h.db.GetMarginBookmarksByTag(tag, fetchLimit, 0)
				case "semble":
					bookmarks, _ = h.db.GetSembleBookmarksByTag(tag, fetchLimit, 0)
				default:
					bookmarks, _ = h.db.GetBookmarksByTag(tag, fetchLimit, 0)
				}
			}
			collectionItems = []db.CollectionItem{}
		}
	} else if creator != "" {
		if motivation == "" || motivation == "commenting" {
			switch feedType {
			case "margin":
				annotations, _ = h.db.GetMarginAnnotationsByAuthor(creator, fetchLimit, 0)
			case "semble":
				annotations, _ = h.db.GetSembleAnnotationsByAuthor(creator, fetchLimit, 0)
			default:
				annotations, _ = h.db.GetAnnotationsByAuthor(creator, fetchLimit, 0)
			}
		}
		if motivation == "" || motivation == "highlighting" {
			switch feedType {
			case "margin":
				highlights, _ = h.db.GetMarginHighlightsByAuthor(creator, fetchLimit, 0)
			case "semble":
				highlights, _ = h.db.GetSembleHighlightsByAuthor(creator, fetchLimit, 0)
			default:
				highlights, _ = h.db.GetHighlightsByAuthor(creator, fetchLimit, 0)
			}
		}
		if motivation == "" || motivation == "bookmarking" {
			switch feedType {
			case "margin":
				bookmarks, _ = h.db.GetMarginBookmarksByAuthor(creator, fetchLimit, 0)
			case "semble":
				bookmarks, _ = h.db.GetSembleBookmarksByAuthor(creator, fetchLimit, 0)
			default:
				bookmarks, _ = h.db.GetBookmarksByAuthor(creator, fetchLimit, 0)
			}
		}
		collectionItems = []db.CollectionItem{}
	} else {
		if motivation == "" || motivation == "commenting" {
			switch feedType {
			case "margin":
				annotations, _ = h.db.GetMarginAnnotations(fetchLimit, 0)
			case "semble":
				annotations, _ = h.db.GetSembleAnnotations(fetchLimit, 0)
			default:
				annotations, _ = h.db.GetRecentAnnotations(fetchLimit, 0)
			}
		}
		if motivation == "" || motivation == "highlighting" {
			switch feedType {
			case "margin":
				highlights, _ = h.db.GetMarginHighlights(fetchLimit, 0)
			case "semble":
				highlights, _ = h.db.GetSembleHighlights(fetchLimit, 0)
			default:
				highlights, _ = h.db.GetRecentHighlights(fetchLimit, 0)
			}
		}
		if motivation == "" || motivation == "bookmarking" {
			switch feedType {
			case "margin":
				bookmarks, _ = h.db.GetMarginBookmarks(fetchLimit, 0)
			case "semble":
				bookmarks, _ = h.db.GetSembleBookmarks(fetchLimit, 0)
			default:
				bookmarks, _ = h.db.GetRecentBookmarks(fetchLimit, 0)
			}
		}
		if motivation == "" {
			collectionItems, err = h.db.GetRecentCollectionItems(fetchLimit, 0)
			if err != nil {
				log.Printf("Error fetching collection items: %v\n", err)
			}
		}
	}

	authAnnos, _ := hydrateAnnotations(h.db, annotations, viewerDID)
	authHighs, _ := hydrateHighlights(h.db, highlights, viewerDID)
	authBooks, _ := hydrateBookmarks(h.db, bookmarks, viewerDID)

	if len(collectionItems) > 0 {
		var sembleURIs []string
		for _, item := range collectionItems {
			if strings.Contains(item.AnnotationURI, "network.cosmik.card") {
				sembleURIs = append(sembleURIs, item.AnnotationURI)
			}
		}
		if len(sembleURIs) > 0 {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()
			ensureSembleCardsIndexed(ctx, h.db, sembleURIs)
		}
	}

	authCollectionItems, _ := hydrateCollectionItems(h.db, collectionItems, viewerDID)

	var feed []interface{}
	for _, a := range authAnnos {
		feed = append(feed, a)
	}
	for _, h := range authHighs {
		feed = append(feed, h)
	}
	for _, b := range authBooks {
		feed = append(feed, b)
	}
	for _, ci := range authCollectionItems {
		feed = append(feed, ci)
	}

	if feedType != "" && feedType != "all" && feedType != "my-feed" {
		var filtered []interface{}
		for _, item := range feed {
			isSemble := false
			var uri string
			switch v := item.(type) {
			case APIAnnotation:
				uri = v.ID
			case APIHighlight:
				uri = v.ID
			case APIBookmark:
				uri = v.ID
			case APICollectionItem:
				uri = v.ID
			}
			if strings.Contains(uri, "network.cosmik") {
				isSemble = true
			}

			if feedType == "semble" && isSemble {
				filtered = append(filtered, item)
			} else if feedType == "margin" && !isSemble {
				filtered = append(filtered, item)
			} else if feedType == "popular" {
				filtered = append(filtered, item)
			}
		}
		feed = filtered
	}

	if feedType == "popular" {
		sortFeedByPopularity(feed)
	} else {
		sortFeed(feed)
	}

	if offset < len(feed) {
		feed = feed[offset:]
	} else {
		feed = []interface{}{}
	}

	if len(feed) > limit {
		feed = feed[:limit]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "Collection",
		"items":      feed,
		"totalItems": len(feed),
	})
}

func (h *Handler) serveUserFeedFromPDS(w http.ResponseWriter, r *http.Request, did, tag string, limit, offset int) {
	var wg sync.WaitGroup
	var rawAnnos, rawHighs, rawBooks []interface{}
	var errAnnos, errHighs, errBooks error

	fetchLimit := limit + offset
	if fetchLimit < 50 {
		fetchLimit = 50
	}

	wg.Add(3)
	go func() {
		defer wg.Done()
		rawAnnos, errAnnos = h.FetchLatestUserRecords(r, did, xrpc.CollectionAnnotation, fetchLimit)
	}()
	go func() {
		defer wg.Done()
		rawHighs, errHighs = h.FetchLatestUserRecords(r, did, xrpc.CollectionHighlight, fetchLimit)
	}()
	go func() {
		defer wg.Done()
		rawBooks, errBooks = h.FetchLatestUserRecords(r, did, xrpc.CollectionBookmark, fetchLimit)
	}()
	wg.Wait()

	if errAnnos != nil {
		log.Printf("PDS Fetch Error (Annos): %v", errAnnos)
	}
	if errHighs != nil {
		log.Printf("PDS Fetch Error (Highs): %v", errHighs)
	}
	if errBooks != nil {
		log.Printf("PDS Fetch Error (Books): %v", errBooks)
	}

	var annotations []db.Annotation
	var highlights []db.Highlight
	var bookmarks []db.Bookmark

	for _, r := range rawAnnos {
		if a, ok := r.(*db.Annotation); ok {
			if tag == "" || containsTag(a.TagsJSON, tag) {
				annotations = append(annotations, *a)
			}
		}
	}
	for _, r := range rawHighs {
		if h, ok := r.(*db.Highlight); ok {
			if tag == "" || containsTag(h.TagsJSON, tag) {
				highlights = append(highlights, *h)
			}
		}
	}
	for _, r := range rawBooks {
		if b, ok := r.(*db.Bookmark); ok {
			if tag == "" || containsTag(b.TagsJSON, tag) {
				bookmarks = append(bookmarks, *b)
			}
		}
	}

	go func() {
		for _, a := range annotations {
			h.db.CreateAnnotation(&a)
		}
		for _, hi := range highlights {
			h.db.CreateHighlight(&hi)
		}
		for _, b := range bookmarks {
			h.db.CreateBookmark(&b)
		}
	}()

	collectionItems := []db.CollectionItem{}
	if tag == "" {
		items, err := h.db.GetCollectionItemsByAuthor(did)
		if err != nil {
			log.Printf("Error fetching collection items for user feed: %v", err)
		} else {
			collectionItems = items
		}
	}

	if len(collectionItems) > 0 {
		var sembleURIs []string
		for _, item := range collectionItems {
			if strings.Contains(item.AnnotationURI, "network.cosmik.card") {
				sembleURIs = append(sembleURIs, item.AnnotationURI)
			}
		}
		if len(sembleURIs) > 0 {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()
			ensureSembleCardsIndexed(ctx, h.db, sembleURIs)
		}
	}

	authAnnos, _ := hydrateAnnotations(h.db, annotations, did)
	authHighs, _ := hydrateHighlights(h.db, highlights, did)
	authBooks, _ := hydrateBookmarks(h.db, bookmarks, did)
	authCollectionItems, _ := hydrateCollectionItems(h.db, collectionItems, did)

	var feed []interface{}
	for _, a := range authAnnos {
		feed = append(feed, a)
	}
	for _, h := range authHighs {
		feed = append(feed, h)
	}
	for _, b := range authBooks {
		feed = append(feed, b)
	}
	for _, ci := range authCollectionItems {
		feed = append(feed, ci)
	}

	sortFeed(feed)

	if offset < len(feed) {
		feed = feed[offset:]
	} else {
		feed = []interface{}{}
	}

	if len(feed) > limit {
		feed = feed[:limit]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "Collection",
		"items":      feed,
		"totalItems": len(feed),
	})

}

func containsTag(tagsJSON *string, tag string) bool {
	if tagsJSON == nil || *tagsJSON == "" {
		return false
	}
	var tags []string
	if err := json.Unmarshal([]byte(*tagsJSON), &tags); err != nil {
		return false
	}
	for _, t := range tags {
		if t == tag {
			return true
		}
	}
	return false
}

func sortFeed(feed []interface{}) {
	sort.Slice(feed, func(i, j int) bool {
		t1 := getCreatedAt(feed[i])
		t2 := getCreatedAt(feed[j])
		return t1.After(t2)
	})
}

func getCreatedAt(item interface{}) time.Time {
	switch v := item.(type) {
	case APIAnnotation:
		return v.CreatedAt
	case APIHighlight:
		return v.CreatedAt
	case APIBookmark:
		return v.CreatedAt
	case APICollectionItem:
		return v.CreatedAt
	default:
		return time.Time{}
	}
}

func sortFeedByPopularity(feed []interface{}) {
	sort.Slice(feed, func(i, j int) bool {
		p1 := getPopularity(feed[i])
		p2 := getPopularity(feed[j])
		return p1 > p2
	})
}

func getPopularity(item interface{}) int {
	switch v := item.(type) {
	case APIAnnotation:
		return v.LikeCount + v.ReplyCount
	case APIHighlight:
		return v.LikeCount + v.ReplyCount
	case APIBookmark:
		return v.LikeCount + v.ReplyCount
	case APICollectionItem:
		pop := 0
		if v.Annotation != nil {
			pop += v.Annotation.LikeCount + v.Annotation.ReplyCount
		}
		if v.Highlight != nil {
			pop += v.Highlight.LikeCount + v.Highlight.ReplyCount
		}
		if v.Bookmark != nil {
			pop += v.Bookmark.LikeCount + v.Bookmark.ReplyCount
		}
		return pop
	default:
		return 0
	}
}

func (h *Handler) GetAnnotation(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	serveResponse := func(data interface{}, context string) {
		w.Header().Set("Content-Type", "application/json")
		response := map[string]interface{}{
			"@context": context,
		}
		jsonData, _ := json.Marshal(data)
		json.Unmarshal(jsonData, &response)
		json.NewEncoder(w).Encode(response)
	}

	if annotation, err := h.db.GetAnnotationByURI(uri); err == nil {
		if enriched, _ := hydrateAnnotations(h.db, []db.Annotation{*annotation}, h.getViewerDID(r)); len(enriched) > 0 {
			serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
			return
		}
	}

	if highlight, err := h.db.GetHighlightByURI(uri); err == nil {
		if enriched, _ := hydrateHighlights(h.db, []db.Highlight{*highlight}, h.getViewerDID(r)); len(enriched) > 0 {
			serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
			return
		}
	}

	if strings.Contains(uri, "at.margin.annotation") {
		highlightURI := strings.Replace(uri, "at.margin.annotation", "at.margin.highlight", 1)
		if highlight, err := h.db.GetHighlightByURI(highlightURI); err == nil {
			if enriched, _ := hydrateHighlights(h.db, []db.Highlight{*highlight}, h.getViewerDID(r)); len(enriched) > 0 {
				serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
				return
			}
		}
	}

	if strings.Contains(uri, "at.margin.annotation") || strings.Contains(uri, "at.margin.bookmark") {
		if strings.HasPrefix(uri, "at://") {
			uriWithoutScheme := strings.TrimPrefix(uri, "at://")
			parts := strings.Split(uriWithoutScheme, "/")
			if len(parts) >= 3 {
				did := parts[0]
				rkey := parts[len(parts)-1]

				sembleURI := fmt.Sprintf("at://%s/network.cosmik.card/%s", did, rkey)

				if annotation, err := h.db.GetAnnotationByURI(sembleURI); err == nil {
					if enriched, _ := hydrateAnnotations(h.db, []db.Annotation{*annotation}, h.getViewerDID(r)); len(enriched) > 0 {
						serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
						return
					}
				}

				if bookmark, err := h.db.GetBookmarkByURI(sembleURI); err == nil {
					if enriched, _ := hydrateBookmarks(h.db, []db.Bookmark{*bookmark}, h.getViewerDID(r)); len(enriched) > 0 {
						serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
						return
					}
				}
			}
		}
	}

	if bookmark, err := h.db.GetBookmarkByURI(uri); err == nil {
		if enriched, _ := hydrateBookmarks(h.db, []db.Bookmark{*bookmark}, h.getViewerDID(r)); len(enriched) > 0 {
			serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
			return
		}
	}

	if strings.Contains(uri, "at.margin.annotation") {
		bookmarkURI := strings.Replace(uri, "at.margin.annotation", "at.margin.bookmark", 1)
		if bookmark, err := h.db.GetBookmarkByURI(bookmarkURI); err == nil {
			if enriched, _ := hydrateBookmarks(h.db, []db.Bookmark{*bookmark}, h.getViewerDID(r)); len(enriched) > 0 {
				serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
				return
			}
		}
	}

	http.Error(w, "Annotation, Highlight, or Bookmark not found", http.StatusNotFound)

}

func (h *Handler) GetByTarget(w http.ResponseWriter, r *http.Request) {
	source := r.URL.Query().Get("source")
	if source == "" {
		source = r.URL.Query().Get("url")
	}
	if source == "" {
		http.Error(w, "source or url parameter required", http.StatusBadRequest)
		return
	}

	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	urlHash := db.HashURL(source)

	annotations, _ := h.db.GetAnnotationsByTargetHash(urlHash, limit, offset)
	highlights, _ := h.db.GetHighlightsByTargetHash(urlHash, limit, offset)
	bookmarks, _ := h.db.GetBookmarksByTargetHash(urlHash, limit, offset)

	enrichedAnnotations, _ := hydrateAnnotations(h.db, annotations, h.getViewerDID(r))
	enrichedHighlights, _ := hydrateHighlights(h.db, highlights, h.getViewerDID(r))
	enrichedBookmarks, _ := hydrateBookmarks(h.db, bookmarks, h.getViewerDID(r))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":    "http://www.w3.org/ns/anno.jsonld",
		"source":      source,
		"sourceHash":  urlHash,
		"annotations": enrichedAnnotations,
		"highlights":  enrichedHighlights,
		"bookmarks":   enrichedBookmarks,
	})
}

func (h *Handler) DiscoverForURL(w http.ResponseWriter, r *http.Request) {
	source := r.URL.Query().Get("source")
	if source == "" {
		source = r.URL.Query().Get("url")
	}
	if source == "" {
		http.Error(w, "source or url parameter required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	annotations, highlights, bookmarks, err := ConstellationClient.GetAllItemsForURL(ctx, source)
	if err != nil {
		log.Printf("Constellation discover error, falling back to local: %v", err)
		h.GetByTarget(w, r)
		return
	}

	var annotationURIs, highlightURIs, bookmarkURIs []string
	seenURIs := make(map[string]bool)

	for _, link := range annotations {
		if !seenURIs[link.URI] {
			annotationURIs = append(annotationURIs, link.URI)
			seenURIs[link.URI] = true
		}
	}
	for _, link := range highlights {
		if !seenURIs[link.URI] {
			highlightURIs = append(highlightURIs, link.URI)
			seenURIs[link.URI] = true
		}
	}
	for _, link := range bookmarks {
		if !seenURIs[link.URI] {
			bookmarkURIs = append(bookmarkURIs, link.URI)
			seenURIs[link.URI] = true
		}
	}

	localAnnotations, _ := h.db.GetAnnotationsByURIs(annotationURIs)
	localHighlights, _ := h.db.GetHighlightsByURIs(highlightURIs)
	localBookmarks, _ := h.db.GetBookmarksByURIs(bookmarkURIs)

	urlHash := db.HashURL(source)
	dbAnnotations, _ := h.db.GetAnnotationsByTargetHash(urlHash, 100, 0)
	dbHighlights, _ := h.db.GetHighlightsByTargetHash(urlHash, 100, 0)
	dbBookmarks, _ := h.db.GetBookmarksByTargetHash(urlHash, 100, 0)

	annoMap := make(map[string]db.Annotation)
	for _, a := range localAnnotations {
		annoMap[a.URI] = a
	}
	for _, a := range dbAnnotations {
		annoMap[a.URI] = a
	}

	highMap := make(map[string]db.Highlight)
	for _, h := range localHighlights {
		highMap[h.URI] = h
	}
	for _, h := range dbHighlights {
		highMap[h.URI] = h
	}

	bookMap := make(map[string]db.Bookmark)
	for _, b := range localBookmarks {
		bookMap[b.URI] = b
	}
	for _, b := range dbBookmarks {
		bookMap[b.URI] = b
	}

	var mergedAnnotations []db.Annotation
	for _, a := range annoMap {
		mergedAnnotations = append(mergedAnnotations, a)
	}
	var mergedHighlights []db.Highlight
	for _, h := range highMap {
		mergedHighlights = append(mergedHighlights, h)
	}
	var mergedBookmarks []db.Bookmark
	for _, b := range bookMap {
		mergedBookmarks = append(mergedBookmarks, b)
	}

	viewerDID := h.getViewerDID(r)
	enrichedAnnotations, _ := hydrateAnnotations(h.db, mergedAnnotations, viewerDID)
	enrichedHighlights, _ := hydrateHighlights(h.db, mergedHighlights, viewerDID)
	enrichedBookmarks, _ := hydrateBookmarks(h.db, mergedBookmarks, viewerDID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":          "http://www.w3.org/ns/anno.jsonld",
		"source":            source,
		"sourceHash":        urlHash,
		"annotations":       enrichedAnnotations,
		"highlights":        enrichedHighlights,
		"bookmarks":         enrichedBookmarks,
		"networkDiscovered": len(annotations) + len(highlights) + len(bookmarks),
	})
}

func (h *Handler) GetHighlights(w http.ResponseWriter, r *http.Request) {
	did := r.URL.Query().Get("creator")
	tag := r.URL.Query().Get("tag")
	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	var highlights []db.Highlight
	var err error

	if did != "" {
		highlights, err = h.db.GetHighlightsByAuthor(did, limit, offset)
	} else if tag != "" {
		highlights, err = h.db.GetHighlightsByTag(tag, limit, offset)
	} else {
		highlights, err = h.db.GetRecentHighlights(limit, offset)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateHighlights(h.db, highlights, h.getViewerDID(r))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "HighlightCollection",
		"items":      enriched,
		"totalItems": len(enriched),
	})
}

func (h *Handler) GetBookmarks(w http.ResponseWriter, r *http.Request) {
	did := r.URL.Query().Get("creator")
	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	if did == "" {
		http.Error(w, "creator parameter required", http.StatusBadRequest)
		return
	}

	bookmarks, err := h.db.GetBookmarksByAuthor(did, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateBookmarks(h.db, bookmarks, h.getViewerDID(r))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "BookmarkCollection",
		"items":      enriched,
		"totalItems": len(enriched),
	})
}

func (h *Handler) GetUserAnnotations(w http.ResponseWriter, r *http.Request) {
	did := chi.URLParam(r, "did")
	if decoded, err := url.QueryUnescape(did); err == nil {
		did = decoded
	}
	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	var annotations []db.Annotation
	var err error

	viewerDID := h.getViewerDID(r)

	if offset == 0 && viewerDID != "" && did == viewerDID {
		go func() {
			if _, err := h.FetchLatestUserRecords(r, did, xrpc.CollectionAnnotation, limit); err != nil {
				log.Printf("Background sync error (annotations): %v", err)
			}
		}()
	}

	annotations, err = h.db.GetAnnotationsByAuthor(did, limit, offset)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateAnnotations(h.db, annotations, h.getViewerDID(r))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "AnnotationCollection",
		"creator":    did,
		"items":      enriched,
		"totalItems": len(enriched),
	})
}

func (h *Handler) GetUserHighlights(w http.ResponseWriter, r *http.Request) {
	did := chi.URLParam(r, "did")
	if decoded, err := url.QueryUnescape(did); err == nil {
		did = decoded
	}
	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	var highlights []db.Highlight
	var err error

	viewerDID := h.getViewerDID(r)

	if offset == 0 && viewerDID != "" && did == viewerDID {
		go func() {
			if _, err := h.FetchLatestUserRecords(r, did, xrpc.CollectionHighlight, limit); err != nil {
				log.Printf("Background sync error (highlights): %v", err)
			}
		}()
	}

	highlights, err = h.db.GetHighlightsByAuthor(did, limit, offset)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateHighlights(h.db, highlights, h.getViewerDID(r))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "HighlightCollection",
		"creator":    did,
		"items":      enriched,
		"totalItems": len(enriched),
	})
}

func (h *Handler) GetUserBookmarks(w http.ResponseWriter, r *http.Request) {
	did := chi.URLParam(r, "did")
	if decoded, err := url.QueryUnescape(did); err == nil {
		did = decoded
	}
	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	var bookmarks []db.Bookmark
	var err error

	viewerDID := h.getViewerDID(r)

	if offset == 0 && viewerDID != "" && did == viewerDID {
		go func() {
			if _, err := h.FetchLatestUserRecords(r, did, xrpc.CollectionBookmark, limit); err != nil {
				log.Printf("Background sync error (bookmarks): %v", err)
			}
		}()
	}

	bookmarks, err = h.db.GetBookmarksByAuthor(did, limit, offset)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateBookmarks(h.db, bookmarks, h.getViewerDID(r))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "BookmarkCollection",
		"creator":    did,
		"items":      enriched,
		"totalItems": len(enriched),
	})
}

func (h *Handler) GetUserTargetItems(w http.ResponseWriter, r *http.Request) {
	did := chi.URLParam(r, "did")
	if decoded, err := url.QueryUnescape(did); err == nil {
		did = decoded
	}

	source := r.URL.Query().Get("source")
	if source == "" {
		source = r.URL.Query().Get("url")
	}
	if source == "" {
		http.Error(w, "source or url parameter required", http.StatusBadRequest)
		return
	}

	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	urlHash := db.HashURL(source)

	annotations, _ := h.db.GetAnnotationsByAuthorAndTargetHash(did, urlHash, limit, offset)
	highlights, _ := h.db.GetHighlightsByAuthorAndTargetHash(did, urlHash, limit, offset)

	enrichedAnnotations, _ := hydrateAnnotations(h.db, annotations, h.getViewerDID(r))
	enrichedHighlights, _ := hydrateHighlights(h.db, highlights, h.getViewerDID(r))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":    "http://www.w3.org/ns/anno.jsonld",
		"creator":     did,
		"source":      source,
		"sourceHash":  urlHash,
		"annotations": enrichedAnnotations,
		"highlights":  enrichedHighlights,
	})
}

func (h *Handler) GetReplies(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	replies, err := h.db.GetRepliesByRoot(uri)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateReplies(h.db, replies)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "ReplyCollection",
		"inReplyTo":  uri,
		"items":      enriched,
		"totalItems": len(enriched),
	})
}

func (h *Handler) GetLikeCount(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	count, err := h.db.GetLikeCount(uri)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	liked := false
	cookie, err := r.Cookie("margin_session")
	if err == nil && cookie != nil {
		session, err := h.refresher.GetSessionWithAutoRefresh(r)
		if err == nil {
			userLike, err := h.db.GetLikeByUserAndSubject(session.DID, uri)
			if err == nil && userLike != nil {
				liked = true
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"count": count,
		"liked": liked,
	})
}

func (h *Handler) GetEditHistory(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	history, err := h.db.GetEditHistory(uri)
	if err != nil {
		http.Error(w, "Failed to fetch edit history", http.StatusInternalServerError)
		return
	}

	if history == nil {
		history = []db.EditHistory{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

func parseIntParam(r *http.Request, name string, defaultVal int) int {
	val := r.URL.Query().Get(name)
	if val == "" {
		return defaultVal
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return defaultVal
	}
	return i
}

func (h *Handler) GetURLMetadata(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, "url parameter required", http.StatusBadRequest)
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"title": "", "error": "failed to fetch"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 100*1024))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"title": ""})
		return
	}

	title := ""
	htmlStr := string(body)
	if idx := strings.Index(strings.ToLower(htmlStr), "<title>"); idx != -1 {
		start := idx + 7
		if endIdx := strings.Index(strings.ToLower(htmlStr[start:]), "</title>"); endIdx != -1 {
			title = strings.TrimSpace(htmlStr[start : start+endIdx])
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"title": title, "url": url})
}

func (h *Handler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	session, err := h.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	notifications, err := h.db.GetNotifications(session.DID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to get notifications", http.StatusInternalServerError)
		return
	}

	enriched, err := hydrateNotifications(h.db, notifications)
	if err != nil {
		log.Printf("Failed to hydrate notifications: %v\n", err)
	}

	w.Header().Set("Content-Type", "application/json")
	if enriched != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"items": enriched})
	} else {
		json.NewEncoder(w).Encode(map[string]interface{}{"items": notifications})
	}
}

func (h *Handler) GetUnreadNotificationCount(w http.ResponseWriter, r *http.Request) {
	session, err := h.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	count, err := h.db.GetUnreadNotificationCount(session.DID)
	if err != nil {
		http.Error(w, "Failed to get count", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"count": count})
}

func (h *Handler) MarkNotificationsRead(w http.ResponseWriter, r *http.Request) {
	session, err := h.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if err := h.db.MarkNotificationsRead(session.DID); err != nil {
		http.Error(w, "Failed to mark as read", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
func (h *Handler) getViewerDID(r *http.Request) string {
	cookie, err := r.Cookie("margin_session")
	if err != nil {
		return ""
	}
	did, _, _, _, _, err := h.db.GetSession(cookie.Value)
	if err != nil {
		return ""
	}
	return did
}
