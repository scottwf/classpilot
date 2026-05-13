type CookiePolicyInput = {
  appUrl?: string;
  cookieSecure?: string;
  nodeEnv?: string;
};

export function shouldUseSecureCookies({
  appUrl,
  cookieSecure,
}: CookiePolicyInput): boolean {
  if (cookieSecure === "true") {
    return true;
  }

  if (cookieSecure === "false") {
    return false;
  }

  return appUrl?.startsWith("https://") ?? false;
}
