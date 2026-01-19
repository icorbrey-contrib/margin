package db

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

func (db *DB) GetReplyCount(rootURI string) (int, error) {
	var count int
	err := db.QueryRow(db.Rebind(`SELECT COUNT(*) FROM replies WHERE root_uri = ?`), rootURI).Scan(&count)
	return count, err
}

func (db *DB) GetReplyCounts(rootURIs []string) (map[string]int, error) {
	if len(rootURIs) == 0 {
		return map[string]int{}, nil
	}

	query := db.Rebind(`
		SELECT root_uri, COUNT(*) 
		FROM replies 
		WHERE root_uri IN (` + buildPlaceholders(len(rootURIs)) + `) 
		GROUP BY root_uri
	`)

	args := make([]interface{}, len(rootURIs))
	for i, uri := range rootURIs {
		args[i] = uri
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var uri string
		var count int
		if err := rows.Scan(&uri, &count); err != nil {
			return nil, err
		}
		counts[uri] = count
	}

	return counts, nil
}

func (db *DB) GetRepliesByURIs(uris []string) ([]Reply, error) {
	if len(uris) == 0 {
		return []Reply{}, nil
	}

	query := db.Rebind(`
		SELECT uri, author_did, parent_uri, root_uri, text, format, created_at, indexed_at, cid
		FROM replies
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
