import React from "react";
import { Layout } from "antd";
import { Header } from "..";

interface MainLayoutProps {
    children: JSX.Element | JSX.Element[];
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <Layout className="general-container">
            <Header />
            {children}
        </Layout>
    );
};
