package wechatpay

import "fmt"

func (r *NotifyResult) ValidateBusinessFields(appID, mchID string) error {
	if r == nil {
		return fmt.Errorf("notify result is nil")
	}
	if r.Currency != "CNY" {
		return fmt.Errorf("unexpected currency: %s", r.Currency)
	}
	if r.AppID != appID || r.MchID != mchID {
		return fmt.Errorf("appid or mchid mismatch")
	}
	return nil
}
