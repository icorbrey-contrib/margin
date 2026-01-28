package crypto

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/fxamacker/cbor/v2"
	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multihash"
)

const (
	DagCBORCodec = 0x71
	SHA256Code   = multihash.SHA2_256
)

type CIDVerificationError struct {
	ExpectedCID string
	ComputedCID string
	RecordURI   string
}

func (e *CIDVerificationError) Error() string {
	return fmt.Sprintf("CID verification failed for %s: expected %s, computed %s",
		e.RecordURI, e.ExpectedCID, e.ComputedCID)
}

func VerifyRecordCID(recordJSON json.RawMessage, expectedCID string, recordURI string) error {
	if expectedCID == "" {
		return nil
	}

	expectedC, err := cid.Decode(expectedCID)
	if err != nil {
		return fmt.Errorf("invalid CID format: %w", err)
	}

	cborBytes, err := jsonToDAGCBOR(recordJSON)
	if err != nil {
		return fmt.Errorf("failed to encode as DAG-CBOR: %w", err)
	}

	mh, err := multihash.Sum(cborBytes, SHA256Code, -1)
	if err != nil {
		return fmt.Errorf("failed to compute hash: %w", err)
	}

	computedC := cid.NewCidV1(DagCBORCodec, mh)

	if !expectedC.Equals(computedC) {
		return &CIDVerificationError{
			ExpectedCID: expectedCID,
			ComputedCID: computedC.String(),
			RecordURI:   recordURI,
		}
	}

	return nil
}

func jsonToDAGCBOR(jsonData json.RawMessage) ([]byte, error) {
	var data interface{}
	if err := json.Unmarshal(jsonData, &data); err != nil {
		return nil, err
	}

	processed := processValue(data)

	encMode, err := cbor.CanonicalEncOptions().EncMode()
	if err != nil {
		return nil, err
	}

	return encMode.Marshal(processed)
}

func processValue(v interface{}) interface{} {
	switch val := v.(type) {
	case map[string]interface{}:
		return processMap(val)
	case []interface{}:
		result := make([]interface{}, len(val))
		for i, item := range val {
			result[i] = processValue(item)
		}
		return result
	case float64:
		if val == float64(int64(val)) {
			return int64(val)
		}
		return val
	case string:
		return val
	default:
		return val
	}
}

func processMap(m map[string]interface{}) interface{} {
	if link, ok := m["$link"].(string); ok && len(m) == 1 {
		c, err := cid.Decode(link)
		if err == nil {
			return cbor.Tag{
				Number:  42,
				Content: append([]byte{0x00}, c.Bytes()...),
			}
		}
	}

	if bytesStr, ok := m["$bytes"].(string); ok && len(m) == 1 {
		bytesStr = strings.TrimRight(bytesStr, "=")
		decoded := decodeBase64(bytesStr)
		if decoded != nil {
			return decoded
		}
	}

	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	result := make(map[string]interface{}, len(m))
	for _, k := range keys {
		result[k] = processValue(m[k])
	}

	return result
}

func decodeBase64(s string) []byte {
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}

	decoded := make([]byte, len(s))
	n := 0
	for i := 0; i < len(s); i += 4 {
		if i+4 > len(s) {
			break
		}
		chunk := s[i : i+4]
		val := uint32(0)
		for _, c := range chunk {
			var v byte
			switch {
			case c >= 'A' && c <= 'Z':
				v = byte(c - 'A')
			case c >= 'a' && c <= 'z':
				v = byte(c - 'a' + 26)
			case c >= '0' && c <= '9':
				v = byte(c - '0' + 52)
			case c == '+' || c == '-':
				v = 62
			case c == '/' || c == '_':
				v = 63
			case c == '=':
				v = 0
			default:
				return nil
			}
			val = val<<6 | uint32(v)
		}
		decoded[n] = byte(val >> 16)
		n++
		if chunk[2] != '=' {
			decoded[n] = byte(val >> 8)
			n++
		}
		if chunk[3] != '=' {
			decoded[n] = byte(val)
			n++
		}
	}
	return decoded[:n]
}

func VerifyRecordCIDBatch(records []struct {
	JSON json.RawMessage
	CID  string
	URI  string
}) []error {
	var errors []error
	for _, r := range records {
		if err := VerifyRecordCID(r.JSON, r.CID, r.URI); err != nil {
			errors = append(errors, err)
		}
	}
	return errors
}

func MustVerifyRecordCID(recordJSON json.RawMessage, expectedCID string, recordURI string) bool {
	return VerifyRecordCID(recordJSON, expectedCID, recordURI) == nil
}

func ComputeRecordCID(recordJSON json.RawMessage) (string, error) {
	cborBytes, err := jsonToDAGCBOR(recordJSON)
	if err != nil {
		return "", fmt.Errorf("failed to encode as DAG-CBOR: %w", err)
	}

	mh, err := multihash.Sum(cborBytes, SHA256Code, -1)
	if err != nil {
		return "", fmt.Errorf("failed to compute hash: %w", err)
	}

	c := cid.NewCidV1(DagCBORCodec, mh)
	return c.String(), nil
}

func CompareRecordBytes(a, b json.RawMessage) (bool, error) {
	cborA, err := jsonToDAGCBOR(a)
	if err != nil {
		return false, err
	}
	cborB, err := jsonToDAGCBOR(b)
	if err != nil {
		return false, err
	}
	return bytes.Equal(cborA, cborB), nil
}
