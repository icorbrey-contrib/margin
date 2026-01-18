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

func (db *DB) CreateAnnotation(a *Annotation) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO annotations (uri, author_did, motivation, body_value, body_format, body_uri, target_source, target_hash, target_title, selector_json, tags_json, created_at, indexed_at, cid)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(uri) DO UPDATE SET
			motivation = excluded.motivation,
			body_value = excluded.body_value,
			body_format = excluded.body_format,
			body_uri = excluded.body_uri,
			target_title = excluded.target_title,
			selector_json = excluded.selector_json,
			tags_json = excluded.tags_json,
			indexed_at = excluded.indexed_at,
			cid = excluded.cid
	`), a.URI, a.AuthorDID, a.Motivation, a.BodyValue, a.BodyFormat, a.BodyURI, a.TargetSource, a.TargetHash, a.TargetTitle, a.SelectorJSON, a.TagsJSON, a.CreatedAt, a.IndexedAt, a.CID)
	return err
}

func (db *DB) GetAnnotationByURI(uri string) (*Annotation, error) {
	var a Annotation
	err := db.QueryRow(db.Rebind(`
		SELECT uri, author_did, motivation, body_value, body_format, body_uri, target_source, target_hash, target_title, selector_json, tags_json, created_at, indexed_at, cid
		FROM annotations
		WHERE uri = ?
	`), uri).Scan(&a.URI, &a.AuthorDID, &a.Motivation, &a.BodyValue, &a.BodyFormat, &a.BodyURI, &a.TargetSource, &a.TargetHash, &a.TargetTitle, &a.SelectorJSON, &a.TagsJSON, &a.CreatedAt, &a.IndexedAt, &a.CID)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (db *DB) GetAnnotationsByTargetHash(targetHash string, limit, offset int) ([]Annotation, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, motivation, body_value, body_format, body_uri, target_source, target_hash, target_title, selector_json, tags_json, created_at, indexed_at, cid
		FROM annotations
		WHERE target_hash = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), targetHash, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAnnotations(rows)
}

func (db *DB) GetAnnotationsByAuthor(authorDID string, limit, offset int) ([]Annotation, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, motivation, body_value, body_format, body_uri, target_source, target_hash, target_title, selector_json, tags_json, created_at, indexed_at, cid
		FROM annotations
		WHERE author_did = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAnnotations(rows)
}

func (db *DB) GetAnnotationsByMotivation(motivation string, limit, offset int) ([]Annotation, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, motivation, body_value, body_format, body_uri, target_source, target_hash, target_title, selector_json, tags_json, created_at, indexed_at, cid
		FROM annotations
		WHERE motivation = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), motivation, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAnnotations(rows)
}

func (db *DB) GetRecentAnnotations(limit, offset int) ([]Annotation, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, motivation, body_value, body_format, body_uri, target_source, target_hash, target_title, selector_json, tags_json, created_at, indexed_at, cid
		FROM annotations
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAnnotations(rows)
}

func (db *DB) GetAnnotationsByTag(tag string, limit, offset int) ([]Annotation, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, motivation, body_value, body_format, body_uri, target_source, target_hash, target_title, selector_json, tags_json, created_at, indexed_at, cid
		FROM annotations
		WHERE tags_json LIKE ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAnnotations(rows)
}

func (db *DB) DeleteAnnotation(uri string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM annotations WHERE uri = ?`), uri)
	return err
}

