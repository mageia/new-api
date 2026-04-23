package alipay

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"net/url"
	"strings"
	"sync"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/smartwalle/nsign"
)

var (
	testKeyPairOnce sync.Once
	testPrivateKey  string
	testPublicKey   string
	testKeyPairErr  error
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

func TestNormalizePayModeAcceptsKnownModes(t *testing.T) {
	mode, err := NormalizePayMode(" page ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mode != PayModePage {
		t.Fatalf("expected %s, got %s", PayModePage, mode)
	}

	mode, err = NormalizePayMode(PayModeQR)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mode != PayModeQR {
		t.Fatalf("expected %s, got %s", PayModeQR, mode)
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

func TestParseNotificationParsesAmountsAndPreservesRawForm(t *testing.T) {
	values := url.Values{}
	values.Set("out_trade_no", "T-1")
	values.Set("trade_no", "ALI-1")
	values.Set("trade_status", alipayTradeStatusSuccess)
	values.Set("total_amount", "7.20")
	values.Set("buyer_pay_amount", "7.10")
	values.Add("voucher_id", "A")
	values.Add("voucher_id", "B")
	values.Set("sign", "dummy-sign")

	result, err := ParseNotification(values)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.TotalAmount.Equal(decimal.RequireFromString("7.20")) {
		t.Fatalf("unexpected total amount: %s", result.TotalAmount)
	}
	if !result.BuyerPayAmount.Equal(decimal.RequireFromString("7.10")) {
		t.Fatalf("unexpected buyer pay amount: %s", result.BuyerPayAmount)
	}
	expectedRawForm := values.Encode()
	if result.RawForm != expectedRawForm {
		t.Fatalf("raw form mismatch, expected %q, got %q", expectedRawForm, result.RawForm)
	}
	if !strings.Contains(result.RawForm, "voucher_id=A&voucher_id=B") {
		t.Fatalf("expected raw form to preserve duplicate keys, got %q", result.RawForm)
	}
}

func TestClientCreatePageOrderBuildsPayURL(t *testing.T) {
	client := newTestClient(t)
	response, err := client.CreatePageOrder(context.Background(), CreateOrderRequest{
		OutTradeNo:  "ORDER-1001",
		TotalAmount: decimal.RequireFromString("18.90"),
	})
	if err != nil {
		t.Fatalf("unexpected create page order error: %v", err)
	}
	if strings.TrimSpace(response.PayURL) == "" {
		t.Fatal("expected non-empty pay url")
	}

	parsedURL, err := url.Parse(response.PayURL)
	if err != nil {
		t.Fatalf("invalid pay url: %v", err)
	}
	query := parsedURL.Query()
	if query.Get("method") != "alipay.trade.page.pay" {
		t.Fatalf("unexpected method: %s", query.Get("method"))
	}
	if query.Get("notify_url") != client.cfg.DefaultNotifyURL {
		t.Fatalf("unexpected notify_url: %s", query.Get("notify_url"))
	}
	if query.Get("return_url") != client.cfg.DefaultReturnURL {
		t.Fatalf("unexpected return_url: %s", query.Get("return_url"))
	}
	bizContent := query.Get("biz_content")
	if !strings.Contains(bizContent, "\"product_code\":\"FAST_INSTANT_TRADE_PAY\"") {
		t.Fatalf("missing product code in biz_content: %s", bizContent)
	}
	if !strings.Contains(bizContent, "\"out_trade_no\":\"ORDER-1001\"") {
		t.Fatalf("missing out_trade_no in biz_content: %s", bizContent)
	}
}

func TestClientCreateQROrderAndQueryOrderValidateInput(t *testing.T) {
	client := newTestClient(t)
	_, err := client.CreateQROrder(context.Background(), CreateOrderRequest{TotalAmount: decimal.RequireFromString("5.00")})
	if err == nil || !strings.Contains(err.Error(), "out_trade_no") {
		t.Fatalf("expected out_trade_no validation error, got %v", err)
	}

	_, err = client.QueryOrder(context.Background(), "")
	if err == nil || !strings.Contains(err.Error(), "out_trade_no") {
		t.Fatalf("expected out_trade_no validation error, got %v", err)
	}
}

func TestClientVerifyNotificationSuccess(t *testing.T) {
	client := newTestClient(t)
	values := url.Values{}
	values.Set("out_trade_no", "ORDER-2001")
	values.Set("trade_no", "20260423000001")
	values.Set("trade_status", alipayTradeStatusSuccess)
	values.Set("total_amount", "9.90")
	values.Set("buyer_pay_amount", "9.90")
	values.Set("sign_type", "RSA2")
	values.Add("coupon", "x")
	values.Add("coupon", "y")
	signNotificationValues(t, client, values)

	result, err := client.VerifyNotification(values)
	if err != nil {
		t.Fatalf("unexpected verify notification error: %v", err)
	}
	if err = result.ValidatePaid(); err != nil {
		t.Fatalf("expected paid notification, got %v", err)
	}
	if result.OutTradeNo != "ORDER-2001" {
		t.Fatalf("unexpected out_trade_no: %s", result.OutTradeNo)
	}
	expectedRawForm := values.Encode()
	if result.RawForm != expectedRawForm {
		t.Fatalf("raw form mismatch, expected %q, got %q", expectedRawForm, result.RawForm)
	}
	if !strings.Contains(result.RawForm, "coupon=x&coupon=y") {
		t.Fatalf("expected duplicated values in raw form, got %q", result.RawForm)
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

func newTestClient(t *testing.T) *sdkClient {
	t.Helper()
	privateKeyPEM, publicKeyPEM := testKeyPair(t)
	client, err := NewClient(Config{
		AppID:                   "2026000000000000",
		PrivateKey:              privateKeyPEM,
		PublicKey:               publicKeyPEM,
		DefaultNotifyURL:        "https://example.com/notify",
		DefaultReturnURL:        "https://example.com/return",
		DefaultOrderDescription: defaultAlipayOrderDescription,
	})
	if err != nil {
		t.Fatalf("new test client failed: %v", err)
	}
	sdkCli, ok := client.(*sdkClient)
	if !ok {
		t.Fatalf("unexpected client type: %T", client)
	}
	return sdkCli
}

func signNotificationValues(t *testing.T, client *sdkClient, values url.Values) {
	t.Helper()
	signBytes, err := client.cli.SignValues(values, nsign.WithIgnore("sign", "sign_type", "alipay_cert_sn"))
	if err != nil {
		t.Fatalf("sign values failed: %v", err)
	}
	values.Set("sign", base64.StdEncoding.EncodeToString(signBytes))
}

func testKeyPair(t *testing.T) (privateKeyPEM string, publicKeyPEM string) {
	t.Helper()
	testKeyPairOnce.Do(func() {
		privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			testKeyPairErr = err
			return
		}
		privateDER := x509.MarshalPKCS1PrivateKey(privateKey)
		privatePEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: privateDER})
		publicDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
		if err != nil {
			testKeyPairErr = err
			return
		}
		publicPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: publicDER})
		testPrivateKey = string(privatePEM)
		testPublicKey = string(publicPEM)
	})
	if testKeyPairErr != nil {
		t.Fatalf("generate test key pair failed: %v", testKeyPairErr)
	}
	return testPrivateKey, testPublicKey
}
