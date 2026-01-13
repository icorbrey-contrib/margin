package api

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"html"
	"image"
	"image/color"
	"image/draw"
	_ "image/jpeg"
	"image/png"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"

	"golang.org/x/image/font"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"

	"margin.at/internal/db"
)

//go:embed fonts/Inter-Regular.ttf
var interRegularTTF []byte

//go:embed fonts/Inter-Bold.ttf
var interBoldTTF []byte

//go:embed assets/logo.png
var logoPNG []byte

var (
	fontRegular *opentype.Font
	fontBold    *opentype.Font
	logoImage   image.Image
)

func init() {
	var err error
	fontRegular, err = opentype.Parse(interRegularTTF)
	if err != nil {
		log.Printf("Warning: failed to parse Inter-Regular font: %v", err)
	}
	fontBold, err = opentype.Parse(interBoldTTF)
	if err != nil {
		log.Printf("Warning: failed to parse Inter-Bold font: %v", err)
	}

	if len(logoPNG) > 0 {
		img, _, err := image.Decode(bytes.NewReader(logoPNG))
		if err != nil {
			log.Printf("Warning: failed to decode logo PNG: %v", err)
		} else {
			logoImage = img
		}
	}
}

type OGHandler struct {
	db        *db.DB
	baseURL   string
	staticDir string
}

func NewOGHandler(database *db.DB) *OGHandler {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://margin.at"
	}
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../web/dist"
	}
	return &OGHandler{
		db:        database,
		baseURL:   strings.TrimSuffix(baseURL, "/"),
		staticDir: staticDir,
	}
}

var crawlerUserAgents = []string{
	"facebookexternalhit",
	"Facebot",
	"Twitterbot",
	"LinkedInBot",
	"WhatsApp",
	"Slackbot",
	"TelegramBot",
	"Discordbot",
	"applebot",
	"bot",
	"crawler",
	"spider",
	"preview",
	"Cardyb",
	"Bluesky",
}

var lucideToEmoji = map[string]string{
	"folder":    "📁",
	"star":      "⭐",
	"heart":     "❤️",
	"bookmark":  "🔖",
	"lightbulb": "💡",
	"zap":       "⚡",
	"coffee":    "☕",
	"music":     "🎵",
	"camera":    "📷",
	"code":      "💻",
	"globe":     "🌍",
	"flag":      "🚩",
	"tag":       "🏷️",
	"box":       "📦",
	"archive":   "🗄️",
	"file":      "📄",
	"image":     "🖼️",
	"video":     "🎬",
	"mail":      "✉️",
	"pin":       "📍",
	"calendar":  "📅",
	"clock":     "🕐",
	"search":    "🔍",
	"settings":  "⚙️",
	"user":      "👤",
	"users":     "👥",
	"home":      "🏠",
	"briefcase": "💼",
	"gift":      "🎁",
	"award":     "🏆",
	"target":    "🎯",
	"trending":  "📈",
	"activity":  "📊",
	"cpu":       "🔲",
	"database":  "🗃️",
	"cloud":     "☁️",
	"sun":       "☀️",
	"moon":      "🌙",
	"flame":     "🔥",
	"leaf":      "🍃",
}

func iconToEmoji(icon string) string {
	if strings.HasPrefix(icon, "icon:") {
		name := strings.TrimPrefix(icon, "icon:")
		if emoji, ok := lucideToEmoji[name]; ok {
			return emoji
		}
		return "📁"
	}
	return icon
}

func isCrawler(userAgent string) bool {
	ua := strings.ToLower(userAgent)
	for _, bot := range crawlerUserAgents {
		if strings.Contains(ua, strings.ToLower(bot)) {
			return true
		}
	}
	return false
}

