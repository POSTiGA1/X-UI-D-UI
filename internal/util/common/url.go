package common

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

// EnsureURLScheme prepends https:// to a URL that carries no scheme, so
// subscription apps and browsers don't resolve it relative to the panel's own
// domain (e.g. "t.me/support" turning into "https://panel.example/t.me/support").
// Values with an explicit scheme (https://, tg://, mailto:, tel:) and empty
// strings pass through untouched.
func EnsureURLScheme(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if strings.Contains(trimmed, "://") ||
		strings.HasPrefix(trimmed, "mailto:") ||
		strings.HasPrefix(trimmed, "tel:") {
		return trimmed
	}
	return "https://" + trimmed
}

// ParseRemoteRoutingURL checks if a raw string is a remote routing URL (https:// or http://).
// If it is, it returns the trimmed URL, remote=true, and nil error (or parse error if malformed).
// If it is not a remote URL (e.g. inline YAML/JSON string or empty), it returns raw, remote=false, nil error.
func ParseRemoteRoutingURL(raw string) (string, bool, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", false, nil
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		u, err := url.Parse(trimmed)
		if err != nil {
			return "", true, err
		}
		if u.Scheme != "http" && u.Scheme != "https" {
			return "", false, nil
		}
		if u.Host == "" {
			return "", true, fmt.Errorf("invalid remote routing URL: missing host")
		}
		return u.String(), true, nil
	}
	if strings.HasPrefix(trimmed, "http:") || strings.HasPrefix(trimmed, "https:") {
		_, err := url.Parse(trimmed)
		return "", true, err
	}
	return trimmed, false, nil
}

// CleanDomainHost strips scheme (http://, https://), path, port, query, hash,
// and whitespace, returning a normalized lower-case domain or IP host string.
func CleanDomainHost(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if idx := strings.Index(raw, "://"); idx != -1 {
		raw = raw[idx+3:]
	}
	if idx := strings.Index(raw, "/"); idx != -1 {
		raw = raw[:idx]
	}
	if idx := strings.IndexAny(raw, "?#"); idx != -1 {
		raw = raw[:idx]
	}
	if host, _, err := net.SplitHostPort(raw); err == nil {
		raw = host
	} else if colonIdx := strings.LastIndex(raw, ":"); colonIdx != -1 && !strings.Contains(raw, "]") {
		raw = raw[:colonIdx]
	}
	return strings.ToLower(strings.TrimSpace(raw))
}

// CleanDomainHosts splits a comma, space, or newline-separated string of domains
// and returns a deduplicated slice of cleaned lower-case domain hostnames.
func CleanDomainHosts(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	fields := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ';' || r == ' ' || r == '\n' || r == '\r' || r == '\t'
	})
	var result []string
	seen := make(map[string]bool)
	for _, f := range fields {
		cleaned := CleanDomainHost(f)
		if cleaned != "" && !seen[cleaned] {
			seen[cleaned] = true
			result = append(result, cleaned)
		}
	}
	return result
}

