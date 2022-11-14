import React, { Component, Fragment } from "react";
import { Layout, Space, Table, Row, Col, Button, Popover, Checkbox } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { Header, ProjectSidenav, Spin } from "../../shared";

const { Content } = Layout;

interface ActivityState {
    runDate: string;
    topic: string;
    member: string;
}
interface ProjectActivityPageState {
    loaded: boolean;
    activities: ActivityState[];
    modal: boolean;
}

interface RouteParams {
    projectId: string;
}

export class ProjectActivityPage extends Component<RouteComponentProps<RouteParams>, ProjectActivityPageState> {
    state: ProjectActivityPageState = {
        loaded: true,
        activities: [
            {
                runDate: "2020-01-01 00:23:00 UTC",
                topic: "Scheduled Job for Spiders: MySpider was created",
                member: "Scraper201222",
            },
            {
                runDate: "2020-01-01 00:23:00 UTC",
                topic: "Scheduled Job for Spiders: MySpider was created",
                member: "Scraper201222",
            },
            {
                runDate: "2020-01-01 00:23:00 UTC",
                topic: "Scheduled Job for Spiders: MySpider was created",
                member: "Scraper201222",
            },
        ],
        modal: false,
    };

    columns = [
        {
            title: "RUN DATE",
            dataIndex: "runDate",
            key: "runDate",
        },
        {
            title: "TOPIC",
            dataIndex: "topic",
            key: "topic",
        },
        {
            title: "MEMBER",
            dataIndex: "member",
            key: "member",
        },
    ];

    options = ["You", "Scrapper1", "Other"];
    pagination = {
        current: 1,
        pageSize: 2,
    };

    content: JSX.Element = (
        <div>
            <Checkbox.Group>
                <div className="gap-x-8">
                    <Row>
                        <Col>
                            <Checkbox value="you">You</Checkbox>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Checkbox value="me">Scraper201222</Checkbox>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Checkbox value="scraper">Scraper</Checkbox>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Checkbox value="others">Others</Checkbox>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Checkbox value="bitmaker scraper">Bitmaker scraper</Checkbox>
                        </Col>
                    </Row>
                </div>
            </Checkbox.Group>
        </div>
    );

    projectId: string = this.props.match.params.projectId;
    render(): JSX.Element {
        const { activities, loaded } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="bg-white">
                    {loaded ? (
                        <Fragment>
                            <ProjectSidenav projectId={this.projectId} path={"/activity"} />
                            <Content className="bg-metal rounded-2xl">
                                <div className="lg:m-10 md:mx-6 mx-2">
                                    <Row className="flow-root my-6">
                                        <Col className="float-left">
                                            <p className="text-xl font-medium text-silver float-left">
                                                PROJECT ACTIVITY
                                            </p>
                                        </Col>
                                    </Row>
                                    <Row className="bg-white rounded-lg">
                                        <div className="m-4">
                                            <Space direction="vertical" className="">
                                                <Row justify="end">
                                                    <Popover
                                                        placement="bottomLeft"
                                                        content={this.content}
                                                        title="SHOW/HIDE COLUMNS"
                                                        trigger="click"
                                                    >
                                                        <Button
                                                            shape="round"
                                                            icon={<FilterOutlined className="mr-2" width={19} />}
                                                            size="large"
                                                            className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                        >
                                                            Filter
                                                        </Button>
                                                    </Popover>
                                                </Row>
                                                <Table
                                                    tableLayout="fixed"
                                                    className="rounded-2xl p-[20px]"
                                                    columns={this.columns}
                                                    dataSource={activities}
                                                    pagination={this.pagination}
                                                    size="middle"
                                                    locale={{ emptyText: "No activity" }}
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