func (h *OGHandler) HandleAnnotationPage(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	var annotationMatch = regexp.MustCompile(`^/at/([^/]+)/([^/]+)$`)
	matches := annotationMatch.FindStringSubmatch(path)

	if len(matches) != 3 {
		h.serveIndexHTML(w, r)
		return
	}

	did, _ := url.QueryUnescape(matches[1])
	rkey := matches[2]

	if !isCrawler(r.UserAgent()) {
		h.serveIndexHTML(w, r)
		return
	}

	uri := fmt.Sprintf("at://%s/at.margin.annotation/%s", did, rkey)
	annotation, err := h.db.GetAnnotationByURI(uri)
	if err == nil && annotation != nil {
		h.serveAnnotationOG(w, annotation)
		return
	}

	bookmarkURI := fmt.Sprintf("at://%s/at.margin.bookmark/%s", did, rkey)
	bookmark, err := h.db.GetBookmarkByURI(bookmarkURI)
	if err == nil && bookmark != nil {
		h.serveBookmarkOG(w, bookmark)
		return
	}

	highlightURI := fmt.Sprintf("at://%s/at.margin.highlight/%s", did, rkey)
	highlight, err := h.db.GetHighlightByURI(highlightURI)
	if err == nil && highlight != nil {
		h.serveHighlightOG(w, highlight)
		return
	}

	collectionURI := fmt.Sprintf("at://%s/at.margin.collection/%s", did, rkey)
	collection, err := h.db.GetCollectionByURI(collectionURI)
	if err == nil && collection != nil {
		h.serveCollectionOG(w, collection)
		return
	}

	h.serveIndexHTML(w, r)
}

func (h *OGHandler) HandleCollectionPage(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	prefix := "/collection/"
	if !strings.HasPrefix(path, prefix) {
		h.serveIndexHTML(w, r)
		return
	}

	uriParam := strings.TrimPrefix(path, prefix)
	if uriParam == "" {
		h.serveIndexHTML(w, r)
		return
	}

	uri, err := url.QueryUnescape(uriParam)
	if err != nil {
		uri = uriParam
	}

	if !isCrawler(r.UserAgent()) {
		h.serveIndexHTML(w, r)
		return
	}

	collection, err := h.db.GetCollectionByURI(uri)
	if err == nil && collection != nil {
		h.serveCollectionOG(w, collection)
		return
	}

	h.serveIndexHTML(w, r)
}

func (h *OGHandler) serveBookmarkOG(w http.ResponseWriter, bookmark *db.Bookmark) {
	title := "Bookmark on Margin"
	if bookmark.Title != nil && *bookmark.Title != "" {
		title = *bookmark.Title
	}

	description := ""
	if bookmark.Description != nil && *bookmark.Description != "" {
		description = *bookmark.Description
	} else {
		description = "A saved bookmark on Margin"
	}

	sourceDomain := ""
	if bookmark.Source != "" {
		if parsed, err := url.Parse(bookmark.Source); err == nil {
			sourceDomain = parsed.Host
		}
	}

	if sourceDomain != "" {
		description += " from " + sourceDomain
	}

	authorHandle := bookmark.AuthorDID
	profiles := fetchProfilesForDIDs([]string{bookmark.AuthorDID})
	if profile, ok := profiles[bookmark.AuthorDID]; ok && profile.Handle != "" {
		authorHandle = "@" + profile.Handle
	}

	pageURL := fmt.Sprintf("%s/at/%s", h.baseURL, url.PathEscape(bookmark.URI[5:]))
	ogImageURL := fmt.Sprintf("%s/og-image?uri=%s", h.baseURL, url.QueryEscape(bookmark.URI))

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s - Margin</title>
    <meta name="description" content="%s">
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="%s">
    <meta property="og:description" content="%s">
    <meta property="og:url" content="%s">
    <meta property="og:image" content="%s">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Margin">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="%s">
    <meta name="twitter:description" content="%s">
    <meta name="twitter:image" content="%s">
    
    <!-- Author -->
    <meta property="article:author" content="%s">
    
    <meta http-equiv="refresh" content="0; url=%s">
</head>
<body>
    <p>Redirecting to <a href="%s">%s</a>...</p>
</body>
</html>`,
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(pageURL),
		html.EscapeString(ogImageURL),
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(ogImageURL),
		html.EscapeString(authorHandle),
		html.EscapeString(pageURL),
		html.EscapeString(pageURL),
		html.EscapeString(title),
	)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(htmlContent))
}

func (h *OGHandler) serveHighlightOG(w http.ResponseWriter, highlight *db.Highlight) {
	title := "Highlight on Margin"
	description := ""

	if highlight.SelectorJSON != nil && *highlight.SelectorJSON != "" {
		var selector struct {
			Exact string `json:"exact"`
		}
		if err := json.Unmarshal([]byte(*highlight.SelectorJSON), &selector); err == nil && selector.Exact != "" {
			description = fmt.Sprintf("\"%s\"", selector.Exact)
			if len(description) > 200 {
				description = description[:197] + "...\""
			}
		}
	}

	if highlight.TargetTitle != nil && *highlight.TargetTitle != "" {
		title = fmt.Sprintf("Highlight on: %s", *highlight.TargetTitle)
		if len(title) > 60 {
			title = title[:57] + "..."
		}
	}

	sourceDomain := ""
	if highlight.TargetSource != "" {
		if parsed, err := url.Parse(highlight.TargetSource); err == nil {
			sourceDomain = parsed.Host
		}
	}

	authorHandle := highlight.AuthorDID
	profiles := fetchProfilesForDIDs([]string{highlight.AuthorDID})
	if profile, ok := profiles[highlight.AuthorDID]; ok && profile.Handle != "" {
		authorHandle = "@" + profile.Handle
	}

	if description == "" {
		description = fmt.Sprintf("A highlight by %s", authorHandle)
		if sourceDomain != "" {
			description += fmt.Sprintf(" on %s", sourceDomain)
		}
	}

	pageURL := fmt.Sprintf("%s/at/%s", h.baseURL, url.PathEscape(highlight.URI[5:]))
	ogImageURL := fmt.Sprintf("%s/og-image?uri=%s", h.baseURL, url.QueryEscape(highlight.URI))

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s - Margin</title>
    <meta name="description" content="%s">
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="%s">
    <meta property="og:description" content="%s">
    <meta property="og:url" content="%s">
    <meta property="og:image" content="%s">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Margin">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="%s">
    <meta name="twitter:description" content="%s">
    <meta name="twitter:image" content="%s">
    
    <!-- Author -->
    <meta property="article:author" content="%s">
    
    <meta http-equiv="refresh" content="0; url=%s">
</head>
<body>
    <p>Redirecting to <a href="%s">%s</a>...</p>
</body>
</html>`,
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(pageURL),
		html.EscapeString(ogImageURL),
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(ogImageURL),
		html.EscapeString(authorHandle),
		html.EscapeString(pageURL),
		html.EscapeString(pageURL),
		html.EscapeString(title),
	)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(htmlContent))
}

