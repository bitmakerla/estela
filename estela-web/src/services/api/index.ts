import { Configuration } from "./generated-api";
import { ApiApi as _ApiApi } from "./generated-api";

import { AuthService } from "../auth.service";
import { API_BASE_URL } from "../../constants";
export * from "./generated-api";

export const ApiService = (signal?: AbortSignal): _ApiApi =>
    new _ApiApi(
        new Configuration({
            basePath: API_BASE_URL,
            headers: AuthService.getDefaultAuthHeaders(),
            ...(signal && {
                fetchApi: (input: RequestInfo, init?: RequestInit) => fetch(input, { ...init, signal }),
            }),
        }),
    );
