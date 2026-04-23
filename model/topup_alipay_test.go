package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestTopUpPersistsPaymentModeAndProviderPayload(t *testing.T) {
	db := setupTopupModelTestDB(t)
	seedTopupModelUser(t, db, 1, 0)
	order := &TopUp{
		UserId:          1,
		Amount:          10,
		Money:           7.2,
		TradeNo:         "ALIPAY-TOPUP-1",
		PaymentMethod:   "alipay_direct",
		PaymentMode:     "qr",
		ProviderPayload: `{"source":"query"}`,
		Status:          common.TopUpStatusPending,
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("failed to create order: %v", err)
	}
	var saved TopUp
	if err := db.First(&saved, "trade_no = ?", order.TradeNo).Error; err != nil {
		t.Fatalf("failed to query order: %v", err)
	}
	if saved.PaymentMode != "qr" || saved.ProviderPayload == "" {
		t.Fatalf("unexpected saved order: %+v", saved)
	}
}