func (h *OGHandler) serveCollectionOG(w http.ResponseWriter, collection *db.Collection) {
	icon := "📁"
	if collection.Icon != nil && *collection.Icon != "" {
		icon = iconToEmoji(*collection.Icon)
	}

	title := fmt.Sprintf("%s %s", icon, collection.Name)
	description := ""
	if collection.Description != nil && *collection.Description != "" {
		description = *collection.Description
		if len(description) > 200 {
			description = description[:197] + "..."
		}
	}

	authorHandle := collection.AuthorDID
	var avatarURL string
	profiles := fetchProfilesForDIDs([]string{collection.AuthorDID})
	if profile, ok := profiles[collection.AuthorDID]; ok {
		if profile.Handle != "" {
			authorHandle = "@" + profile.Handle
		}
		if profile.Avatar != "" {
			avatarURL = profile.Avatar
		}
	}

	if description == "" {
		description = fmt.Sprintf("A collection by %s", authorHandle)
	} else {
		description = fmt.Sprintf("By %s • %s", authorHandle, description)
	}

	pageURL := fmt.Sprintf("%s/collection/%s", h.baseURL, url.PathEscape(collection.URI))
	ogImageURL := fmt.Sprintf("%s/og-image?uri=%s", h.baseURL, url.QueryEscape(collection.URI))

	_ = avatarURL

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s - Margin</title>
    <meta name="description" content="%s">
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="%s">
    <meta property="og:description" content="%s">
    <meta property="og:url" content="%s">
    <meta property="og:image" content="%s">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Margin">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="%s">
    <meta name="twitter:description" content="%s">
    <meta name="twitter:image" content="%s">
    
    <!-- Author -->
    <meta property="article:author" content="%s">
    
    <meta http-equiv="refresh" content="0; url=%s">
</head>
<body>
    <p>Redirecting to <a href="%s">%s</a>...</p>
</body>
</html>`,
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(pageURL),
		html.EscapeString(ogImageURL),
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(ogImageURL),
		html.EscapeString(authorHandle),
		html.EscapeString(pageURL),
		html.EscapeString(pageURL),
		html.EscapeString(title),
	)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(htmlContent))
}

func (h *OGHandler) serveAnnotationOG(w http.ResponseWriter, annotation *db.Annotation) {
	title := "Annotation on Margin"
	description := ""

	if annotation.BodyValue != nil && *annotation.BodyValue != "" {
		description = *annotation.BodyValue
		if len(description) > 200 {
			description = description[:197] + "..."
		}
	}

	if annotation.TargetTitle != nil && *annotation.TargetTitle != "" {
		title = fmt.Sprintf("Comment on: %s", *annotation.TargetTitle)
		if len(title) > 60 {
			title = title[:57] + "..."
		}
	}

	sourceDomain := ""
	if annotation.TargetSource != "" {
		if parsed, err := url.Parse(annotation.TargetSource); err == nil {
			sourceDomain = parsed.Host
		}
	}

	authorHandle := annotation.AuthorDID
	profiles := fetchProfilesForDIDs([]string{annotation.AuthorDID})
	if profile, ok := profiles[annotation.AuthorDID]; ok && profile.Handle != "" {
		authorHandle = "@" + profile.Handle
	}

	pageURL := fmt.Sprintf("%s/at/%s", h.baseURL, url.PathEscape(annotation.URI[5:]))

	var selectorText string
	if annotation.SelectorJSON != nil && *annotation.SelectorJSON != "" {
		var selector struct {
			Exact string `json:"exact"`
		}
		if err := json.Unmarshal([]byte(*annotation.SelectorJSON), &selector); err == nil && selector.Exact != "" {
			selectorText = selector.Exact
			if len(selectorText) > 100 {
				selectorText = selectorText[:97] + "..."
			}
		}
	}

	if selectorText != "" && description != "" {
		description = fmt.Sprintf("\"%s\"\n\n%s", selectorText, description)
	} else if selectorText != "" {
		description = fmt.Sprintf("Highlighted: \"%s\"", selectorText)
	}

	if description == "" {
		description = fmt.Sprintf("An annotation by %s", authorHandle)
		if sourceDomain != "" {
			description += fmt.Sprintf(" on %s", sourceDomain)
		}
	}

	ogImageURL := fmt.Sprintf("%s/og-image?uri=%s", h.baseURL, url.QueryEscape(annotation.URI))

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s - Margin</title>
    <meta name="description" content="%s">
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="%s">
    <meta property="og:description" content="%s">
    <meta property="og:url" content="%s">
    <meta property="og:image" content="%s">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Margin">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="%s">
    <meta name="twitter:description" content="%s">
    <meta name="twitter:image" content="%s">
    
    <!-- Author -->
    <meta property="article:author" content="%s">
    
    <meta http-equiv="refresh" content="0; url=%s">
</head>
<body>
    <p>Redirecting to <a href="%s">%s</a>...</p>
</body>
</html>`,
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(pageURL),
		html.EscapeString(ogImageURL),
		html.EscapeString(title),
		html.EscapeString(description),
		html.EscapeString(ogImageURL),
		html.EscapeString(authorHandle),
		html.EscapeString(pageURL),
		html.EscapeString(pageURL),
		html.EscapeString(title),
	)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(htmlContent))
}

