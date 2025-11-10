import { WebSocketServer, WebSocket } from "ws";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";

console.log("🔧 WebSocket Bridge starting...");
console.log("� R2 configuration will be provided via LSP initialization options");

const wss = new WebSocketServer({ port: 3001 });

// Store R2 configuration received from client
interface R2Config {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
}

console.log("🚀 LSP WebSocket Bridge starting on port 3001...");

wss.on("connection", (ws: WebSocket) => {
  console.log("🔌 LSP WebSocket client connected");

  // Path to your compiled language server
  const serverPath = join(__dirname, "language-server.js");
  
  let serverProcess: ChildProcess | null = null;
  let r2Config: R2Config = {};
  let serverInitialized = false;

  // Bridge WebSocket messages to LSP server stdin
  // LSP protocol requires Content-Length header format
  ws.on("message", (data: Buffer) => {
    const rawMessage = data.toString("utf8");
    console.log(
      "📨 Received message from client:",
      rawMessage.substring(0, 150)
    );
    
    // Try to parse the message to intercept initialization
    try {
      const jsonMessage = rawMessage.trim();
      const message = JSON.parse(jsonMessage);
      
      // Intercept initialize request to extract R2 config
      if (message.method === "initialize" && message.params?.initializationOptions) {
        r2Config = message.params.initializationOptions;
        console.log("🔑 R2 Config received from client:");
        console.log("  - R2_BUCKET_NAME:", r2Config.R2_BUCKET_NAME || "(not provided)");
        console.log("  - R2_ACCOUNT_ID:", r2Config.R2_ACCOUNT_ID || "(not provided)");
        console.log("  - R2_ACCESS_KEY_ID:", r2Config.R2_ACCESS_KEY_ID ? "***" + r2Config.R2_ACCESS_KEY_ID.slice(-4) : "(not provided)");
        console.log("  - R2_SECRET_ACCESS_KEY:", r2Config.R2_SECRET_ACCESS_KEY ? "***" + r2Config.R2_SECRET_ACCESS_KEY.slice(-4) : "(not provided)");
        
        // Start the LSP server now that we have config
        if (!serverProcess) {
          console.log(`📁 Starting LSP server: ${serverPath}`);
          
          // Start server WITHOUT R2 env vars - it will get config from initialize params
          serverProcess = spawn("node", [serverPath, "--stdio"], {
            stdio: ["pipe", "pipe", "pipe"],
            env: process.env,
          });
          
          setupServerHandlers(serverProcess);
          serverInitialized = true;
        }
      }
    } catch (e) {
      // Not JSON or failed to parse, ignore
    }
    
    // Wait for server to be initialized before forwarding messages
    if (!serverProcess) {
      console.warn("⚠️ Server not yet started, buffering message");
      return;
    }
    
    if (!serverProcess.stdin || !serverProcess.stdin.writable) {
      console.error("❌ Server stdin not writable");
      return;
    }

    // Check if message already has Content-Length header
    if (rawMessage.startsWith("Content-Length:")) {
      // Already formatted, send as-is
      serverProcess.stdin.write(rawMessage);
    } else {
      // monaco-languageclient sends pure JSON, add Content-Length header
      try {
        const jsonMessage = rawMessage.trim();
        // Validate it's JSON
        JSON.parse(jsonMessage);
        
        const contentLength = Buffer.byteLength(jsonMessage, "utf8");
        const formattedMessage = `Content-Length: ${contentLength}\r\n\r\n${jsonMessage}`;
        
        console.log(`📝 Added Content-Length: ${contentLength} bytes`);
        serverProcess.stdin!.write(formattedMessage, "utf8");
      } catch (error) {
        console.error("❌ Invalid JSON from client:", error);
        console.error("Raw message:", rawMessage);
      }
    }
  });

  // Setup server process handlers
  const setupServerHandlers = (proc: ChildProcess) => {
    // Buffer for accumulating stdout from LSP server
    let stdoutBuffer = "";

    // Bridge LSP server stdout to WebSocket
    // LSP server sends messages with Content-Length headers that need to be preserved or stripped
    proc.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stdoutBuffer += chunk;

      // Process complete messages (those with Content-Length header)
      while (true) {
        const headerMatch = stdoutBuffer.match(/Content-Length: (\d+)\r\n\r\n/);
        if (!headerMatch) {
          break;
        }

        const contentLength = parseInt(headerMatch[1], 10);
        const headerLength = headerMatch[0].length;
        const messageStart = stdoutBuffer.indexOf(headerMatch[0]) + headerLength;
        const messageEnd = messageStart + contentLength;

        // Check if we have the complete message
        if (stdoutBuffer.length >= messageEnd) {
          const jsonMessage = stdoutBuffer.substring(messageStart, messageEnd);
          
          // Log full message for debugging (truncate only for very long messages)
          const logMessage = jsonMessage.length > 500 
            ? jsonMessage.substring(0, 500) + "... (truncated)"
            : jsonMessage;
          console.log("📤 Sending message to client:", logMessage);
          
          if (ws.readyState === WebSocket.OPEN) {
            // Send ONLY the JSON payload (monaco-languageclient handles protocol framing)
            ws.send(jsonMessage);
          }

          // Remove processed message from buffer
          stdoutBuffer = stdoutBuffer.substring(messageEnd);
        } else {
          // Incomplete message, wait for more data
          break;
        }
      }
    });

    // Log errors from LSP server
    proc.stderr?.on("data", (data: Buffer) => {
      console.error("❌ LSP Server Error:", data.toString());
    });

    // Handle cleanup
    proc.on("close", (code) => {
      console.log(`🔚 LSP server process exited with code ${code}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    proc.on("error", (error) => {
      console.error("❌ Failed to start LSP server:", error);
      ws.close();
    });
  };

  // Handle WebSocket cleanup
  ws.on("close", () => {
    console.log("🔌 LSP WebSocket client disconnected");
    if (serverProcess) {
      serverProcess.kill();
    }
  });
});

wss.on("listening", () => {
  console.log("✅ LSP WebSocket Bridge is running on ws://localhost:3001");
  console.log("💡 Start your frontend and connect to this WebSocket");
});

wss.on("error", (error) => {
  console.error("❌ WebSocket server error:", error);
});
