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
 * @interface DeployCreate
 */
export interface DeployCreate {
    /**
     * 
     * @type {number}
     * @memberof DeployCreate
     */
    readonly did?: number;
    /**
     * 
     * @type {string}
     * @memberof DeployCreate
     */
    status?: DeployCreateStatusEnum;
    /**
     * 
     * @type {Date}
     * @memberof DeployCreate
     */
    readonly created?: Date;
    /**
     * 
     * @type {string}
     * @memberof DeployCreate
     */
    readonly projectZip?: string;
}

/**
* @export
* @enum {string}
*/
export enum DeployCreateStatusEnum {
    Success = 'SUCCESS',
    Building = 'BUILDING',
    Failure = 'FAILURE',
    Canceled = 'CANCELED'
}

export function DeployCreateFromJSON(json: any): DeployCreate {
    return DeployCreateFromJSONTyped(json, false);
}

export function DeployCreateFromJSONTyped(json: any, ignoreDiscriminator: boolean): DeployCreate {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'did': !exists(json, 'did') ? undefined : json['did'],
        'status': !exists(json, 'status') ? undefined : json['status'],
        'created': !exists(json, 'created') ? undefined : (new Date(json['created'])),
        'projectZip': !exists(json, 'project_zip') ? undefined : json['project_zip'],
    };
}

export function DeployCreateToJSON(value?: DeployCreate | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'status': value.status,
    };
}