func (h *OGHandler) serveIndexHTML(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, h.staticDir+"/index.html")
}

func (h *OGHandler) HandleOGImage(w http.ResponseWriter, r *http.Request) {
	uri := r.URL.Query().Get("uri")
	if uri == "" {
		http.Error(w, "uri parameter required", http.StatusBadRequest)
		return
	}

	var authorHandle, text, quote, sourceDomain, avatarURL string

	annotation, err := h.db.GetAnnotationByURI(uri)
	if err == nil && annotation != nil {
		authorHandle = annotation.AuthorDID
		profiles := fetchProfilesForDIDs([]string{annotation.AuthorDID})
		if profile, ok := profiles[annotation.AuthorDID]; ok {
			if profile.Handle != "" {
				authorHandle = "@" + profile.Handle
			}
			if profile.Avatar != "" {
				avatarURL = profile.Avatar
			}
		}

		if annotation.BodyValue != nil {
			text = *annotation.BodyValue
		}

		if annotation.SelectorJSON != nil && *annotation.SelectorJSON != "" {
			var selector struct {
				Exact string `json:"exact"`
			}
			if err := json.Unmarshal([]byte(*annotation.SelectorJSON), &selector); err == nil {
				quote = selector.Exact
			}
		}

		if annotation.TargetSource != "" {
			if parsed, err := url.Parse(annotation.TargetSource); err == nil {
				sourceDomain = parsed.Host
			}
		}
	} else {
		bookmark, err := h.db.GetBookmarkByURI(uri)
		if err == nil && bookmark != nil {
			authorHandle = bookmark.AuthorDID
			profiles := fetchProfilesForDIDs([]string{bookmark.AuthorDID})
			if profile, ok := profiles[bookmark.AuthorDID]; ok {
				if profile.Handle != "" {
					authorHandle = "@" + profile.Handle
				}
				if profile.Avatar != "" {
					avatarURL = profile.Avatar
				}
			}

			text = "Bookmark"
			if bookmark.Description != nil {
				quote = *bookmark.Description
			}
			if bookmark.Title != nil {
				text = *bookmark.Title
			}

			if bookmark.Source != "" {
				if parsed, err := url.Parse(bookmark.Source); err == nil {
					sourceDomain = parsed.Host
				}
			}
		} else {
			highlight, err := h.db.GetHighlightByURI(uri)
			if err == nil && highlight != nil {
				authorHandle = highlight.AuthorDID
				profiles := fetchProfilesForDIDs([]string{highlight.AuthorDID})
				if profile, ok := profiles[highlight.AuthorDID]; ok {
					if profile.Handle != "" {
						authorHandle = "@" + profile.Handle
					}
					if profile.Avatar != "" {
						avatarURL = profile.Avatar
					}
				}

				targetTitle := ""
				if highlight.TargetTitle != nil {
					targetTitle = *highlight.TargetTitle
				}

				if highlight.SelectorJSON != nil && *highlight.SelectorJSON != "" {
					var selector struct {
						Exact string `json:"exact"`
					}
					if err := json.Unmarshal([]byte(*highlight.SelectorJSON), &selector); err == nil && selector.Exact != "" {
						quote = selector.Exact
					}
				}

				if highlight.TargetSource != "" {
					if parsed, err := url.Parse(highlight.TargetSource); err == nil {
						sourceDomain = parsed.Host
					}
				}

				img := generateHighlightOGImagePNG(authorHandle, targetTitle, quote, sourceDomain, avatarURL)

				w.Header().Set("Content-Type", "image/png")
				w.Header().Set("Cache-Control", "public, max-age=86400")
				png.Encode(w, img)
				return
			} else {
				collection, err := h.db.GetCollectionByURI(uri)
				if err == nil && collection != nil {
					authorHandle = collection.AuthorDID
					profiles := fetchProfilesForDIDs([]string{collection.AuthorDID})
					if profile, ok := profiles[collection.AuthorDID]; ok {
						if profile.Handle != "" {
							authorHandle = "@" + profile.Handle
						}
						if profile.Avatar != "" {
							avatarURL = profile.Avatar
						}
					}

					icon := "📁"
					if collection.Icon != nil && *collection.Icon != "" {
						icon = iconToEmoji(*collection.Icon)
					}

					description := ""
					if collection.Description != nil && *collection.Description != "" {
						description = *collection.Description
					}

					img := generateCollectionOGImagePNG(authorHandle, collection.Name, description, icon, avatarURL)

					w.Header().Set("Content-Type", "image/png")
					w.Header().Set("Cache-Control", "public, max-age=86400")
					png.Encode(w, img)
					return
				} else {
					http.Error(w, "Record not found", http.StatusNotFound)
					return
				}
			}
		}
	}

	img := generateOGImagePNG(authorHandle, text, quote, sourceDomain, avatarURL)

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	png.Encode(w, img)
}

