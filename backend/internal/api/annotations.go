package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"margin.at/internal/db"
	"margin.at/internal/xrpc"
)

type AnnotationService struct {
	db        *db.DB
	refresher *TokenRefresher
}

func NewAnnotationService(database *db.DB, refresher *TokenRefresher) *AnnotationService {
	return &AnnotationService{db: database, refresher: refresher}
}

type CreateAnnotationRequest struct {
	URL      string      `json:"url"`
	Text     string      `json:"text"`
	Selector interface{} `json:"selector,omitempty"`
	Title    string      `json:"title,omitempty"`
	Tags     []string    `json:"tags,omitempty"`
}

type CreateAnnotationResponse struct {
	URI string `json:"uri"`
	CID string `json:"cid"`
}

func (s *AnnotationService) CreateAnnotation(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateAnnotationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	if req.Text == "" && req.Selector == nil && len(req.Tags) == 0 {
		http.Error(w, "Must provide text, selector, or tags", http.StatusBadRequest)
		return
	}

	if len(req.Text) > 3000 {
		http.Error(w, "Text too long (max 3000 chars)", http.StatusBadRequest)
		return
	}

	urlHash := db.HashURL(req.URL)

	motivation := "commenting"
	if req.Selector != nil && req.Text == "" {
		motivation = "highlighting"
	} else if len(req.Tags) > 0 {
		motivation = "tagging"
	}

	record := xrpc.NewAnnotationRecordWithMotivation(req.URL, urlHash, req.Text, req.Selector, req.Title, motivation)

	var result *xrpc.CreateRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var createErr error
		result, createErr = client.CreateRecord(r.Context(), did, xrpc.CollectionAnnotation, record)
		return createErr
	})
	if err != nil {
		http.Error(w, "Failed to create annotation: "+err.Error(), http.StatusInternalServerError)
		return
	}

	bodyValue := req.Text
	var bodyValuePtr, targetTitlePtr, selectorJSONPtr *string
	if bodyValue != "" {
		bodyValuePtr = &bodyValue
	}
	if req.Title != "" {
		targetTitlePtr = &req.Title
	}
	if req.Selector != nil {
		selectorBytes, _ := json.Marshal(req.Selector)
		selectorStr := string(selectorBytes)
		selectorJSONPtr = &selectorStr
	}

	cid := result.CID
	did := session.DID
	annotation := &db.Annotation{
		URI:          result.URI,
		CID:          &cid,
		AuthorDID:    did,
		Motivation:   motivation,
		BodyValue:    bodyValuePtr,
		TargetSource: req.URL,
		TargetHash:   urlHash,
		TargetTitle:  targetTitlePtr,
		SelectorJSON: selectorJSONPtr,
		CreatedAt:    time.Now(),
		IndexedAt:    time.Now(),
	}

	if err := s.db.CreateAnnotation(annotation); err != nil {
		log.Printf("Warning: failed to index annotation in local DB: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateAnnotationResponse{
		URI: result.URI,
		CID: result.CID,
	})
}

