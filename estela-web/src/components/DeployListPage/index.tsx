import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Row, Table, Button, Tag, Col, Typography, Modal } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import Copy from "../../assets/icons/copy.svg";
import Info from "../../assets/icons/info.svg";
import WelcomeDeploy from "../../assets/images/welcomeDeploy.svg";

import "./styles.scss";
import { ApiService } from "../../services";
import { ApiProjectsDeploysListRequest, Deploy, Spider, UserDetail } from "../../services/api";
import { resourceNotAllowedNotification, Spin, PaginationItem } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text, Paragraph } = Typography;

interface DeployListPageState {
    deploys: Deploy[];
    current: number;
    count: number;
    loaded: boolean;
    modalIsOpen: boolean;
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
        modalIsOpen: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    columns = [
        {
            title: "DEPLOY ID",
            dataIndex: "did",
            key: "did",
        },
        {
            title: "MEMBER",
            dataIndex: "user",
            key: "user",
            render: (user: UserDetail, deploy: Deploy): ReactElement => (
                <Content key={deploy.did}>{user.username}</Content>
            ),
        },
        {
            title: "DEPLOYMENT DATE",
            dataIndex: "created",
            key: "created",
            render: (created: Date): ReactElement => <Content>{convertDateToString(created)}</Content>,
        },
        {
            title: "SPIDER",
            key: "spiders",
            dataIndex: "spiders",
            render: (spiders: Spider[]): ReactElement => (
                <>
                    {spiders.length === 0 ? (
                        "-/-"
                    ) : spiders.length > 1 ? (
                        <>
                            <span className="text-estela-blue-full font-medium">{spiders[0].name}&nbsp;</span>
                            <Tag className="bg-estela-blue-low rounded-lg border-estela-blue-full text-estela">+1</Tag>
                        </>
                    ) : (
                        <>
                            <span className="text-estela-blue-full font-medium">{spiders[0].name}</span>
                        </>
                    )}
                </>
            ),
        },
        {
            title: "STATUS",
            key: "status",
            dataIndex: "status",
            render: (state: string): ReactElement => (
                <Content>
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
                </Content>
            ),
        },
    ];

    async componentDidMount(): Promise<void> {
        await this.getProjectDeploys(1);
    }

