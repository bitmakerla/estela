export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
export const ESTELA_PROXIES = process.env.ESTELA_PROXIES ? process.env.ESTELA_PROXIES : "Estela Proxy";
export const REGISTER_PAGE_ENABLED = process.env.REGISTER_PAGE_ENABLED === "true";
export const DEFAULT_RESOURCE_TIER = "LARGE";

export const PREDEFINED_TIERS = [
    { name: "TINY", memLimit: "128Mi" },
    { name: "XSMALL", memLimit: "256Mi" },
    { name: "SMALL", memLimit: "512Mi" },
    { name: "MEDIUM", memLimit: "1Gi" },
    { name: "LARGE", memLimit: "1536Mi" },
    { name: "XLARGE", memLimit: "2Gi" },
    { name: "HUGE", memLimit: "4Gi" },
    { name: "XHUGE", memLimit: "8Gi" },
];
