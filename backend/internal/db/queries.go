package db

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"
)

type EditHistory struct {
	ID              int       `json:"id"`
	URI             string    `json:"uri"`
	RecordType      string    `json:"recordType"`
	PreviousContent string    `json:"previousContent"`
	PreviousCID     *string   `json:"previousCid"`
	EditedAt        time.Time `json:"editedAt"`
}

func scanAnnotations(rows interface {
	Next() bool
	Scan(...interface{}) error
}) ([]Annotation, error) {
	var annotations []Annotation
	for rows.Next() {
		var a Annotation
		if err := rows.Scan(&a.URI, &a.AuthorDID, &a.Motivation, &a.BodyValue, &a.BodyFormat, &a.BodyURI, &a.TargetSource, &a.TargetHash, &a.TargetTitle, &a.SelectorJSON, &a.TagsJSON, &a.CreatedAt, &a.IndexedAt, &a.CID); err != nil {
			return nil, err
		}
		annotations = append(annotations, a)
	}
	return annotations, nil
}

func (db *DB) AnnotationExists(uri string) bool {
	var count int
	db.QueryRow(db.Rebind(`SELECT COUNT(*) FROM annotations WHERE uri = ?`), uri).Scan(&count)
	return count > 0
}

func HashURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return hashString(rawURL)
	}

	normalized := strings.ToLower(parsed.Host) + parsed.Path
	if parsed.RawQuery != "" {
		normalized += "?" + parsed.RawQuery
	}
	normalized = strings.TrimSuffix(normalized, "/")

	return hashString(normalized)
}

func hashString(s string) string {
	h := sha256.New()
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}

func ToJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func (db *DB) GetAuthorByURI(uri string) (string, error) {
	var authorDID string
	err := db.QueryRow(db.Rebind(`SELECT author_did FROM annotations WHERE uri = ?`), uri).Scan(&authorDID)
	if err == nil {
		return authorDID, nil
	}

	err = db.QueryRow(db.Rebind(`SELECT author_did FROM highlights WHERE uri = ?`), uri).Scan(&authorDID)
	if err == nil {
		return authorDID, nil
	}

	err = db.QueryRow(db.Rebind(`SELECT author_did FROM bookmarks WHERE uri = ?`), uri).Scan(&authorDID)
	if err == nil {
		return authorDID, nil
	}

	return "", fmt.Errorf("uri not found or no author")
}

func buildPlaceholders(n int) string {
	if n == 0 {
		return ""
	}
	placeholders := make([]string, n)
	for i := range placeholders {
		placeholders[i] = "?"
	}
	return strings.Join(placeholders, ", ")
}
