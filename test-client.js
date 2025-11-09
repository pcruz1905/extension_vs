import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3001");

ws.on("open", () => {
  console.log("✅ Connected to LSP WebSocket bridge");

  // Example: Send an LSP-style initialize request
  const initializeRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: process.pid,
      rootUri: null,
      capabilities: {},
    },
  });

  // LSP messages need a Content-Length header
  const message = `Content-Length: ${Buffer.byteLength(
    initializeRequest,
    "utf8"
  )}\r\n\r\n${initializeRequest}`;
  console.log("📨 Sending test initialize request...");
  ws.send(message);
});

ws.on("message", (data) => {
  console.log("📥 Received from server:");
  console.log(data.toString());
});

ws.on("close", () => {
  console.log("🔌 Disconnected from server");
});

ws.on("error", (err) => {
  console.error("❌ WebSocket error:", err);
});
