package api

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"margin.at/internal/db"
	"margin.at/internal/xrpc"
)

type CollectionService struct {
	db        *db.DB
	refresher *TokenRefresher
}

func NewCollectionService(database *db.DB, refresher *TokenRefresher) *CollectionService {
	return &CollectionService{db: database, refresher: refresher}
}

type CreateCollectionRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

type AddCollectionItemRequest struct {
	AnnotationURI string `json:"annotationUri"`
	Position      int    `json:"position"`
}

func (s *CollectionService) CreateCollection(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	record := xrpc.NewCollectionRecord(req.Name, req.Description, req.Icon)

	var result *xrpc.CreateRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var createErr error
		result, createErr = client.CreateRecord(r.Context(), did, xrpc.CollectionCollection, record)
		return createErr
	})
	if err != nil {
		http.Error(w, "Failed to create collection: "+err.Error(), http.StatusInternalServerError)
		return
	}

	did := session.DID
	var descPtr, iconPtr *string
	if req.Description != "" {
		descPtr = &req.Description
	}
	if req.Icon != "" {
		iconPtr = &req.Icon
	}
	collection := &db.Collection{
		URI:         result.URI,
		AuthorDID:   did,
		Name:        req.Name,
		Description: descPtr,
		Icon:        iconPtr,
		CreatedAt:   time.Now(),
		IndexedAt:   time.Now(),
	}
	s.db.CreateCollection(collection)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *CollectionService) AddCollectionItem(w http.ResponseWriter, r *http.Request) {
	collectionURIRaw := chi.URLParam(r, "collection")
	if collectionURIRaw == "" {
		http.Error(w, "Collection URI required", http.StatusBadRequest)
		return
	}

	collectionURI, _ := url.QueryUnescape(collectionURIRaw)

	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req AddCollectionItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.AnnotationURI == "" {
		http.Error(w, "Annotation URI required", http.StatusBadRequest)
		return
	}

	record := xrpc.NewCollectionItemRecord(collectionURI, req.AnnotationURI, req.Position)

	var result *xrpc.CreateRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var createErr error
		result, createErr = client.CreateRecord(r.Context(), did, xrpc.CollectionCollectionItem, record)
		return createErr
	})
	if err != nil {
		http.Error(w, "Failed to add item: "+err.Error(), http.StatusInternalServerError)
		return
	}

	did := session.DID
	item := &db.CollectionItem{
		URI:           result.URI,
		AuthorDID:     did,
		CollectionURI: collectionURI,
		AnnotationURI: req.AnnotationURI,
		Position:      req.Position,
		CreatedAt:     time.Now(),
		IndexedAt:     time.Now(),
	}
	if err := s.db.AddToCollection(item); err != nil {
		log.Printf("Failed to add to collection in DB: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *CollectionService) RemoveCollectionItem(w http.ResponseWriter, r *http.Request) {
	itemURI := r.URL.Query().Get("uri")
	if itemURI == "" {
		http.Error(w, "Item URI required", http.StatusBadRequest)
		return
	}

	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		return client.DeleteRecordByURI(r.Context(), itemURI)
	})
	if err != nil {
		log.Printf("Warning: PDS delete failed for %s: %v", itemURI, err)
	}

	s.db.RemoveFromCollection(itemURI)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func (s *CollectionService) GetAnnotationCollections(w http.ResponseWriter, r *http.Request) {
	annotationURI := r.URL.Query().Get("uri")
	if annotationURI == "" {
		http.Error(w, "uri parameter required", http.StatusBadRequest)
		return
	}

	uris, err := s.db.GetCollectionURIsForAnnotation(annotationURI)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if uris == nil {
		uris = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(uris)
}

func (s *CollectionService) GetCollections(w http.ResponseWriter, r *http.Request) {
	authorDID := r.URL.Query().Get("author")
	if authorDID == "" {
		session, err := s.refresher.GetSessionWithAutoRefresh(r)
		if err == nil {
			authorDID = session.DID
		}
	}

	if authorDID == "" {
		http.Error(w, "Author DID required", http.StatusBadRequest)
		return
	}

	collections, err := s.db.GetCollectionsByAuthor(authorDID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"@context":   "http://www.w3.org/ns/anno.jsonld",
		"type":       "Collection",
		"items":      collections,
		"totalItems": len(collections),
	})
}

type EnrichedCollectionItem struct {
	URI           string         `json:"uri"`
	CollectionURI string         `json:"collectionUri"`
	AnnotationURI string         `json:"annotationUri"`
	Position      int            `json:"position"`
	CreatedAt     time.Time      `json:"createdAt"`
	Type          string         `json:"type"`
	Annotation    *APIAnnotation `json:"annotation,omitempty"`
	Highlight     *APIHighlight  `json:"highlight,omitempty"`
	Bookmark      *APIBookmark   `json:"bookmark,omitempty"`
}

