package db

import "fmt"

type TrendingTag struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
}

func (db *DB) GetTrendingTags(limit int) ([]TrendingTag, error) {
	query := `
		SELECT 
			json_each.value as tag, 
			COUNT(*) as count
		FROM annotations, json_each(annotations.tags_json)
		WHERE tags_json IS NOT NULL 
			AND tags_json != '' 
			AND tags_json != '[]'
			AND created_at > %s
		GROUP BY tag
		HAVING count > 2
		ORDER BY count DESC
		LIMIT ?
	`

	dateFilter := "datetime('now', '-7 days')"
	if db.driver == "postgres" {
		dateFilter = "NOW() - INTERVAL '7 days'"
	}

	rows, err := db.Query(db.Rebind(fmt.Sprintf(query, dateFilter)), limit)
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
