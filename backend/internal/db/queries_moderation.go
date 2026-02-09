package db

import "time"

func (db *DB) CreateBlock(actorDID, subjectDID string) error {
	query := `INSERT INTO blocks (actor_did, subject_did, created_at) VALUES (?, ?, ?)
		ON CONFLICT(actor_did, subject_did) DO NOTHING`
	_, err := db.Exec(db.Rebind(query), actorDID, subjectDID, time.Now())
	return err
}

func (db *DB) DeleteBlock(actorDID, subjectDID string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM blocks WHERE actor_did = ? AND subject_did = ?`), actorDID, subjectDID)
	return err
}

func (db *DB) GetBlocks(actorDID string) ([]Block, error) {
	rows, err := db.Query(db.Rebind(`SELECT id, actor_did, subject_did, created_at FROM blocks WHERE actor_did = ? ORDER BY created_at DESC`), actorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []Block
	for rows.Next() {
		var b Block
		if err := rows.Scan(&b.ID, &b.ActorDID, &b.SubjectDID, &b.CreatedAt); err != nil {
			continue
		}
		blocks = append(blocks, b)
	}
	return blocks, nil
}

func (db *DB) IsBlocked(actorDID, subjectDID string) (bool, error) {
	var count int
	err := db.QueryRow(db.Rebind(`SELECT COUNT(*) FROM blocks WHERE actor_did = ? AND subject_did = ?`), actorDID, subjectDID).Scan(&count)
	return count > 0, err
}

func (db *DB) IsBlockedEither(did1, did2 string) (bool, error) {
	var count int
	err := db.QueryRow(db.Rebind(`SELECT COUNT(*) FROM blocks WHERE (actor_did = ? AND subject_did = ?) OR (actor_did = ? AND subject_did = ?)`), did1, did2, did2, did1).Scan(&count)
	return count > 0, err
}

func (db *DB) GetBlockedDIDs(actorDID string) ([]string, error) {
	rows, err := db.Query(db.Rebind(`SELECT subject_did FROM blocks WHERE actor_did = ?`), actorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dids []string
	for rows.Next() {
		var did string
		if err := rows.Scan(&did); err != nil {
			continue
		}
		dids = append(dids, did)
	}
	return dids, nil
}

func (db *DB) GetBlockedByDIDs(actorDID string) ([]string, error) {
	rows, err := db.Query(db.Rebind(`SELECT actor_did FROM blocks WHERE subject_did = ?`), actorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dids []string
	for rows.Next() {
		var did string
		if err := rows.Scan(&did); err != nil {
			continue
		}
		dids = append(dids, did)
	}
	return dids, nil
}

func (db *DB) CreateMute(actorDID, subjectDID string) error {
	query := `INSERT INTO mutes (actor_did, subject_did, created_at) VALUES (?, ?, ?)
		ON CONFLICT(actor_did, subject_did) DO NOTHING`
	_, err := db.Exec(db.Rebind(query), actorDID, subjectDID, time.Now())
	return err
}

func (db *DB) DeleteMute(actorDID, subjectDID string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM mutes WHERE actor_did = ? AND subject_did = ?`), actorDID, subjectDID)
	return err
}

