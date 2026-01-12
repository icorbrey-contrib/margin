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
			http.Error(w, "Record not found", http.StatusNotFound)
			return
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

	if quote != "" {
		if len(quote) > 100 {
			quote = quote[:97] + "..."
		}

		lines := wrapTextToWidth(quote, contentWidth-30, 24)
		numLines := min(len(lines), 2)
		barHeight := numLines*32 + 10

		draw.Draw(img, image.Rect(padding, yPos, padding+6, yPos+barHeight), &image.Uniform{accent}, image.Point{}, draw.Src)

		for i, line := range lines {
			if i >= 2 {
				break
			}
			drawText(img, "\""+line+"\"", padding+24, yPos+28+(i*32), textTertiary, 24, true)
		}
		yPos += 30 + (numLines * 32) + 30
	}

	if text != "" {
		if len(text) > 300 {
			text = text[:297] + "..."
		}
		lines := wrapTextToWidth(text, contentWidth, 32)
		for i, line := range lines {
			if i >= 6 {
				break
			}
			drawText(img, line, padding, yPos+(i*42), textPrimary, 32, false)
		}
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
