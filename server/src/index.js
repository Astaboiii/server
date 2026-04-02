import "dotenv/config";
import app from "./app.js";
import { ensureAdminSeed } from "./services/userService.js";

const port = process.env.PORT || 4000;

ensureAdminSeed()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