func generateOGImagePNG(author, text, quote, source, avatarURL string) image.Image {
	width := 1200
	height := 630
	padding := 120

	bgPrimary := color.RGBA{12, 10, 20, 255}
	accent := color.RGBA{168, 85, 247, 255}
	textPrimary := color.RGBA{244, 240, 255, 255}
	textSecondary := color.RGBA{168, 158, 200, 255}
	textTertiary := color.RGBA{107, 95, 138, 255}
	border := color.RGBA{45, 38, 64, 255}

	img := image.NewRGBA(image.Rect(0, 0, width, height))

	draw.Draw(img, img.Bounds(), &image.Uniform{bgPrimary}, image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(0, 0, width, 6), &image.Uniform{accent}, image.Point{}, draw.Src)

	if logoImage != nil {
		logoHeight := 50
		logoWidth := int(float64(logoImage.Bounds().Dx()) * (float64(logoHeight) / float64(logoImage.Bounds().Dy())))
		drawScaledImage(img, logoImage, padding, 80, logoWidth, logoHeight)
	} else {
		drawText(img, "Margin", padding, 120, accent, 36, true)
	}

	avatarSize := 80
	avatarX := padding
	avatarY := 180
	avatarImg := fetchAvatarImage(avatarURL)
	if avatarImg != nil {
		drawCircularAvatar(img, avatarImg, avatarX, avatarY, avatarSize)
	} else {
		drawDefaultAvatar(img, author, avatarX, avatarY, avatarSize, accent)
	}

	handleX := avatarX + avatarSize + 24
	drawText(img, author, handleX, avatarY+50, textSecondary, 24, false)

	yPos := 280
	draw.Draw(img, image.Rect(padding, yPos, width-padding, yPos+1), &image.Uniform{border}, image.Point{}, draw.Src)
	yPos += 40

	contentWidth := width - (padding * 2)

	if text != "" {
		textLen := len(text)
		textSize := 32
		textLineHeight := 42
		maxTextLines := 6

		if textLen > 200 {
			textSize = 28
			textLineHeight = 36
			maxTextLines = 7
		}

		lines := wrapTextToWidth(text, contentWidth, textSize)
		numLines := min(len(lines), maxTextLines)

		for i := 0; i < numLines; i++ {
			line := lines[i]
			if i == numLines-1 && len(lines) > numLines {
				line += "..."
			}
			drawText(img, line, padding, yPos+(i*textLineHeight), textPrimary, float64(textSize), false)
		}
		yPos += (numLines * textLineHeight) + 40
	}

	if quote != "" {
		quoteLen := len(quote)
		quoteSize := 24
		quoteLineHeight := 32
		maxQuoteLines := 2

		if quoteLen > 150 {
			quoteSize = 20
			quoteLineHeight = 28
			maxQuoteLines = 3
		}

		lines := wrapTextToWidth(quote, contentWidth-30, quoteSize)
		numLines := min(len(lines), maxQuoteLines)
		barHeight := numLines*quoteLineHeight + 10

		draw.Draw(img, image.Rect(padding, yPos, padding+6, yPos+barHeight), &image.Uniform{accent}, image.Point{}, draw.Src)

		for i := 0; i < numLines; i++ {
			line := lines[i]
			isLast := i == numLines-1
			if isLast && len(lines) > numLines {
				line += "..."
			}
			drawText(img, "\""+line+"\"", padding+24, yPos+28+(i*quoteLineHeight), textTertiary, float64(quoteSize), true)
		}
		yPos += 30 + (numLines * quoteLineHeight) + 30
	}

	drawText(img, source, padding, 580, textTertiary, 20, false)

	return img
}

