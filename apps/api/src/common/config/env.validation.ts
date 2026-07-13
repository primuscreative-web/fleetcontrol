import { serverEnvSchema } from "@fleetcontrol/config";

export function validateEnv(config: Record<string, unknown>) {
  return serverEnvSchema.parse(config);
}
