package db

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

func (db *DB) GetLikeCounts(subjectURIs []string) (map[string]int, error) {
	if len(subjectURIs) == 0 {
		return map[string]int{}, nil
	}

	query := db.Rebind(`
		SELECT subject_uri, COUNT(*) 
		FROM likes 
		WHERE subject_uri IN (` + buildPlaceholders(len(subjectURIs)) + `) 
		GROUP BY subject_uri
	`)

	args := make([]interface{}, len(subjectURIs))
	for i, uri := range subjectURIs {
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

func (db *DB) GetViewerLikes(viewerDID string, subjectURIs []string) (map[string]bool, error) {
	if len(subjectURIs) == 0 {
		return map[string]bool{}, nil
	}

	query := db.Rebind(`
		SELECT subject_uri 
		FROM likes 
		WHERE author_did = ? AND subject_uri IN (` + buildPlaceholders(len(subjectURIs)) + `)
	`)

	args := make([]interface{}, len(subjectURIs)+1)
	args[0] = viewerDID
	for i, uri := range subjectURIs {
		args[i+1] = uri
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	likes := make(map[string]bool)
	for rows.Next() {
		var uri string
		if err := rows.Scan(&uri); err != nil {
			return nil, err
		}
		likes[uri] = true
	}

	return likes, nil
}
