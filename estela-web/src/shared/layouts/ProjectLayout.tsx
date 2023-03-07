import React, { Component } from "react";
import { RouteComponentProps } from "react-router-dom";
import { Layout } from "antd";
import { Header } from "..";

interface RouteParams {
    projectId: string;
}

interface ProjectLayoutProps extends RouteComponentProps<RouteParams> {
    children: JSX.Element | JSX.Element[];
}

export class ProjectLayout extends Component<RouteComponentProps<RouteParams>, unknown> {
    projectId: string = this.props.match.params.projectId;
    render() {
        return (
            <Layout>
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"jobs"} />
                    {this.props}
                </Layout>
            </Layout>
        );
    }
}
