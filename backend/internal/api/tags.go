package api

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func (h *Handler) HandleGetTrendingTags(w http.ResponseWriter, r *http.Request) {
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 50 {
			limit = val
		}
	}

	tags, err := h.db.GetTrendingTags(limit)
	if err != nil {
		http.Error(w, `{"error": "Failed to fetch trending tags: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tags)
}
