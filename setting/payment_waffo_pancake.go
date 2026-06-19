package setting

// Waffo Pancake hosted checkout configuration. StoreID + ProductID are
// operator-bound via SaveWaffoPancakeConfig.
var (
	WaffoPancakeEnabled    bool = false
	WaffoPancakeMerchantID string
	WaffoPancakePrivateKey string
	WaffoPancakeReturnURL  string
	WaffoPancakeUnitPrice  float64 = 1.0
	WaffoPancakeMinTopUp   int     = 1
	WaffoPancakeStoreID    string
	WaffoPancakeProductID  string
)
