/**
 * Target URL Validation and SSRF Protection Layer.
 * Prevents scanning loopback, cloud metadata endpoints, and internal private subnets.
 */

export interface UrlValidationResult {
  isValid: boolean;
  formattedUrl?: string;
  error?: string;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
]);

const BLOCKED_EXTENSIONS = ['.local', '.internal', '.lan', '.home', '.corp'];

/**
 * Checks if an IPv4 address falls within a private or restricted CIDR block.
 */
function isRestrictedIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

/**
 * Validates a target URL against SSRF and protocol restrictions.
 */
export function validateTargetUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Target URL is required.' };
  }

  let trimmed = rawUrl.trim();

  // If a scheme is specified, verify that it is strictly http or https
  const protocolMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (protocolMatch) {
    const scheme = protocolMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return {
        isValid: false,
        error: `Protocol '${scheme}:' is not allowed. Only HTTP and HTTPS are permitted.`,
      };
    }
  } else {
    // Default to https if no protocol was provided (e.g. 'example.com')
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: `Protocol '${parsed.protocol}' is not allowed. Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Allow local development overrides if explicitly specified in environment
  const allowLocal = process.env.ALLOW_LOCAL_TARGETS === 'true';

  if (!allowLocal) {
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return {
        isValid: false,
        error: `Target '${hostname}' is restricted for security (SSRF prevention).`,
      };
    }

    if (BLOCKED_EXTENSIONS.some(ext => hostname.endsWith(ext))) {
      return {
        isValid: false,
        error: `Internal domain '${hostname}' cannot be audited.`,
      };
    }

    if (isRestrictedIp(hostname)) {
      return {
        isValid: false,
        error: `Private or loopback IP '${hostname}' is restricted for security.`,
      };
    }
  }

  return {
    isValid: true,
    formattedUrl: parsed.toString(),
  };
}
