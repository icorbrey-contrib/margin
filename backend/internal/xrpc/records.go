package xrpc

import "time"

const (
	CollectionAnnotation     = "at.margin.annotation"
	CollectionHighlight      = "at.margin.highlight"
	CollectionBookmark       = "at.margin.bookmark"
	CollectionReply          = "at.margin.reply"
	CollectionLike           = "at.margin.like"
	CollectionCollection     = "at.margin.collection"
	CollectionCollectionItem = "at.margin.collectionItem"
)

type AnnotationRecord struct {
	Type       string           `json:"$type"`
	Motivation string           `json:"motivation,omitempty"`
	Body       *AnnotationBody  `json:"body,omitempty"`
	Target     AnnotationTarget `json:"target"`
	Tags       []string         `json:"tags,omitempty"`
	CreatedAt  string           `json:"createdAt"`
}

type AnnotationBody struct {
	Value  string `json:"value,omitempty"`
	Format string `json:"format,omitempty"`
}

type AnnotationTarget struct {
	Source     string      `json:"source"`
	SourceHash string      `json:"sourceHash"`
	Title      string      `json:"title,omitempty"`
	Selector   interface{} `json:"selector,omitempty"`
}

type TextQuoteSelector struct {
	Type   string `json:"type"`
	Exact  string `json:"exact"`
	Prefix string `json:"prefix,omitempty"`
	Suffix string `json:"suffix,omitempty"`
}

func NewAnnotationRecord(url, urlHash, text string, selector interface{}, title string) *AnnotationRecord {
	return NewAnnotationRecordWithMotivation(url, urlHash, text, selector, title, "commenting")
}

func NewAnnotationRecordWithMotivation(url, urlHash, text string, selector interface{}, title string, motivation string) *AnnotationRecord {
	record := &AnnotationRecord{
		Type:       CollectionAnnotation,
		Motivation: motivation,
		Target: AnnotationTarget{
			Source:     url,
			SourceHash: urlHash,
			Title:      title,
		},
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	if text != "" {
		record.Body = &AnnotationBody{
			Value:  text,
			Format: "text/plain",
		}
	}

	if selector != nil {
		record.Target.Selector = selector
	}

	return record
}

type HighlightRecord struct {
	Type      string           `json:"$type"`
	Target    AnnotationTarget `json:"target"`
	Color     string           `json:"color,omitempty"`
	Tags      []string         `json:"tags,omitempty"`
	CreatedAt string           `json:"createdAt"`
}

func NewHighlightRecord(url, urlHash string, selector interface{}, color string) *HighlightRecord {
	return &HighlightRecord{
		Type: CollectionHighlight,
		Target: AnnotationTarget{
			Source:     url,
			SourceHash: urlHash,
			Selector:   selector,
		},
		Color:     color,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
}

type ReplyRef struct {
	URI string `json:"uri"`
	CID string `json:"cid"`
}

type ReplyRecord struct {
	Type      string   `json:"$type"`
	Parent    ReplyRef `json:"parent"`
	Root      ReplyRef `json:"root"`
	Text      string   `json:"text"`
	Format    string   `json:"format,omitempty"`
	CreatedAt string   `json:"createdAt"`
}

func NewReplyRecord(parentURI, parentCID, rootURI, rootCID, text string) *ReplyRecord {
	return &ReplyRecord{
		Type:      CollectionReply,
		Parent:    ReplyRef{URI: parentURI, CID: parentCID},
		Root:      ReplyRef{URI: rootURI, CID: rootCID},
		Text:      text,
		Format:    "text/plain",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
}

type SubjectRef struct {
	URI string `json:"uri"`
	CID string `json:"cid"`
}

type LikeRecord struct {
	Type      string     `json:"$type"`
	Subject   SubjectRef `json:"subject"`
	CreatedAt string     `json:"createdAt"`
}

func NewLikeRecord(subjectURI, subjectCID string) *LikeRecord {
	return &LikeRecord{
		Type:      CollectionLike,
		Subject:   SubjectRef{URI: subjectURI, CID: subjectCID},
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
}

type BookmarkRecord struct {
	Type        string   `json:"$type"`
	Source      string   `json:"source"`
	SourceHash  string   `json:"sourceHash"`
	Title       string   `json:"title,omitempty"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	CreatedAt   string   `json:"createdAt"`
}

func NewBookmarkRecord(url, urlHash, title, description string) *BookmarkRecord {
	return &BookmarkRecord{
		Type:        CollectionBookmark,
		Source:      url,
		SourceHash:  urlHash,
		Title:       title,
		Description: description,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
}

type CollectionRecord struct {
	Type        string `json:"$type"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Icon        string `json:"icon,omitempty"`
	CreatedAt   string `json:"createdAt"`
}

func NewCollectionRecord(name, description, icon string) *CollectionRecord {
	return &CollectionRecord{
		Type:        CollectionCollection,
		Name:        name,
		Description: description,
		Icon:        icon,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
}

type CollectionItemRecord struct {
	Type       string `json:"$type"`
	Collection string `json:"collection"`
	Annotation string `json:"annotation"`
	Position   int    `json:"position,omitempty"`
	CreatedAt  string `json:"createdAt"`
}

func NewCollectionItemRecord(collection, annotation string, position int) *CollectionItemRecord {
	return &CollectionItemRecord{
		Type:       CollectionCollectionItem,
		Collection: collection,
		Annotation: annotation,
		Position:   position,
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	}
}
