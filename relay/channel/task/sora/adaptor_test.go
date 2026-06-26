package sora

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/require"
)

func TestParseTaskResultDoneWithVideoURL(t *testing.T) {
	body := []byte(`{
		"id":"task_upstream",
		"model":"grok-image-video",
		"status":"done",
		"progress":100,
		"result_url":"https://example.com/result.mp4",
		"video":{"url":"https://example.com/video.mp4"},
		"output":["https://example.com/output.mp4"]
	}`)

	info, err := (&TaskAdaptor{}).ParseTaskResult(body)
	require.NoError(t, err)
	require.NotNil(t, info)
	require.Equal(t, string(model.TaskStatusSuccess), info.Status)
	require.Equal(t, "https://example.com/result.mp4", info.Url)
}

func TestExtractResponseTaskVideoURLFallbacks(t *testing.T) {
	require.Equal(t, "https://example.com/video.mp4", extractResponseTaskVideoURL(responseTask{Video: &struct {
		URL string `json:"url,omitempty"`
	}{URL: "https://example.com/video.mp4"}}))
	require.Equal(t, "https://example.com/output.mp4", extractResponseTaskVideoURL(responseTask{Output: []string{"https://example.com/output.mp4"}}))
}
