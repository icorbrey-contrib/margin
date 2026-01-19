package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"
)

type DB struct {
	*sql.DB
	driver string
}

type Annotation struct {
	URI          string    `json:"uri"`
	AuthorDID    string    `json:"authorDid"`
	Motivation   string    `json:"motivation,omitempty"`
	BodyValue    *string   `json:"bodyValue,omitempty"`
	BodyFormat   *string   `json:"bodyFormat,omitempty"`
	BodyURI      *string   `json:"bodyUri,omitempty"`
	TargetSource string    `json:"targetSource"`
	TargetHash   string    `json:"targetHash"`
	TargetTitle  *string   `json:"targetTitle,omitempty"`
	SelectorJSON *string   `json:"selector,omitempty"`
	TagsJSON     *string   `json:"tags,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	IndexedAt    time.Time `json:"indexedAt"`
	CID          *string   `json:"cid,omitempty"`
}

type Selector struct {
	Type   string `json:"type"`
	Exact  string `json:"exact,omitempty"`
	Prefix string `json:"prefix,omitempty"`
	Suffix string `json:"suffix,omitempty"`
	Start  *int   `json:"start,omitempty"`
	End    *int   `json:"end,omitempty"`
	Value  string `json:"value,omitempty"`
}

type Highlight struct {
	URI          string    `json:"uri"`
	AuthorDID    string    `json:"authorDid"`
	TargetSource string    `json:"targetSource"`
	TargetHash   string    `json:"targetHash"`
	TargetTitle  *string   `json:"targetTitle,omitempty"`
	SelectorJSON *string   `json:"selector,omitempty"`
	Color        *string   `json:"color,omitempty"`
	TagsJSON     *string   `json:"tags,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	IndexedAt    time.Time `json:"indexedAt"`
	CID          *string   `json:"cid,omitempty"`
}

type Bookmark struct {
	URI         string    `json:"uri"`
	AuthorDID   string    `json:"authorDid"`
	Source      string    `json:"source"`
	SourceHash  string    `json:"sourceHash"`
	Title       *string   `json:"title,omitempty"`
	Description *string   `json:"description,omitempty"`
	TagsJSON    *string   `json:"tags,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	IndexedAt   time.Time `json:"indexedAt"`
	CID         *string   `json:"cid,omitempty"`
}

type Reply struct {
	URI       string    `json:"uri"`
	AuthorDID string    `json:"authorDid"`
	ParentURI string    `json:"parentUri"`
	RootURI   string    `json:"rootUri"`
	Text      string    `json:"text"`
	Format    *string   `json:"format,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	IndexedAt time.Time `json:"indexedAt"`
	CID       *string   `json:"cid,omitempty"`
}

type Like struct {
	URI        string    `json:"uri"`
	AuthorDID  string    `json:"authorDid"`
	SubjectURI string    `json:"subjectUri"`
	CreatedAt  time.Time `json:"createdAt"`
	IndexedAt  time.Time `json:"indexedAt"`
}

type Collection struct {
	URI         string    `json:"uri"`
	AuthorDID   string    `json:"authorDid"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	Icon        *string   `json:"icon,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	IndexedAt   time.Time `json:"indexedAt"`
}

type CollectionItem struct {
	URI           string    `json:"uri"`
	AuthorDID     string    `json:"authorDid"`
	CollectionURI string    `json:"collectionUri"`
	AnnotationURI string    `json:"annotationUri"`
	Position      int       `json:"position"`
	CreatedAt     time.Time `json:"createdAt"`
	IndexedAt     time.Time `json:"indexedAt"`
}

type Notification struct {
	ID           int        `json:"id"`
	RecipientDID string     `json:"recipientDid"`
	ActorDID     string     `json:"actorDid"`
	Type         string     `json:"type"`
	SubjectURI   string     `json:"subjectUri"`
	CreatedAt    time.Time  `json:"createdAt"`
	ReadAt       *time.Time `json:"readAt,omitempty"`
}

type APIKey struct {
	ID         string     `json:"id"`
	OwnerDID   string     `json:"ownerDid"`
	Name       string     `json:"name"`
	KeyHash    string     `json:"-"`
	CreatedAt  time.Time  `json:"createdAt"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty"`
}

