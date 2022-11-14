import React, { Component, Fragment, ReactElement } from "react";
import { Link } from "react-router-dom";
import { Col, Layout, Row, Button, Space, Table } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsSpidersListRequest, Spider } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
import { ColumnsType } from "antd/lib/table";

const { Content } = Layout;

interface SpiderListPageState {
    spiders: Spider[];
    current: number;
    count: number;
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
}

export class SpiderListPage extends Component<RouteComponentProps<RouteParams>, SpiderListPageState> {
    PAGE_SIZE = 10;
    state: SpiderListPageState = {
        spiders: [],
        count: 0,
        current: 0,
        loaded: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            await this.getProjectSpiders(1);
        }
    }

    async getProjectSpiders(page: number): Promise<void> {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId, page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                const spiders: Spider[] = results.results;
                this.setState({ spiders: [...spiders], count: results.count, current: page, loaded: true });
                console.log(spiders);
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    }

    columns: ColumnsType<Spider> = [
        {
            title: "SPIDER",
            dataIndex: "name",
            key: "name",
            render: (name: string, spider: Spider): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${spider.sid}`} className="text-estela-blue-medium">
                    {name}
                </Link>
            ),
        },
        {
            title: "LAST RUN",
            dataIndex: "lastRun",
            key: "lastRun",
        },
        {
            title: "JOBS",
            dataIndex: "jobs",
            key: "jobs",
        },
    ];

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        await this.getProjectSpiders(page);
    };

    render(): JSX.Element {
        const { loaded, spiders } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="bg-white">
                    {loaded ? (
                        <Fragment>
                            <ProjectSidenav projectId={this.projectId} path={"/spiders"} />
                            <Content className="bg-metal rounded-2xl">
                                <div className="lg:m-10 md:mx-6 mx-2">
                                    <Row className="flow-root my-6">
                                        <Col className="float-left">
                                            <p className="text-xl font-medium text-silver float-left">
                                                SPIDER OVERVIEW
                                            </p>
                                        </Col>
                                        <Col className="float-right">
                                            <Button
                                                icon={<PlusOutlined className="mr-2" width={19} />}
                                                onClick={() =>
                                                    this.props.history.push(`/projects/${this.projectId}/deploys`)
                                                }
                                                size="large"
                                                className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                            >
                                                Deploy new spider
                                            </Button>
                                        </Col>
                                    </Row>
                                    <Row className="bg-white rounded-lg">
                                        <div className="m-4">
                                            <Space direction="vertical" className="">
                                                <Table
                                                    tableLayout="fixed"
                                                    className="rounded-2xl"
                                                    columns={this.columns}
                                                    dataSource={spiders}
                                                    pagination={false}
                                                    size="middle"
                                                    locale={{ emptyText: "No spiders yet" }}
                                                />
                                            </Space>
                                        </div>
                                    </Row>
                                </div>
                            </Content>
                        </Fragment>
                    ) : (
                        <Spin />
                    )}
                </Layout>
            </Layout>
        );
    }
}
