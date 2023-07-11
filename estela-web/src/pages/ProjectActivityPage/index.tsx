import React, { Component, ReactElement } from "react";
import { Layout, Space, Table, Row, Col, Button, Pagination } from "antd";
import type { ColumnsType } from "antd/es/table";
import { RouteComponentProps } from "react-router-dom";
import { ApiService } from "../../services";
import { ProjectActivity, ApiProjectsActivitiesRequest, Activity, UserDetail } from "../../services/api";
import { convertDateToString } from "../../utils";
import { UserContext, UserContextProps } from "../../context";

import "./styles.scss";
import Filter from "../../assets/icons/filter.svg";
import { Spin, PaginationItem } from "../../shared";

const { Content } = Layout;

interface ActivityState {
    key: number;
    created?: Date | undefined;
    description: string;
    user: UserDetail;
}

interface ProjectActivityPageState {
    loaded: boolean;
    activities: ActivityState[];
    modal: boolean;
    count: number;
    current: number;
}

interface RouteParams {
    projectId: string;
}

export class ProjectActivityPage extends Component<RouteComponentProps<RouteParams>, ProjectActivityPageState> {
    projectId: string = this.props.match.params.projectId;
    PAGE_SIZE = 10;
    static contextType = UserContext;
    apiService = ApiService();

    state: ProjectActivityPageState = {
        loaded: false,
        activities: [],
        modal: false,
        count: 0,
        current: 1,
    };

    columns: ColumnsType<ActivityState> = [
        {
            title: "DATE",
            dataIndex: "created",
            key: "created",
            render: (created: Date, activity: ActivityState): ReactElement => (
                <Content key={activity.key}>{convertDateToString(created)}</Content>
            ),
        },
        {
            title: "MEMBER",
            dataIndex: "user",
            key: "user",
            render: (user: UserDetail): ReactElement => (
                <p className="">{this.getUserDetails() === user.email ? "You" : user.username}</p>
            ),
        },
        {
            title: "ACTIVITY",
            dataIndex: "description",
            key: "description",
        },
    ];

    content: JSX.Element = (<Content className="flex flex-col"></Content>);

    async componentDidMount(): Promise<void> {
        await this.getProjectActivities(1);
    }

    getProjectActivities = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsActivitiesRequest = {
            pid: this.projectId,
            page: page,
            pageSize: this.PAGE_SIZE,
        };
        await this.apiService.apiProjectsActivities(requestParams).then(
            (response: ProjectActivity) => {
                const activities: ActivityState[] = response.results.map((activity: Activity, id: number) => {
                    return {
                        key: id,
                        ...activity,
                    };
                });
                this.setState({ loaded: true, activities: activities, count: response.count, current: page });
            },
            (error) => {
                console.log(error);
            },
        );
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getProjectActivities(page);
    };

    getUserDetails = (): string => {
        const { email } = this.context as UserContextProps;
        return email ?? "";
    };

    render(): JSX.Element {
        const { activities, loaded, count, current } = this.state;
        return (
            <Content className="bg-metal rounded-2xl">
                {loaded ? (
                    <div className="lg:m-10 md:mx-6 mx-2">
                        <Row className="flow-root my-6">
                            <Col className="float-left">
                                <p className="text-xl font-medium text-silver float-left">PROJECT ACTIVITY</p>
                            </Col>
                        </Row>
                        <Row className="bg-white rounded-lg">
                            <div className="m-4 w-full">
                                <Space direction="vertical" className="w-full">
                                    <Row justify="end" className="my-2">
                                        <Button
                                            disabled={true}
                                            icon={<Filter className="h-6 w-6 mr-2" />}
                                            size="large"
                                            className="flex items-center mr-2 stroke-estela border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                        >
                                            Filter
                                        </Button>
                                    </Row>
                                    <Table
                                        className="rounded-2xl"
                                        columns={this.columns}
                                        dataSource={activities}
                                        pagination={false}
                                        size="small"
                                        locale={{ emptyText: "No activity" }}
                                    />
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