func New(dsn string) (*DB, error) {
	driver := "sqlite3"
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		driver = "postgres"
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, err
	}

	if driver == "sqlite3" {
		db.SetMaxOpenConns(1)
	} else {
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(5)
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &DB{DB: db, driver: driver}, nil
}

func (db *DB) Migrate() error {

	dateType := "DATETIME"
	if db.driver == "postgres" {
		dateType = "TIMESTAMP"
	}

	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS annotations (
			uri TEXT PRIMARY KEY,
			author_did TEXT NOT NULL,
			motivation TEXT,
			body_value TEXT,
			body_format TEXT DEFAULT 'text/plain',
			body_uri TEXT,
			target_source TEXT NOT NULL,
			target_hash TEXT NOT NULL,
			target_title TEXT,
			selector_json TEXT,
			tags_json TEXT,
			created_at ` + dateType + ` NOT NULL,
			indexed_at ` + dateType + ` NOT NULL,
			cid TEXT
		)`)
	if err != nil {
		return err
	}

	db.Exec(`CREATE INDEX IF NOT EXISTS idx_annotations_target_hash ON annotations(target_hash)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_annotations_author_did ON annotations(author_did)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_annotations_motivation ON annotations(motivation)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_annotations_created_at ON annotations(created_at DESC)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS highlights (
		uri TEXT PRIMARY KEY,
		author_did TEXT NOT NULL,
		target_source TEXT NOT NULL,
		target_hash TEXT NOT NULL,
		target_title TEXT,
		selector_json TEXT,
		color TEXT,
		tags_json TEXT,
		created_at ` + dateType + ` NOT NULL,
		indexed_at ` + dateType + ` NOT NULL,
		cid TEXT
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_highlights_target_hash ON highlights(target_hash)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_highlights_author_did ON highlights(author_did)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS bookmarks (
		uri TEXT PRIMARY KEY,
		author_did TEXT NOT NULL,
		source TEXT NOT NULL,
		source_hash TEXT NOT NULL,
		title TEXT,
		description TEXT,
		tags_json TEXT,
		created_at ` + dateType + ` NOT NULL,
		indexed_at ` + dateType + ` NOT NULL,
		cid TEXT
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_bookmarks_source_hash ON bookmarks(source_hash)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_bookmarks_author_did ON bookmarks(author_did)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS replies (
		uri TEXT PRIMARY KEY,
		author_did TEXT NOT NULL,
		parent_uri TEXT NOT NULL,
		root_uri TEXT NOT NULL,
		text TEXT NOT NULL,
		format TEXT DEFAULT 'text/plain',
		created_at ` + dateType + ` NOT NULL,
		indexed_at ` + dateType + ` NOT NULL,
		cid TEXT
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_replies_parent_uri ON replies(parent_uri)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_replies_root_uri ON replies(root_uri)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS likes (
		uri TEXT PRIMARY KEY,
		author_did TEXT NOT NULL,
		subject_uri TEXT NOT NULL,
		created_at ` + dateType + ` NOT NULL,
		indexed_at ` + dateType + ` NOT NULL
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_likes_subject_uri ON likes(subject_uri)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_likes_author_did ON likes(author_did)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS collections (
		uri TEXT PRIMARY KEY,
		author_did TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		icon TEXT,
		created_at ` + dateType + ` NOT NULL,
		indexed_at ` + dateType + ` NOT NULL
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_collections_author_did ON collections(author_did)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS collection_items (
		uri TEXT PRIMARY KEY,
		author_did TEXT NOT NULL,
		collection_uri TEXT NOT NULL,
		annotation_uri TEXT NOT NULL,
		position INTEGER DEFAULT 0,
		created_at ` + dateType + ` NOT NULL,
		indexed_at ` + dateType + ` NOT NULL
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_uri)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_collection_items_annotation ON collection_items(annotation_uri)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		did TEXT NOT NULL,
		handle TEXT NOT NULL,
		access_token TEXT NOT NULL,
		refresh_token TEXT NOT NULL,
		dpop_key TEXT,
		created_at ` + dateType + ` NOT NULL,
		expires_at ` + dateType + ` NOT NULL
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_sessions_did ON sessions(did)`)

	autoInc := "INTEGER PRIMARY KEY AUTOINCREMENT"
	if db.driver == "postgres" {
		autoInc = "SERIAL PRIMARY KEY"
	}

	db.Exec(`CREATE TABLE IF NOT EXISTS edit_history (
		id ` + autoInc + `,
		uri TEXT NOT NULL,
		record_type TEXT NOT NULL,
		previous_content TEXT NOT NULL,
		previous_cid TEXT,
		edited_at ` + dateType + ` NOT NULL
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_edit_history_uri ON edit_history(uri)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_edit_history_edited_at ON edit_history(edited_at DESC)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS notifications (
		id ` + autoInc + `,
		recipient_did TEXT NOT NULL,
		actor_did TEXT NOT NULL,
		type TEXT NOT NULL,
		subject_uri TEXT NOT NULL,
		created_at ` + dateType + ` NOT NULL,
		read_at ` + dateType + `
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_did)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS api_keys (
		id TEXT PRIMARY KEY,
		owner_did TEXT NOT NULL,
		name TEXT NOT NULL,
		key_hash TEXT NOT NULL,
		created_at ` + dateType + ` NOT NULL,
		last_used_at ` + dateType + `
	)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_did)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`)

	db.runMigrations()

	db.Exec(`CREATE TABLE IF NOT EXISTS cursors (
		id TEXT PRIMARY KEY,
		last_cursor BIGINT NOT NULL,
		updated_at ` + dateType + ` NOT NULL
	)`)

	db.runMigrations()

	return nil
}

func (db *DB) GetCursor(id string) (int64, error) {
	var cursor int64
	err := db.QueryRow("SELECT last_cursor FROM cursors WHERE id = $1", id).Scan(&cursor)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return cursor, nil
}

func (db *DB) SetCursor(id string, cursor int64) error {
	query := `
		INSERT INTO cursors (id, last_cursor, updated_at) 
		VALUES ($1, $2, $3) 
		ON CONFLICT(id) DO UPDATE SET 
			last_cursor = EXCLUDED.last_cursor, 
			updated_at = EXCLUDED.updated_at
	`
	_, err := db.Exec(query, id, cursor, time.Now())
	return err
}

func (db *DB) runMigrations() {

	db.Exec(`ALTER TABLE sessions ADD COLUMN dpop_key TEXT`)

	db.Exec(`ALTER TABLE annotations ADD COLUMN motivation TEXT`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN body_value TEXT`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN body_format TEXT DEFAULT 'text/plain'`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN body_uri TEXT`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN target_source TEXT`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN target_hash TEXT`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN target_title TEXT`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN selector_json TEXT`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN tags_json TEXT`)
	db.Exec(`ALTER TABLE annotations ADD COLUMN cid TEXT`)

	db.Exec(`UPDATE annotations SET target_source = url WHERE target_source IS NULL AND url IS NOT NULL`)
	db.Exec(`UPDATE annotations SET target_hash = url_hash WHERE target_hash IS NULL AND url_hash IS NOT NULL`)
	db.Exec(`UPDATE annotations SET body_value = text WHERE body_value IS NULL AND text IS NOT NULL`)
	db.Exec(`UPDATE annotations SET target_title = title WHERE target_title IS NULL AND title IS NOT NULL`)
	db.Exec(`UPDATE annotations SET motivation = 'commenting' WHERE motivation IS NULL`)

	if db.driver == "postgres" {
		db.Exec(`ALTER TABLE cursors ALTER COLUMN last_cursor TYPE BIGINT`)
	}
}

func (db *DB) Close() error {
	return db.DB.Close()
}

func (db *DB) Rebind(query string) string {
	if db.driver != "postgres" {
		return query
	}

	if !strings.Contains(query, "?") {
		return query
	}

	var builder strings.Builder
	builder.Grow(len(query) + 20)

	paramCount := 1
	for _, r := range query {
		if r == '?' {
			fmt.Fprintf(&builder, "$%d", paramCount)
			paramCount++
		} else {
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

func ParseSelector(selectorJSON *string) (*Selector, error) {
	if selectorJSON == nil || *selectorJSON == "" {
		return nil, nil
	}
	var s Selector
	err := json.Unmarshal([]byte(*selectorJSON), &s)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func ParseTags(tagsJSON *string) ([]string, error) {
	if tagsJSON == nil || *tagsJSON == "" {
		return nil, nil
	}
	var tags []string
	err := json.Unmarshal([]byte(*tagsJSON), &tags)
	if err != nil {
		return nil, err
	}
	return tags, nil
}
