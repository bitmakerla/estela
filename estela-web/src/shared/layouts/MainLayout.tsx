import React from "react";
import { Layout } from "antd";
import { Header } from "..";

interface MainLayoutProps {
    children: JSX.Element | JSX.Element[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <Layout className="h-screen">
            <Header />
            <Layout className="bg-metal p-6">{children}</Layout>
        </Layout>
    );
};