    onPageChange = async (page: number): Promise<void> => {
        await this.getProjectDeploys(page);
    };

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
                const deploys: Deploy[] = results.results.map((deploy: Deploy, id: number) => {
                    return {
                        key: id,
                        ...deploy,
                    };
                });
                this.setState({
                    deploys: [...deploys],
                    count: results.count,
                    current: page,
                    loaded: true,
                    modalIsOpen: results.count === 0,
                });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    }

    handleCloseModal = (): void => {
        this.setState({ modalIsOpen: false });
    };

    render(): JSX.Element {
        const { loaded, deploys, count, current, modalIsOpen } = this.state;
        return (
            <Content className="bg-white">
                {loaded ? (
                    <Layout className="bg-metal rounded-2xl w-full">
                        <Modal open={modalIsOpen} footer={false} width={990} onCancel={this.handleCloseModal}>
                            <Row align="middle" justify="space-between">
                                <Col span={16}>
                                    <Text className="text-estela font-bold text-4xl">ONE STEP MISSING!</Text>
                                    <Paragraph className="text-xl my-6">
                                        Install
                                        <a
                                            target="_blank"
                                            href="https://estela.bitmaker.la/docs/estela-cli/install.html"
                                            rel="noreferrer"
                                        >
                                            <Text className="text-estela underline mx-1">estela CLI</Text>
                                        </a>
                                        to be able to access all Estela tools and
                                        <Text className="font-bold"> deploy </Text> your spiders.
                                    </Paragraph>
                                    <Paragraph className="font-bold text-lg">
                                        Check all our documentation&nbsp;
                                        <a target="_blank" href="https://estela.bitmaker.la/docs/" rel="noreferrer">
                                            <Text className="text-estela underline">here!</Text>
                                        </a>
                                    </Paragraph>
                                </Col>
                                <Col span={8}>
                                    <WelcomeDeploy className="w-72 h-72" />
                                </Col>
                            </Row>
                            <Row justify="center" className="gap-8 mb-4">
                                <Button
                                    className="w-96 h-14 px-10 bg-white border-estela text-estela rounded-lg"
                                    onClick={this.handleCloseModal}
                                >
                                    I have it installed
                                </Button>
                                <Button
                                    target="_blank"
                                    href="https://estela.bitmaker.la/docs/estela-cli/install.html"
                                    className="w-96 h-14 px-10 bg-estela-blue-full border-estela text-white rounded-lg flex flex-col justify-center"
                                    onClick={this.handleCloseModal}
                                >
                                    Install estela CLI
                                </Button>
                            </Row>
                        </Modal>
                        <Content className="lg:m-10 md:mx-6 mx-2">
                            <p className="font-medium text-xl text-silver">SPIDER OVERVIEW</p>
                            <Row className="bg-white p-5 rounded-lg mt-6" justify="center">
                                <Content>
                                    <Row align="middle" className="gap-4 my-4">
                                        <Col>
                                            <Info className="w-9 h-9" />
                                        </Col>
                                        <Col className="flex flex-col">
                                            <div>
                                                <Text strong>Deploy spiders</Text> and <Text strong>jobs</Text>, access{" "}
                                                <Text strong>developer features</Text> and more by installing
                                                <a
                                                    target="_blank"
                                                    href="https://estela.bitmaker.la/docs/estela-cli/install.html"
                                                    rel="noreferrer"
                                                >
                                                    <Text className="text-estela underline mx-1">estela CLI</Text>
                                                </a>
                                            </div>
                                            <div>
                                                Want to know more about estela, access our{" "}
                                                <a
                                                    target="_blank"
                                                    href="https://estela.bitmaker.la/docs/"
                                                    rel="noreferrer"
                                                >
                                                    <Text className="text-estela underline mx-1">documentation</Text>
                                                </a>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Row
                                        justify="space-between"
                                        align="middle"
                                        className="rounded-md p-4 bg-estela-blue-low text-base"
                                    >
                                        <Row className="gap-4 px-5">
                                            <p className="text-estela-black-full text-sm font-normal">
                                                Copy project ID to deploy your spiders:
                                            </p>
                                            <Link
                                                id="id_project"
                                                className="text-estela-blue-medium text-base font-normal"
                                                to={`/projects/${this.projectId}/dashboard`}
                                            >
                                                {this.projectId}
                                            </Link>
                                        </Row>
                                        <Button
                                            icon={<Copy width={24} />}
                                            className="border-0 mx-4 hover:bg-button-hover stroke-black hover:stroke-estela"
                                            onClick={this.copy}
                                        />
                                    </Row>
                                </Content>
                                <Row className="my-6 grid grid-cols-11 text-base mx-10">
                                    <div className="col-span-5 flex flex-col font-sans text-xs mx-5">
                                        <p className="font-medium text-center text-sm text-estela-black-full">
                                            Deploy a demo
                                        </p>
                                        <div className="mt-4 rounded-md p-6 bg-back-code font-courier text-sm">
                                            <p className=" text-white">
                                                $ git clone https://github.com/scrapy/quotesbot.git
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
                                        <p className="font-medium text-center mt-5 text-estela-black-medium">OR</p>
                                    </div>
                                    <div className="col-span-5 flex flex-col font-sans text-xs mx-5">
                                        <p className="font-medium text-center text-sm text-estela-black-full">
                                            Deploy your spider
                                        </p>
                                        <div className="mt-4 rounded-md p-6 bg-back-code font-courier text-sm">
                                            <p className="text-white ">$ estela create project &lt;project_name&gt;</p>
                                            <p className=" text-white ">$ cd &lt;project_name&gt;</p>
                                            <p className=" text-white ">$ estela login</p>
                                            <p className=" text-white ">Host [http://localhost]:</p>
                                            <p className=" text-white ">Username: admin</p>
                                            <p className=" text-white ">Password:</p>
                                            <p className=" text-white ">$ estela init {this.projectId}</p>
                                            <p className=" text-white ">$ estela deploy</p>
                                        </div>
                                    </div>
                                </Row>
                                <Row>
                                    <Table
                                        tableLayout="fixed"
                                        columns={this.columns}
                                        dataSource={deploys}
                                        pagination={false}
                                        size="middle"
                                        className="my-4"
                                        locale={{ emptyText: "No jobs yet." }}
                                    />
                                </Row>
                                <Pagination
                                    className="pagination"
                                    defaultCurrent={1}
                                    total={count}
                                    current={current}
                                    pageSize={this.PAGE_SIZE}
                                    onChange={this.onPageChange}
                                    showSizeChanger={false}
                                    itemRender={PaginationItem}
                                />
                            </Row>
                        </Content>
                    </Layout>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    }
}
