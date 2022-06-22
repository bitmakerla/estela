import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Layout, List, Pagination, Typography } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsSpidersListRequest, Spider } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

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
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    }

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        await this.getProjectSpiders(page);
    };

    render(): JSX.Element {
        const { loaded, spiders, count, current } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} />
                    <Content>
                        {loaded ? (
                            <Layout className="white-background">
                                <Content>
                                    <List
                                        header={<Title level={3}>Project Spiders</Title>}
                                        bordered
                                        dataSource={spiders}
                                        renderItem={(spider: Spider) => (
                                            <List.Item>
                                                <Link to={`/projects/${this.projectId}/spiders/${spider.sid}`}>
                                                    {spider.name}
                                                </Link>
                                            </List.Item>
                                        )}
                                        className="spider-list"
                                    />
                                    <Pagination
                                        className="pagination"
                                        defaultCurrent={1}
                                        total={count}
                                        current={current}
                                        pageSize={this.PAGE_SIZE}
                                        onChange={this.onPageChange}
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