func drawScaledImage(dst *image.RGBA, src image.Image, x, y, w, h int) {
	bounds := src.Bounds()
	srcW := bounds.Dx()
	srcH := bounds.Dy()

	for dy := 0; dy < h; dy++ {
		for dx := 0; dx < w; dx++ {
			srcX := bounds.Min.X + (dx * srcW / w)
			srcY := bounds.Min.Y + (dy * srcH / h)
			c := src.At(srcX, srcY)
			_, _, _, a := c.RGBA()
			if a > 0 {
				dst.Set(x+dx, y+dy, c)
			}
		}
	}
}

func fetchAvatarImage(avatarURL string) image.Image {
	if avatarURL == "" {
		return nil
	}

	resp, err := http.Get(avatarURL)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil
	}

	img, _, err := image.Decode(resp.Body)
	if err != nil {
		return nil
	}

	return img
}

func drawCircularAvatar(dst *image.RGBA, src image.Image, x, y, size int) {
	bounds := src.Bounds()
	srcW := bounds.Dx()
	srcH := bounds.Dy()

	centerX := size / 2
	centerY := size / 2
	radius := size / 2

	for dy := 0; dy < size; dy++ {
		for dx := 0; dx < size; dx++ {
			distX := dx - centerX
			distY := dy - centerY
			if distX*distX+distY*distY <= radius*radius {
				srcX := bounds.Min.X + (dx * srcW / size)
				srcY := bounds.Min.Y + (dy * srcH / size)
				dst.Set(x+dx, y+dy, src.At(srcX, srcY))
			}
		}
	}
}

