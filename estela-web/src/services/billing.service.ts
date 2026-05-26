import { API_BASE_URL, BILLING_APP, isBillingEnabled } from "../constants";
import { AuthService } from "./auth.service";

function billingUserUrl(username: string): string {
    return `${API_BASE_URL}/${BILLING_APP}/users/${encodeURIComponent(username)}`;
}

export interface CreditsWallet {
    balance_cents: number;
    currency: string;
}

export interface BillingUser {
    username: string;
    email: string;
    is_admin: boolean;
    credits_wallet?: CreditsWallet;
}

export function formatWalletBalance(cents: number, currency = "usd"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(cents / 100);
}

const userCache = new Map<string, BillingUser | null>();
const userRequests = new Map<string, Promise<BillingUser | null>>();

export const BillingService = {
    clearCache(): void {
        userCache.clear();
        userRequests.clear();
    },

    async fetchUser(username: string): Promise<BillingUser | null> {
        if (!isBillingEnabled()) {
            return null;
        }

        if (userCache.has(username)) {
            return userCache.get(username) ?? null;
        }

        let request = userRequests.get(username);
        if (!request) {
            request = (async (): Promise<BillingUser | null> => {
                try {
                    const response = await fetch(billingUserUrl(username), {
                        headers: AuthService.getDefaultAuthHeaders(),
                    });
                    const user = response.ok ? await response.json() : null;
                    userCache.set(username, user);
                    return user;
                } finally {
                    userRequests.delete(username);
                }
            })();
            userRequests.set(username, request);
        }

        return request;
    },

    async fetchCurrentUserWallet(): Promise<CreditsWallet | null> {
        const username = AuthService.getUserUsername();
        if (!username) {
            return null;
        }
        const user = await this.fetchUser(username);
        return user?.credits_wallet ?? null;
    },
};
