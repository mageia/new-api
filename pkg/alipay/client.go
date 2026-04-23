package alipay

import (
	"context"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"
	sdk "github.com/smartwalle/alipay/v3"
)

const (
	PayModePage = "page"
	PayModeQR   = "qr"
)

type Config struct {
	AppID                        string
	PrivateKey                   string
	PublicKey                    string
	Sandbox                      bool
	DefaultNotifyURL             string
	DefaultReturnURL             string
	DefaultSubscriptionReturnURL string
	DefaultOrderDescription      string
}

type CreateOrderRequest struct {
	OutTradeNo  string
	Subject     string
	TotalAmount decimal.Decimal
	NotifyURL   string
	ReturnURL   string
}

type PageOrderResponse struct {
	PayURL string
}

type QROrderResponse struct {
	QRCode  string
	TradeNo string
}

type QueryOrderResult struct {
	OutTradeNo     string
	TradeNo        string
	TradeStatus    string
	TotalAmount    decimal.Decimal
	BuyerPayAmount decimal.Decimal
}

type NotificationResult struct {
	OutTradeNo     string
	TradeNo        string
	TradeStatus    string
	TotalAmount    decimal.Decimal
	BuyerPayAmount decimal.Decimal
	RawForm        string
}

type Client interface {
	CreatePageOrder(ctx context.Context, req CreateOrderRequest) (*PageOrderResponse, error)
	CreateQROrder(ctx context.Context, req CreateOrderRequest) (*QROrderResponse, error)
	QueryOrder(ctx context.Context, outTradeNo string) (*QueryOrderResult, error)
	VerifyNotification(values map[string]string) (*NotificationResult, error)
}

type sdkClient struct {
	cfg Config
	cli *sdk.Client
}

var _ Client = (*sdkClient)(nil)

func (c Config) Validate() error {
	if strings.TrimSpace(c.AppID) == "" || strings.TrimSpace(c.PrivateKey) == "" || strings.TrimSpace(c.PublicKey) == "" {
		return fmt.Errorf("alipay config is incomplete")
	}
	return nil
}

func NormalizePayMode(value string) (string, error) {
	switch strings.TrimSpace(value) {
	case PayModePage:
		return PayModePage, nil
	case PayModeQR:
		return PayModeQR, nil
	default:
		return "", fmt.Errorf("invalid alipay pay mode: %s", value)
	}
}

func NewClient(cfg Config) (Client, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	cli, err := sdk.New(cfg.AppID, cfg.PrivateKey, !cfg.Sandbox)
	if err != nil {
		return nil, err
	}
	if err := cli.LoadAliPayPublicKey(cfg.PublicKey); err != nil {
		return nil, err
	}
	return &sdkClient{cfg: cfg, cli: cli}, nil
}

func (c *sdkClient) CreatePageOrder(ctx context.Context, req CreateOrderRequest) (*PageOrderResponse, error) {
	return nil, fmt.Errorf("create page order is not implemented")
}

func (c *sdkClient) CreateQROrder(ctx context.Context, req CreateOrderRequest) (*QROrderResponse, error) {
	return nil, fmt.Errorf("create qr order is not implemented")
}

func (c *sdkClient) QueryOrder(ctx context.Context, outTradeNo string) (*QueryOrderResult, error) {
	return nil, fmt.Errorf("query order is not implemented")
}

func (c *sdkClient) VerifyNotification(values map[string]string) (*NotificationResult, error) {
	return nil, fmt.Errorf("verify notification is not implemented")
}
