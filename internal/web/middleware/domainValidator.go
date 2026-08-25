package middleware

import (
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mdaltoon10/D-UI/v3/internal/logger"
	"github.com/mdaltoon10/D-UI/v3/internal/util/common"
)

// DomainValidatorMiddleware returns a Gin middleware that validates the request domain.
// It extracts candidate hosts from the request (c.Request.Host, X-Forwarded-Host, Host header),
// normalizes them, and compares against the configured domain(s).
// Requests from direct IP addresses or loopback (localhost, 127.0.0.1, ::1) are always allowed as fallbacks.
func DomainValidatorMiddleware(domain string) gin.HandlerFunc {
	allowedDomains := common.CleanDomainHosts(domain)
	return func(c *gin.Context) {
		if len(allowedDomains) == 0 {
			c.Next()
			return
		}

		candidateHosts := []string{
			c.Request.Host,
			c.GetHeader("X-Forwarded-Host"),
			c.GetHeader("Host"),
		}

		for _, cand := range candidateHosts {
			if cand == "" {
				continue
			}
			for _, part := range strings.Split(cand, ",") {
				host := common.CleanDomainHost(part)
				if host == "" {
					continue
				}

				// Always allow loopback and direct IP accesses
				if host == "localhost" || host == "127.0.0.1" || host == "::1" || net.ParseIP(host) != nil {
					c.Next()
					return
				}

				// Check against allowed domains
				for _, allowed := range allowedDomains {
					if host == allowed {
						c.Next()
						return
					}
					if strings.HasPrefix(allowed, "*.") && strings.HasSuffix(host, allowed[1:]) {
						c.Next()
						return
					}
					if strings.HasPrefix(allowed, ".") && strings.HasSuffix(host, allowed) {
						c.Next()
						return
					}
				}
			}
		}

		logger.Warningf("DomainValidatorMiddleware: Host mismatch. Candidates: %v, Configured Domains: %v. Request rejected.", candidateHosts, allowedDomains)
		c.AbortWithStatus(http.StatusForbidden)
	}
}
