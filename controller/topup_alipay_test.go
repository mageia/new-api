package controller

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

type alipaySettingSnapshot struct {
	Enabled               bool
	Sandbox               bool
	AppID                 string
	PrivateKey            string
	PublicKey             string
	UnitPrice             float64
	MinTopUp              int
	NotifyURL             string
	ReturnURL             string
	SubscriptionReturnURL string
	OrderDescription      string
}

func snapshotAlipaySettings() alipaySettingSnapshot {
	return alipaySettingSnapshot{
		Enabled:               setting.AlipayEnabled,
		Sandbox:               setting.AlipaySandbox,
		AppID:                 setting.AlipayAppID,
		PrivateKey:            setting.AlipayPrivateKey,
		PublicKey:             setting.AlipayPublicKey,
		UnitPrice:             setting.AlipayUnitPrice,
		MinTopUp:              setting.AlipayMinTopUp,
		NotifyURL:             setting.AlipayNotifyURL,
		ReturnURL:             setting.AlipayReturnURL,
		SubscriptionReturnURL: setting.AlipaySubscriptionReturnURL,
		OrderDescription:      setting.AlipayOrderDescription,
	}
}

func restoreAlipaySettings(snapshot alipaySettingSnapshot) {
	setting.AlipayEnabled = snapshot.Enabled
	setting.AlipaySandbox = snapshot.Sandbox
	setting.AlipayAppID = snapshot.AppID
	setting.AlipayPrivateKey = snapshot.PrivateKey
	setting.AlipayPublicKey = snapshot.PublicKey
	setting.AlipayUnitPrice = snapshot.UnitPrice
	setting.AlipayMinTopUp = snapshot.MinTopUp
	setting.AlipayNotifyURL = snapshot.NotifyURL
	setting.AlipayReturnURL = snapshot.ReturnURL
	setting.AlipaySubscriptionReturnURL = snapshot.SubscriptionReturnURL
	setting.AlipayOrderDescription = snapshot.OrderDescription
}

func setupAlipaySettingIsolation(t *testing.T) {
	t.Helper()
	snapshot := snapshotAlipaySettings()
	t.Cleanup(func() {
		restoreAlipaySettings(snapshot)
	})
}

func seedSubscriptionPlan(t *testing.T) *model.SubscriptionPlan {
	t.Helper()

	plan := &model.SubscriptionPlan{
		Title:         "Alipay Plan",
		PriceAmount:   7.2,
		Currency:      "USD",
		DurationUnit:  model.SubscriptionDurationMonth,
		DurationValue: 1,
		Enabled:       true,
		TotalAmount:   1000,
	}
	if err := model.DB.Create(plan).Error; err != nil {
		t.Fatalf("failed to create subscription plan: %v", err)
	}
	return plan
}

func setupSubscriptionOrderTestEnv(t *testing.T) {
	t.Helper()

	setupTopupControllerTestEnv(t)
	if err := model.DB.AutoMigrate(&model.SubscriptionPlan{}, &model.SubscriptionOrder{}, &model.UserSubscription{}); err != nil {
		t.Fatalf("failed to migrate subscription tables: %v", err)
	}
}