func (s *AnnotationService) DeleteAnnotation(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	rkey := r.URL.Query().Get("rkey")
	collectionType := r.URL.Query().Get("type")

	if rkey == "" {
		http.Error(w, "rkey required", http.StatusBadRequest)
		return
	}

	collection := xrpc.CollectionAnnotation
	if collectionType == "reply" {
		collection = xrpc.CollectionReply
	}

	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		return client.DeleteRecord(r.Context(), did, collection, rkey)
	})
	if err != nil {
		http.Error(w, "Failed to delete record: "+err.Error(), http.StatusInternalServerError)
		return
	}

	did := session.DID
	if collectionType == "reply" {
		uri := "at://" + did + "/" + xrpc.CollectionReply + "/" + rkey
		s.db.DeleteReply(uri)
	} else {
		uri := "at://" + did + "/" + xrpc.CollectionAnnotation + "/" + rkey
		s.db.DeleteAnnotation(uri)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

type UpdateAnnotationRequest struct {
	Text string   `json:"text"`
	Tags []string `json:"tags"`
}

func (s *AnnotationService) UpdateAnnotation(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	annotation, err := s.db.GetAnnotationByURI(uri)
	if err != nil || annotation == nil {
		http.Error(w, "Annotation not found", http.StatusNotFound)
		return
	}

	if annotation.AuthorDID != session.DID {
		http.Error(w, "Not authorized to edit this annotation", http.StatusForbidden)
		return
	}

	var req UpdateAnnotationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	parts := parseATURI(uri)
	if len(parts) < 3 {
		http.Error(w, "Invalid URI format", http.StatusBadRequest)
		return
	}
	rkey := parts[2]

	var selector interface{} = nil
	if annotation.SelectorJSON != nil && *annotation.SelectorJSON != "" {
		json.Unmarshal([]byte(*annotation.SelectorJSON), &selector)
	}

	tagsJSON := ""
	if len(req.Tags) > 0 {
		tagsBytes, _ := json.Marshal(req.Tags)
		tagsJSON = string(tagsBytes)
	}

	record := map[string]interface{}{
		"$type":     xrpc.CollectionAnnotation,
		"text":      req.Text,
		"url":       annotation.TargetSource,
		"createdAt": annotation.CreatedAt.Format(time.RFC3339),
	}
	if selector != nil {
		record["selector"] = selector
	}
	if len(req.Tags) > 0 {
		record["tags"] = req.Tags
	}
	if annotation.TargetTitle != nil {
		record["title"] = *annotation.TargetTitle
	}

	if annotation.BodyValue != nil {
		previousContent := *annotation.BodyValue
		s.db.SaveEditHistory(uri, "annotation", previousContent, annotation.CID)
	}

	var result *xrpc.PutRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var updateErr error
		result, updateErr = client.PutRecord(r.Context(), did, xrpc.CollectionAnnotation, rkey, record)
		if updateErr != nil {
			log.Printf("UpdateAnnotation failed: %v. Retrying with delete-then-create workaround.", updateErr)
			_ = client.DeleteRecord(r.Context(), did, xrpc.CollectionAnnotation, rkey)
			result, updateErr = client.PutRecord(r.Context(), did, xrpc.CollectionAnnotation, rkey, record)
		}
		return updateErr
	})

	if err != nil {
		http.Error(w, "Failed to update record: "+err.Error(), http.StatusInternalServerError)
		return
	}

	s.db.UpdateAnnotation(uri, req.Text, tagsJSON, result.CID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"uri":     result.URI,
		"cid":     result.CID,
	})
}

func parseATURI(uri string) []string {

	if len(uri) < 5 || uri[:5] != "at://" {
		return nil
	}
	return strings.Split(uri[5:], "/")
}

type CreateLikeRequest struct {
	SubjectURI string `json:"subjectUri"`
	SubjectCID string `json:"subjectCid"`
}

func (s *AnnotationService) LikeAnnotation(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateLikeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	existingLike, _ := s.db.GetLikeByUserAndSubject(session.DID, req.SubjectURI)
	if existingLike != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"uri": existingLike.URI, "existing": "true"})
		return
	}

	record := xrpc.NewLikeRecord(req.SubjectURI, req.SubjectCID)

	var result *xrpc.CreateRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var createErr error
		result, createErr = client.CreateRecord(r.Context(), did, xrpc.CollectionLike, record)
		return createErr
	})
	if err != nil {
		http.Error(w, "Failed to create like: "+err.Error(), http.StatusInternalServerError)
		return
	}

	did := session.DID
	like := &db.Like{
		URI:        result.URI,
		AuthorDID:  did,
		SubjectURI: req.SubjectURI,
		CreatedAt:  time.Now(),
		IndexedAt:  time.Now(),
	}
	s.db.CreateLike(like)

	if authorDID, err := s.db.GetAuthorByURI(req.SubjectURI); err == nil && authorDID != did {
		s.db.CreateNotification(&db.Notification{
			RecipientDID: authorDID,
			ActorDID:     did,
			Type:         "like",
			SubjectURI:   req.SubjectURI,
			CreatedAt:    time.Now(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"uri": result.URI})
}

func (s *AnnotationService) UnlikeAnnotation(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	subjectURI := r.URL.Query().Get("uri")
	if subjectURI == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	userLike, err := s.db.GetLikeByUserAndSubject(session.DID, subjectURI)
	if err != nil {
		http.Error(w, "Like not found", http.StatusNotFound)
		return
	}

	parts := strings.Split(userLike.URI, "/")
	rkey := parts[len(parts)-1]

	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		return client.DeleteRecord(r.Context(), did, xrpc.CollectionLike, rkey)
	})
	if err != nil {
		http.Error(w, "Failed to delete like: "+err.Error(), http.StatusInternalServerError)
		return
	}

	s.db.DeleteLike(userLike.URI)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

