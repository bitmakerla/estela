import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Row, Space, Table, Col, Button, Switch, Tag, message, ConfigProvider } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import history from "../../history";
import { ApiService } from "../../services";
import {
    ApiProjectsSpidersCronjobsUpdateRequest,
    ApiProjectsSpidersCronjobsDeleteRequest,
    ApiProjectsSpidersCronjobsRunOnceRequest,
    SpiderCronJobUpdateStatusEnum,
    ApiProjectsCronjobsRequest,
    SpiderCronJobStatusEnum,
    ApiProjectsReadRequest,
    ProjectCronJob,
    SpiderCronJob,
    Project,
} from "../../services/api";
import { resourceNotAllowedNotification, incorrectDataNotification, Spin, PaginationItem } from "../../shared";
import CronjobCreateModal from "../CronjobCreateModal";
import { convertDateToString } from "../../utils";

const { Content } = Layout;

interface Ids {
    sid: number;
    cid: number | undefined;
}

interface TagsData {
    name: string;
}

interface Args {
    name: string;
    value: string;
}

interface SpiderCronJobData {
    id: Ids;
    key: number | undefined;
    date: string;
    status: string | undefined;
    schedule: string | undefined;
    dataExpiryDays: number | undefined | null;
    dataStatus: string | undefined;
    tags: TagsData[] | undefined;
    args: Args[] | undefined;
}

interface ProjectCronJobListPageState {
    name: string;
    cronjobs: SpiderCronJobData[];
    selectedRows: SpiderCronJobData[];
    loadedCronjobs: boolean;
    count: number;
    current: number;
    loading: boolean;
    page: number;
}

interface RouteParams {
    projectId: string;
}

export class ProjectCronJobListPage extends Component<RouteComponentProps<RouteParams>, ProjectCronJobListPageState> {
    PAGE_SIZE = 10;
    state: ProjectCronJobListPageState = {
        name: "",
        cronjobs: [],
        selectedRows: [],
        loadedCronjobs: false,
        count: 0,
        current: 0,
        loading: false,
        page: 1,
    };

    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    countKey = 0;
    hourFormat = "HH:mm";
    dateFormat = "MMM D, YYYY";

    dataPersistenceOptions = [
        { label: "1 day", key: 1, value: 1 },
        { label: "1 week", key: 2, value: 7 },
        { label: "1 month", key: 3, value: 30 },
        { label: "3 months", key: 4, value: 90 },
        { label: "6 months", key: 5, value: 180 },
        { label: "1 year", key: 6, value: 365 },
        { label: "Forever", key: 7, value: 720 },
    ];

    repeatOptions = [
        { label: "Hourly", key: 1, value: "hourly" },
        { label: "Daily", key: 2, value: "daily" },
        { label: "Weekly", key: 3, value: "weekly" },
        { label: "Monthly", key: 4, value: "monthly" },
        { label: "Yearly", key: 5, value: "yearly" },
        { label: "Custom ...", key: 6, value: "custom" },
    ];

    recurrenceOptions = [
        { label: "Days", key: 1, value: "days" },
        { label: "Weeks", key: 2, value: "weeks" },
        { label: "Months", key: 3, value: "months" },
        { label: "Years", key: 4, value: "years" },
    ];

    weekOptions = [
        { label: "S", key: 0, value: 0 },
        { label: "M", key: 1, value: 1 },
        { label: "T", key: 2, value: 2 },
        { label: "W", key: 3, value: 3 },
        { label: "T", key: 4, value: 4 },
        { label: "F", key: 5, value: 5 },
        { label: "S", key: 6, value: 6 },
    ];

