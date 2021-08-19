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
        message: "Incorrect Data",
        description: "Check form fields or data.",
    });
};
