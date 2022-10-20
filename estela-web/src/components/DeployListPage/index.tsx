import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Typography, Row, Space, Table } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import { ReactComponent as Copy } from "../../assets/icons/copy.svg";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsDeploysListRequest, Deploy, UserDetail } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Title, Text } = Typography;

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
            render: (name: string): ReactElement => <div className="tracking-wide w-12">{name}</div>,
        },
        {
            title: "MEMBER",
            key: "user",
            dataIndex: "user",
            render: (user: UserDetail): ReactElement => <div className="tracking-wide w-24">{user.username}</div>,
        },
        {
            title: "DEPLOYMENT DATE",
            dataIndex: "created",
            key: "date",
            render: (date: Date): ReactElement => <div className="tracking-wider">{convertDateToString(date)}</div>,
        },
        {
            title: "SPIDER",
            key: "user",
            dataIndex: "user",
            render: (user: UserDetail): ReactElement => <div className="text-blue-700 w-36">My spider</div>,
        },
        {
            title: "STATUS",
            key: "status",
            dataIndex: "status",
            render: (state: string): ReactElement => (
                <div className="">
                    {state === "BUILDING" ? (
                        <p className="font-normal bg-estela-blue-low rounded-md content-center  inline px-6 py-2 text-estela-yellow">
                            Waiting
                        </p>
                    ) : state === "SUCCESS" ? (
                        <p className="font-normal bg-estela-blue-low rounded-md content-center  inline px-6 py-2 text-estela-green">
                            Completed
                        </p>
                    ) : (
                        <p className="font-normal bg-estela-blue-low rounded-md content-center  inline px-6 py-2 text-estela-red-full">
                            Failure
                        </p>
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
                // deploys.map(function (val, indx) {
                //     console.log(val, indx);
                // });
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
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/deploys"} />
                    <Content className="content-padding">
                        {loaded ? (
                            <Layout className="white-background ">
                                <Content className="w-full">
                                    <Title level={2} className="tracking-wide py-7 px-5 text-left font-light">
                                        <p className="font-medium text-2xl text-estela-black-medium font-sans">
                                            SPIDER OVERVIEW
                                        </p>
                                    </Title>
                                    <Row className="flex flex-col content-center text-6xl">
                                        <div className="rounded-md px-10 py-6 bg-estela-blue-low text-base mx-auto mt-3 w-9/12 tracking-wide font-sans">
                                            <b className="text-estela-black-full font-light">
                                                Copy project ID to deploy your spiders:
                                            </b>
                                            <Link
                                                id="id_project"
                                                className="text-links"
                                                to={`/projects/${this.projectId}`}
                                            >
                                                &emsp;{this.projectId}
                                            </Link>
                                            {/* <div className="relative ml-auto mr-0"> */}
                                            <div className="inline-block w-5/12 text-right stroke-black hover:stroke-estela">
                                                <button onClick={this.copy} className="">
                                                    <Copy className="mr-1" />
                                                </button>
                                            </div>
                                        </div>
                                        <Row className="mt-10 grid grid-cols-11 text-base mx-10 mb-10">
                                            <div className="col-span-5 flex flex-col font-sans text-xs mx-5">
                                                <p className="font-medium text-center text-base text-estela-black-full">
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
                                            <div className="col-span-1 font-sans text-xl my-auto">
                                                <p className="font-medium text-center mt-5 text-estela-black-medium">
                                                    OR
                                                </p>
                                            </div>
                                            <div className="col-span-5 flex flex-col font-sans text-xs mx-5">
                                                <p className="font-medium text-center text-base text-estela-black-full">
                                                    Deploy your spider
                                                </p>
                                                <div className="mt-4 rounded-md p-6 bg-back-code font-courier text-sm">
                                                    <p className=" text-white ">
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
                                            columns={this.columns}
                                            dataSource={deploys}
                                            pagination={false}
                                            size="middle"
                                            className="w-9/12 mt-10 font-sans font-light ml-6"
                                        />
                                    </Row>
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