func (db *DB) UpdateAnnotation(uri, bodyValue, tagsJSON, cid string) error {
	_, err := db.Exec(db.Rebind(`
		UPDATE annotations 
		SET body_value = ?, tags_json = ?, cid = ?, indexed_at = ?
		WHERE uri = ?
	`), bodyValue, tagsJSON, cid, time.Now(), uri)
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

func (db *DB) UpdateBookmark(uri, title, description, tagsJSON, cid string) error {
	_, err := db.Exec(db.Rebind(`
		UPDATE bookmarks 
		SET title = ?, description = ?, tags_json = ?, cid = ?, indexed_at = ?
		WHERE uri = ?
	`), title, description, tagsJSON, cid, time.Now(), uri)
	return err
}

type EditHistory struct {
	ID              int       `json:"id"`
	URI             string    `json:"uri"`
	RecordType      string    `json:"recordType"`
	PreviousContent string    `json:"previousContent"`
	PreviousCID     *string   `json:"previousCid"`
	EditedAt        time.Time `json:"editedAt"`
}

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

func (db *DB) GetRecentBookmarks(limit, offset int) ([]Bookmark, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, source, source_hash, title, description, tags_json, created_at, indexed_at, cid
		FROM bookmarks
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookmarks []Bookmark
	for rows.Next() {
		var b Bookmark
		if err := rows.Scan(&b.URI, &b.AuthorDID, &b.Source, &b.SourceHash, &b.Title, &b.Description, &b.TagsJSON, &b.CreatedAt, &b.IndexedAt, &b.CID); err != nil {
			return nil, err
		}
		bookmarks = append(bookmarks, b)
	}
	return bookmarks, nil
}

func (db *DB) GetBookmarksByTag(tag string, limit, offset int) ([]Bookmark, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, source, source_hash, title, description, tags_json, created_at, indexed_at, cid
		FROM bookmarks
		WHERE tags_json LIKE ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookmarks []Bookmark
	for rows.Next() {
		var b Bookmark
		if err := rows.Scan(&b.URI, &b.AuthorDID, &b.Source, &b.SourceHash, &b.Title, &b.Description, &b.TagsJSON, &b.CreatedAt, &b.IndexedAt, &b.CID); err != nil {
			return nil, err
		}
		bookmarks = append(bookmarks, b)
	}
	return bookmarks, nil
}

func (db *DB) GetAnnotationsByTagAndAuthor(tag, authorDID string, limit, offset int) ([]Annotation, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, motivation, body_value, body_format, body_uri, target_source, target_hash, target_title, selector_json, tags_json, created_at, indexed_at, cid
		FROM annotations
		WHERE author_did = ? AND tags_json LIKE ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAnnotations(rows)
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

func (db *DB) GetBookmarksByTagAndAuthor(tag, authorDID string, limit, offset int) ([]Bookmark, error) {
	pattern := "%\"" + tag + "\"%"
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, source, source_hash, title, description, tags_json, created_at, indexed_at, cid
		FROM bookmarks
		WHERE author_did = ? AND tags_json LIKE ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, pattern, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookmarks []Bookmark
	for rows.Next() {
		var b Bookmark
		if err := rows.Scan(&b.URI, &b.AuthorDID, &b.Source, &b.SourceHash, &b.Title, &b.Description, &b.TagsJSON, &b.CreatedAt, &b.IndexedAt, &b.CID); err != nil {
			return nil, err
		}
		bookmarks = append(bookmarks, b)
	}
	return bookmarks, nil
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

func (db *DB) DeleteHighlight(uri string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM highlights WHERE uri = ?`), uri)
	return err
}

func (db *DB) CreateBookmark(b *Bookmark) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO bookmarks (uri, author_did, source, source_hash, title, description, tags_json, created_at, indexed_at, cid)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(uri) DO UPDATE SET
			title = excluded.title,
			description = excluded.description,
			tags_json = excluded.tags_json,
			indexed_at = excluded.indexed_at,
			cid = excluded.cid
	`), b.URI, b.AuthorDID, b.Source, b.SourceHash, b.Title, b.Description, b.TagsJSON, b.CreatedAt, b.IndexedAt, b.CID)
	return err
}

func (db *DB) GetBookmarkByURI(uri string) (*Bookmark, error) {
	var b Bookmark
	err := db.QueryRow(db.Rebind(`
		SELECT uri, author_did, source, source_hash, title, description, tags_json, created_at, indexed_at, cid
		FROM bookmarks
		WHERE uri = ?
	`), uri).Scan(&b.URI, &b.AuthorDID, &b.Source, &b.SourceHash, &b.Title, &b.Description, &b.TagsJSON, &b.CreatedAt, &b.IndexedAt, &b.CID)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (db *DB) GetBookmarksByAuthor(authorDID string, limit, offset int) ([]Bookmark, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, source, source_hash, title, description, tags_json, created_at, indexed_at, cid
		FROM bookmarks
		WHERE author_did = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), authorDID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookmarks []Bookmark
	for rows.Next() {
		var b Bookmark
		if err := rows.Scan(&b.URI, &b.AuthorDID, &b.Source, &b.SourceHash, &b.Title, &b.Description, &b.TagsJSON, &b.CreatedAt, &b.IndexedAt, &b.CID); err != nil {
			return nil, err
		}
		bookmarks = append(bookmarks, b)
	}
	return bookmarks, nil
}

func (db *DB) DeleteBookmark(uri string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM bookmarks WHERE uri = ?`), uri)
	return err
}

func (db *DB) CreateReply(r *Reply) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO replies (uri, author_did, parent_uri, root_uri, text, format, created_at, indexed_at, cid)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(uri) DO UPDATE SET
			text = excluded.text,
			format = excluded.format,
			indexed_at = excluded.indexed_at,
			cid = excluded.cid
	`), r.URI, r.AuthorDID, r.ParentURI, r.RootURI, r.Text, r.Format, r.CreatedAt, r.IndexedAt, r.CID)
	return err
}

