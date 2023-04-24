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
/**
 * Cron job env variables.
 * @export
 * @interface SpiderJobEnvVar
 */
export interface SpiderJobEnvVar {
    /**
     * Env variable name.
     * @type {string}
     * @memberof SpiderJobEnvVar
     */
    name: string;
    /**
     * Env variable value.
     * @type {string}
     * @memberof SpiderJobEnvVar
     */
    value: string;
    /**
     * Whether the env variable value is masked.
     * @type {boolean}
     * @memberof SpiderJobEnvVar
     */
    masked?: boolean;
}

export function SpiderJobEnvVarFromJSON(json: any): SpiderJobEnvVar {
    return SpiderJobEnvVarFromJSONTyped(json, false);
}

export function SpiderJobEnvVarFromJSONTyped(json: any, ignoreDiscriminator: boolean): SpiderJobEnvVar {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'name': json['name'],
        'value': json['value'],
        'masked': !exists(json, 'masked') ? undefined : json['masked'],
    };
}

export function SpiderJobEnvVarToJSON(value?: SpiderJobEnvVar | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'name': value.name,
        'value': value.value,
        'masked': value.masked,
    };
}