func TestGetTopUpInfoPrefersAlipayDirectOverLegacyAlipay(t *testing.T) {
	setupTopupControllerTestEnv(t)
	setupAlipaySettingIsolation(t)
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

func TestGetTopUpInfoDoesNotDuplicateAlipayDirect(t *testing.T) {
	setupTopupControllerTestEnv(t)
	setupAlipaySettingIsolation(t)

	operation_setting.PayMethods = []map[string]string{
		{
			"name": "支付宝",
			"type": "alipay",
		},
		{
			"name":      "支付宝直连",
			"type":      "alipay_direct",
			"min_topup": "3",
		},
	}
	setting.AlipayEnabled = true
	setting.AlipayAppID = "2026000000000000"
	setting.AlipayPrivateKey = "private-key"
	setting.AlipayPublicKey = "public-key"
	setting.AlipayMinTopUp = 3

	ctx, recorder := newTopupTestContext(t, "GET", "/api/user/topup/info", nil, 1)
	GetTopUpInfo(ctx)

	var response struct {
		Success bool `json:"success"`
		Data    struct {
			PayMethods []map[string]string `json:"pay_methods"`
		} `json:"data"`
	}
	if err := common.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if !response.Success {
		t.Fatalf("expected success response, got body: %s", recorder.Body.String())
	}

	alipayDirectCount := 0
	alipayCount := 0
	for _, method := range response.Data.PayMethods {
		switch method["type"] {
		case "alipay":
			alipayCount++
		case "alipay_direct":
			alipayDirectCount++
		}
	}
	if alipayCount != 0 {
		t.Fatalf("expected no legacy alipay in pay_methods, got body: %s", recorder.Body.String())
	}
	if alipayDirectCount != 1 {
		t.Fatalf("expected exactly one alipay_direct, got %d, body: %s", alipayDirectCount, recorder.Body.String())
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

func TestCompleteSubscriptionOrderSyncsMetadataToCreatedTopUp(t *testing.T) {
	setupSubscriptionOrderTestEnv(t)
	seedTopupUser(t, 1, "default")
	plan := seedSubscriptionPlan(t)

	order := &model.SubscriptionOrder{
		UserId:        1,
		PlanId:        plan.Id,
		Money:         7.2,
		TradeNo:       "SUB-ALIPAY-CREATE-1",
		PaymentMethod: "alipay_direct",
		PaymentMode:   "qr",
		Status:        common.TopUpStatusPending,
		CreateTime:    common.GetTimestamp(),
	}
	if err := model.DB.Create(order).Error; err != nil {
		t.Fatalf("failed to create subscription order: %v", err)
	}

	notifyPayload := `{"source":"notify"}`
	if err := model.CompleteSubscriptionOrder(order.TradeNo, notifyPayload); err != nil {
		t.Fatalf("failed to complete subscription order: %v", err)
	}

	var topUp model.TopUp
	if err := model.DB.First(&topUp, "trade_no = ?", order.TradeNo).Error; err != nil {
		t.Fatalf("failed to query topup: %v", err)
	}
	if topUp.PaymentMode != "qr" {
		t.Fatalf("expected payment_mode qr, got %q", topUp.PaymentMode)
	}
	if topUp.ProviderPayload != notifyPayload {
		t.Fatalf("expected provider_payload %s, got %s", notifyPayload, topUp.ProviderPayload)
	}

	var savedOrder model.SubscriptionOrder
	if err := model.DB.First(&savedOrder, "trade_no = ?", order.TradeNo).Error; err != nil {
		t.Fatalf("failed to query subscription order: %v", err)
	}
	if savedOrder.ProviderPayload != notifyPayload {
		t.Fatalf("expected subscription order provider_payload %s, got %s", notifyPayload, savedOrder.ProviderPayload)
	}
}

func TestCompleteSubscriptionOrderSyncsMetadataToExistingTopUp(t *testing.T) {
	setupSubscriptionOrderTestEnv(t)
	seedTopupUser(t, 1, "default")
	plan := seedSubscriptionPlan(t)

	orderPayload := `{"source":"order"}`
	order := &model.SubscriptionOrder{
		UserId:          1,
		PlanId:          plan.Id,
		Money:           8.8,
		TradeNo:         "SUB-ALIPAY-UPDATE-1",
		PaymentMethod:   "alipay_direct",
		PaymentMode:     "app",
		ProviderPayload: orderPayload,
		Status:          common.TopUpStatusPending,
		CreateTime:      common.GetTimestamp(),
	}
	if err := model.DB.Create(order).Error; err != nil {
		t.Fatalf("failed to create subscription order: %v", err)
	}

	existingTopUp := &model.TopUp{
		UserId:        1,
		Amount:        0,
		Money:         order.Money,
		TradeNo:       order.TradeNo,
		PaymentMethod: order.PaymentMethod,
		Status:        common.TopUpStatusPending,
		CreateTime:    order.CreateTime,
	}
	if err := model.DB.Create(existingTopUp).Error; err != nil {
		t.Fatalf("failed to create existing topup: %v", err)
	}

	if err := model.CompleteSubscriptionOrder(order.TradeNo, ""); err != nil {
		t.Fatalf("failed to complete subscription order: %v", err)
	}

	var topUp model.TopUp
	if err := model.DB.First(&topUp, "trade_no = ?", order.TradeNo).Error; err != nil {
		t.Fatalf("failed to query topup: %v", err)
	}
	if topUp.PaymentMode != "app" {
		t.Fatalf("expected payment_mode app, got %q", topUp.PaymentMode)
	}
	if topUp.ProviderPayload != orderPayload {
		t.Fatalf("expected provider_payload %s, got %s", orderPayload, topUp.ProviderPayload)
	}
}
