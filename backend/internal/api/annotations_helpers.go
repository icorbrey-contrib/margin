package api

import (
	"encoding/json"
	"time"

	"margin.at/internal/db"
)

func (s *AnnotationService) checkDuplicateAnnotation(did, url, text string) (*db.Annotation, error) {
	recentAnnos, err := s.db.GetAnnotationsByAuthor(did, 5, 0)
	if err != nil {
		return nil, err
	}
	for _, a := range recentAnnos {
		if a.TargetSource == url &&
			((a.BodyValue == nil && text == "") || (a.BodyValue != nil && *a.BodyValue == text)) &&
			time.Since(a.CreatedAt) < 10*time.Second {
			return &a, nil
		}
	}
	return nil, nil
}

func (s *AnnotationService) checkDuplicateHighlight(did, url string, selector json.RawMessage) (*db.Highlight, error) {
	recentHighs, err := s.db.GetHighlightsByAuthor(did, 5, 0)
	if err != nil {
		return nil, err
	}
	for _, h := range recentHighs {
		matchSelector := false
		if h.SelectorJSON == nil && selector == nil {
			matchSelector = true
		} else if h.SelectorJSON != nil && selector != nil {
			selectorBytes, _ := json.Marshal(selector)
			if *h.SelectorJSON == string(selectorBytes) {
				matchSelector = true
			}
		}

		if h.TargetSource == url && matchSelector && time.Since(h.CreatedAt) < 10*time.Second {
			return &h, nil
		}
	}
	return nil, nil
}

func (s *AnnotationService) checkDuplicateBookmark(did, url string) (*db.Bookmark, error) {
	recentBooks, err := s.db.GetBookmarksByAuthor(did, 5, 0)
	if err != nil {
		return nil, err
	}
	for _, b := range recentBooks {
		if b.Source == url && time.Since(b.CreatedAt) < 10*time.Second {
			return &b, nil
		}
	}
	return nil, nil
}
