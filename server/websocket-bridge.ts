import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import { join } from "path";

const wss = new WebSocketServer({ port: 3001 });

console.log("🚀 LSP WebSocket Bridge starting on port 3001...");

wss.on("connection", (ws: WebSocket) => {
  console.log("🔌 LSP WebSocket client connected");

  // Path to your compiled language server
  const serverPath = join(__dirname, "language-server.js");

  console.log(`📁 Starting LSP server: ${serverPath}`);

  // Spawn your existing language server as a child process
  const serverProcess = spawn("node", [serverPath, "--stdio"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Bridge WebSocket messages to LSP server stdin
  ws.on("message", (data: Buffer) => {
    console.log(
      "📨 Received message from client:",
      data.toString().substring(0, 100)
    );
    if (serverProcess.stdin.writable) {
      serverProcess.stdin.write(data);
    }
  });

  // Bridge LSP server stdout to WebSocket
  serverProcess.stdout.on("data", (data: Buffer) => {
    console.log(
      "📤 Sending message to client:",
      data.toString().substring(0, 100)
    );
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  // Log errors from LSP server
  serverProcess.stderr.on("data", (data: Buffer) => {
    console.error("❌ LSP Server Error:", data.toString());
  });

  // Handle cleanup
  ws.on("close", () => {
    console.log("🔌 LSP WebSocket client disconnected");
    serverProcess.kill();
  });

  serverProcess.on("close", (code) => {
    console.log(`🔚 LSP server process exited with code ${code}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  serverProcess.on("error", (error) => {
    console.error("❌ Failed to start LSP server:", error);
    ws.close();
  });
});

wss.on("listening", () => {
  console.log("✅ LSP WebSocket Bridge is running on ws://localhost:3001");
  console.log("💡 Start your frontend and connect to this WebSocket");
});

wss.on("error", (error) => {
  console.error("❌ WebSocket server error:", error);
});
