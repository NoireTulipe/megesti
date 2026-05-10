import React

@objc(SumUp)
class SumUpModule: RCTEventEmitter {

  override static func moduleName() -> String! {
    return "SumUp"
  }

  override func supportedEvents() -> [String]! { return [] }

  // MARK: - init

  @objc
  func `init`(_ affiliateKey: String, resolver resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    // SumUpSDK.init(withAffiliateKey: affiliateKey) — nécessite SumUpSDK pod
    // Pour l'instant : placeholder
    resolve(true)
  }

  // MARK: - login

  @objc
  func login(_ token: String, resolver resolve: @escaping RCTPromiseResolveBlock,
             rejecter reject: @escaping RCTPromiseRejectBlock) {
    // SumUpSDK.login(withToken: token) { success, error in ... }
    resolve(true)
  }

  // MARK: - checkout

  @objc
  func checkout(_ amount: Double, currency: String, title: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    // let request = CheckoutRequest(total: NSDecimalNumber(value: amount),
    //                                title: title, currencyCode: currency)
    // SumUpSDK.checkout(request: request) { result, error in ... }
    let result: [String: Any] = [
      "success": false,
      "errorCode": "NOT_IMPLEMENTED",
      "message": "SumUp iOS SDK — à brancher après ajout du pod SumUpSDK"
    ]
    resolve(result)
  }

  // MARK: - isReady

  @objc
  func isReady(_ resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
    // SumUpSDK.isReady
    resolve(false)
  }

  // MARK: - logout

  @objc
  func logout(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    // SumUpSDK.logout { success, error in ... }
    resolve(nil)
  }
}
