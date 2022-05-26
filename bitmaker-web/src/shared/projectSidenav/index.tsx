import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";

import "./styles.scss";

const { Sider } = Layout;

interface ProjectSideNavPropsInterface {
    projectId: string;
}

export class ProjectSidenav extends Component<ProjectSideNavPropsInterface, unknown> {
    projectId = this.props.projectId;

    render(): JSX.Element {
        return (
            <Sider width={250}>
                <Menu mode="inline" className="sider-menu" theme="dark">
                    <Menu.Item key="1">
                        <Link to={`/projects/${this.projectId}`}>Project Detail</Link>
                    </Menu.Item>
                    <Menu.Item key="2">
                        <Link to={`/projects/${this.projectId}/spiders`}>Spiders</Link>
                    </Menu.Item>
                    <Menu.Item key="3">
                        <Link to="/projects">Projects</Link>
                    </Menu.Item>
                </Menu>
            </Sider>
        );
    }
}
