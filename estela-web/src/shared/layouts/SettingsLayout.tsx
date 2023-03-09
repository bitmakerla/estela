import React, { useState } from "react";
import { ProfileSettingsSideNav } from "..";

interface SettingsLayoutProps {
    children?: JSX.Element | JSX.Element[];
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
    const [path, setPath] = useState("profile");

    const updatePathHandler = (newPath: string) => {
        setPath(newPath);
    };
    return (
        <>
            <ProfileSettingsSideNav path={path} updatePath={updatePathHandler} />
            {children}
        </>
    );
};
