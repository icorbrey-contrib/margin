package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"margin.at/internal/db"
	"margin.at/internal/xrpc"
)

type PreferencesResponse struct {
	ExternalLinkSkippedHostnames []string `json:"externalLinkSkippedHostnames"`
}

func (h *Handler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	session, err := h.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	prefs, err := h.db.GetPreferences(session.DID)
	if err != nil {
		http.Error(w, "Failed to fetch preferences", http.StatusInternalServerError)
		return
	}

	hostnames := []string{}
	if prefs != nil && prefs.ExternalLinkSkippedHostnames != nil {
		json.Unmarshal([]byte(*prefs.ExternalLinkSkippedHostnames), &hostnames)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(PreferencesResponse{
		ExternalLinkSkippedHostnames: hostnames,
	})
}

func (h *Handler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	session, err := h.refresher.GetSessionWithAutoRefresh(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var input PreferencesResponse
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	record := xrpc.NewPreferencesRecord(input.ExternalLinkSkippedHostnames)
	if err := record.Validate(); err != nil {
		http.Error(w, fmt.Sprintf("Invalid record: %v", err), http.StatusBadRequest)
		return
	}

	err = h.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, _ string) error {
		url := fmt.Sprintf("%s/xrpc/com.atproto.repo.putRecord", client.PDS)

		body := map[string]interface{}{
			"repo":       session.DID,
			"collection": xrpc.CollectionPreferences,
			"rkey":       "self",
			"record":     record,
		}

		jsonBody, err := json.Marshal(body)
		if err != nil {
			return err
		}

		req, err := http.NewRequestWithContext(r.Context(), "POST", url, bytes.NewBuffer(jsonBody))
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+client.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			var errResp struct {
				Error   string `json:"error"`
				Message string `json:"message"`
			}
			json.NewDecoder(resp.Body).Decode(&errResp)
			return fmt.Errorf("XRPC error %d: %s - %s", resp.StatusCode, errResp.Error, errResp.Message)
		}

		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update preferences: %v", err), http.StatusInternalServerError)
		return
	}

	createdAt, _ := time.Parse(time.RFC3339, record.CreatedAt)
	hostnamesJSON, _ := json.Marshal(input.ExternalLinkSkippedHostnames)
	hostnamesStr := string(hostnamesJSON)
	uri := fmt.Sprintf("at://%s/%s/self", session.DID, xrpc.CollectionPreferences)

	err = h.db.UpsertPreferences(&db.Preferences{
		URI:                          uri,
		AuthorDID:                    session.DID,
		ExternalLinkSkippedHostnames: &hostnamesStr,
		CreatedAt:                    createdAt,
		IndexedAt:                    time.Now(),
	})

	if err != nil {
		fmt.Printf("Failed to update local db preferences: %v\n", err)
	}

	w.WriteHeader(http.StatusOK)
}
