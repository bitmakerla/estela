import React, { Component, ReactElement } from "react";
import { Link } from "react-router-dom";
import { Col, Layout, Row, Button, Space, Typography, Table } from "antd";
import Add from "../../assets/icons/add.svg";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService } from "../../services";
import { ApiProjectsSpidersListRequest, Spider } from "../../services/api";
import { resourceNotAllowedNotification, Spin } from "../../shared";
import { ColumnsType } from "antd/lib/table";

const { Content } = Layout;
const { Text } = Typography;

interface SpiderList {
    key: number;
    name: string;
    sid: number | undefined;
}

interface SpiderListPageState {
    spiders: SpiderList[];
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
        await this.getProjectSpiders(1);
    }

    async getProjectSpiders(page: number): Promise<void> {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId, page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                // const spiders: Spider[] = results.results;
                const spiders: SpiderList[] = results.results.map((spider: Spider, index: number) => {
                    return {
                        key: index,
                        name: spider.name,
                        sid: spider.sid,
                    };
                });
                this.setState({ spiders: [...spiders], count: results.count, current: page, loaded: true });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    }

    columns: ColumnsType<SpiderList> = [
        {
            title: "SPIDER",
            dataIndex: "name",
            key: "name",
            render: (name: string, spider: SpiderList): ReactElement => (
                <Link
                    key={spider.key}
                    to={`/projects/${this.projectId}/spiders/${spider.sid}`}
                    className="text-estela-blue-medium"
                >
                    {name}
                </Link>
            ),
        },
        {
            title: "LAST RUN",
            dataIndex: "lastRun",
            key: "lastRun",
            render: (): ReactElement => <Text className="text-estela-black-medium text-xs">Not available</Text>,
        },
        {
            title: "JOBS",
            dataIndex: "jobs",
            key: "jobs",
            render: (): ReactElement => <Text className="text-estela-black-medium text-xs">-/-</Text>,
        },
    ];

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        await this.getProjectSpiders(page);
    };

    render(): JSX.Element {
        const { loaded, spiders } = this.state;
        return (
            <Content className="bg-metal rounded-2xl">
                {loaded ? (
                    <div className="lg:m-10 md:mx-6 mx-2">
                        <Row className="flow-root my-6">
                            <Col className="float-left">
                                <p className="text-xl font-medium text-silver float-left">SPIDER OVERVIEW</p>
                            </Col>
                            <Col className="float-right">
                                <Button
                                    icon={<Add className="mr-2" width={19} />}
                                    onClick={() => this.props.history.push(`/projects/${this.projectId}/deploys`)}
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
                ) : (
                    <Spin />
                )}
            </Content>
        );
    }
}