    columns = [
        {
            title: "ENABLED",
            key: "status",
            dataIndex: "status",
            render: (status: string, cronjob: SpiderCronJobData) => {
                return (
                    <Switch
                        size="small"
                        className="bg-estela-white-low"
                        checked={status === SpiderCronJobStatusEnum.Active}
                        onChange={() => this.updateStatus(cronjob)}
                    />
                );
            },
        },
        {
            title: "SCHEDULED JOB",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}/cronjobs/${id.cid}`}>{id.cid}</Link>
            ),
        },
        {
            title: "SPIDER",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}`}>{id.sid}</Link>
            ),
        },
        {
            title: "ARGUMENTS",
            dataIndex: "args",
            key: "args",
            render: (args: Args[]): ReactElement => (
                <Content>
                    {args.map((arg: Args, id: number) => (
                        <Tag key={id} className="text-xs text-estela border-estela rounded bg-button-hover">
                            {arg.name}: {arg.value}
                        </Tag>
                    ))}
                </Content>
            ),
        },
        {
            title: "EXPRESSION",
            key: "schedule",
            dataIndex: "schedule",
        },
        {
            title: "TAGS",
            key: "tags",
            dataIndex: "tags",
            render: (tags: TagsData[]): ReactElement => (
                <Content>
                    {tags.map((tag: TagsData, id) => (
                        <Tag key={id} className="text-estela border-estela rounded bg-button-hover">
                            {tag.name}
                        </Tag>
                    ))}
                </Content>
            ),
        },
        {
            title: "PERSISTENCE",
            key: "dataExpiryDays",
            dataIndex: "dataExpiryDays",
            render: (dataExpiryDays: number, cronjob: SpiderCronJobData): ReactElement => (
                <p>{cronjob.dataStatus == "PENDING" ? `${dataExpiryDays} days` : "Forever"}</p>
            ),
        },
    ];

    async componentDidMount(): Promise<void> {
        const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
        this.apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                this.setState({ name: response.name });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
        this.getCronJobs(this.state.page);
    }

    getCronJobs = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsCronjobsRequest = {
            pid: this.projectId,
            page,
            pageSize: this.PAGE_SIZE,
        };

        await this.apiService.apiProjectsCronjobs(requestParams).then((response: ProjectCronJob) => {
            const data = response.results.map((cronjob: SpiderCronJob, iterator: number) => ({
                key: iterator,
                id: { sid: cronjob.spider, cid: cronjob.cjid },
                date: convertDateToString(cronjob.created),
                status: cronjob.status,
                schedule: cronjob.schedule,
                dataExpiryDays: cronjob.dataExpiryDays,
                dataStatus: cronjob.dataStatus,
                tags: cronjob.ctags,
                args: cronjob.cargs,
            }));
            const cronjobs: SpiderCronJobData[] = data;
            this.setState({ cronjobs: [...cronjobs], loadedCronjobs: true, count: response.count, current: page });
        });
    };

    updateStatus = (cronjob: SpiderCronJobData): void => {
        const _status =
            cronjob.status == SpiderCronJobUpdateStatusEnum.Disabled
                ? SpiderCronJobUpdateStatusEnum.Active
                : SpiderCronJobUpdateStatusEnum.Disabled;
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: Number(cronjob.id.cid),
            sid: String(cronjob.id.sid),
            pid: this.projectId,
            data: {
                status: _status,
            },
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then(
            (response) => {
                message.success(`ScheduledJob ${response.cjid} ${response.status}`);
                this.getCronJobs(this.state.page);
            },
            (error: unknown) => {
                error;
                incorrectDataNotification();
            },
        );
    };

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ page: page });
        await this.getCronJobs(page);
    };

    runOnceRows = (): void => {
        this.state.selectedRows.map((row) => {
            this.runOnce(row);
        });
    };

    deleteRows = (): void => {
        this.state.selectedRows.map((row) => {
            this.deleteCronjob(row);
        });
        this.setState({ selectedRows: [] });
    };

    goCronjobDetail = (): void => {
        this.editCronjob(this.state.selectedRows[0]);
    };

    editCronjob = (cronjob: SpiderCronJobData): void => {
        history.push(`/projects/${this.projectId}/spiders/${cronjob.id.sid}/cronjobs/${cronjob.id.cid}`);
    };

    runOnce = (cronjob: SpiderCronJobData): void => {
        const requestParams: ApiProjectsSpidersCronjobsRunOnceRequest = {
            pid: this.projectId,
            sid: String(cronjob.id.sid),
            cjid: Number(cronjob.id.cid),
        };
        this.apiService.apiProjectsSpidersCronjobsRunOnce(requestParams).then(
            async (response: SpiderCronJob) => {
                response;
            },
            (error: unknown) => {
                error;
            },
        );
    };

    deleteCronjob = (cronjob: SpiderCronJobData): void => {
        const requestParams: ApiProjectsSpidersCronjobsDeleteRequest = {
            pid: this.projectId,
            sid: String(cronjob.id.sid),
            cjid: Number(cronjob.id.cid),
        };
        this.apiService.apiProjectsSpidersCronjobsDelete(requestParams).then(
            () => {
                this.getCronJobs(1);
            },
            (error: unknown) => {
                message.error(`Failed action: ${error}`);
            },
        );
    };

    rowSelection = {
        onChange: (selectedRowKeys: React.Key[], selectedRows: SpiderCronJobData[]) => {
            this.setState({ selectedRows: selectedRows });
        },
    };

    render(): JSX.Element {
        const { loadedCronjobs, cronjobs, selectedRows, count, current } = this.state;
        return (
            <Content className="bg-metal rounded-2xl">
                {loadedCronjobs ? (
                    <Layout className="bg-white">
                        <Content className="bg-metal rounded-2xl">
                            <div className="lg:m-10 m-6">
                                <Row className="flow-root my-6">
                                    <Col className="float-left">
                                        <p className="text-xl font-medium text-silver float-left">SCHEDULED JOBS</p>
                                    </Col>
                                    <Col className="float-right">
                                        <CronjobCreateModal projectId={this.projectId} />
                                    </Col>
                                </Row>
                                <Content className="bg-white rounded-lg p-4">
                                    <ConfigProvider renderEmpty={() => <p>No scheduled jobs yet.</p>}>
                                        <Table
                                            rowSelection={{
                                                type: "checkbox",
                                                ...this.rowSelection,
                                            }}
                                            columns={this.columns}
                                            dataSource={cronjobs}
                                            pagination={false}
                                            size="small"
                                        />
                                    </ConfigProvider>
                                </Content>
                                <Row className="my-2">
                                    <Space direction="horizontal">
                                        <Button
                                            disabled={selectedRows.length === 0}
                                            onClick={this.deleteRows}
                                            className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl"
                                        >
                                            Delete
                                        </Button>
                                        <Button
                                            disabled={selectedRows.length !== 1}
                                            onClick={this.goCronjobDetail}
                                            className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            disabled={selectedRows.length !== 1}
                                            onClick={this.runOnceRows}
                                            className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                        >
                                            Run once
                                        </Button>
                                    </Space>
                                </Row>
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
                            </div>
                        </Content>
                    </Layout>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    }
}
