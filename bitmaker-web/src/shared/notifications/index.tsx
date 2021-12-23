import { notification } from "antd";

import "./styles.scss";
import history from "../../history";

export const authNotification = (): void => {
    notification.open({
        message: "Authenticated Resource",
        description: "You need to be logged to enter to this resource.",
    });
    history.push("/login");
};

export const resourceNotAllowedNotification = (): void => {
    notification.open({
        message: "Resource Not Allowed",
        description: "You do not have permissions to enter to this resource.",
    });
    history.push("/");
};

export const credentialsIncorrectNotification = (): void => {
    notification.open({
        message: "Credentials are incorrect",
        description: "Credentials are incorrect.",
    });
};

export const incorrectDataNotification = (): void => {
    notification.open({
        message: "Incorrect Data or Insufficient permissions.",
        description: "Check form fields, data and permissions.",
    });
};

export const badPasswordNotification = (message: string): void => {
    notification.warn({
        message: "Insecure password",
        description: message,
    });
};

export const invalidDataNotification = (): void => {
    notification.open({
        message: "Invalid Data",
        description: `Invalid email or username. You might be using an email or 
                      username that is already taken or your password is not 
                      strong enough.`,
    });
};

export const nonExistentUserNotification = (): void => {
    notification.open({
        message: "Invalid Data",
        description: `User does not exist.`,
    });
};
