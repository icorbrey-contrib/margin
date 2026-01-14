package api

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"margin.at/internal/db"
)

type Handler struct {
	db                *db.DB
	annotationService *AnnotationService
	refresher         *TokenRefresher
}

func NewHandler(database *db.DB, annotationService *AnnotationService, refresher *TokenRefresher) *Handler {
	return &Handler{db: database, annotationService: annotationService, refresher: refresher}
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

		r.Get("/targets", h.GetByTarget)

		r.Get("/users/{did}/annotations", h.GetUserAnnotations)
		r.Get("/users/{did}/highlights", h.GetUserHighlights)
		r.Get("/users/{did}/bookmarks", h.GetUserBookmarks)

		r.Get("/replies", h.GetReplies)
		r.Get("/likes", h.GetLikeCount)
		r.Get("/url-metadata", h.GetURLMetadata)
		r.Get("/notifications", h.GetNotifications)
		r.Get("/notifications/count", h.GetUnreadNotificationCount)
		r.Post("/notifications/read", h.MarkNotificationsRead)
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

	var annotations []db.Annotation
	var err error

	if source != "" {
		urlHash := db.HashURL(source)
		annotations, err = h.db.GetAnnotationsByTargetHash(urlHash, limit, offset)
	} else if motivation != "" {
		annotations, err = h.db.GetAnnotationsByMotivation(motivation, limit, offset)
	} else {
		annotations, err = h.db.GetRecentAnnotations(limit, offset)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateAnnotations(annotations)

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

	annotations, _ := h.db.GetRecentAnnotations(limit, 0)
	highlights, _ := h.db.GetRecentHighlights(limit, 0)
	bookmarks, _ := h.db.GetRecentBookmarks(limit, 0)

	authAnnos, _ := hydrateAnnotations(annotations)
	authHighs, _ := hydrateHighlights(highlights)
	authBooks, _ := hydrateBookmarks(bookmarks)

	collectionItems, err := h.db.GetRecentCollectionItems(limit, 0)
	if err != nil {
		log.Printf("Error fetching collection items: %v\n", err)
	}
	// log.Printf("Fetched %d collection items\n", len(collectionItems))
	authCollectionItems, _ := hydrateCollectionItems(h.db, collectionItems)
	// log.Printf("Hydrated %d collection items\n", len(authCollectionItems))

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

	for i := 0; i < len(feed); i++ {
		for j := i + 1; j < len(feed); j++ {
			t1 := getCreatedAt(feed[i])
			t2 := getCreatedAt(feed[j])
			if t1.Before(t2) {
				feed[i], feed[j] = feed[j], feed[i]
			}
		}
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
		if enriched, _ := hydrateAnnotations([]db.Annotation{*annotation}); len(enriched) > 0 {
			serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
			return
		}
	}

	if highlight, err := h.db.GetHighlightByURI(uri); err == nil {
		if enriched, _ := hydrateHighlights([]db.Highlight{*highlight}); len(enriched) > 0 {
			serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
			return
		}
	}

	if strings.Contains(uri, "at.margin.annotation") {
		highlightURI := strings.Replace(uri, "at.margin.annotation", "at.margin.highlight", 1)
		if highlight, err := h.db.GetHighlightByURI(highlightURI); err == nil {
			if enriched, _ := hydrateHighlights([]db.Highlight{*highlight}); len(enriched) > 0 {
				serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
				return
			}
		}
	}

	if bookmark, err := h.db.GetBookmarkByURI(uri); err == nil {
		if enriched, _ := hydrateBookmarks([]db.Bookmark{*bookmark}); len(enriched) > 0 {
			serveResponse(enriched[0], "http://www.w3.org/ns/anno.jsonld")
			return
		}
	}

	if strings.Contains(uri, "at.margin.annotation") {
		bookmarkURI := strings.Replace(uri, "at.margin.annotation", "at.margin.bookmark", 1)
		if bookmark, err := h.db.GetBookmarkByURI(bookmarkURI); err == nil {
			if enriched, _ := hydrateBookmarks([]db.Bookmark{*bookmark}); len(enriched) > 0 {
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

	enrichedAnnotations, _ := hydrateAnnotations(annotations)
	enrichedHighlights, _ := hydrateHighlights(highlights)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":    "http://www.w3.org/ns/anno.jsonld",
		"source":      source,
		"sourceHash":  urlHash,
		"annotations": enrichedAnnotations,
		"highlights":  enrichedHighlights,
	})
}

func (h *Handler) GetHighlights(w http.ResponseWriter, r *http.Request) {
	did := r.URL.Query().Get("creator")
	limit := parseIntParam(r, "limit", 50)
	offset := parseIntParam(r, "offset", 0)

	if did == "" {
		http.Error(w, "creator parameter required", http.StatusBadRequest)
		return
	}

	highlights, err := h.db.GetHighlightsByAuthor(did, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateHighlights(highlights)

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

	enriched, _ := hydrateBookmarks(bookmarks)

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

	annotations, err := h.db.GetAnnotationsByAuthor(did, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateAnnotations(annotations)

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

	highlights, err := h.db.GetHighlightsByAuthor(did, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateHighlights(highlights)

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

	bookmarks, err := h.db.GetBookmarksByAuthor(did, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enriched, _ := hydrateBookmarks(bookmarks)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "BookmarkCollection",
		"creator":    did,
		"items":      enriched,
		"totalItems": len(enriched),
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

	enriched, _ := hydrateReplies(replies)

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
