import React, { Component, Fragment } from "react";
import { Layout, Space, Table, Row, Col, Button, Popover, Checkbox } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { Header, ProjectSidenav, Spin } from "../../shared";

const { Content } = Layout;

interface ProjectActivityPageState {
    loaded: boolean;
    members: any[];
    modal: boolean;
}

interface RouteParams {
    projectId: string;
}

export class ProjectActivityPage extends Component<RouteComponentProps<RouteParams>, ProjectActivityPageState> {
    state: ProjectActivityPageState = {
        loaded: true,
        members: [],
        modal: false,
    };

    columns = [
        {
            title: "RUN DATE",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "DESCRIPTION",
            dataIndex: "description",
            key: "description",
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
        pageSize: 10,
    };

    content: JSX.Element = (
        <>
            <Checkbox.Group>
                <Row>
                    <Col>
                        <Checkbox value="you">You</Checkbox>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Checkbox value="me">Me</Checkbox>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Checkbox value="others">Others</Checkbox>
                    </Col>
                </Row>
            </Checkbox.Group>
        </>
    );

    projectId: string = this.props.match.params.projectId;
    render(): JSX.Element {
        const { members, loaded } = this.state;
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
                                                    className="rounded-2xl"
                                                    columns={this.columns}
                                                    dataSource={members}
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
