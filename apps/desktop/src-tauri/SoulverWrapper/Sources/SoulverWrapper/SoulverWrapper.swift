import SoulverCore
import Foundation

struct SoulverResult: Codable {
    let value: String
    let type: String
    let error: String?

    init(value: String, type: String, error: String? = nil) {
        self.value = value
        self.type = type
        self.error = error
    }
}

private let calculatorQueue = DispatchQueue(label: "app.beam.soulver.calculator")
nonisolated(unsafe) private var globalCalculator: Calculator?

@_cdecl("initialize_soulver")
public func initialize_soulver(resourcesPath: UnsafePointer<CChar>) {
    let pathString = String(cString: resourcesPath)
    calculatorQueue.sync {
        guard globalCalculator == nil else {
            return
        }

        let resourcesURL = URL(fileURLWithPath: pathString)

        guard SoulverCore.ResourceBundle(url: resourcesURL) != nil else {
            return
        }

        var customization = EngineCustomization.standard
        let fallbackCurrencyProvider = customization.currencyRateProvider

        let currencyProvider = RaycastCurrencyProvider(fallbackProvider: fallbackCurrencyProvider)
        customization.currencyRateProvider = currencyProvider

        currencyProvider.startUpdating()

        globalCalculator = Calculator(customization: customization)
    }
}

@_cdecl("evaluate")
public func evaluate(expression: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>? {
    let encoder = JSONEncoder()
    let swiftExpression = String(cString: expression)

    return calculatorQueue.sync {
        guard let calculator = globalCalculator else {
            let errorMsg = "Error: SoulverCore not initialized. Call initialize_soulver() first."
            let errorResult = SoulverResult(value: "", type: "error", error: errorMsg)
            if let jsonData = try? encoder.encode(errorResult), let jsonString = String(data: jsonData, encoding: .utf8) {
                return strdup(jsonString)
            }
            return nil
        }

        if swiftExpression.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let emptyResult = SoulverResult(value: "", type: "none", error: nil)
            if let jsonData = try? encoder.encode(emptyResult), let jsonString = String(data: jsonData, encoding: .utf8) {
                return strdup(jsonString)
            }
            return nil
        }

        let result = calculator.calculate(swiftExpression)

        if result.isEmptyResult {
             let emptyResult = SoulverResult(value: "", type: "none", error: nil)
             if let jsonData = try? encoder.encode(emptyResult), let jsonString = String(data: jsonData, encoding: .utf8) {
                 return strdup(jsonString)
             }
             return nil
        }

        let soulverResult = SoulverResult(value: result.stringValue, type: formatResult(result: result.evaluationResult, customization: calculator.customization))

        if let jsonData = try? encoder.encode(soulverResult),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            return strdup(jsonString)
        }

        let errorMsg = "Failed to encode Soulver result to JSON."
        let errorResult = SoulverResult(value: "", type: "error", error: errorMsg)
        if let jsonData = try? encoder.encode(errorResult), let jsonString = String(data: jsonData, encoding: .utf8) {
            return strdup(jsonString)
        }
        return nil
    }
}

@_cdecl("free_string")
public func free_string(ptr: UnsafeMutablePointer<CChar>?) {
    free(ptr)
}
