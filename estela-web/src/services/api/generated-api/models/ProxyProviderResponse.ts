/* tslint:disable */
/* eslint-disable */
/**
 * estela API v1.0 Documentation
 * estela API Swagger Specification
 *
 * The version of the OpenAPI document: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import {
    SpiderJobEnvVar,
    SpiderJobEnvVarFromJSON,
    SpiderJobEnvVarFromJSONTyped,
    SpiderJobEnvVarToJSON,
} from './';

/**
 * 
 * @export
 * @interface ProxyProviderResponse
 */
export interface ProxyProviderResponse {
    /**
     * 
     * @type {boolean}
     * @memberof ProxyProviderResponse
     */
    success: boolean;
    /**
     * Env vars for the instace(project, spider)
     * @type {Array<SpiderJobEnvVar>}
     * @memberof ProxyProviderResponse
     */
    envVars?: Array<SpiderJobEnvVar>;
}

export function ProxyProviderResponseFromJSON(json: any): ProxyProviderResponse {
    return ProxyProviderResponseFromJSONTyped(json, false);
}

export function ProxyProviderResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): ProxyProviderResponse {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'success': json['success'],
        'envVars': !exists(json, 'env_vars') ? undefined : ((json['env_vars'] as Array<any>).map(SpiderJobEnvVarFromJSON)),
    };
}

export function ProxyProviderResponseToJSON(value?: ProxyProviderResponse | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'success': value.success,
        'env_vars': value.envVars === undefined ? undefined : ((value.envVars as Array<any>).map(SpiderJobEnvVarToJSON)),
    };
}

