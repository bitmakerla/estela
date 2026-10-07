// With AUTH_MODE=oidc, signing in and out happen at the gateway in front of estela (oauth2-proxy's
// paths): full-page navigations, not API calls. Signing in comes back to the page it started from.
export const signIn = (): void =>
    window.location.assign("/oauth2/start?rd=" + encodeURIComponent(window.location.pathname + window.location.search));

export const signOut = (): void => window.location.assign("/oauth2/sign_out?rd=%2F");
