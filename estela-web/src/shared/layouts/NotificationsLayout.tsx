import React, { useState } from "react";
import { NotificationsSidenav } from "..";

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
            <NotificationsSidenav path={path} updatePath={updatePathHandler} />
            {children}
        </>
    );
};
