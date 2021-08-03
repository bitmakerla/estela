const TOKEN_ITEM_NAME = "authToken";

export const AuthService = {
    getAuthToken(): string | null {
        return localStorage.getItem(TOKEN_ITEM_NAME);
    },
    removeAuthToken(): void {
        localStorage.removeItem(TOKEN_ITEM_NAME);
    },
    setAuthToken(token: string): void {
        localStorage.setItem(TOKEN_ITEM_NAME, token);
    },
    getDefaultAuthHeaders(): { Authorization: string } | Record<string, never> {
        const token = this.getAuthToken();
        if (!token) {
            return {};
        }
        return { Authorization: `Token ${token}` };
    },
};
