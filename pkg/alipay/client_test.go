package alipay

import (
	"net/url"
	"testing"

	"github.com/shopspring/decimal"
)

func TestConfigValidateRequiresCoreKeys(t *testing.T) {
	cfg := Config{}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected config validation error")
	}
}

func TestNormalizePayModeRejectsUnknownMode(t *testing.T) {
	if _, err := NormalizePayMode("mobile"); err == nil {
		t.Fatal("expected invalid pay mode error")
	}
}

func TestNotificationResultValidateRequiresSuccessAndAmount(t *testing.T) {
	result := NotificationResult{
		OutTradeNo:     "T-1",
		TradeStatus:    "WAIT_BUYER_PAY",
		TotalAmount:    decimal.RequireFromString("7.20"),
		BuyerPayAmount: decimal.RequireFromString("7.20"),
	}
	if err := result.ValidatePaid(); err == nil {
		t.Fatal("expected unpaid notification error")
	}
}

func TestVerifyNotificationRejectsMissingSignature(t *testing.T) {
	values := url.Values{}
	values.Set("out_trade_no", "T-1")
	_, err := ParseNotification(values)
	if err == nil {
		t.Fatal("expected missing sign error")
	}
}

func TestNewClientReturnsSDKErrorOnInvalidKey(t *testing.T) {
	_, err := NewClient(Config{
		AppID:      "2026000000000000",
		PrivateKey: "invalid",
		PublicKey:  "invalid",
	})
	if err == nil {
		t.Fatal("expected sdk init error")
	}
}
