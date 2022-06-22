import { Configuration } from "./generated-api";
import { ApiApi as _ApiApi } from "./generated-api";

import { AuthService } from "../auth.service";
import { API_BASE_URL } from "../../constants";
export * from "./generated-api";

export const ApiService = (): _ApiApi =>
    new _ApiApi(
        new Configuration({
            basePath: API_BASE_URL,
            headers: AuthService.getDefaultAuthHeaders(),
        }),
    );
