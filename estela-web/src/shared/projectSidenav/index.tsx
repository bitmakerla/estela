import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";
import type { MenuProps } from "antd";
import Dashboard from "../../assets/icons/dashboard.svg";
import Spider from "../../assets/icons/spider.svg";
import Job from "../../assets/icons/jobs.svg";
import Activity from "../../assets/icons/activity.svg";
import Members from "../../assets/icons/members.svg";
import Settings from "../../assets/icons/setting.svg";

import "./styles.scss";

const { Sider, Content } = Layout;

interface ProjectSideNavPropsInterface {
    projectId: string;
    path: string;
}

export class ProjectSidenav extends Component<ProjectSideNavPropsInterface, unknown> {
    projectId = this.props.projectId;
    path = this.props.path;

    items: MenuProps["items"] = [
        {
            key: "1",
            label: <h2 className=" text-estela-black-medium font-bold text-sm">TOOLS</h2>,
            type: "group",
        },
        {
            key: "dashboard",
            label: (
                <Content className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                    <Dashboard className="mr-2 w-8 h-8" />
                    <Link to={`/projects/${this.projectId}/dashboard`}>Dashboard</Link>
                </Content>
            ),
        },
        {
            key: "2",
            label: (
                <Content className="flex items-center sub-menu stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                    <Job className="mr-2 w-8 h-8" />
                    <span className="">Jobs</span>
                </Content>
            ),
            children: [
                {
                    key: "jobs",
                    label: (
                        <Content className="flex items-center hover:bg-button-hover pl-4 rounded">
                            <Link to={`/projects/${this.projectId}/jobs`}>Overview</Link>
                        </Content>
                    ),
                },
                {
                    key: "cronjobs",
                    label: (
                        <Content className="flex items-center hover:bg-button-hover pl-4 rounded">
                            <Link to={`/projects/${this.projectId}/cronjobs`}>Schedule</Link>
                        </Content>
                    ),
                },
            ],
        },
        {
            key: "3",
            label: (
                <Content className="flex items-center sub-menu stroke-black hover:stroke-estela hover:bg-button-hover rounded">
                    <Spider className="mr-2 w-8 h-8" />
                    <span className="">Spiders</span>
                </Content>
            ),
            children: [
                {
                    key: "spiders",
                    label: (
                        <Content className="flex items-center hover:bg-button-hover pl-4 rounded">
                            <Link to={`/projects/${this.projectId}/spiders`}>Overview</Link>
                        </Content>
                    ),
                },
                {
                    key: "deploys",
                    label: (
                        <Content className="flex items-center hover:bg-button-hover pl-4 rounded">
                            <Link to={`/projects/${this.projectId}/deploys`}>Deploys</Link>
                        </Content>
                    ),
                },
            ],
        },
        {
            key: "4",
            label: <h2 className="text-estela-black-medium my-2 font-bold text-sm">PROJECT SETTINGS</h2>,
            children: [
                {
                    key: "activity",
                    label: (
                        <Content className="flex items-center stroke-estela-black-low rounded">
                            <Activity className="mr-2 w-8 h-8" />
                            Activity
                        </Content>
                    ),
                    disabled: true,
                },
                {
                    key: "members",
                    label: (
                        <Content className="flex items-center hover:bg-button-hover stroke-black hover:stroke-estela hover:text-estela rounded">
                            <Members className="mr-2 w-8 h-8" />
                            <Link to={`/projects/${this.projectId}/members`}>Members</Link>
                        </Content>
                    ),
                },
                {
                    key: "settings",
                    label: (
                        <Content className="flex items-center hover:bg-button-hover stroke-black hover:stroke-estela rounded">
                            <Settings className="mr-2 w-8 h-8" />
                            <Link to={`/projects/${this.projectId}/settings`} className="hover:text-estela">
                                Settings
                            </Link>
                        </Content>
                    ),
                },
            ],
            type: "group",
        },
    ];

    render(): JSX.Element {
        return (
            <Sider width={240}>
                <Menu
                    items={this.items}
                    mode="inline"
                    className="h-full"
                    selectedKeys={[`${this.path}`]}
                    defaultOpenKeys={["2", "3"]}
                />
            </Sider>
        );
    }
}
