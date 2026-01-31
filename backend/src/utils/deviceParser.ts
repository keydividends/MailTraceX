// deviceParser.ts
// Parse user-agent strings to extract device/browser info
export function parseUserAgent(ua: string) {
  return { raw: ua };
}

export default parseUserAgent;
