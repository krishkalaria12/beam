import Testing
import Foundation
@testable import SoulverWrapper

private func soulverResourcesPath() -> String {
    URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .appendingPathComponent("Vendor/SoulverCore-linux/SoulverCore_SoulverCore.resources")
        .path
}

private func decodeResult(_ pointer: UnsafeMutablePointer<CChar>?) throws -> SoulverResult {
    defer { free_string(ptr: pointer) }
    let raw = try #require(pointer)
    let json = String(cString: raw)
    return try JSONDecoder().decode(SoulverResult.self, from: Data(json.utf8))
}

@Test func resolvesSubstanceConversionQuery() throws {
    let resourcesPath = soulverResourcesPath()
    resourcesPath.withCString { pointer in
        initialize_soulver(resourcesPath: pointer)
    }

    let result = try decodeResult(
        "1 tbsp of honey in gram".withCString { pointer in
            evaluate(expression: pointer)
        }
    )

    #expect(result.error == nil)
    #expect(result.type.lowercased() != "none")
    #expect(result.value.isEmpty == false)
}