func (db *DB) GetMutes(actorDID string) ([]Mute, error) {
	rows, err := db.Query(db.Rebind(`SELECT id, actor_did, subject_did, created_at FROM mutes WHERE actor_did = ? ORDER BY created_at DESC`), actorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mutes []Mute
	for rows.Next() {
		var m Mute
		if err := rows.Scan(&m.ID, &m.ActorDID, &m.SubjectDID, &m.CreatedAt); err != nil {
			continue
		}
		mutes = append(mutes, m)
	}
	return mutes, nil
}

func (db *DB) IsMuted(actorDID, subjectDID string) (bool, error) {
	var count int
	err := db.QueryRow(db.Rebind(`SELECT COUNT(*) FROM mutes WHERE actor_did = ? AND subject_did = ?`), actorDID, subjectDID).Scan(&count)
	return count > 0, err
}

func (db *DB) GetMutedDIDs(actorDID string) ([]string, error) {
	rows, err := db.Query(db.Rebind(`SELECT subject_did FROM mutes WHERE actor_did = ?`), actorDID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dids []string
	for rows.Next() {
		var did string
		if err := rows.Scan(&did); err != nil {
			continue
		}
		dids = append(dids, did)
	}
	return dids, nil
}

func (db *DB) GetAllHiddenDIDs(actorDID string) (map[string]bool, error) {
	hidden := make(map[string]bool)
	if actorDID == "" {
		return hidden, nil
	}

	blocked, err := db.GetBlockedDIDs(actorDID)
	if err != nil {
		return hidden, err
	}
	for _, did := range blocked {
		hidden[did] = true
	}

	blockedBy, err := db.GetBlockedByDIDs(actorDID)
	if err != nil {
		return hidden, err
	}
	for _, did := range blockedBy {
		hidden[did] = true
	}

	muted, err := db.GetMutedDIDs(actorDID)
	if err != nil {
		return hidden, err
	}
	for _, did := range muted {
		hidden[did] = true
	}

	return hidden, nil
}

func (db *DB) GetViewerRelationship(viewerDID, subjectDID string) (blocked bool, muted bool, blockedBy bool, err error) {
	if viewerDID == "" || subjectDID == "" {
		return false, false, false, nil
	}

	blocked, err = db.IsBlocked(viewerDID, subjectDID)
	if err != nil {
		return
	}

	muted, err = db.IsMuted(viewerDID, subjectDID)
	if err != nil {
		return
	}

	blockedBy, err = db.IsBlocked(subjectDID, viewerDID)
	return
}

func (db *DB) CreateReport(reporterDID, subjectDID string, subjectURI *string, reasonType string, reasonText *string) (int, error) {
	query := `INSERT INTO moderation_reports (reporter_did, subject_did, subject_uri, reason_type, reason_text, status, created_at)
		VALUES (?, ?, ?, ?, ?, 'pending', ?)`

	result, err := db.Exec(db.Rebind(query), reporterDID, subjectDID, subjectURI, reasonType, reasonText, time.Now())
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	return int(id), err
}

func (db *DB) GetReports(status string, limit, offset int) ([]ModerationReport, error) {
	query := `SELECT id, reporter_did, subject_did, subject_uri, reason_type, reason_text, status, created_at, resolved_at, resolved_by
		FROM moderation_reports`
	args := []interface{}{}

	if status != "" {
		query += ` WHERE status = ?`
		args = append(args, status)
	}

	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := db.Query(db.Rebind(query), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []ModerationReport
	for rows.Next() {
		var r ModerationReport
		if err := rows.Scan(&r.ID, &r.ReporterDID, &r.SubjectDID, &r.SubjectURI, &r.ReasonType, &r.ReasonText, &r.Status, &r.CreatedAt, &r.ResolvedAt, &r.ResolvedBy); err != nil {
			continue
		}
		reports = append(reports, r)
	}
	return reports, nil
}

func (db *DB) GetReport(id int) (*ModerationReport, error) {
	var r ModerationReport
	err := db.QueryRow(db.Rebind(`SELECT id, reporter_did, subject_did, subject_uri, reason_type, reason_text, status, created_at, resolved_at, resolved_by FROM moderation_reports WHERE id = ?`), id).Scan(
		&r.ID, &r.ReporterDID, &r.SubjectDID, &r.SubjectURI, &r.ReasonType, &r.ReasonText, &r.Status, &r.CreatedAt, &r.ResolvedAt, &r.ResolvedBy,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (db *DB) ResolveReport(id int, resolvedBy string, status string) error {
	_, err := db.Exec(db.Rebind(`UPDATE moderation_reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?`), status, time.Now(), resolvedBy, id)
	return err
}

func (db *DB) CreateModerationAction(reportID int, actorDID, action string, comment *string) error {
	query := `INSERT INTO moderation_actions (report_id, actor_did, action, comment, created_at) VALUES (?, ?, ?, ?, ?)`
	_, err := db.Exec(db.Rebind(query), reportID, actorDID, action, comment, time.Now())
	return err
}

func (db *DB) GetReportActions(reportID int) ([]ModerationAction, error) {
	rows, err := db.Query(db.Rebind(`SELECT id, report_id, actor_did, action, comment, created_at FROM moderation_actions WHERE report_id = ? ORDER BY created_at DESC`), reportID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var actions []ModerationAction
	for rows.Next() {
		var a ModerationAction
		if err := rows.Scan(&a.ID, &a.ReportID, &a.ActorDID, &a.Action, &a.Comment, &a.CreatedAt); err != nil {
			continue
		}
		actions = append(actions, a)
	}
	return actions, nil
}

func (db *DB) GetReportCount(status string) (int, error) {
	query := `SELECT COUNT(*) FROM moderation_reports`
	args := []interface{}{}
	if status != "" {
		query += ` WHERE status = ?`
		args = append(args, status)
	}
	var count int
	err := db.QueryRow(db.Rebind(query), args...).Scan(&count)
	return count, err
}

func (db *DB) CreateContentLabel(src, uri, val, createdBy string) error {
	query := `INSERT INTO content_labels (src, uri, val, neg, created_by, created_at) VALUES (?, ?, ?, 0, ?, ?)`
	_, err := db.Exec(db.Rebind(query), src, uri, val, createdBy, time.Now())
	return err
}

func (db *DB) SyncSelfLabels(authorDID, uri string, labels []string) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM content_labels WHERE src = ? AND uri = ? AND created_by = ?`), authorDID, uri, authorDID)
	if err != nil {
		return err
	}
	for _, val := range labels {
		if err := db.CreateContentLabel(authorDID, uri, val, authorDID); err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) NegateContentLabel(id int) error {
	_, err := db.Exec(db.Rebind(`UPDATE content_labels SET neg = 1 WHERE id = ?`), id)
	return err
}

func (db *DB) DeleteContentLabel(id int) error {
	_, err := db.Exec(db.Rebind(`DELETE FROM content_labels WHERE id = ?`), id)
	return err
}

func (db *DB) GetContentLabelsForURIs(uris []string, labelerDIDs []string) (map[string][]ContentLabel, error) {
	result := make(map[string][]ContentLabel)
	if len(uris) == 0 {
		return result, nil
	}

	placeholders := make([]string, len(uris))
	args := make([]interface{}, len(uris))
	for i, uri := range uris {
		placeholders[i] = "?"
		args[i] = uri
	}

	query := `SELECT id, src, uri, val, neg, created_by, created_at FROM content_labels
		WHERE uri IN (` + joinStrings(placeholders, ",") + `) AND neg = 0`

	if len(labelerDIDs) > 0 {
		srcPlaceholders := make([]string, len(labelerDIDs))
		for i, did := range labelerDIDs {
			srcPlaceholders[i] = "?"
			args = append(args, did)
		}
		query += ` AND src IN (` + joinStrings(srcPlaceholders, ",") + `)`
	}

	query += ` ORDER BY created_at DESC`

	rows, err := db.Query(db.Rebind(query), args...)
	if err != nil {
		return result, err
	}
	defer rows.Close()

	for rows.Next() {
		var l ContentLabel
		if err := rows.Scan(&l.ID, &l.Src, &l.URI, &l.Val, &l.Neg, &l.CreatedBy, &l.CreatedAt); err != nil {
			continue
		}
		result[l.URI] = append(result[l.URI], l)
	}
	return result, nil
}

func (db *DB) GetContentLabelsForDIDs(dids []string, labelerDIDs []string) (map[string][]ContentLabel, error) {
	result := make(map[string][]ContentLabel)
	if len(dids) == 0 {
		return result, nil
	}

	placeholders := make([]string, len(dids))
	args := make([]interface{}, len(dids))
	for i, did := range dids {
		placeholders[i] = "?"
		args[i] = did
	}

	query := `SELECT id, src, uri, val, neg, created_by, created_at FROM content_labels
		WHERE uri IN (` + joinStrings(placeholders, ",") + `) AND neg = 0`

	if len(labelerDIDs) > 0 {
		srcPlaceholders := make([]string, len(labelerDIDs))
		for i, did := range labelerDIDs {
			srcPlaceholders[i] = "?"
			args = append(args, did)
		}
		query += ` AND src IN (` + joinStrings(srcPlaceholders, ",") + `)`
	}

	query += ` ORDER BY created_at DESC`

	rows, err := db.Query(db.Rebind(query), args...)
	if err != nil {
		return result, err
	}
	defer rows.Close()

	for rows.Next() {
		var l ContentLabel
		if err := rows.Scan(&l.ID, &l.Src, &l.URI, &l.Val, &l.Neg, &l.CreatedBy, &l.CreatedAt); err != nil {
			continue
		}
		result[l.URI] = append(result[l.URI], l)
	}
	return result, nil
}

func (db *DB) GetAllContentLabels(limit, offset int) ([]ContentLabel, error) {
	rows, err := db.Query(db.Rebind(`SELECT id, src, uri, val, neg, created_by, created_at FROM content_labels ORDER BY created_at DESC LIMIT ? OFFSET ?`), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var labels []ContentLabel
	for rows.Next() {
		var l ContentLabel
		if err := rows.Scan(&l.ID, &l.Src, &l.URI, &l.Val, &l.Neg, &l.CreatedBy, &l.CreatedAt); err != nil {
			continue
		}
		labels = append(labels, l)
	}
	return labels, nil
}

func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
