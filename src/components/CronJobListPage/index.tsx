import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Layout, List, Pagination, Typography, Button } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersCronjobsListRequest,
    ApiProjectsSpidersReadRequest,
    SpiderCronJob,
    Spider,
} from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

interface CronjobListPageState {
    spiderName: string | undefined;
    cronjobs: SpiderCronJob[];
    current: number;
    count: number;
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
}

export class CronJobListPage extends Component<RouteComponentProps<RouteParams>, CronjobListPageState> {
    PAGE_SIZE = 10;
    state = {
        spiderName: "",
        cronjobs: [],
        count: 0,
        current: 0,
        loaded: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsSpidersReadRequest = { pid: this.projectId, sid: this.spiderId };
            this.apiService.apiProjectsSpidersRead(requestParams).then(
                async (response: Spider) => {
                    this.setState({ spiderName: response.name });
                    await this.getProjectCronJobs(1);
                },
                (error: unknown) => {
                    console.error(error);
                    resourceNotAllowedNotification();
                },
            );
        }
    }

    async getProjectCronJobs(page: number): Promise<void> {
        const requestParams: ApiProjectsSpidersCronjobsListRequest = {
            pid: this.projectId,
            page,
            sid: this.spiderId,
            pageSize: this.PAGE_SIZE,
        };
        this.apiService.apiProjectsSpidersCronjobsList(requestParams).then(
            (response) => {
                const cronjobs: SpiderCronJob[] = response.results;
                this.setState({ cronjobs: [...cronjobs], count: response.count, current: page, loaded: true });
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    }

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        await this.getProjectCronJobs(page);
    };

    render(): JSX.Element {
        const { loaded, cronjobs, count, current, spiderName } = this.state;
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
                                        header={<Title level={3}>Spider {spiderName} CronJobs</Title>}
                                        bordered
                                        dataSource={cronjobs}
                                        renderItem={(cronjob: SpiderCronJob) => (
                                            <List.Item>
                                                <Link
                                                    to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob.cjid}`}
                                                >
                                                    CronJob {cronjob.cjid} ({cronjob.schedule})
                                                </Link>
                                            </List.Item>
                                        )}
                                        className="cronjob-list"
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
                                    <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/create`}>
                                        <Button className="create-new-job">Create New CronJob</Button>
                                    </Link>
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
