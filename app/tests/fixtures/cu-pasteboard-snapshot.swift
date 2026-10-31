// Live-test helper (tests/computer-use-clipboard-live.test.mjs): saves the general pasteboard — every item, every type,
// as raw data — to a file and puts it back exactly, so a test that pastes leaves the user's clipboard as it found it,
// images and rich text included. `hash` prints a SHA-256 of all items (never their contents).
//   cu-pasteboard-snapshot save <file> | restore <file> | hash
import AppKit
import CryptoKit

let board = NSPasteboard.general

func items() -> [[String: Data]] {
    (board.pasteboardItems ?? []).map { item in
        var types: [String: Data] = [:]
        for type in item.types { if let data = item.data(forType: type) { types[type.rawValue] = data } }
        return types
    }
}

func digest(_ list: [[String: Data]]) -> String {
    var hasher = SHA256()
    for item in list {
        for key in item.keys.sorted() {
            hasher.update(data: Data(key.utf8))
            hasher.update(data: item[key]!)
        }
        hasher.update(data: Data([0]))
    }
    return hasher.finalize().map { String(format: "%02x", $0) }.joined()
}

let args = CommandLine.arguments
switch args.count > 1 ? args[1] : "" {
case "save" where args.count > 2:
    let data = try PropertyListSerialization.data(fromPropertyList: items(), format: .binary, options: 0)
    FileManager.default.createFile(atPath: args[2], contents: data, attributes: [.posixPermissions: 0o600])
    print(digest(items()))
case "restore" where args.count > 2:
    let data = try Data(contentsOf: URL(fileURLWithPath: args[2]))
    let list = try PropertyListSerialization.propertyList(from: data, format: nil) as? [[String: Data]] ?? []
    board.clearContents()
    let restored: [NSPasteboardItem] = list.map { types in
        let item = NSPasteboardItem()
        for (type, value) in types { item.setData(value, forType: NSPasteboard.PasteboardType(type)) }
        return item
    }
    if !restored.isEmpty { board.writeObjects(restored) }
    print(digest(items()))
case "hash":
    print(digest(items()))
default:
    FileHandle.standardError.write("usage: cu-pasteboard-snapshot save <file> | restore <file> | hash\n".data(using: .utf8)!)
    exit(2)
}