type CreateReplyRequest struct {
	ParentURI string `json:"parentUri"`
	ParentCID string `json:"parentCid"`
	RootURI   string `json:"rootUri"`
	RootCID   string `json:"rootCid"`
	Text      string `json:"text"`
}

func (s *AnnotationService) CreateReply(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateReplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	record := xrpc.NewReplyRecord(req.ParentURI, req.ParentCID, req.RootURI, req.RootCID, req.Text)

	var result *xrpc.CreateRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var createErr error
		result, createErr = client.CreateRecord(r.Context(), did, xrpc.CollectionReply, record)
		return createErr
	})
	if err != nil {
		http.Error(w, "Failed to create reply: "+err.Error(), http.StatusInternalServerError)
		return
	}

	reply := &db.Reply{
		URI:       result.URI,
		AuthorDID: session.DID,
		ParentURI: req.ParentURI,
		RootURI:   req.RootURI,
		Text:      req.Text,
		CreatedAt: time.Now(),
		IndexedAt: time.Now(),
		CID:       &result.CID,
	}
	s.db.CreateReply(reply)

	if authorDID, err := s.db.GetAuthorByURI(req.ParentURI); err == nil && authorDID != session.DID {
		s.db.CreateNotification(&db.Notification{
			RecipientDID: authorDID,
			ActorDID:     session.DID,
			Type:         "reply",
			SubjectURI:   result.URI,
			CreatedAt:    time.Now(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"uri": result.URI})
}

func (s *AnnotationService) DeleteReply(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	reply, err := s.db.GetReplyByURI(uri)
	if err != nil || reply == nil {
		http.Error(w, "reply not found", http.StatusNotFound)
		return
	}

	if reply.AuthorDID != session.DID {
		http.Error(w, "not authorized to delete this reply", http.StatusForbidden)
		return
	}

	parts := strings.Split(uri, "/")
	if len(parts) >= 2 {
		rkey := parts[len(parts)-1]
		_ = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
			return client.DeleteRecord(r.Context(), did, "at.margin.reply", rkey)
		})
	}

	s.db.DeleteReply(uri)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func resolveDIDToPDS(did string) (string, error) {
	if strings.HasPrefix(did, "did:plc:") {
		resp, err := http.Get("https://plc.directory/" + did)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		var doc struct {
			Service []struct {
				Type            string `json:"type"`
				ServiceEndpoint string `json:"serviceEndpoint"`
			} `json:"service"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
			return "", err
		}

		for _, svc := range doc.Service {
			if svc.Type == "AtprotoPersonalDataServer" {
				return svc.ServiceEndpoint, nil
			}
		}
	}
	return "", nil
}

type CreateHighlightRequest struct {
	URL      string      `json:"url"`
	Title    string      `json:"title,omitempty"`
	Selector interface{} `json:"selector"`
	Color    string      `json:"color,omitempty"`
	Tags     []string    `json:"tags,omitempty"`
}

func (s *AnnotationService) CreateHighlight(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateHighlightRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.URL == "" || req.Selector == nil {
		http.Error(w, "URL and selector are required", http.StatusBadRequest)
		return
	}

	urlHash := db.HashURL(req.URL)
	record := xrpc.NewHighlightRecord(req.URL, urlHash, req.Selector, req.Color, req.Tags)

	var result *xrpc.CreateRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var createErr error
		result, createErr = client.CreateRecord(r.Context(), did, xrpc.CollectionHighlight, record)
		return createErr
	})
	if err != nil {
		http.Error(w, "Failed to create highlight: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var selectorJSONPtr *string
	if req.Selector != nil {
		selectorBytes, _ := json.Marshal(req.Selector)
		selectorStr := string(selectorBytes)
		selectorJSONPtr = &selectorStr
	}

	var titlePtr *string
	if req.Title != "" {
		titlePtr = &req.Title
	}

	var colorPtr *string
	if req.Color != "" {
		colorPtr = &req.Color
	}

	var tagsJSONPtr *string
	if len(req.Tags) > 0 {
		tagsBytes, _ := json.Marshal(req.Tags)
		tagsStr := string(tagsBytes)
		tagsJSONPtr = &tagsStr
	}

	cid := result.CID
	highlight := &db.Highlight{
		URI:          result.URI,
		AuthorDID:    session.DID,
		TargetSource: req.URL,
		TargetHash:   urlHash,
		TargetTitle:  titlePtr,
		SelectorJSON: selectorJSONPtr,
		Color:        colorPtr,
		TagsJSON:     tagsJSONPtr,
		CreatedAt:    time.Now(),
		IndexedAt:    time.Now(),
		CID:          &cid,
	}
	if err := s.db.CreateHighlight(highlight); err != nil {
		http.Error(w, "Failed to index highlight", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"uri": result.URI, "cid": result.CID})
}

type CreateBookmarkRequest struct {
	URL         string `json:"url"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
}

func (s *AnnotationService) CreateBookmark(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req CreateBookmarkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	urlHash := db.HashURL(req.URL)
	record := xrpc.NewBookmarkRecord(req.URL, urlHash, req.Title, req.Description)

	var result *xrpc.CreateRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		var createErr error
		result, createErr = client.CreateRecord(r.Context(), did, xrpc.CollectionBookmark, record)
		return createErr
	})
	if err != nil {
		http.Error(w, "Failed to create bookmark: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var titlePtr *string
	if req.Title != "" {
		titlePtr = &req.Title
	}
	var descPtr *string
	if req.Description != "" {
		descPtr = &req.Description
	}

	cid := result.CID
	bookmark := &db.Bookmark{
		URI:         result.URI,
		AuthorDID:   session.DID,
		Source:      req.URL,
		SourceHash:  urlHash,
		Title:       titlePtr,
		Description: descPtr,
		CreatedAt:   time.Now(),
		IndexedAt:   time.Now(),
		CID:         &cid,
	}
	s.db.CreateBookmark(bookmark)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"uri": result.URI, "cid": result.CID})
}

