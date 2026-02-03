package api

import (
	"encoding/json"
	"net/http"
)

type APIError struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

func WriteJSONError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(APIError{Error: message})
}

func WriteJSONErrorWithCode(w http.ResponseWriter, statusCode int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(APIError{Error: message, Code: code})
}

func WriteJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func WriteSuccess(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusOK, data)
}

func WriteBadRequest(w http.ResponseWriter, message string) {
	WriteJSONError(w, http.StatusBadRequest, message)
}

func WriteUnauthorized(w http.ResponseWriter, message string) {
	WriteJSONError(w, http.StatusUnauthorized, message)
}

func WriteForbidden(w http.ResponseWriter, message string) {
	WriteJSONError(w, http.StatusForbidden, message)
}

func WriteNotFound(w http.ResponseWriter, message string) {
	WriteJSONError(w, http.StatusNotFound, message)
}

func WriteConflict(w http.ResponseWriter, message string) {
	WriteJSONError(w, http.StatusConflict, message)
}

func WriteInternalError(w http.ResponseWriter, message string) {
	WriteJSONError(w, http.StatusInternalServerError, message)
}
