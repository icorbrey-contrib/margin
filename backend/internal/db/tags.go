package db

import "database/sql"

type TrendingTag struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
}

func (db *DB) GetTrendingTags(limit int) ([]TrendingTag, error) {
	var query string
	if db.driver == "postgres" {
		query = `
			SELECT tag, COUNT(*) as count FROM (
				SELECT value as tag, author_did
				FROM annotations, json_array_elements_text(tags_json::json) as value
				WHERE tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
					AND created_at > NOW() - INTERVAL '14 days'
				UNION ALL
				SELECT value as tag, author_did
				FROM highlights, json_array_elements_text(tags_json::json) as value
				WHERE tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
					AND created_at > NOW() - INTERVAL '14 days'
				UNION ALL
				SELECT value as tag, author_did
				FROM bookmarks, json_array_elements_text(tags_json::json) as value
				WHERE tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
					AND created_at > NOW() - INTERVAL '14 days'
			) combined
			GROUP BY tag
			HAVING COUNT(DISTINCT author_did) >= 3
			ORDER BY count DESC
			LIMIT $1
		`
	} else {
		query = `
			SELECT tag, COUNT(*) as count FROM (
				SELECT json_each.value as tag, author_did
				FROM annotations, json_each(annotations.tags_json)
				WHERE tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
					AND created_at > datetime('now', '-14 days')
				UNION ALL
				SELECT json_each.value as tag, author_did
				FROM highlights, json_each(highlights.tags_json)
				WHERE tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
					AND created_at > datetime('now', '-14 days')
				UNION ALL
				SELECT json_each.value as tag, author_did
				FROM bookmarks, json_each(bookmarks.tags_json)
				WHERE tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
					AND created_at > datetime('now', '-14 days')
			) combined
			GROUP BY tag
			HAVING COUNT(DISTINCT author_did) >= 3
			ORDER BY count DESC
			LIMIT ?
		`
	}

	var rows *sql.Rows
	var err error
	if db.driver == "postgres" {
		rows, err = db.Query(query, limit)
	} else {
		rows, err = db.Query(db.Rebind(query), limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []TrendingTag
	for rows.Next() {
		var t TrendingTag
		if err := rows.Scan(&t.Tag, &t.Count); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	if tags == nil {
		return []TrendingTag{}, nil
	}

	return tags, nil
}

func (db *DB) GetUserTags(did string, limit int) ([]TrendingTag, error) {
	var query string
	if db.driver == "postgres" {
		query = `
			SELECT tag, SUM(cnt) as count FROM (
				SELECT value as tag, COUNT(*) as cnt
				FROM annotations, json_array_elements_text(tags_json::json) as value
				WHERE author_did = $1 AND tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
				GROUP BY tag
				UNION ALL
				SELECT value as tag, COUNT(*) as cnt
				FROM highlights, json_array_elements_text(tags_json::json) as value
				WHERE author_did = $1 AND tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
				GROUP BY tag
				UNION ALL
				SELECT value as tag, COUNT(*) as cnt
				FROM bookmarks, json_array_elements_text(tags_json::json) as value
				WHERE author_did = $1 AND tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
				GROUP BY tag
			) combined
			GROUP BY tag
			ORDER BY count DESC
			LIMIT $2
		`
	} else {
		query = `
			SELECT tag, SUM(cnt) as count FROM (
				SELECT json_each.value as tag, COUNT(*) as cnt
				FROM annotations, json_each(annotations.tags_json)
				WHERE author_did = ? AND tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
				GROUP BY tag
				UNION ALL
				SELECT json_each.value as tag, COUNT(*) as cnt
				FROM highlights, json_each(highlights.tags_json)
				WHERE author_did = ? AND tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
				GROUP BY tag
				UNION ALL
				SELECT json_each.value as tag, COUNT(*) as cnt
				FROM bookmarks, json_each(bookmarks.tags_json)
				WHERE author_did = ? AND tags_json IS NOT NULL AND tags_json != '' AND tags_json != '[]'
				GROUP BY tag
			) combined
			GROUP BY tag
			ORDER BY count DESC
			LIMIT ?
		`
	}

	var rows *sql.Rows
	var err error
	if db.driver == "postgres" {
		rows, err = db.Query(query, did, limit)
	} else {
		rows, err = db.Query(db.Rebind(query), did, did, did, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []TrendingTag
	for rows.Next() {
		var t TrendingTag
		if err := rows.Scan(&t.Tag, &t.Count); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	if tags == nil {
		return []TrendingTag{}, nil
	}

	return tags, nil
}
