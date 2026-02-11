package db

type TrendingTag struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
}

func (db *DB) GetTrendingTags(limit int) ([]TrendingTag, error) {
	var query string
	if db.driver == "postgres" {
		query = `
			SELECT 
				value as tag, 
				COUNT(*) as count
			FROM annotations, json_array_elements_text(tags_json::json) as value
			WHERE tags_json IS NOT NULL 
				AND tags_json != '' 
				AND tags_json != '[]'
				AND created_at > NOW() - INTERVAL '7 days'
			GROUP BY tag
			HAVING COUNT(*) > 2
			ORDER BY COUNT(*) DESC
			LIMIT $1
		`
		rows, err := db.Query(query, limit)
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
		return tags, nil
	}

	query = `
		SELECT 
			json_each.value as tag, 
			COUNT(*) as count
		FROM annotations, json_each(annotations.tags_json)
		WHERE tags_json IS NOT NULL 
			AND tags_json != '' 
			AND tags_json != '[]'
			AND created_at > datetime('now', '-7 days')
		GROUP BY tag
		HAVING count > 2
		ORDER BY count DESC
		LIMIT ?
	`
	rows, err := db.Query(db.Rebind(query), limit)
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
