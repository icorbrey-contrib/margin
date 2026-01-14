package oauth

import (
	"context"
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
)

type Client struct {
	ClientID    string
	RedirectURI string
	PrivateKey  *ecdsa.PrivateKey
	PublicJWK   jose.JSONWebKey
}

type AuthServerMetadata struct {
	Issuer                             string   `json:"issuer"`
	AuthorizationEndpoint              string   `json:"authorization_endpoint"`
	TokenEndpoint                      string   `json:"token_endpoint"`
	PushedAuthorizationRequestEndpoint string   `json:"pushed_authorization_request_endpoint"`
	ScopesSupported                    []string `json:"scopes_supported"`
	ResponseTypesSupported             []string `json:"response_types_supported"`
	DPoPSigningAlgValuesSupported      []string `json:"dpop_signing_alg_values_supported"`
}

type PARResponse struct {
	RequestURI string `json:"request_uri"`
	ExpiresIn  int    `json:"expires_in"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
	Sub          string `json:"sub"`
}

type PendingAuth struct {
	State        string
	DID          string
	Handle       string
	PDS          string
	AuthServer   string
	Issuer       string
	PKCEVerifier string
	DPoPKey      *ecdsa.PrivateKey
	DPoPNonce    string
	CreatedAt    time.Time
}

func NewClient(clientID, redirectURI string, privateKey *ecdsa.PrivateKey) *Client {
	publicJWK := jose.JSONWebKey{
		Key:       &privateKey.PublicKey,
		Algorithm: string(jose.ES256),
		Use:       "sig",
	}
	thumbprint, _ := publicJWK.Thumbprint(crypto.SHA256)
	publicJWK.KeyID = base64.RawURLEncoding.EncodeToString(thumbprint)

	return &Client{
		ClientID:    clientID,
		RedirectURI: redirectURI,
		PrivateKey:  privateKey,
		PublicJWK:   publicJWK,
	}
}

func GenerateKey() (*ecdsa.PrivateKey, error) {
	return ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
}

func (c *Client) ResolveHandle(ctx context.Context, handle string) (string, error) {
	url := fmt.Sprintf("https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=%s", url.QueryEscape(handle))
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("failed to resolve handle: %d", resp.StatusCode)
	}

	var result struct {
		DID string `json:"did"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.DID, nil
}

func (c *Client) ResolveDIDToPDS(ctx context.Context, did string) (string, error) {
	var docURL string
	if strings.HasPrefix(did, "did:plc:") {
		docURL = fmt.Sprintf("https://plc.directory/%s", did)
	} else if strings.HasPrefix(did, "did:web:") {
		domain := strings.TrimPrefix(did, "did:web:")
		docURL = fmt.Sprintf("https://%s/.well-known/did.json", domain)
	} else {
		return "", fmt.Errorf("unsupported DID method: %s", did)
	}

	resp, err := http.Get(docURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var doc struct {
		Service []struct {
			ID              string `json:"id"`
			Type            string `json:"type"`
			ServiceEndpoint string `json:"serviceEndpoint"`
		} `json:"service"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return "", err
	}

	for _, svc := range doc.Service {
		if svc.Type == "AtprotoPersonalDataServer" {
			return svc.ServiceEndpoint, nil
		}
	}
	return "", fmt.Errorf("no PDS found in DID document")
}

func (c *Client) GetAuthServerMetadata(ctx context.Context, pds string) (*AuthServerMetadata, error) {
	resourceURL := fmt.Sprintf("%s/.well-known/oauth-protected-resource", strings.TrimSuffix(pds, "/"))
	resp, err := http.Get(resourceURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var resource struct {
		AuthorizationServers []string `json:"authorization_servers"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&resource); err != nil {
		return nil, err
	}

	if len(resource.AuthorizationServers) == 0 {
		return nil, fmt.Errorf("no authorization servers found")
	}

	authServerURL := resource.AuthorizationServers[0]
	metaURL := fmt.Sprintf("%s/.well-known/oauth-authorization-server", strings.TrimSuffix(authServerURL, "/"))

	metaResp, err := http.Get(metaURL)
	if err != nil {
		return nil, err
	}
	defer metaResp.Body.Close()

	var meta AuthServerMetadata
	if err := json.NewDecoder(metaResp.Body).Decode(&meta); err != nil {
		return nil, err
	}
	return &meta, nil
}

func (c *Client) GeneratePKCE() (verifier, challenge string) {
	b := make([]byte, 32)
	rand.Read(b)
	verifier = base64.RawURLEncoding.EncodeToString(b)

	h := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(h[:])
	return
}

func (c *Client) GenerateDPoPKey() (*ecdsa.PrivateKey, error) {
	return ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
}

func (c *Client) CreateDPoPProof(dpopKey *ecdsa.PrivateKey, method, uri, nonce, ath string) (string, error) {
	now := time.Now()
	jti := make([]byte, 16)
	rand.Read(jti)

	publicJWK := jose.JSONWebKey{
		Key:       &dpopKey.PublicKey,
		Algorithm: string(jose.ES256),
	}

	claims := map[string]interface{}{
		"jti": base64.RawURLEncoding.EncodeToString(jti),
		"htm": method,
		"htu": uri,
		"iat": now.Unix(),
		"exp": now.Add(5 * time.Minute).Unix(),
	}
	if nonce != "" {
		claims["nonce"] = nonce
	}
	if ath != "" {
		claims["ath"] = ath
	}

	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.ES256, Key: dpopKey}, &jose.SignerOptions{
		ExtraHeaders: map[jose.HeaderKey]interface{}{
			"typ": "dpop+jwt",
			"jwk": publicJWK,
		},
	})
	if err != nil {
		return "", err
	}

	claimsBytes, _ := json.Marshal(claims)
	sig, err := signer.Sign(claimsBytes)
	if err != nil {
		return "", err
	}

	return sig.CompactSerialize()
}

