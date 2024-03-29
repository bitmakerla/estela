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
 * 
 * @export
 * @interface ProxyProviderUpdate
 */
export interface ProxyProviderUpdate {
    /**
     * Spider or project
     * @type {string}
     * @memberof ProxyProviderUpdate
     */
    level: string;
    /**
     * Project id where the update will be performed
     * @type {string}
     * @memberof ProxyProviderUpdate
     */
    projectOrSpiderId: string;
}

export function ProxyProviderUpdateFromJSON(json: any): ProxyProviderUpdate {
    return ProxyProviderUpdateFromJSONTyped(json, false);
}

export function ProxyProviderUpdateFromJSONTyped(json: any, ignoreDiscriminator: boolean): ProxyProviderUpdate {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'level': json['level'],
        'projectOrSpiderId': json['project_or_spider_id'],
    };
}

export function ProxyProviderUpdateToJSON(value?: ProxyProviderUpdate | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'level': value.level,
        'project_or_spider_id': value.projectOrSpiderId,
    };
}