func (db *DB) GetRepliesByRoot(rootURI string) ([]Reply, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, parent_uri, root_uri, text, format, created_at, indexed_at, cid
		FROM replies
		WHERE root_uri = ?
		ORDER BY created_at ASC
	`), rootURI)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var replies []Reply
	for rows.Next() {
		var r Reply
		if err := rows.Scan(&r.URI, &r.AuthorDID, &r.ParentURI, &r.RootURI, &r.Text, &r.Format, &r.CreatedAt, &r.IndexedAt, &r.CID); err != nil {
			return nil, err
		}
		replies = append(replies, r)
	}
	return replies, nil
}

func (db *DB) GetReplyByURI(uri string) (*Reply, error) {
	var r Reply
	err := db.QueryRow(db.Rebind(`
		SELECT uri, author_did, parent_uri, root_uri, text, format, created_at, indexed_at, cid
		FROM replies
		WHERE uri = ?
	`), uri).Scan(&r.URI, &r.AuthorDID, &r.ParentURI, &r.RootURI, &r.Text, &r.Format, &r.CreatedAt, &r.IndexedAt, &r.CID)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (db *DB) DeleteReply(uri string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM replies WHERE uri = ?`), uri)
	return err
}

func (db *DB) GetRepliesByAuthor(authorDID string) ([]Reply, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, parent_uri, root_uri, text, format, created_at, indexed_at, cid
		FROM replies
		WHERE author_did = ?
		ORDER BY created_at DESC
	`), authorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var replies []Reply
	for rows.Next() {
		var r Reply
		if err := rows.Scan(&r.URI, &r.AuthorDID, &r.ParentURI, &r.RootURI, &r.Text, &r.Format, &r.CreatedAt, &r.IndexedAt, &r.CID); err != nil {
			return nil, err
		}
		replies = append(replies, r)
	}
	return replies, nil
}

func (db *DB) AnnotationExists(uri string) bool {
	var count int
	db.QueryRow(db.Rebind(`SELECT COUNT(*) FROM annotations WHERE uri = ?`), uri).Scan(&count)
	return count > 0
}

func (db *DB) GetOrphanedRepliesByAuthor(authorDID string) ([]Reply, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT r.uri, r.author_did, r.parent_uri, r.root_uri, r.text, r.format, r.created_at, r.indexed_at, r.cid
		FROM replies r
		LEFT JOIN annotations a ON r.root_uri = a.uri
		WHERE r.author_did = ? AND a.uri IS NULL
	`), authorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var replies []Reply
	for rows.Next() {
		var r Reply
		if err := rows.Scan(&r.URI, &r.AuthorDID, &r.ParentURI, &r.RootURI, &r.Text, &r.Format, &r.CreatedAt, &r.IndexedAt, &r.CID); err != nil {
			return nil, err
		}
		replies = append(replies, r)
	}
	return replies, nil
}

