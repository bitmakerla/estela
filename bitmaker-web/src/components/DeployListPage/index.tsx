import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Typography, Row, Space, Table } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";

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
            title: "Deploy ID",
            dataIndex: "did",
            key: "id",
        },
        {
            title: "Date",
            dataIndex: "created",
            key: "date",
            render: (date: Date): ReactElement => <div>{convertDateToString(date)}</div>,
        },
        {
            title: "User",
            key: "user",
            dataIndex: "user",
            render: (user: UserDetail): ReactElement => <div>{user.username}</div>,
        },
        {
            title: "Status",
            key: "status",
            dataIndex: "status",
        },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            await this.getProjectDeploys(1);
        }
    }

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
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} />
                    <Content className="content-padding">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content>
                                    <Title level={4} className="text-center">
                                        DEPLOYS
                                    </Title>
                                    <Row justify="center" className="deploy-list">
                                        <Space direction="vertical" size="large">
                                            <Text>
                                                <b>Project ID:</b>
                                                <Link to={`/projects/${this.projectId}`}>&nbsp; {this.projectId}</Link>
                                            </Text>
                                            <Table
                                                columns={this.columns}
                                                dataSource={deploys}
                                                pagination={false}
                                                size="middle"
                                                className="table"
                                            />
                                        </Space>
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
