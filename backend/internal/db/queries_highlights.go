package db

import (
	"time"
)

func (db *DB) CreateHighlight(h *Highlight) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO highlights (uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(uri) DO UPDATE SET
			target_title = excluded.target_title,
			selector_json = excluded.selector_json,
			color = excluded.color,
			tags_json = excluded.tags_json,
			indexed_at = excluded.indexed_at,
			cid = excluded.cid
	`), h.URI, h.AuthorDID, h.TargetSource, h.TargetHash, h.TargetTitle, h.SelectorJSON, h.Color, h.TagsJSON, h.CreatedAt, h.IndexedAt, h.CID)
	return err
}

func (db *DB) GetHighlightByURI(uri string) (*Highlight, error) {
	var h Highlight
	err := db.QueryRow(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE uri = ?
	`), uri).Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID)
	if err != nil {
		return nil, err
	}
	return &h, nil
}

func (db *DB) GetRecentHighlights(limit, offset int) ([]Highlight, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetMarginHighlights(limit, offset int) ([]Highlight, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE uri NOT LIKE '%network.cosmik%'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetSembleHighlights(limit, offset int) ([]Highlight, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE uri LIKE '%network.cosmik%'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetHighlightsByTag(tag string, limit, offset int) ([]Highlight, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE tags_json LIKE ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetMarginHighlightsByTag(tag string, limit, offset int) ([]Highlight, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE tags_json LIKE ? AND uri NOT LIKE '%network.cosmik%'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetSembleHighlightsByTag(tag string, limit, offset int) ([]Highlight, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE tags_json LIKE ? AND uri LIKE '%network.cosmik%'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetHighlightsByTagAndAuthor(tag, authorDID string, limit, offset int) ([]Highlight, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE author_did = ? AND tags_json LIKE ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetMarginHighlightsByTagAndAuthor(tag, authorDID string, limit, offset int) ([]Highlight, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE author_did = ? AND tags_json LIKE ? AND uri NOT LIKE '%network.cosmik%'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetSembleHighlightsByTagAndAuthor(tag, authorDID string, limit, offset int) ([]Highlight, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE author_did = ? AND tags_json LIKE ? AND uri LIKE '%network.cosmik%'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetHighlightsByTargetHash(targetHash string, limit, offset int) ([]Highlight, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE target_hash = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), targetHash, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetHighlightsByAuthor(authorDID string, limit, offset int) ([]Highlight, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE author_did = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetMarginHighlightsByAuthor(authorDID string, limit, offset int) ([]Highlight, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE author_did = ? AND uri NOT LIKE '%network.cosmik%'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetSembleHighlightsByAuthor(authorDID string, limit, offset int) ([]Highlight, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE author_did = ? AND uri LIKE '%network.cosmik%'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetHighlightsByAuthorAndTargetHash(authorDID, targetHash string, limit, offset int) ([]Highlight, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE author_did = ? AND target_hash = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, targetHash, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) DeleteHighlight(uri string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM highlights WHERE uri = ?`), uri)
	return err
}

func (db *DB) UpdateHighlight(uri, color, tagsJSON, cid string) error {
	_, err := db.Exec(db.Rebind(`
		UPDATE highlights 
		SET color = ?, tags_json = ?, cid = ?, indexed_at = ?
		WHERE uri = ?
	`), color, tagsJSON, cid, time.Now(), uri)
	return err
}

func (db *DB) GetHighlightsByURIs(uris []string) ([]Highlight, error) {
	if len(uris) == 0 {
		return []Highlight{}, nil
	}

	query := db.Rebind(`
		SELECT uri, author_did, target_source, target_hash, target_title, selector_json, color, tags_json, created_at, indexed_at, cid
		FROM highlights
		WHERE uri IN (` + buildPlaceholders(len(uris)) + `)
	`)

	args := make([]interface{}, len(uris))
	for i, uri := range uris {
		args[i] = uri
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		if err := rows.Scan(&h.URI, &h.AuthorDID, &h.TargetSource, &h.TargetHash, &h.TargetTitle, &h.SelectorJSON, &h.Color, &h.TagsJSON, &h.CreatedAt, &h.IndexedAt, &h.CID); err != nil {
			return nil, err
		}
		highlights = append(highlights, h)
	}
	return highlights, nil
}

func (db *DB) GetHighlightURIs(authorDID string) ([]string, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri FROM highlights WHERE author_did = ?
	`), authorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var uris []string
	for rows.Next() {
		var uri string
		if err := rows.Scan(&uri); err != nil {
			return nil, err
		}
		uris = append(uris, uri)
	}
	return uris, nil
}
