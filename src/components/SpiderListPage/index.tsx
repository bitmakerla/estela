import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Layout, List, Typography } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsSpidersListRequest, Spider } from "../../services/api";
import { Header, ProjectSidenav, Spin } from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

interface SpiderListPageState {
    spiders: Spider[];
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
}

export class SpiderListPage extends Component<RouteComponentProps<RouteParams>, SpiderListPageState> {
    page = 1;
    PAGE_SIZE = 30;
    state: SpiderListPageState = {
        spiders: [],
        loaded: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            history.push("/login");
        } else {
            await this.getProjectSpiders(this.page);
        }
    }

    async getProjectSpiders(page: number): Promise<void> {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId, page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                const spiders: Spider[] = results.results;
                this.setState({ spiders: [...spiders], loaded: true });
            },
            (error: unknown) => {
                console.error(error);
                history.push("/login");
            },
        );
    }

    render(): JSX.Element {
        const { loaded, spiders } = this.state;
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
                                        className="project-list"
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
