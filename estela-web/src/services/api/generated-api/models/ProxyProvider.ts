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
 * @interface ProxyProvider
 */
export interface ProxyProvider {
    /**
     * A name to identify the proxy
     * @type {string}
     * @memberof ProxyProvider
     */
    name: string;
    /**
     * A description for the proxy
     * @type {string}
     * @memberof ProxyProvider
     */
    description: string;
    /**
     * A unique integer value identifying this proxy.
     * @type {number}
     * @memberof ProxyProvider
     */
    readonly proxyid?: number;
}

export function ProxyProviderFromJSON(json: any): ProxyProvider {
    return ProxyProviderFromJSONTyped(json, false);
}

export function ProxyProviderFromJSONTyped(json: any, ignoreDiscriminator: boolean): ProxyProvider {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'name': json['name'],
        'description': json['description'],
        'proxyid': !exists(json, 'proxyid') ? undefined : json['proxyid'],
    };
}

export function ProxyProviderToJSON(value?: ProxyProvider | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'name': value.name,
        'description': value.description,
    };
}


