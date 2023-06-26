import React, { useState } from "react";
import { NotificationsSideNav } from "..";

interface NotificationsLayoutProps {
    children?: JSX.Element | JSX.Element[];
}

export const NotificationsLayout: React.FC<NotificationsLayoutProps> = ({ children }) => {
    const [path, setPath] = useState("inbox");

    const updatePathHandler = (newPath: string) => {
        setPath(newPath);
    };
    return (
        <>
            <NotificationsSideNav path={path} updatePath={updatePathHandler} />
            {children}
        </>
    );
};