func (s *AnnotationService) DeleteHighlight(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	rkey := r.URL.Query().Get("rkey")
	if rkey == "" {
		http.Error(w, "rkey required", http.StatusBadRequest)
		return
	}

	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		return client.DeleteRecord(r.Context(), did, xrpc.CollectionHighlight, rkey)
	})
	if err != nil {
		http.Error(w, "Failed to delete highlight: "+err.Error(), http.StatusInternalServerError)
		return
	}

	uri := "at://" + session.DID + "/" + xrpc.CollectionHighlight + "/" + rkey
	s.db.DeleteHighlight(uri)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *AnnotationService) DeleteBookmark(w http.ResponseWriter, r *http.Request) {
	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	rkey := r.URL.Query().Get("rkey")
	if rkey == "" {
		http.Error(w, "rkey required", http.StatusBadRequest)
		return
	}

	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		return client.DeleteRecord(r.Context(), did, xrpc.CollectionBookmark, rkey)
	})
	if err != nil {
		http.Error(w, "Failed to delete bookmark: "+err.Error(), http.StatusInternalServerError)
		return
	}

	uri := "at://" + session.DID + "/" + xrpc.CollectionBookmark + "/" + rkey
	s.db.DeleteBookmark(uri)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

type UpdateHighlightRequest struct {
	Color string   `json:"color"`
	Tags  []string `json:"tags,omitempty"`
}