func (db *DB) CreateLike(l *Like) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO likes (uri, author_did, subject_uri, created_at, indexed_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(uri) DO NOTHING
	`), l.URI, l.AuthorDID, l.SubjectURI, l.CreatedAt, l.IndexedAt)
	return err
}

func (db *DB) DeleteLike(uri string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM likes WHERE uri = ?`), uri)
	return err
}

func (db *DB) GetLikeCount(subjectURI string) (int, error) {
	var count int
	err := db.QueryRow(db.Rebind(`SELECT COUNT(*) FROM likes WHERE subject_uri = ?`), subjectURI).Scan(&count)
	return count, err
}

func (db *DB) GetReplyCount(rootURI string) (int, error) {
	var count int
	err := db.QueryRow(db.Rebind(`SELECT COUNT(*) FROM replies WHERE root_uri = ?`), rootURI).Scan(&count)
	return count, err
}

func (db *DB) GetLikeByUserAndSubject(userDID, subjectURI string) (*Like, error) {
	var like Like
	err := db.QueryRow(db.Rebind(`
		SELECT uri, author_did, subject_uri, created_at, indexed_at
		FROM likes
		WHERE author_did = ? AND subject_uri = ?
	`), userDID, subjectURI).Scan(&like.URI, &like.AuthorDID, &like.SubjectURI, &like.CreatedAt, &like.IndexedAt)
	if err != nil {
		return nil, err
	}
	return &like, nil
}

func (db *DB) CreateCollection(c *Collection) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO collections (uri, author_did, name, description, icon, created_at, indexed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(uri) DO UPDATE SET
			name = excluded.name,
			description = excluded.description,
			icon = excluded.icon,
			indexed_at = excluded.indexed_at
	`), c.URI, c.AuthorDID, c.Name, c.Description, c.Icon, c.CreatedAt, c.IndexedAt)
	return err
}

func (db *DB) GetCollectionsByAuthor(authorDID string) ([]Collection, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, name, description, icon, created_at, indexed_at
		FROM collections
		WHERE author_did = ?
		ORDER BY created_at DESC
	`), authorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collections []Collection
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.URI, &c.AuthorDID, &c.Name, &c.Description, &c.Icon, &c.CreatedAt, &c.IndexedAt); err != nil {
			return nil, err
		}
		collections = append(collections, c)
	}
	return collections, nil
}