func (s *CollectionService) GetCollectionItems(w http.ResponseWriter, r *http.Request) {
	collectionURI := r.URL.Query().Get("collection")
	if collectionURI == "" {
		collectionURIRaw := chi.URLParam(r, "collection")
		collectionURI, _ = url.QueryUnescape(collectionURIRaw)
	}

	if collectionURI == "" {
		http.Error(w, "Collection URI required", http.StatusBadRequest)
		return
	}

	items, err := s.db.GetCollectionItems(collectionURI)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	enrichedItems := make([]EnrichedCollectionItem, 0, len(items))

	for _, item := range items {
		enriched := EnrichedCollectionItem{
			URI:           item.URI,
			CollectionURI: item.CollectionURI,
			AnnotationURI: item.AnnotationURI,
			Position:      item.Position,
			CreatedAt:     item.CreatedAt,
		}

		if strings.Contains(item.AnnotationURI, "at.margin.annotation") {
			enriched.Type = "annotation"
			if a, err := s.db.GetAnnotationByURI(item.AnnotationURI); err == nil {
				hydrated, _ := hydrateAnnotations([]db.Annotation{*a})
				if len(hydrated) > 0 {
					enriched.Annotation = &hydrated[0]
				}
			}
		} else if strings.Contains(item.AnnotationURI, "at.margin.highlight") {
			enriched.Type = "highlight"
			if h, err := s.db.GetHighlightByURI(item.AnnotationURI); err == nil {
				hydrated, _ := hydrateHighlights([]db.Highlight{*h})
				if len(hydrated) > 0 {
					enriched.Highlight = &hydrated[0]
				}
			}
		} else if strings.Contains(item.AnnotationURI, "at.margin.bookmark") {
			enriched.Type = "bookmark"
			if b, err := s.db.GetBookmarkByURI(item.AnnotationURI); err == nil {
				hydrated, _ := hydrateBookmarks([]db.Bookmark{*b})
				if len(hydrated) > 0 {
					enriched.Bookmark = &hydrated[0]
				}
			} else {
				log.Printf("GetBookmarkByURI failed for %s: %v\n", item.AnnotationURI, err)
			}
		} else {
			log.Printf("Unknown annotation type for URI: %s\n", item.AnnotationURI)
		}

		if enriched.Annotation != nil || enriched.Highlight != nil || enriched.Bookmark != nil {
			enrichedItems = append(enrichedItems, enriched)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(enrichedItems)
}

type UpdateCollectionRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

func (s *CollectionService) UpdateCollection(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "URI required", http.StatusBadRequest)
		return
	}

	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if len(uri) < len(session.DID)+5 || uri[5:5+len(session.DID)] != session.DID {
		http.Error(w, "Not authorized to update this collection", http.StatusForbidden)
		return
	}

	var req UpdateCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	record := xrpc.NewCollectionRecord(req.Name, req.Description, req.Icon)
	parts := strings.Split(uri, "/")
	rkey := parts[len(parts)-1]

	var result *xrpc.PutRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var updateErr error
		result, updateErr = client.PutRecord(r.Context(), did, xrpc.CollectionCollection, rkey, record)
		if updateErr != nil {
			log.Printf("DEBUG PutRecord failed: %v. Retrying with delete-then-create workaround for buggy PDS.", updateErr)
			_ = client.DeleteRecord(r.Context(), did, xrpc.CollectionCollection, rkey)
			result, updateErr = client.PutRecord(r.Context(), did, xrpc.CollectionCollection, rkey, record)
		}
		return updateErr
	})

	if err != nil {
		http.Error(w, "Failed to update collection: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var descPtr, iconPtr *string
	if req.Description != "" {
		descPtr = &req.Description
	}
	if req.Icon != "" {
		iconPtr = &req.Icon
	}

	collection := &db.Collection{
		URI:         result.URI,
		AuthorDID:   session.DID,
		Name:        req.Name,
		Description: descPtr,
		Icon:        iconPtr,
		CreatedAt:   time.Now(),
		IndexedAt:   time.Now(),
	}
	s.db.CreateCollection(collection)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *CollectionService) DeleteCollection(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "URI required", http.StatusBadRequest)
		return
	}

	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if len(uri) < len(session.DID)+5 || uri[5:5+len(session.DID)] != session.DID {
		http.Error(w, "Not authorized to delete this collection", http.StatusForbidden)
		return
	}

	items, _ := s.db.GetCollectionItems(uri)

	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		for _, item := range items {
			client.DeleteRecordByURI(r.Context(), item.URI)
		}

		parts := strings.Split(uri, "/")
		rkey := parts[len(parts)-1]
		return client.DeleteRecord(r.Context(), did, xrpc.CollectionCollection, rkey)
	})
	if err != nil {
		http.Error(w, "Failed to delete collection: "+err.Error(), http.StatusInternalServerError)
		return
	}

	s.db.DeleteCollection(uri)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}
