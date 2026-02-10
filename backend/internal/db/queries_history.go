package db

import (
	"fmt"
	"strings"
	"time"
)

func (db *DB) SaveEditHistory(uri, recordType, previousContent string, previousCID *string) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO edit_history (uri, record_type, previous_content, previous_cid, edited_at)
		VALUES (?, ?, ?, ?, ?)
	`), uri, recordType, previousContent, previousCID, time.Now())
	return err
}

func (db *DB) GetEditHistory(uri string) ([]EditHistory, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT id, uri, record_type, previous_content, previous_cid, edited_at
		FROM edit_history
		WHERE uri = ?
		ORDER BY edited_at DESC
	`), uri)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []EditHistory
	for rows.Next() {
		var h EditHistory
		var editedAt interface{}
		if err := rows.Scan(&h.ID, &h.URI, &h.RecordType, &h.PreviousContent, &h.PreviousCID, &editedAt); err != nil {
			return nil, err
		}

		switch v := editedAt.(type) {
		case time.Time:
			h.EditedAt = v
		case []byte:
			parsed, err := parseTime(string(v))
			if err != nil {
				return nil, err
			}
			h.EditedAt = parsed
		case string:
			parsed, err := parseTime(v)
			if err != nil {
				return nil, err
			}
			h.EditedAt = parsed
		}

		history = append(history, h)
	}
	return history, nil
}

func (db *DB) GetLatestEditTimes(uris []string) (map[string]time.Time, error) {
	if len(uris) == 0 {
		return nil, nil
	}

	query := `
		SELECT uri, MAX(edited_at) as edited_at
		FROM edit_history
		WHERE uri IN (`
	args := make([]interface{}, len(uris))
	placeholders := make([]string, len(uris))

	for i, uri := range uris {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = uri
	}

	query += strings.Join(placeholders, ",") + ") GROUP BY uri"

	if db.driver == "sqlite3" {
		query = strings.ReplaceAll(query, "$", "?")
		placeholders = make([]string, len(uris))
		for i := range uris {
			placeholders[i] = "?"
		}
		query = `
		SELECT uri, MAX(edited_at) as edited_at
		FROM edit_history
		WHERE uri IN (` + strings.Join(placeholders, ",") + ") GROUP BY uri"
	}

	rows, err := db.Query(db.Rebind(query), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]time.Time)
	for rows.Next() {
		var uri string
		var editedAt interface{}
		if err := rows.Scan(&uri, &editedAt); err != nil {
			continue
		}

		var finalTime time.Time
		switch v := editedAt.(type) {
		case time.Time:
			finalTime = v
		case []byte:
			parsed, err := parseTime(string(v))
			if err != nil {
				continue
			}
			finalTime = parsed
		case string:
			parsed, err := parseTime(v)
			if err != nil {
				continue
			}
			finalTime = parsed
		default:
			continue
		}

		result[uri] = finalTime
	}

	return result, nil
}

func parseTime(s string) (time.Time, error) {
	formats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05",
	}

	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("could not parse time: %s", s)
}