func (c *Client) CreateClientAssertion(issuer string) (string, error) {
	now := time.Now()
	jti := make([]byte, 16)
	rand.Read(jti)

	claims := jwt.Claims{
		Issuer:   c.ClientID,
		Subject:  c.ClientID,
		Audience: jwt.Audience{issuer},
		IssuedAt: jwt.NewNumericDate(now.Add(-5 * time.Minute)),
		Expiry:   jwt.NewNumericDate(now.Add(5 * time.Minute)),
		ID:       base64.RawURLEncoding.EncodeToString(jti),
	}

	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.ES256, Key: c.PrivateKey}, &jose.SignerOptions{
		ExtraHeaders: map[jose.HeaderKey]interface{}{
			"kid": c.PublicJWK.KeyID,
		},
	})
	if err != nil {
		return "", err
	}

	return jwt.Signed(signer).Claims(claims).Serialize()
}

func (c *Client) SendPAR(meta *AuthServerMetadata, loginHint, scope string, dpopKey *ecdsa.PrivateKey, pkceChallenge string) (*PARResponse, string, string, error) {
	stateBytes := make([]byte, 16)
	rand.Read(stateBytes)
	state := base64.RawURLEncoding.EncodeToString(stateBytes)

	parResp, dpopNonce, err := c.sendPARRequest(meta, loginHint, scope, dpopKey, pkceChallenge, state, "")
	if err != nil {

		if strings.Contains(err.Error(), "use_dpop_nonce") && dpopNonce != "" {

			parResp, dpopNonce, err = c.sendPARRequest(meta, loginHint, scope, dpopKey, pkceChallenge, state, dpopNonce)
			if err != nil {
				return nil, "", "", err
			}
		} else {
			return nil, "", "", err
		}
	}

	return parResp, state, dpopNonce, nil
}