func drawDefaultAvatar(dst *image.RGBA, author string, x, y, size int, accentColor color.RGBA) {
	centerX := size / 2
	centerY := size / 2
	radius := size / 2

	for dy := 0; dy < size; dy++ {
		for dx := 0; dx < size; dx++ {
			distX := dx - centerX
			distY := dy - centerY
			if distX*distX+distY*distY <= radius*radius {
				dst.Set(x+dx, y+dy, accentColor)
			}
		}
	}

	initial := "?"
	if len(author) > 1 {
		if author[0] == '@' && len(author) > 1 {
			initial = strings.ToUpper(string(author[1]))
		} else {
			initial = strings.ToUpper(string(author[0]))
		}
	}
	drawText(dst, initial, x+size/2-10, y+size/2+12, color.RGBA{255, 255, 255, 255}, 32, true)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func drawText(img *image.RGBA, text string, x, y int, c color.Color, size float64, bold bool) {
	if fontRegular == nil || fontBold == nil {
		return
	}

	selectedFont := fontRegular
	if bold {
		selectedFont = fontBold
	}

	face, err := opentype.NewFace(selectedFont, &opentype.FaceOptions{
		Size:    size,
		DPI:     72,
		Hinting: font.HintingFull,
	})
	if err != nil {
		return
	}
	defer face.Close()

	d := &font.Drawer{
		Dst:  img,
		Src:  image.NewUniform(c),
		Face: face,
		Dot:  fixed.Point26_6{X: fixed.I(x), Y: fixed.I(y)},
	}
	d.DrawString(text)
}

func wrapTextToWidth(text string, maxWidth int, fontSize int) []string {
	words := strings.Fields(text)
	var lines []string
	var currentLine string

	charWidth := fontSize * 6 / 10

	for _, word := range words {
		testLine := currentLine
		if testLine != "" {
			testLine += " "
		}
		testLine += word

		if len(testLine)*charWidth > maxWidth && currentLine != "" {
			lines = append(lines, currentLine)
			currentLine = word
		} else {
			currentLine = testLine
		}
	}
	if currentLine != "" {
		lines = append(lines, currentLine)
	}
	return lines
}

func generateCollectionOGImagePNG(author, collectionName, description, icon, avatarURL string) image.Image {
	width := 1200
	height := 630
	padding := 120

	bgPrimary := color.RGBA{12, 10, 20, 255}
	accent := color.RGBA{168, 85, 247, 255}
	textPrimary := color.RGBA{244, 240, 255, 255}
	textSecondary := color.RGBA{168, 158, 200, 255}
	textTertiary := color.RGBA{107, 95, 138, 255}
	border := color.RGBA{45, 38, 64, 255}

	img := image.NewRGBA(image.Rect(0, 0, width, height))

	draw.Draw(img, img.Bounds(), &image.Uniform{bgPrimary}, image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(0, 0, width, 12), &image.Uniform{accent}, image.Point{}, draw.Src)

	iconY := 120
	var iconWidth int
	if icon != "" {
		emojiImg := fetchTwemojiImage(icon)
		if emojiImg != nil {
			iconSize := 96
			drawScaledImage(img, emojiImg, padding, iconY, iconSize, iconSize)
			iconWidth = iconSize + 32
		} else {
			drawText(img, icon, padding, iconY+70, textPrimary, 80, true)
			iconWidth = 100
		}
	}

	drawText(img, collectionName, padding+iconWidth, iconY+65, textPrimary, 64, true)

	yPos := 280
	contentWidth := width - (padding * 2)

	if description != "" {
		if len(description) > 200 {
			description = description[:197] + "..."
		}
		lines := wrapTextToWidth(description, contentWidth, 32)
		for i, line := range lines {
			if i >= 4 {
				break
			}
			drawText(img, line, padding, yPos+(i*42), textSecondary, 32, false)
		}
	} else {
		drawText(img, "A collection on Margin", padding, yPos, textTertiary, 32, false)
	}

	yPos = 480
	draw.Draw(img, image.Rect(padding, yPos, width-padding, yPos+1), &image.Uniform{border}, image.Point{}, draw.Src)

	avatarSize := 64
	avatarX := padding
	avatarY := yPos + 40

	avatarImg := fetchAvatarImage(avatarURL)
	if avatarImg != nil {
		drawCircularAvatar(img, avatarImg, avatarX, avatarY, avatarSize)
	} else {
		drawDefaultAvatar(img, author, avatarX, avatarY, avatarSize, accent)
	}

	handleX := avatarX + avatarSize + 24
	drawText(img, author, handleX, avatarY+42, textTertiary, 28, false)

	return img
}

func fetchTwemojiImage(emoji string) image.Image {
	var codes []string
	for _, r := range emoji {
		codes = append(codes, fmt.Sprintf("%x", r))
	}
	hexCode := strings.Join(codes, "-")

	url := fmt.Sprintf("https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/%s.png", hexCode)

	resp, err := http.Get(url)
	if err != nil || resp.StatusCode != 200 {
		if strings.Contains(hexCode, "-fe0f") {
			simpleHex := strings.ReplaceAll(hexCode, "-fe0f", "")
			url = fmt.Sprintf("https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/%s.png", simpleHex)
			resp, err = http.Get(url)
			if err != nil || resp.StatusCode != 200 {
				return nil
			}
		} else {
			return nil
		}
	}
	defer resp.Body.Close()

	img, _, err := image.Decode(resp.Body)
	if err != nil {
		return nil
	}
	return img
}

func generateHighlightOGImagePNG(author, pageTitle, quote, source, avatarURL string) image.Image {
	width := 1200
	height := 630
	padding := 100

	bgPrimary := color.RGBA{12, 10, 20, 255}
	accent := color.RGBA{250, 204, 21, 255}
	textPrimary := color.RGBA{244, 240, 255, 255}
	textSecondary := color.RGBA{168, 158, 200, 255}
	border := color.RGBA{45, 38, 64, 255}

	img := image.NewRGBA(image.Rect(0, 0, width, height))

	draw.Draw(img, img.Bounds(), &image.Uniform{bgPrimary}, image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(0, 0, width, 12), &image.Uniform{accent}, image.Point{}, draw.Src)

	avatarSize := 64
	avatarX := padding
	avatarY := padding

	avatarImg := fetchAvatarImage(avatarURL)
	if avatarImg != nil {
		drawCircularAvatar(img, avatarImg, avatarX, avatarY, avatarSize)
	} else {
		drawDefaultAvatar(img, author, avatarX, avatarY, avatarSize, accent)
	}
	drawText(img, author, avatarX+avatarSize+24, avatarY+42, textSecondary, 28, false)

	contentWidth := width - (padding * 2)
	yPos := 220
	if quote != "" {
		quoteLen := len(quote)
		fontSize := 42.0
		lineHeight := 56
		maxLines := 4

		if quoteLen > 200 {
			fontSize = 32.0
			lineHeight = 44
			maxLines = 6
		} else if quoteLen > 100 {
			fontSize = 36.0
			lineHeight = 48
			maxLines = 5
		}

		lines := wrapTextToWidth(quote, contentWidth-40, int(fontSize))
		numLines := min(len(lines), maxLines)
		barHeight := numLines * lineHeight

		draw.Draw(img, image.Rect(padding, yPos, padding+8, yPos+barHeight), &image.Uniform{accent}, image.Point{}, draw.Src)

		for i := 0; i < numLines; i++ {
			line := lines[i]
			if i == numLines-1 && len(lines) > numLines {
				line += "..."
			}
			drawText(img, line, padding+40, yPos+42+(i*lineHeight), textPrimary, fontSize, false)
		}
		yPos += barHeight + 40
	}

	draw.Draw(img, image.Rect(padding, yPos, width-padding, yPos+1), &image.Uniform{border}, image.Point{}, draw.Src)
	yPos += 40

	if pageTitle != "" {
		if len(pageTitle) > 60 {
			pageTitle = pageTitle[:57] + "..."
		}
		drawText(img, pageTitle, padding, yPos+32, textSecondary, 32, true)
	}

	if source != "" {
		drawText(img, source, padding, yPos+80, textSecondary, 24, false)
	}

	return img
}
