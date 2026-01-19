package db

import (
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
		if err := rows.Scan(&h.ID, &h.URI, &h.RecordType, &h.PreviousContent, &h.PreviousCID, &h.EditedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, nil
}