func (db *DB) GetCollectionByURI(uri string) (*Collection, error) {
	var c Collection
	err := db.QueryRow(db.Rebind(`
		SELECT uri, author_did, name, description, icon, created_at, indexed_at
		FROM collections
		WHERE uri = ?
	`), uri).Scan(&c.URI, &c.AuthorDID, &c.Name, &c.Description, &c.Icon, &c.CreatedAt, &c.IndexedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) DeleteCollection(uri string) error {

	db.Exec(db.Rebind(`DELETE FROM collection_items WHERE collection_uri = ?`), uri)
	_, err := db.Exec(db.Rebind(`DELETE FROM collections WHERE uri = ?`), uri)
	return err
}

func (db *DB) AddToCollection(item *CollectionItem) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO collection_items (uri, author_did, collection_uri, annotation_uri, position, created_at, indexed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(uri) DO UPDATE SET
			position = excluded.position,
			indexed_at = excluded.indexed_at
	`), item.URI, item.AuthorDID, item.CollectionURI, item.AnnotationURI, item.Position, item.CreatedAt, item.IndexedAt)
	return err
}

func (db *DB) GetCollectionItems(collectionURI string) ([]CollectionItem, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, collection_uri, annotation_uri, position, created_at, indexed_at
		FROM collection_items
		WHERE collection_uri = ?
		ORDER BY position ASC, created_at DESC
	`), collectionURI)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []CollectionItem
	for rows.Next() {
		var item CollectionItem
		if err := rows.Scan(&item.URI, &item.AuthorDID, &item.CollectionURI, &item.AnnotationURI, &item.Position, &item.CreatedAt, &item.IndexedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (db *DB) RemoveFromCollection(uri string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM collection_items WHERE uri = ?`), uri)
	return err
}

func (db *DB) GetRecentCollectionItems(limit, offset int) ([]CollectionItem, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT uri, author_did, collection_uri, annotation_uri, position, created_at, indexed_at
		FROM collection_items
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []CollectionItem
	for rows.Next() {
		var item CollectionItem
		if err := rows.Scan(&item.URI, &item.AuthorDID, &item.CollectionURI, &item.AnnotationURI, &item.Position, &item.CreatedAt, &item.IndexedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (db *DB) GetCollectionURIsForAnnotation(annotationURI string) ([]string, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT collection_uri FROM collection_items WHERE annotation_uri = ?
	`), annotationURI)
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

func (db *DB) SaveSession(id, did, handle, accessToken, refreshToken, dpopKey string, expiresAt time.Time) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO sessions (id, did, handle, access_token, refresh_token, dpop_key, created_at, expires_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			access_token = excluded.access_token,
			refresh_token = excluded.refresh_token,
			dpop_key = excluded.dpop_key,
			expires_at = excluded.expires_at
	`), id, did, handle, accessToken, refreshToken, dpopKey, time.Now(), expiresAt)
	return err
}

func (db *DB) GetSession(id string) (did, handle, accessToken, refreshToken, dpopKey string, err error) {
	err = db.QueryRow(db.Rebind(`
		SELECT did, handle, access_token, refresh_token, COALESCE(dpop_key, '')
		FROM sessions
		WHERE id = ? AND expires_at > ?
	`), id, time.Now()).Scan(&did, &handle, &accessToken, &refreshToken, &dpopKey)
	return
}

func (db *DB) DeleteSession(id string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM sessions WHERE id = ?`), id)
	return err
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

func (db *DB) CreateNotification(n *Notification) error {
	_, err := db.Exec(db.Rebind(`
		INSERT INTO notifications (recipient_did, actor_did, type, subject_uri, created_at)
		VALUES (?, ?, ?, ?, ?)
	`), n.RecipientDID, n.ActorDID, n.Type, n.SubjectURI, n.CreatedAt)
	return err
}

func (db *DB) GetNotifications(recipientDID string, limit, offset int) ([]Notification, error) {
	rows, err := db.Query(db.Rebind(`
		SELECT id, recipient_did, actor_did, type, subject_uri, created_at, read_at
		FROM notifications
		WHERE recipient_did = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`), recipientDID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.RecipientDID, &n.ActorDID, &n.Type, &n.SubjectURI, &n.CreatedAt, &n.ReadAt); err != nil {
			continue
		}
		notifications = append(notifications, n)
	}
	return notifications, nil
}

func (db *DB) GetUnreadNotificationCount(recipientDID string) (int, error) {
	var count int
	err := db.QueryRow(db.Rebind(`
		SELECT COUNT(*) FROM notifications WHERE recipient_did = ? AND read_at IS NULL
	`), recipientDID).Scan(&count)
	return count, err
}

func (db *DB) MarkNotificationsRead(recipientDID string) error {
	_, err := db.Exec(db.Rebind(`
		UPDATE notifications SET read_at = ? WHERE recipient_did = ? AND read_at IS NULL
	`), time.Now(), recipientDID)
	return err
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
