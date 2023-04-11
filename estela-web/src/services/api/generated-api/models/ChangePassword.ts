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
 * @interface ChangePassword
 */
export interface ChangePassword {
    /**
     * 
     * @type {string}
     * @memberof ChangePassword
     */
    newPassword: string;
    /**
     * 
     * @type {string}
     * @memberof ChangePassword
     */
    confirmNewPassword: string;
    /**
     * 
     * @type {string}
     * @memberof ChangePassword
     */
    oldPassword: string;
}

export function ChangePasswordFromJSON(json: any): ChangePassword {
    return ChangePasswordFromJSONTyped(json, false);
}

export function ChangePasswordFromJSONTyped(json: any, ignoreDiscriminator: boolean): ChangePassword {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'newPassword': json['new_password'],
        'confirmNewPassword': json['confirm_new_password'],
        'oldPassword': json['old_password'],
    };
}

export function ChangePasswordToJSON(value?: ChangePassword | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'new_password': value.newPassword,
        'confirm_new_password': value.confirmNewPassword,
        'old_password': value.oldPassword,
    };
}


