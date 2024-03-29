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
 * Job env variables.
 * @export
 * @interface SpiderJobCreateEnvVar
 */
export interface SpiderJobCreateEnvVar {
    /**
     * Env var id.
     * @type {number}
     * @memberof SpiderJobCreateEnvVar
     */
    evid?: number;
    /**
     * Env var name.
     * @type {string}
     * @memberof SpiderJobCreateEnvVar
     */
    name: string;
    /**
     * Env var value.
     * @type {string}
     * @memberof SpiderJobCreateEnvVar
     */
    value: string;
    /**
     * Env var masked.
     * @type {boolean}
     * @memberof SpiderJobCreateEnvVar
     */
    masked?: boolean;
}

export function SpiderJobCreateEnvVarFromJSON(json: any): SpiderJobCreateEnvVar {
    return SpiderJobCreateEnvVarFromJSONTyped(json, false);
}

export function SpiderJobCreateEnvVarFromJSONTyped(json: any, ignoreDiscriminator: boolean): SpiderJobCreateEnvVar {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'evid': !exists(json, 'evid') ? undefined : json['evid'],
        'name': json['name'],
        'value': json['value'],
        'masked': !exists(json, 'masked') ? undefined : json['masked'],
    };
}

export function SpiderJobCreateEnvVarToJSON(value?: SpiderJobCreateEnvVar | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'evid': value.evid,
        'name': value.name,
        'value': value.value,
        'masked': value.masked,
    };
}


