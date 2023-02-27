import { notification } from "antd";

import "./styles.scss";
import history from "../../history";

export const authNotification = (): void => {
    notification.warn({
        message: "Authenticated Resource",
        description: "You need to be logged to enter to this resource.",
    });
    history.push("/login");
};

export const resourceNotAllowedNotification = (): void => {
    notification.error({
        message: "Resource Not Allowed",
        description: "You do not have permissions to enter to this resource.",
    });
    history.push("/");
};

export const dataDeletedNotification = (n: number): void => {
    notification.open({
        message: "Data Successfully Deleted",
        description: `${n} Items have been deleted`,
    });
};

export const credentialsIncorrectNotification = (): void => {
    notification.open({
        message: "Credentials are incorrect",
        description: "Credentials are incorrect.",
    });
};

export const incorrectDataNotification = (): void => {
    notification.error({
        message: "Incorrect Data or Insufficient Permissions.",
        description: "Check form fields, data and permissions.",
    });
};

export const insecurePasswordNotification = (message: string): void => {
    notification.warn({
        message: "Insecure Password",
        description: message,
    });
};

export const invalidDataNotification = (message: string): void => {
    notification.error({
        message: "Invalid Data",
        description: message,
    });
};

export const nonExistentUserNotification = (): void => {
    notification.warn({
        message: "Invalid Data",
        description: `User does not exist.`,
    });
};

export const emailConfirmationNotification = (): void => {
    notification.success({
        message: "Confirmation email sent",
        description: `The confirmation email was sent to the email you provided.`,
    });
};
