package common

import (
	"reflect"
	"testing"
)

func TestEnsureURLScheme(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"empty", "", ""},
		{"whitespace only", "   ", ""},
		{"bare telegram handle", "t.me/dui_support", "https://t.me/dui_support"},
		{"bare domain with path", "example.com/help", "https://example.com/help"},
		{"already https", "https://t.me/dui_support", "https://t.me/dui_support"},
		{"already http", "http://example.com", "http://example.com"},
		{"telegram deep link", "tg://resolve?domain=dui_support", "tg://resolve?domain=dui_support"},
		{"mailto", "mailto:support@example.com", "mailto:support@example.com"},
		{"tel", "tel:+1234567890", "tel:+1234567890"},
		{"trims whitespace", "  t.me/dui_support  ", "https://t.me/dui_support"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EnsureURLScheme(tt.in); got != tt.want {
				t.Errorf("EnsureURLScheme(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestCleanDomainHost(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", ""},
		{"   ", ""},
		{"sub.example.com", "sub.example.com"},
		{"https://sub.example.com", "sub.example.com"},
		{"http://sub.example.com:2053/path?query=1#frag", "sub.example.com"},
		{"Sub.Example.Com:8443/", "sub.example.com"},
		{"127.0.0.1", "127.0.0.1"},
		{"https://127.0.0.1:2053", "127.0.0.1"},
	}
	for _, tt := range tests {
		if got := CleanDomainHost(tt.in); got != tt.want {
			t.Errorf("CleanDomainHost(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestCleanDomainHosts(t *testing.T) {
	in := " https://panel1.example.com:2053/ , panel2.example.com; sub.example.com "
	want := []string{"panel1.example.com", "panel2.example.com", "sub.example.com"}
	got := CleanDomainHosts(in)
	if !reflect.DeepEqual(got, want) {
		t.Errorf("CleanDomainHosts(%q) = %v, want %v", in, got, want)
	}
}
