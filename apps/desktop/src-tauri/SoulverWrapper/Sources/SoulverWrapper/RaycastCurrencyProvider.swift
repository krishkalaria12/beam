import Foundation
import FoundationNetworking
import SoulverCore

private struct CurrencyLayerResponse: Codable {
    let success: Bool
    let source: String
    let quotes: [String: Double]
}

private struct CryptoCoinLayerResponse: Codable {
    let success: Bool
    let target: String
    let rates: [String: Double]
}

class RaycastCurrencyProvider: CurrencyRateProvider {

    private actor RateManager {
        private(set) var rates: [String: Decimal] = [:]
        private var isUpdating = false
        
        private let standardCurrenciesURL = URL(string: "https://backend.raycast.com/api/v1/currencies")!
        private let cryptoSymbols: [String] = ["BTC", "ETH", "SOL", "DOGE", "LTC", "XRP"]
        
        private var cryptoCurrenciesURL: URL {
            let symbolsString = cryptoSymbols.joined(separator: ",")
            return URL(string: "https://backend.raycast.com/api/v1/currencies/crypto?symbols=\(symbolsString)")!
        }

        func getRate(for code: String) -> Decimal? {
            rates[code]
        }

        func updateRates() async {
            guard !isUpdating else { return }
            isUpdating = true
            defer { isUpdating = false }

            async let standardRatesTask = fetchStandardRates()
            async let cryptoRatesTask = fetchCryptoRates()
            
            let (standardRates, cryptoRates) = await (standardRatesTask, cryptoRatesTask)
            
            var allRates = [String: Decimal]()
            allRates["USD"] = 1.0
            
            if let standardRates {
                for (key, value) in standardRates {
                    allRates[key] = Decimal(value)
                }
            }
            
            if let cryptoRates {
                for (key, value) in cryptoRates {
                    if value > 0 {
                        allRates[key] = 1.0 / Decimal(value)
                    }
                }
            }
            
            if !allRates.isEmpty && allRates.count > 1 {
                self.rates = allRates
            }
        }

        private func fetchStandardRates() async -> [String: Double]? {
            do {
                let (data, _) = try await URLSession.shared.data(from: standardCurrenciesURL)
                let response = try JSONDecoder().decode(CurrencyLayerResponse.self, from: data)
                guard response.success, response.source == "USD" else { return nil }
                
                var processedQuotes = [String: Double]()
                for (key, value) in response.quotes {
                    if key.hasPrefix("USD") {
                        let currencyCode = String(key.dropFirst(3))
                        processedQuotes[currencyCode] = value
                    }
                }
                return processedQuotes
            } catch {
                return nil
            }
        }
        
        private func fetchCryptoRates() async -> [String: Double]? {
            do {
                let (data, _) = try await URLSession.shared.data(from: cryptoCurrenciesURL)
                let response = try JSONDecoder().decode(CryptoCoinLayerResponse.self, from: data)
                guard response.success, response.target == "USD" else { return nil }
                return response.rates
            } catch {
                return nil
            }
        }
    }
    
    private let fallbackProvider: (any CurrencyRateProvider)?
    private let rateManager = RateManager()
    private let timerQueue = DispatchQueue(label: "app.beam.soulver.currency-updates", qos: .utility)
    private var updateTimer: DispatchSourceTimer?

    init(fallbackProvider: (any CurrencyRateProvider)? = nil) {
        self.fallbackProvider = fallbackProvider
    }

    public func startUpdating() {
        updateTimer?.cancel()
        updateTimer = nil

        let initialUpdateManager = self.rateManager
        Task.detached(priority: .utility) {
            await initialUpdateManager.updateRates()
        }

        let timerManager = self.rateManager
        let timer = DispatchSource.makeTimerSource(queue: timerQueue)
        timer.schedule(deadline: .now() + 3600, repeating: 3600)
        timer.setEventHandler {
            Task.detached(priority: .utility) {
                await timerManager.updateRates()
            }
        }
        updateTimer = timer
        timer.resume()
    }

    func rateFor(request: CurrencyRateRequest) -> Decimal? {
        let targetCode = request.currencyCode
        
        if targetCode == "USD" {
            return 1.0
        }

        let semaphore = DispatchSemaphore(value: 0)
        var rate: Decimal?

        let manager = self.rateManager
        Task.detached(priority: .utility) {
            rate = await manager.getRate(for: targetCode)
            semaphore.signal()
        }
        
        semaphore.wait()

        return rate ?? fallbackProvider?.rateFor(request: request)
    }

    func fetchRateInBackgroundFor(request: CurrencyRateRequest) async -> Decimal? {
        if let fallbackProvider {
            return await fallbackProvider.fetchRateInBackgroundFor(request: request)
        }

        return nil
    }
}
