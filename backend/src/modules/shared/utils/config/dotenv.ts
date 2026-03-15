import { config } from "dotenv";
import * as path from "path";

export const getBaseEnvPath = (nodeEnv: string | undefined) =>
  nodeEnv === "test" ? ".env.test" : ".env";

// Initializing dotenv. The path is relative to the working directory, which
// is the backend folder in every way the app runs (yarn scripts, Docker
// entrypoints, Jest): relative to this file it would differ between src/
// and the build output in dist/src/
const envPath: string = path.resolve(
  process.cwd(),
  getBaseEnvPath(process.env.NODE_ENV),
);
config({ path: envPath });
