package alipay

import (
	"fmt"
	"net/url"
	"sort"
	"strings"

	"github.com/shopspring/decimal"
)

func ParseNotification(values url.Values) (*NotificationResult, error) {
	if strings.TrimSpace(values.Get("sign")) == "" {
		return nil, fmt.Errorf("missing alipay sign")
	}
	if strings.TrimSpace(values.Get("out_trade_no")) == "" {
		return nil, fmt.Errorf("missing out_trade_no")
	}

	result := &NotificationResult{
		OutTradeNo:  values.Get("out_trade_no"),
		TradeNo:     values.Get("trade_no"),
		TradeStatus: values.Get("trade_status"),
		RawForm:     normalizeValues(values),
	}

	if total := values.Get("total_amount"); total != "" {
		amount, err := decimal.NewFromString(total)
		if err != nil {
			return nil, err
		}
		result.TotalAmount = amount
	}

	if paid := values.Get("buyer_pay_amount"); paid != "" {
		amount, err := decimal.NewFromString(paid)
		if err != nil {
			return nil, err
		}
		result.BuyerPayAmount = amount
	}

	return result, nil
}

func (r NotificationResult) ValidatePaid() error {
	if r.TradeStatus != "TRADE_SUCCESS" && r.TradeStatus != "TRADE_FINISHED" {
		return fmt.Errorf("unexpected trade status: %s", r.TradeStatus)
	}
	if !r.TotalAmount.GreaterThan(decimal.Zero) {
		return fmt.Errorf("invalid total amount")
	}
	return nil
}

func normalizeValues(values url.Values) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	pairs := make([]string, 0, len(keys))
	for _, key := range keys {
		pairs = append(pairs, fmt.Sprintf("%s=%s", key, values.Get(key)))
	}
	return strings.Join(pairs, "&")
}
