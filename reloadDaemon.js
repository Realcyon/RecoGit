import { WebSocketServer } from "ws";
import chokidar from "chokidar";

const wss = new WebSocketServer({ port: 8080 });

chokidar.watch(["views", "public"]).on("all", (ev, path) => {
  wss.clients.forEach(w => w.send("r"));
})

wss.on('connection', (ws) => {
  ws.on('error', log);
});

function log(msg) {
  console.log("[reloadD]" + msg);
}

