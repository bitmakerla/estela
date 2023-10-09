import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Row, Table, Button, Tag, Col, Typography, Modal, Tooltip as TooltipAnt } from "antd";
import { RouteComponentProps } from "react-router-dom";
import Copy from "../../assets/icons/copy.svg";
import Info from "../../assets/icons/info.svg";
import Help from "../../assets/icons/help.svg";
import SpiderIcon from "../../assets/icons/spider.svg";
import WelcomeDeploy from "../../assets/images/welcomeDeploy.svg";

import "./styles.scss";
import { API_BASE_URL } from "../../constants";
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
            title: (
                <Row className="flex items-center gap-1">
                    STATUS
                    <TooltipAnt
                        placement="left"
                        title="Refresh the page to see the updated deployment status. After a successful deployment, you can see the list of spiders in the spiders overview page."
                    >
                        <Help className="w-5 h-5 stroke-estela-black-medium" />
                    </TooltipAnt>
                </Row>
            ),
            key: "status",
            dataIndex: "status",
            render: (state: string): ReactElement => (
                <Content style={{ display: "flex", alignItems: "center" }}>
                    {state === "BUILDING" ? (
                        <Tag className="border-0 text-s bg-estela-blue-low rounded-md text-estela-yellow">Waiting</Tag>
                    ) : state === "SUCCESS" ? (
                        <Tag className="border-0 text-s bg-estela-blue-low rounded-md text-estela-green">Completed</Tag>
                    ) : (
                        <Tag className="border-0 text-s bg-estela-blue-low rounded-md text-estela-red-full">
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
        let copy_text = "";
        if (value) {
            copy_text = value;
        }
        navigator.clipboard.writeText(copy_text);
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
                                        Install the
                                        <a
                                            target="_blank"
                                            href="https://estela-cli.bitmaker.la/installation/"
                                            rel="noreferrer"
                                        >
                                            <Text className="text-estela underline mx-1">estela CLI</Text>
                                        </a>
                                        to <Text strong>deploy</Text> your spiders, unlock{" "}
                                        <Text strong>advanced developer features</Text>, and access all{" "}
                                        <Text strong>estela tools</Text>.
                                    </Paragraph>
                                    <Paragraph className="font-bold text-lg">
                                        Check all our documentation&nbsp;
                                        <a target="_blank" href="https://estela-cli.bitmaker.la/" rel="noreferrer">
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
                                    I already have it
                                </Button>
                                <Button
                                    target="_blank"
                                    href="https://estela-cli.bitmaker.la/installation/"
                                    className="w-96 h-14 px-10 bg-estela-blue-full border-estela text-white rounded-lg flex flex-col justify-center"
                                    onClick={this.handleCloseModal}
                                >
                                    Install the estela CLI
                                </Button>
                            </Row>
                        </Modal>
                        <Content className="lg:m-10 md:mx-6 mx-2">
                            <p className="font-medium text-xl text-silver">SPIDER OVERVIEW</p>
                            <Row className="bg-white p-5 rounded-lg mt-6" justify="center">
                                <Content>
                                    <Row className="flex items-center justify-between">
                                        <Col className="flex gap-4 my-4">
                                            <Info className="w-9 h-9" />
                                            <Col>
                                                <p>
                                                    <Text strong>Want to know more about estela?</Text> Access our
                                                    <a
                                                        target="_blank"
                                                        href="https://estela.bitmaker.la/"
                                                        rel="noreferrer"
                                                    >
                                                        <Text strong className="text-estela underline mx-1">
                                                            documentation
                                                        </Text>
                                                    </a>
                                                    .
                                                </p>
                                                <p>
                                                    Install the
                                                    <a
                                                        target="_blank"
                                                        href="https://estela-cli.bitmaker.la/installation/"
                                                        rel="noreferrer"
                                                    >
                                                        <Text strong className="text-estela underline mx-1">
                                                            estela CLI
                                                        </Text>
                                                    </a>
                                                    to <Text strong>streamline spider deployment</Text>, unlock{" "}
                                                    <Text strong>advanced developer features</Text>, and access all{" "}
                                                    <Text strong>estela tools</Text>.
                                                </p>
                                            </Col>
                                        </Col>
                                        <Button
                                            icon={<SpiderIcon className="mr-2 w-6 h-6" width={40} />}
                                            size="large"
                                            className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                            onClick={() =>
                                                this.props.history.push(`/projects/${this.projectId}/spiders`)
                                            }
                                        >
                                            View spiders
                                        </Button>
                                    </Row>
                                    <Row
                                        justify="space-between"
                                        align="middle"
                                        className="rounded-md p-4 bg-estela-blue-low text-base"
                                    >
                                        <Row className="gap-4 px-5" align="middle">
                                            <p className="text-estela-black-full text-sm font-normal">
                                                Copy your project ID to deploy your spiders:
                                            </p>
                                            <Button
                                                id="id_project"
                                                className="border-0 text-estela-blue-medium text-base font-normal"
                                                onClick={this.copy}
                                            >
                                                {this.projectId}
                                            </Button>
                                        </Row>
                                        <Button
                                            icon={<Copy className="text-2xl" />}
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
                                            <p className="break-words text-white">
                                                $ git clone https://github.com/scrapy/quotesbot.git
                                            </p>
                                            <p className="text-white">$ cd quotesbot</p>
                                            <p className="text-white">$ estela login</p>
                                            <p className="text-white">Host [http://localhost]: {API_BASE_URL}</p>
                                            <p className="text-white">Username: admin</p>
                                            <p className="text-white">Password:</p>
                                            <p className="break-words text-white">$ estela init {this.projectId}</p>
                                            <p className="text-white">$ estela deploy</p>
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
                                            <p className="text-white">$ cd &lt;project_name&gt;</p>
                                            <p className="text-white">$ estela login</p>
                                            <p className="text-white">Host [http://localhost]: {API_BASE_URL}</p>
                                            <p className="text-white">Username: admin</p>
                                            <p className="text-white">Password:</p>
                                            <p className="break-words text-white">$ estela init {this.projectId}</p>
                                            <p className="text-white">$ estela deploy</p>
                                        </div>
                                    </div>
                                </Row>
                                <Row className="flex ">
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
