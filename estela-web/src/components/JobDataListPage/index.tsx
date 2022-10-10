import React, { Component, Fragment } from "react";
import { Layout, List, Pagination, Typography, Button, Modal, message, Input } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersJobsDataListRequest,
    ApiProjectsSpidersJobsDataDeleteRequest,
    DeleteJobData,
} from "../../services/api";
import {
    authNotification,
    resourceNotAllowedNotification,
    dataDeletedNotification,
    Header,
    ProjectSidenav,
    Spin,
} from "../../shared";

const { Content } = Layout;
const { Title } = Typography;
const { confirm } = Modal;

interface JobDataListPageState {
    data: unknown[];
    current: number;
    count: number;
    confirmationText: string;
    isOkDisabled: boolean;
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    jobId: string;
    dataType: string;
}

export class JobDataListPage extends Component<RouteComponentProps<RouteParams>, JobDataListPageState> {
    PAGE_SIZE = 10;
    state = {
        data: [],
        count: 0,
        current: 0,
        confirmationText: "",
        isOkDisabled: true,
        loaded: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    jobId: string = this.props.match.params.jobId;
    type: string = this.props.match.params.dataType;

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            await this.getSpiderJobData(1);
        }
    }

    deleteSpiderJobData = (): void => {
        const request: ApiProjectsSpidersJobsDataDeleteRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.jobId,
            type: this.type,
        };
        this.apiService.apiProjectsSpidersJobsDataDelete(request).then(
            (response: DeleteJobData) => {
                this.setState({ data: [], count: 0, current: 0, loaded: true });
                dataDeletedNotification(response.count);
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    };

    onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        this.setState({ confirmationText: e.target.value });
    };

    showConfirm = (): void => {
        confirm({
            title: "We are deleting your data from ...",
            okButtonProps: {
                danger: true,
                onClick: () => {
                    if (this.state.confirmationText === this.projectId) {
                        message.success("Your data is being deleted");
                        this.deleteSpiderJobData();
                        Modal.destroyAll();
                    } else {
                        message.error("Please write the correct ProjectId to delete");
                    }
                },
            },
            content: (
                <>
                    <p>
                        Project: <strong>{this.projectId}</strong>
                        <br />
                        Spider: <strong>{this.spiderId}</strong>
                        <br />
                        Job: <strong>{this.jobId}</strong>
                        <Input placeholder="Write {pid} to delete" onChange={this.onChange} />
                    </p>
                    <p>Are you sure?</p>
                </>
            ),
            onCancel: () => {
                console.log("Cancel action");
            },
        });
    };

    async getSpiderJobData(page: number): Promise<void> {
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.jobId,
            page,
            pageSize: this.PAGE_SIZE,
            type: this.type,
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: unknown[] = [];
                if (response.results) {
                    data = response.results;
                }
                this.setState({ data: [...data], count: response.count, current: page, loaded: true });
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    }

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        await this.getSpiderJobData(page);
    };

    render(): JSX.Element {
        const { loaded, data, count, current } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/jobs"} />
                    <Content>
                        {loaded ? (
                            <Layout className="white-background">
                                <Content>
                                    <List
                                        header={
                                            <Fragment>
                                                <Title level={3}>Spider Job {this.jobId + " " + this.type}</Title>
                                                <span>
                                                    <b>Total data items:</b> {count}
                                                </span>
                                            </Fragment>
                                        }
                                        bordered
                                        dataSource={data}
                                        renderItem={(item) => (
                                            <List.Item className="list-item">
                                                <div>
                                                    {Object.keys(item).map((key, idx) => {
                                                        return (
                                                            <div key={idx}>
                                                                <b>
                                                                    <span>{key}</span>:
                                                                </b>
                                                                &nbsp;
                                                                <span>{JSON.stringify(item[key])}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </List.Item>
                                        )}
                                        className="data-list"
                                    />
                                    <Button danger className="stop-job" onClick={this.showConfirm}>
                                        <div>Delete Job Data</div>
                                    </Button>
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
