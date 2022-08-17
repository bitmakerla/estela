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
 * Spiders in this deploy.
 * @export
 * @interface Spider
 */
export interface Spider {
    /**
     * A unique integer value identifying this spider.
     * @type {number}
     * @memberof Spider
     */
    readonly sid?: number;
    /**
     * Spider's name.
     * @type {string}
     * @memberof Spider
     */
    name: string;
    /**
     * Project UUID.
     * @type {string}
     * @memberof Spider
     */
    project: string;
}

export function SpiderFromJSON(json: any): Spider {
    return SpiderFromJSONTyped(json, false);
}

export function SpiderFromJSONTyped(json: any, ignoreDiscriminator: boolean): Spider {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'sid': !exists(json, 'sid') ? undefined : json['sid'],
        'name': json['name'],
        'project': json['project'],
    };
}

export function SpiderToJSON(value?: Spider | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'name': value.name,
        'project': value.project,
    };
}


