import { createAppServer } from "./server.js";

const port = Number(process.env.PORT ?? "8787");

const server = createAppServer();
server.listen(port, () => {
  console.log(`itineraryAI-interview listening on http://localhost:${port}`);
  console.log(`POST /generate  GET /health`);
});
