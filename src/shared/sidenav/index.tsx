import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";

import "./styles.scss";

const { Sider } = Layout;

export class Sidenav extends Component<unknown> {
    render(): JSX.Element {
        return (
            <Sider width={250}>
                <Menu mode="inline" className="sider-menu" theme="dark">
                    <Menu.Item key="1">
                        <Link to="/projects">All Projects</Link>
                    </Menu.Item>
                    <Menu.Item key="2">
                        <Link to="/projects/create">Create New Project</Link>
                    </Menu.Item>
                </Menu>
            </Sider>
        );
    }
}
