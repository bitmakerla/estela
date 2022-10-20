import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";
import { ReactComponent as Dashboard } from "../../assets/icons/dashboard.svg";
import { ReactComponent as Spider } from "../../assets/icons/spider.svg";
import { ReactComponent as Job } from "../../assets/icons/jobs.svg";
import { ReactComponent as Activity } from "../../assets/icons/activity.svg";
import { ReactComponent as Members } from "../../assets/icons/members.svg";
import { ReactComponent as Settings } from "../../assets/icons/setting.svg";

import "./styles.scss";

const { Sider } = Layout;

interface ProjectSideNavPropsInterface {
    projectId: string;
    path: string;
}

export class ProjectSidenav extends Component<ProjectSideNavPropsInterface, unknown> {
    projectId = this.props.projectId;
    path = this.props.path;
    render(): JSX.Element {
        return (
            <Sider width={240}>
                <Menu
                    mode="inline"
                    className="h-full"
                    selectedKeys={[`/projects/${this.projectId}${this.path}`]}
                    defaultOpenKeys={["2", "5"]}
                >
                    <div>
                        <p className="m-5 text-[#6C757D] font-bold text-sm">Tools</p>
                    </div>
                    <Menu.Item key={`/projects/${this.projectId}`} className="">
                        <div className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Dashboard className="mr-1" />
                            <Link to={`/projects/${this.projectId}`}>Dashboard</Link>
                        </div>
                    </Menu.Item>
                    <Menu.SubMenu
                        key={2}
                        title={
                            <div className="flex items-center sub-menu stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                                <Job className="mr-1" />
                                <span className="">Jobs</span>
                            </div>
                        }
                    >
                        <Menu.Item key={`/projects/${this.projectId}/jobs`}>
                            <div className="flex items-center hover:bg-button-hover pl-4 rounded">
                                <Link to={`/projects/${this.projectId}/jobs`}>Overview</Link>
                            </div>
                        </Menu.Item>
                        <Menu.Item key={`/projects/${this.projectId}/schedule`}>
                            <div className="flex items-center hover:bg-button-hover pl-4 rounded">
                                <Link to={`/projects/${this.projectId}/jobs`}>Schedule</Link>
                            </div>
                        </Menu.Item>
                    </Menu.SubMenu>
                    <Menu.SubMenu
                        key={5}
                        title={
                            <div className="flex items-center sub-menu stroke-black hover:stroke-estela hover:bg-button-hover rounded">
                                <Spider className="mr-1" />
                                <span className="">Spiders</span>
                            </div>
                        }
                    >
                        <Menu.Item key={`/projects/${this.projectId}/spiders`}>
                            <div className="flex items-center hover:bg-button-hover pl-4 rounded">
                                <Link to={`/projects/${this.projectId}/spiders`}>Overview</Link>
                            </div>
                        </Menu.Item>
                        <Menu.Item key={`/projects/${this.projectId}/deploys`}>
                            <div className="flex items-center hover:bg-button-hover pl-4 rounded">
                                <Link to={`/projects/${this.projectId}/deploys`}>Deploys</Link>
                            </div>
                        </Menu.Item>
                    </Menu.SubMenu>
                    <div>
                        <h2 className="m-5 text-[#6C757D] font-bold text-sm">Project Settings</h2>
                    </div>
                    <Menu.Item key={`/projects/${this.projectId}/activity`} className="">
                        <div className="flex items-center hover:bg-button-hover stroke-black hover:stroke-estela rounded">
                            <Activity className="mr-1" />
                            <Link to={`/projects/${this.projectId}`}>Activity</Link>
                        </div>
                    </Menu.Item>
                    <Menu.Item key={`/projects/${this.projectId}/members`} className="">
                        <div className="flex items-center hover:bg-button-hover stroke-black hover:stroke-estela rounded">
                            <Members className="mr-1" />
                            <Link to={`/projects/${this.projectId}/members`}>Members</Link>
                        </div>
                    </Menu.Item>
                    <Menu.Item key={`/projects/${this.projectId}/settings`} className="">
                        <div className="flex items-center hover:bg-button-hover stroke-black hover:stroke-estela rounded">
                            <Settings className="mr-1" />
                            <Link to={`/projects/${this.projectId}`} className="hover:text-estela">
                                Settings
                            </Link>
                        </div>
                    </Menu.Item>
                </Menu>
            </Sider>
        );
    }
}
