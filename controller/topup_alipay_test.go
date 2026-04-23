package controller

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

func TestGetTopUpInfoPrefersAlipayDirectOverLegacyAlipay(t *testing.T) {
	setupTopupControllerTestEnv(t)
	operation_setting.PayMethods = []map[string]string{{
		"name": "支付宝",
		"type": "alipay",
	}}
	setting.AlipayEnabled = true
	setting.AlipayAppID = "2026000000000000"
	setting.AlipayPrivateKey = "private-key"
	setting.AlipayPublicKey = "public-key"
	setting.AlipayMinTopUp = 3

	ctx, recorder := newTopupTestContext(t, "GET", "/api/user/topup/info", nil, 1)
	GetTopUpInfo(ctx)

	body := recorder.Body.String()
	if strings.Contains(body, `"type":"alipay"`) {
		t.Fatalf("expected legacy alipay to be hidden: %s", body)
	}
	if !strings.Contains(body, `"type":"alipay_direct"`) {
		t.Fatalf("expected alipay_direct in response: %s", body)
	}
}

func TestTopUpPersistsPaymentModeAndProviderPayload(t *testing.T) {
	setupTopupControllerTestEnv(t)
	seedTopupUser(t, 1, "default")

	order := &model.TopUp{
		UserId:          1,
		Amount:          10,
		Money:           7.2,
		TradeNo:         "ALIPAY-TOPUP-1",
		PaymentMethod:   "alipay_direct",
		PaymentMode:     "qr",
		ProviderPayload: `{"source":"query"}`,
		Status:          common.TopUpStatusPending,
	}
	if err := model.DB.Create(order).Error; err != nil {
		t.Fatalf("failed to create order: %v", err)
	}

	var saved model.TopUp
	if err := model.DB.First(&saved, "trade_no = ?", order.TradeNo).Error; err != nil {
		t.Fatalf("failed to query order: %v", err)
	}
	if saved.PaymentMode != "qr" || saved.ProviderPayload == "" {
		t.Fatalf("unexpected saved order: %+v", saved)
	}
}
