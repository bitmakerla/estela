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
 * Project where the activity was performed.
 * @export
 * @interface ProjectDetail
 */
export interface ProjectDetail {
    /**
     * A UUID identifying this project.
     * @type {string}
     * @memberof ProjectDetail
     */
    readonly pid?: string;
    /**
     * Project name.
     * @type {string}
     * @memberof ProjectDetail
     */
    readonly name?: string;
}

export function ProjectDetailFromJSON(json: any): ProjectDetail {
    return ProjectDetailFromJSONTyped(json, false);
}

export function ProjectDetailFromJSONTyped(json: any, ignoreDiscriminator: boolean): ProjectDetail {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'pid': !exists(json, 'pid') ? undefined : json['pid'],
        'name': !exists(json, 'name') ? undefined : json['name'],
    };
}

export function ProjectDetailToJSON(value?: ProjectDetail | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
    };
}


