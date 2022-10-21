import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Row, Space, Table, Button, Tag } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import { ReactComponent as Copy } from "../../assets/icons/copy.svg";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsDeploysListRequest, Deploy, UserDetail } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;

interface DeployListPageState {
    deploys: Deploy[];
    current: number;
    count: number;
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
}

export class DeployListPage extends Component<RouteComponentProps<RouteParams>, DeployListPageState> {
    PAGE_SIZE = 10;
    state: DeployListPageState = {
        deploys: [],
        count: 0,
        current: 0,
        loaded: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    columns = [
        {
            title: "DEPLOY ID",
            dataIndex: "did",
            key: "id",
        },
        {
            title: "MEMBER",
            key: "user",
            dataIndex: "user",
            render: (user: UserDetail): ReactElement => <div>{user.username}</div>,
        },
        {
            title: "DEPLOYMENT DATE",
            dataIndex: "created",
            key: "date",
            render: (date: Date): ReactElement => <div>{convertDateToString(date)}</div>,
        },
        {
            title: "SPIDER",
            key: "user",
            dataIndex: "user",
            render: (): ReactElement => <div className="text-estela">My Spider</div>,
        },
        {
            title: "STATUS",
            key: "status",
            dataIndex: "status",
            render: (state: string): ReactElement => (
                <div>
                    {state === "BUILDING" ? (
                        <Tag className="border-0 text-xs bg-estela-blue-low rounded-md text-estela-yellow">Waiting</Tag>
                    ) : state === "SUCCESS" ? (
                        <Tag className="border-0 text-xs bg-estela-blue-low rounded-md text-estela-green">
                            Completed
                        </Tag>
                    ) : (
                        <Tag className="border-0 text-xs bg-estela-blue-low rounded-md text-estela-red-full">
                            Failure
                        </Tag>
                    )}
                </div>
            ),
        },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            await this.getProjectDeploys(1);
        }
    }

    copy = () => {
        const node = document.getElementById("id_project");
        const value = node?.textContent;
        let copytext = "";
        if (value) {
            copytext = value;
        }
        navigator.clipboard.writeText(copytext);
    };

    async getProjectDeploys(page: number): Promise<void> {
        const requestParams: ApiProjectsDeploysListRequest = { pid: this.projectId, page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsDeploysList(requestParams).then(
            (results) => {
                const deploys: Deploy[] = results.results;
                this.setState({ deploys: [...deploys], count: results.count, current: page, loaded: true });
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    }

    render(): JSX.Element {
        const { loaded, deploys, count, current } = this.state;
        return (
            <Layout>
                <Header />
                <Layout>
                    <ProjectSidenav projectId={this.projectId} path={"/deploys"} />
                    <Content className="bg-white">
                        {loaded ? (
                            <Layout className="bg-metal rounded-2xl">
                                <Content className="lg:m-10 md:mx-6 mx-2">
                                    <p className="font-medium text-xl text-silver">SPIDER OVERVIEW</p>
                                    <Row justify="center">
                                        <Space
                                            direction="horizontal"
                                            className="rounded-md p-4 bg-estela-blue-low text-base"
                                        >
                                            <p className="text-estela-black-full text-sm font-normal">
                                                Copy project ID to deploy your spiders:
                                            </p>
                                            <Link
                                                id="id_project"
                                                className="text-estela text-base font-normal"
                                                to={`/projects/${this.projectId}`}
                                            >
                                                &emsp;{this.projectId}
                                            </Link>
                                            <Button
                                                icon={<Copy width={24} />}
                                                className="border-0 mx-4 hover:bg-button-hover stroke-black hover:stroke-estela"
                                                onClick={this.copy}
                                            ></Button>
                                        </Space>
                                        <Row className="my-6 grid grid-cols-11 text-base mx-10">
                                            <div className="col-span-5 flex flex-col font-sans text-xs mx-5">
                                                <p className="font-medium text-center text-sm text-estela-black-full">
                                                    Deploy a demo
                                                </p>
                                                <div className="mt-4 rounded-md p-6 bg-back-code font-courier text-sm">
                                                    <p className=" text-white">
                                                        $ github clone https://github.com/bitmaker/demospider.git
                                                    </p>
                                                    <p className=" text-white ">$ estela login</p>
                                                    <p className=" text-white ">Host [http://localhost]:</p>
                                                    <p className=" text-white ">Username: admin</p>
                                                    <p className=" text-white ">Password:</p>
                                                    <p className=" text-white ">$ estela init {this.projectId}</p>
                                                    <p className=" text-white ">$ estela deploy</p>
                                                </div>
                                            </div>
                                            <div className="col-span-1 text-base my-auto">
                                                <p className="font-medium text-center mt-5 text-estela-black-medium">
                                                    OR
                                                </p>
                                            </div>
                                            <div className="col-span-5 flex flex-col font-sans text-xs mx-5">
                                                <p className="font-medium text-center text-sm text-estela-black-full">
                                                    Deploy your spider
                                                </p>
                                                <div className="mt-4 rounded-md p-6 bg-back-code font-courier text-sm">
                                                    <p className="text-white ">
                                                        $ estela create project &lt;project_name&gt;
                                                    </p>
                                                    <p className=" text-white ">$ cd &lt;project_name&gt;</p>
                                                    <p className=" text-white ">Host [http://localhost]:</p>
                                                    <p className=" text-white ">Username: admin</p>
                                                    <p className=" text-white ">Password:</p>
                                                    <p className=" text-white ">$ estela init {this.projectId}</p>
                                                    <p className=" text-white ">$ estela deploy</p>
                                                </div>
                                            </div>
                                        </Row>
                                        <Table
                                            tableLayout="fixed"
                                            columns={this.columns}
                                            dataSource={deploys}
                                            pagination={false}
                                            size="middle"
                                            className="my-4"
                                        />
                                    </Row>
                                    <Pagination
                                        className="pagination"
                                        defaultCurrent={1}
                                        total={count}
                                        current={current}
                                        pageSize={this.PAGE_SIZE}
                                        showSizeChanger={false}
                                    />
                                </Content>
                            </Layout>
                        ) : (
                            <Spin />
                        )}
                    </Content>
                </Layout>
            </Layout>
        );
    }
}
