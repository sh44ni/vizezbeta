const globalAny = global as any;
if (!globalAny.ropSessions) {
  globalAny.ropSessions = new Map<string, any>();
}
export const sessions = globalAny.ropSessions;
