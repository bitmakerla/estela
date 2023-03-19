import React from "react";
import { Layout } from "antd";

interface AuthLayoutProps {
    children: JSX.Element | JSX.Element[];
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    return <Layout className="white-background h-screen container mx-auto">{children}</Layout>;
};