func (c *Client) sendPARRequest(meta *AuthServerMetadata, loginHint, scope string, dpopKey *ecdsa.PrivateKey, pkceChallenge, state, dpopNonce string) (*PARResponse, string, error) {
	dpopProof, err := c.CreateDPoPProof(dpopKey, "POST", meta.PushedAuthorizationRequestEndpoint, dpopNonce, "")
	if err != nil {
		return nil, "", err
	}

	clientAssertion, err := c.CreateClientAssertion(meta.Issuer)
	if err != nil {
		return nil, "", err
	}

	data := url.Values{}
	data.Set("client_id", c.ClientID)
	data.Set("redirect_uri", c.RedirectURI)
	data.Set("response_type", "code")
	data.Set("scope", scope)
	data.Set("state", state)
	data.Set("code_challenge", pkceChallenge)
	data.Set("code_challenge_method", "S256")
	data.Set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
	data.Set("client_assertion", clientAssertion)
	if loginHint != "" {
		data.Set("login_hint", loginHint)
	}

	req, err := http.NewRequest("POST", meta.PushedAuthorizationRequestEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("DPoP", dpopProof)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	responseNonce := resp.Header.Get("DPoP-Nonce")

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		body, _ := io.ReadAll(resp.Body)
		return nil, responseNonce, fmt.Errorf("PAR failed: %d - %s", resp.StatusCode, string(body))
	}

	var parResp PARResponse
	if err := json.NewDecoder(resp.Body).Decode(&parResp); err != nil {
		return nil, responseNonce, err
	}

	return &parResp, responseNonce, nil
}

func (c *Client) ExchangeCode(meta *AuthServerMetadata, code, pkceVerifier string, dpopKey *ecdsa.PrivateKey, dpopNonce string) (*TokenResponse, string, error) {
	return c.exchangeCodeInternal(meta, code, pkceVerifier, dpopKey, dpopNonce, false)
}

func (c *Client) exchangeCodeInternal(meta *AuthServerMetadata, code, pkceVerifier string, dpopKey *ecdsa.PrivateKey, dpopNonce string, isRetry bool) (*TokenResponse, string, error) {
	accessTokenHash := ""
	dpopProof, err := c.CreateDPoPProof(dpopKey, "POST", meta.TokenEndpoint, dpopNonce, accessTokenHash)
	if err != nil {
		return nil, "", err
	}

	clientAssertion, err := c.CreateClientAssertion(meta.Issuer)
	if err != nil {
		return nil, "", err
	}

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", c.RedirectURI)
	data.Set("client_id", c.ClientID)
	data.Set("code_verifier", pkceVerifier)
	data.Set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
	data.Set("client_assertion", clientAssertion)

	req, err := http.NewRequest("POST", meta.TokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("DPoP", dpopProof)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	newNonce := resp.Header.Get("DPoP-Nonce")

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		bodyStr := string(body)

		if !isRetry && strings.Contains(bodyStr, "use_dpop_nonce") && newNonce != "" {
			return c.exchangeCodeInternal(meta, code, pkceVerifier, dpopKey, newNonce, true)
		}

		return nil, newNonce, fmt.Errorf("token exchange failed: %d - %s", resp.StatusCode, bodyStr)
	}

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, newNonce, err
	}

	return &tokenResp, newNonce, nil
}

func (c *Client) RefreshToken(meta *AuthServerMetadata, refreshToken string, dpopKey *ecdsa.PrivateKey, dpopNonce string) (*TokenResponse, string, error) {
	return c.refreshTokenInternal(meta, refreshToken, dpopKey, dpopNonce, false)
}

func (c *Client) refreshTokenInternal(meta *AuthServerMetadata, refreshToken string, dpopKey *ecdsa.PrivateKey, dpopNonce string, isRetry bool) (*TokenResponse, string, error) {
	dpopProof, err := c.CreateDPoPProof(dpopKey, "POST", meta.TokenEndpoint, dpopNonce, "")
	if err != nil {
		return nil, "", err
	}

	clientAssertion, err := c.CreateClientAssertion(meta.Issuer)
	if err != nil {
		return nil, "", err
	}

	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)
	data.Set("client_id", c.ClientID)
	data.Set("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
	data.Set("client_assertion", clientAssertion)

	req, err := http.NewRequest("POST", meta.TokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("DPoP", dpopProof)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	newNonce := resp.Header.Get("DPoP-Nonce")

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		bodyStr := string(body)

		if !isRetry && strings.Contains(bodyStr, "use_dpop_nonce") && newNonce != "" {
			return c.refreshTokenInternal(meta, refreshToken, dpopKey, newNonce, true)
		}

		return nil, newNonce, fmt.Errorf("refresh failed: %d - %s", resp.StatusCode, bodyStr)
	}

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, newNonce, err
	}

	return &tokenResp, newNonce, nil
}

func (c *Client) GetPublicJWKS() map[string]interface{} {
	return map[string]interface{}{
		"keys": []interface{}{c.PublicJWK},
	}
}
