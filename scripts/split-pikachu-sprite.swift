import AppKit
import Foundation

let arguments = CommandLine.arguments

guard arguments.count == 3 else {
  fatalError("Usage: split-pikachu-sprite.swift input.png output-directory")
}

let inputURL = URL(fileURLWithPath: arguments[1])
let outputURL = URL(fileURLWithPath: arguments[2], isDirectory: true)

guard
  let image = NSImage(contentsOf: inputURL),
  let source = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  fatalError("Could not read source sprite")
}

let columns = 4
let rows = 4
let cellWidth = source.width / columns
let cellHeight = source.height / rows

try FileManager.default.createDirectory(
  at: outputURL,
  withIntermediateDirectories: true
)

for row in 0..<rows {
  for column in 0..<columns {
    let cropRect = CGRect(
      x: column * cellWidth,
      y: source.height - (row + 1) * cellHeight,
      width: cellWidth,
      height: cellHeight
    )

    guard let cropped = source.cropping(to: cropRect) else {
      fatalError("Could not crop row \(row), column \(column)")
    }

    let representation = NSBitmapImageRep(cgImage: cropped)
    guard let png = representation.representation(using: .png, properties: [:]) else {
      fatalError("Could not encode row \(row), column \(column)")
    }

    let number = row * columns + column + 1
    let filename = String(format: "tile_%02d.png", number)
    try png.write(to: outputURL.appendingPathComponent(filename))
  }
}