func (s *AnnotationService) UpdateHighlight(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if len(uri) < 5 || !strings.HasPrefix(uri[5:], session.DID) {
		http.Error(w, "Not authorized", http.StatusForbidden)
		return
	}

	var req UpdateHighlightRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	parts := parseATURI(uri)
	if len(parts) < 3 {
		http.Error(w, "Invalid URI", http.StatusBadRequest)
		return
	}
	rkey := parts[2]

	var result *xrpc.PutRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		existing, getErr := client.GetRecord(r.Context(), did, xrpc.CollectionHighlight, rkey)
		if getErr != nil {
			return fmt.Errorf("failed to fetch record: %w", getErr)
		}

		var record map[string]interface{}
		json.Unmarshal(existing.Value, &record)

		if req.Color != "" {
			record["color"] = req.Color
		}
		if req.Tags != nil {
			record["tags"] = req.Tags
		}

		var updateErr error
		result, updateErr = client.PutRecord(r.Context(), did, xrpc.CollectionHighlight, rkey, record)
		if updateErr != nil {
			log.Printf("UpdateHighlight failed: %v. Retrying with delete-then-create workaround.", updateErr)
			_ = client.DeleteRecord(r.Context(), did, xrpc.CollectionHighlight, rkey)
			result, updateErr = client.PutRecord(r.Context(), did, xrpc.CollectionHighlight, rkey, record)
		}
		return updateErr
	})

	if err != nil {
		http.Error(w, "Failed to update: "+err.Error(), http.StatusInternalServerError)
		return
	}

	tagsJSON := ""
	if req.Tags != nil {
		b, _ := json.Marshal(req.Tags)
		tagsJSON = string(b)
	}
	s.db.UpdateHighlight(uri, req.Color, tagsJSON, result.CID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "uri": result.URI, "cid": result.CID})
}

type UpdateBookmarkRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Tags        []string `json:"tags,omitempty"`
}

func (s *AnnotationService) UpdateBookmark(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri query parameter required", http.StatusBadRequest)
		return
	}

	session, err := s.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if len(uri) < 5 || !strings.HasPrefix(uri[5:], session.DID) {
		http.Error(w, "Not authorized", http.StatusForbidden)
		return
	}

	var req UpdateBookmarkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	parts := parseATURI(uri)
	if len(parts) < 3 {
		http.Error(w, "Invalid URI", http.StatusBadRequest)
		return
	}
	rkey := parts[2]

	var result *xrpc.PutRecordOutput
	err = s.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		existing, getErr := client.GetRecord(r.Context(), did, xrpc.CollectionBookmark, rkey)
		if getErr != nil {
			return fmt.Errorf("failed to fetch record: %w", getErr)
		}

		var record map[string]interface{}
		json.Unmarshal(existing.Value, &record)

		if req.Title != "" {
			record["title"] = req.Title
		}
		if req.Description != "" {
			record["description"] = req.Description
		}
		if req.Tags != nil {
			record["tags"] = req.Tags
		}

		var updateErr error
		result, updateErr = client.PutRecord(r.Context(), did, xrpc.CollectionBookmark, rkey, record)
		if updateErr != nil {
			log.Printf("UpdateBookmark failed: %v. Retrying with delete-then-create workaround.", updateErr)
			_ = client.DeleteRecord(r.Context(), did, xrpc.CollectionBookmark, rkey)
			result, updateErr = client.PutRecord(r.Context(), did, xrpc.CollectionBookmark, rkey, record)
		}
		return updateErr
	})

	if err != nil {
		http.Error(w, "Failed to update: "+err.Error(), http.StatusInternalServerError)
		return
	}

	tagsJSON := ""
	if req.Tags != nil {
		b, _ := json.Marshal(req.Tags)
		tagsJSON = string(b)
	}
	s.db.UpdateBookmark(uri, req.Title, req.Description, tagsJSON, result.CID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "uri": result.URI, "cid": result.CID})
}
