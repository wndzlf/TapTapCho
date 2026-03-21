import AppKit
import Foundation
import WebKit

guard CommandLine.arguments.count == 5 else {
  fputs("usage: swift render-svg-to-png.swift <input.svg> <output.png> <width> <height>\n", stderr)
  exit(1)
}

let inputPath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let width = Int(CommandLine.arguments[3]) ?? 0
let height = Int(CommandLine.arguments[4]) ?? 0

guard width > 0, height > 0 else {
  fputs("width and height must be positive integers\n", stderr)
  exit(1)
}

final class Renderer: NSObject, WKNavigationDelegate {
  private let webView: WKWebView
  private let outputURL: URL
  private let pixelSize: CGSize

  init(outputURL: URL, pixelSize: CGSize) {
    self.outputURL = outputURL
    self.pixelSize = pixelSize
    let configuration = WKWebViewConfiguration()
    self.webView = WKWebView(frame: CGRect(origin: .zero, size: pixelSize), configuration: configuration)
    super.init()
    self.webView.navigationDelegate = self
    self.webView.setValue(false, forKey: "drawsBackground")
  }

  func start(svgContent: String, baseURL: URL) {
    let cleaned = svgContent.replacingOccurrences(of: #"<\?xml[^>]*>\s*"#, with: "", options: .regularExpression)
    let html = """
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        html, body {
          margin: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          overflow: hidden;
        }

        body > svg {
          display: block;
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>\(cleaned)</body>
    </html>
    """

    self.webView.loadHTMLString(html, baseURL: baseURL)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
      let config = WKSnapshotConfiguration()
      config.rect = CGRect(origin: .zero, size: self.pixelSize)
      config.snapshotWidth = NSNumber(value: Float(self.pixelSize.width))

      webView.takeSnapshot(with: config) { image, error in
        if let error {
          fputs("snapshot error: \(error)\n", stderr)
          exit(1)
        }

        guard let image else {
          fputs("snapshot failed\n", stderr)
          exit(1)
        }

        guard
          let bitmap = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: Int(self.pixelSize.width),
            pixelsHigh: Int(self.pixelSize.height),
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
          )
        else {
          fputs("failed to create bitmap\n", stderr)
          exit(1)
        }

        bitmap.size = self.pixelSize

        NSGraphicsContext.saveGraphicsState()
        if let context = NSGraphicsContext(bitmapImageRep: bitmap) {
          NSGraphicsContext.current = context
          image.draw(
            in: CGRect(origin: .zero, size: self.pixelSize),
            from: CGRect(origin: .zero, size: image.size),
            operation: .copy,
            fraction: 1.0
          )
          context.flushGraphics()
        }
        NSGraphicsContext.restoreGraphicsState()

        guard let png = bitmap.representation(using: .png, properties: [:]) else {
          fputs("failed to encode png\n", stderr)
          exit(1)
        }

        do {
          try png.write(to: self.outputURL)
          print("wrote \(self.outputURL.path)")
          exit(0)
        } catch {
          fputs("write error: \(error)\n", stderr)
          exit(1)
        }
      }
    }
  }
}

_ = NSApplication.shared
NSApp.setActivationPolicy(.prohibited)

let inputURL = URL(fileURLWithPath: inputPath)
let outputURL = URL(fileURLWithPath: outputPath)
let svg = try String(contentsOf: inputURL, encoding: .utf8)
let renderer = Renderer(outputURL: outputURL, pixelSize: CGSize(width: width, height: height))

renderer.start(svgContent: svg, baseURL: inputURL.deletingLastPathComponent())
RunLoop.main.run()
