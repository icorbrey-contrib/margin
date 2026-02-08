package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"margin.at/internal/config"
	"margin.at/internal/db"
	"margin.at/internal/xrpc"
)

type LabelerSubscription struct {
	DID string `json:"did"`
}

type LabelPreference struct {
	LabelerDID string `json:"labelerDid"`
	Label      string `json:"label"`
	Visibility string `json:"visibility"`
}

type PreferencesResponse struct {
	ExternalLinkSkippedHostnames []string              `json:"externalLinkSkippedHostnames"`
	SubscribedLabelers           []LabelerSubscription  `json:"subscribedLabelers"`
	LabelPreferences             []LabelPreference      `json:"labelPreferences"`
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

	var labelers []LabelerSubscription
	if prefs != nil && prefs.SubscribedLabelers != nil {
		json.Unmarshal([]byte(*prefs.SubscribedLabelers), &labelers)
	}
	if labelers == nil {
		labelers = []LabelerSubscription{}
		serviceDID := config.Get().ServiceDID
		if serviceDID != "" {
			labelers = append(labelers, LabelerSubscription{DID: serviceDID})
		}
	}

	var labelPrefs []LabelPreference
	if prefs != nil && prefs.LabelPreferences != nil {
		json.Unmarshal([]byte(*prefs.LabelPreferences), &labelPrefs)
	}
	if labelPrefs == nil {
		labelPrefs = []LabelPreference{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(PreferencesResponse{
		ExternalLinkSkippedHostnames: hostnames,
		SubscribedLabelers:           labelers,
		LabelPreferences:             labelPrefs,
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

	var xrpcLabelers []xrpc.LabelerSubscription
	for _, l := range input.SubscribedLabelers {
		xrpcLabelers = append(xrpcLabelers, xrpc.LabelerSubscription{DID: l.DID})
	}
	var xrpcLabelPrefs []xrpc.LabelPreference
	for _, lp := range input.LabelPreferences {
		xrpcLabelPrefs = append(xrpcLabelPrefs, xrpc.LabelPreference{
			LabelerDID: lp.LabelerDID,
			Label:      lp.Label,
			Visibility: lp.Visibility,
		})
	}

	record := xrpc.NewPreferencesRecord(input.ExternalLinkSkippedHostnames, xrpcLabelers, xrpcLabelPrefs)
	if err := record.Validate(); err != nil {
		http.Error(w, fmt.Sprintf("Invalid record: %v", err), http.StatusBadRequest)
		return
	}

	err = h.refresher.ExecuteWithAutoRefresh(r, session, func(client *xrpc.Client, did string) error {
		_, err := client.PutRecord(r.Context(), did, xrpc.CollectionPreferences, "self", record)
		return err
	})

	if err != nil {
		fmt.Printf("[UpdatePreferences] PDS write failed: %v\n", err)
		http.Error(w, fmt.Sprintf("Failed to update preferences: %v", err), http.StatusInternalServerError)
		return
	}

	createdAt, _ := time.Parse(time.RFC3339, record.CreatedAt)
	hostnamesJSON, _ := json.Marshal(input.ExternalLinkSkippedHostnames)
	hostnamesStr := string(hostnamesJSON)

	var subscribedLabelersPtr, labelPrefsPtr *string
	if len(input.SubscribedLabelers) > 0 {
		labelersJSON, _ := json.Marshal(input.SubscribedLabelers)
		s := string(labelersJSON)
		subscribedLabelersPtr = &s
	}
	if len(input.LabelPreferences) > 0 {
		prefsJSON, _ := json.Marshal(input.LabelPreferences)
		s := string(prefsJSON)
		labelPrefsPtr = &s
	}

	uri := fmt.Sprintf("at://%s/%s/self", session.DID, xrpc.CollectionPreferences)

	err = h.db.UpsertPreferences(&db.Preferences{
		URI:                          uri,
		AuthorDID:                    session.DID,
		ExternalLinkSkippedHostnames: &hostnamesStr,
		SubscribedLabelers:           subscribedLabelersPtr,
		LabelPreferences:             labelPrefsPtr,
		CreatedAt:                    createdAt,
		IndexedAt:                    time.Now(),
	})

	if err != nil {
		fmt.Printf("Failed to update local db preferences: %v\n", err)
	}

	w.WriteHeader(http.StatusOK)
}
