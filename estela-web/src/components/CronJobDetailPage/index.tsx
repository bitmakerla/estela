import React, { Component, ReactElement } from "react";
import moment from "moment";
import {
    Layout,
    Typography,
    Row,
    Col,
    Card,
    Space,
    Tabs,
    Tag,
    Modal,
    Table,
    Switch,
    Button,
    InputNumber,
    DatePicker,
    TimePicker,
    Pagination,
    Select,
    Radio,
    Checkbox,
    Input,
    message,
    Tooltip,
} from "antd";
import type { DatePickerProps, RadioChangeEvent } from "antd";
import cronstrue from "cronstrue";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import Run from "../../assets/icons/play.svg";
import Edit from "../../assets/icons/edit.svg";
import Filter from "../../assets/icons/filter.svg";
import Setting from "../../assets/icons/setting.svg";
import Pause from "../../assets/icons/pause.svg";
import {
    ApiProjectsSpidersCronjobsUpdateRequest,
    ApiProjectsSpidersCronjobsReadRequest,
    ApiProjectsSpidersJobsListRequest,
    ApiProjectsSpidersCronjobsRunOnceRequest,
    SpiderCronJob,
    SpiderJobEnvVar,
    SpiderJob,
    SpiderCronJobUpdateStatusEnum,
    SpiderCronJobDataStatusEnum,
    SpiderCronJobUpdate,
    SpiderCronJobUpdateDataStatusEnum,
} from "../../services/api";
import { resourceNotAllowedNotification, incorrectDataNotification, Spin, PaginationItem } from "../../shared";
import { convertDateToString } from "../../utils";

const { Option } = Select;
const { Content } = Layout;
const { Text } = Typography;

interface ArgsData {
    name: string;
    value: string;
}

interface TagsData {
    name: string;
}

interface SpiderJobData {
    id: number | undefined;
    sid: number | undefined;
    key: number | undefined;
    date: string;
    status: string | undefined;
    cronjob: number | null | undefined;
    tags: TagsData[] | undefined;
    args: ArgsData[] | undefined;
}

interface OptionDataRepeat {
    label: string;
    key: number;
    value: string;
}

interface OptionDataPersistance {
    label: string;
    key: number;
    value: number;
}

interface CronJobDetailPageState {
    loaded: boolean;
    name: string | undefined;
    args: ArgsData[];
    envVars: SpiderJobEnvVar[];
    tags: TagsData[];
    status: string | undefined;
    jobs: SpiderJobData[];
    created: string;
    currentDay: number;
    modalVisible: boolean;
    date: moment.Moment;
    repeat: string;
    expression: string;
    recurrence: string;
    recurrenceNum: number;
    schedulesFlag: boolean[];
    weekDays: boolean[];
    queueJobs: SpiderJobData[];
    runningJobs: SpiderJobData[];
    completedJobs: SpiderJobData[];
    errorJobs: SpiderJobData[];
    count: number;
    current: number;
    tableStatus: boolean[];
    schedule: string | undefined;
    unique_collection: boolean | undefined;
    new_schedule: string | undefined;
    dataStatus: SpiderCronJobUpdateDataStatusEnum | SpiderCronJobDataStatusEnum | undefined;
    dataExpiryDays: number | null | undefined;
    loading_status: boolean;
    modified: boolean;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    cronjobId: string;
}

export class CronJobDetailPage extends Component<RouteComponentProps<RouteParams>, CronJobDetailPageState> {
    PAGE_SIZE = 10;
    initial_schedule = "";
    state = {
        loaded: false,
        name: "",
        args: [],
        envVars: [],
        tags: [],
        jobs: [],
        currentDay: 1,
        date: moment(),
        expression: "",
        repeat: "hourly",
        created: "",
        queueJobs: [],
        runningJobs: [],
        completedJobs: [],
        errorJobs: [],
        recurrence: "weeks",
        recurrenceNum: 1,
        schedulesFlag: [true, false],
        weekDays: new Array<boolean>(7).fill(false),
        modalVisible: false,
        tableStatus: new Array<boolean>(4).fill(true),
        status: "",
        schedule: "",
        unique_collection: false,
        new_schedule: "",
        count: 0,
        current: 0,
        dataStatus: undefined,
        dataExpiryDays: 0,
        loading_status: false,
        modified: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    cronjobId: number = parseInt(this.props.match.params.cronjobId);
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
            title: "SCHEDULED JOB",
            key: "cronjob",
            dataIndex: "cronjob",
            render: (cronjob: number): ReactElement =>
                cronjob ? (
                    <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob}`}>
                        {cronjob}
                    </Link>
                ) : (
                    <div></div>
                ),
        },
        {
            title: "SPIDER",
            dataIndex: "sid",
            key: "sid",
            render: (spiderID: number): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`}>{spiderID}</Link>
            ),
        },
        {
            title: "JOB",
            dataIndex: "id",
            key: "id",
            render: (jobID: number): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${jobID}`}>{jobID}</Link>
            ),
        },
        {
            title: "LAUNCH DATE",
            dataIndex: "date",
            key: "date",
        },
        {
            title: "ARGUMENTS",
            dataIndex: "args",
            key: "args",
            render: (args: ArgsData[]): ReactElement => (
                <Content>
                    {args.map((arg: ArgsData, id: number) => (
                        <Tag key={id} className="text-xs text-estela border-estela rounded bg-button-hover">
                            {arg.name}: {arg.value}
                        </Tag>
                    ))}
                </Content>
            ),
        },
        {
            title: "TAGS",
            dataIndex: "tags",
            key: "tags",
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
    ];

    async componentDidMount(): Promise<void> {
        const requestParams: ApiProjectsSpidersCronjobsReadRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            cjid: this.cronjobId,
        };
        this.apiService.apiProjectsSpidersCronjobsRead(requestParams).then(
            async (response: SpiderCronJob) => {
                const args = response.cargs || [];
                const envVars = response.cenvVars || [];
                const tags = response.ctags || [];
                this.initial_schedule = response.schedule || "";
                const data = await this.getJobs(1);
                const errorJobs = data.data.filter((job: SpiderJobData) => job.status === "ERROR");
                const completedJobs = data.data.filter((job: SpiderJobData) => job.status === "COMPLETED");
                const runningJobs = data.data.filter((job: SpiderJobData) => job.status === "RUNNING");
                const queueJobs = data.data.filter((job: SpiderJobData) => job.status === "IN_QUEUE");
                const tableStatus = [
                    queueJobs.length === 0 ? false : true,
                    runningJobs.length === 0 ? false : true,
                    completedJobs.length === 0 ? false : true,
                    errorJobs.length === 0 ? false : true,
                ];
                const weekDays = this.state.weekDays;
                weekDays[moment().day() % 7] = true;
                const jobs: SpiderJobData[] = data.data;
                this.setState({
                    name: response.name,
                    args: [...args],
                    envVars: [...envVars],
                    tags: [...tags],
                    status: response.status,
                    schedule: response.schedule,
                    created: convertDateToString(response.created),
                    unique_collection: response.uniqueCollection,
                    jobs: [...jobs],
                    count: data.count,
                    current: data.current,
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays == null ? 1 : response.dataExpiryDays,
                    loaded: true,
                    errorJobs: [...errorJobs],
                    completedJobs: [...completedJobs],
                    runningJobs: [...runningJobs],
                    queueJobs: [...queueJobs],
                    tableStatus: [...tableStatus],
                    currentDay: moment().day(),
                    weekDays: weekDays,
                });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    }

    handleInputChange = (event: string): void => {
        this.setState({ new_schedule: event });
        this.updateSchedule(event);
    };

    updateSchedule = (_schedule: string): void => {
        const requestData: SpiderCronJobUpdate = {
            schedule: _schedule,
        };
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            pid: this.projectId,
            sid: this.spiderId,
            data: requestData,
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then(
            (response: SpiderCronJobUpdate) => {
                this.setState({ schedule: response.schedule });
                message.success("Schedule updated successfully");
            },
            (error: unknown) => {
                error;
                incorrectDataNotification();
            },
        );
    };

    updateDataExpiry = (): void => {
        this.setState({ loading_status: true });
        const requestData: SpiderCronJobUpdate = {
            dataStatus: this.state.dataStatus,
            dataExpiryDays: this.state.dataExpiryDays,
        };
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            pid: this.projectId,
            sid: this.spiderId,
            data: requestData,
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then(
            (response: SpiderCronJobUpdate) => {
                this.setState({
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays,
                    modified: false,
                    loading_status: false,
                });
            },
            (error: unknown) => {
                error;
                incorrectDataNotification();
            },
        );
    };

    getJobs = async (page: number): Promise<{ data: SpiderJobData[]; count: number; current: number }> => {
        const requestParams: ApiProjectsSpidersJobsListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            page,
            pageSize: this.PAGE_SIZE,
            cronjob: this.cronjobId,
        };
        const response = await this.apiService.apiProjectsSpidersJobsList(requestParams);
        const data = response.results.map((job: SpiderJob, iterator: number) => ({
            key: iterator,
            id: job.jid,
            sid: job.spider,
            args: job.args,
            date: convertDateToString(job.created),
            status: job.jobStatus,
            tags: job.tags,
            cronjob: job.cronjob,
        }));
        return { data: data, count: response.count, current: page };
    };

    onPageChange = async (page: number): Promise<void> => {
        const data = await this.getJobs(page);
        const jobs: SpiderJobData[] = data.data;
        const errorJobs = jobs.filter((job: SpiderJobData) => job.status === "ERROR");
        const completedJobs = jobs.filter((job: SpiderJobData) => job.status === "COMPLETED");
        const runningJobs = jobs.filter((job: SpiderJobData) => job.status === "RUNNING");
        const queueJobs = jobs.filter((job: SpiderJobData) => job.status === "IN_QUEUE");
        const tableStatus = [
            queueJobs.length === 0 ? false : true,
            runningJobs.length === 0 ? false : true,
            completedJobs.length === 0 ? false : true,
            errorJobs.length === 0 ? false : true,
        ];
        this.setState({
            jobs: [...jobs],
            errorJobs: [...errorJobs],
            completedJobs: [...completedJobs],
            runningJobs: [...runningJobs],
            queueJobs: [...queueJobs],
            tableStatus: [...tableStatus],
            count: data.count,
            current: data.current,
        });
    };

    onChangeDataPersistence = ({ target: { value } }: RadioChangeEvent): void => {
        if (value === 720) {
            this.setState({ dataStatus: SpiderCronJobUpdateDataStatusEnum.Persistent, modified: true });
        } else {
            this.setState({
                dataExpiryDays: value,
                dataStatus: SpiderCronJobUpdateDataStatusEnum.Pending,
                modified: true,
            });
        }
    };

    onChangeStatus = (index: number, count: number) => {
        if (count === 0) {
            const tableStatus = this.state.tableStatus;
            tableStatus[index] = !tableStatus[index];
            this.setState({ tableStatus: tableStatus });
        }
    };

    runOnce = (): void => {
        const requestParams: ApiProjectsSpidersCronjobsRunOnceRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            cjid: this.cronjobId,
        };
        this.apiService.apiProjectsSpidersCronjobsRunOnce(requestParams).then(
            async (response: SpiderCronJob) => {
                response;
                const data = await this.getJobs(1);
                const jobs: SpiderJobData[] = data.data;
                this.setState({ jobs: [...jobs] });
            },
            (error: unknown) => {
                error;
            },
        );
    };

    updateStatus = (_status: SpiderCronJobUpdateStatusEnum): void => {
        this.setState({ loading_status: true });
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            sid: this.spiderId,
            pid: this.projectId,
            data: {
                status: _status,
                schedule: this.state.schedule,
            },
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then(
            (response) => {
                this.setState({ status: response.status, loading_status: false });
            },
            (error: unknown) => {
                error;
                incorrectDataNotification();
            },
        );
    };

    onChangeSchedule = (id: number): void => {
        const checked = [false, false];
        checked[id] = true;
        this.setState({ schedulesFlag: checked, repeat: "hourly" });
        if (id == 1) {
            this.setState({ date: moment() });
        }
    };

    onChangeExpression = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        this.setState({ expression: e.target.value });
    };

    onChangeDate: DatePickerProps["onChange"] = (date) => {
        this.setState({ date: moment(date) });
    };

    handleRepeatChange = (value: string): void => {
        this.setState({ repeat: value });
    };

    onChangeRecurrence = (value: number | null) => {
        this.setState({ recurrenceNum: Number(value) });
    };

    handleRecurrenceChange = (value: string): void => {
        this.setState({ recurrence: value });
    };

    handleWeekChange = (value: number): void => {
        if (value % 7 != this.state.currentDay) {
            const weekDays = [...this.state.weekDays];
            weekDays[value] = !weekDays[value];
            this.setState({ weekDays: weekDays });
        }
    };

    getCustomExpression = (): string => {
        const { date, recurrence, recurrenceNum, weekDays } = this.state;
        let days = "";
        weekDays.map((day, index) => {
            if (day) {
                days += index + ",";
            }
        });

        switch (recurrence) {
            case "days":
                return `${date.minutes()} ${date.hours()} */${recurrenceNum} * *`;
            case "weeks":
                return `${date.minutes()} ${date.hours()} * * ${days.slice(0, -1)}`;
            case "months":
                return `${date.minutes()} ${date.hours()} ${date.date()} */${recurrenceNum} *`;
            case "years":
                return `${date.minutes()} ${date.hours()} ${date.date()} ${date.month() + 1}/${recurrenceNum * 12} *`;
            default:
                return `${date.minutes()} ${date.hours()} * ${recurrenceNum * 7} * ${days.slice(0, -1)}`;
        }
    };

    getExpression = (): string => {
        const { repeat, date } = this.state;
        switch (repeat) {
            case "hourly":
                return `${date.minutes()} * * * *`;
            case "daily":
                return `${date.minutes()} ${date.hours()} * * *`;
            case "weekly":
                return `${date.minutes()} ${date.hours()} * * ${date.day()}`;
            case "monthly":
                return `${date.minutes()} ${date.hours()} ${date.date()} * *`;
            case "yearly":
                return `${date.minutes()} ${date.hours()} ${date.date()} ${date.month() + 1} *`;
            default:
                return this.getCustomExpression();
        }
    };

    handleSubmit = (): void => {
        let expression = "";
        if (this.state.schedulesFlag[0]) {
            expression = this.state.expression;
        } else {
            expression = this.getExpression();
        }
        this.updateSchedule(expression);
        this.setState({ modalVisible: false });
    };

    overview = (): React.ReactNode => {
        const {
            args,
            date,
            envVars,
            count,
            current,
            tags,
            repeat,
            schedule,
            created,
            weekDays,
            expression,
            unique_collection,
            recurrenceNum,
            recurrence,
            schedulesFlag,
            modalVisible,
            tableStatus,
            errorJobs,
            completedJobs,
            runningJobs,
            queueJobs,
        } = this.state;
        return (
            <>
                <Content className="grid lg:grid-cols-3 grid-cols-1 gap-4 items-start lg:w-full">
                    <Card className="w-fit col-span-1" style={{ borderRadius: "8px" }} bordered={false}>
                        <Space direction="horizontal" className="flow-root items-center mx-4 w-full">
                            <Text className="float-left py-2 text-estela-black-medium font-medium text-base">
                                PERIOD
                            </Text>
                            <Button
                                icon={<Edit className="flex h-6 w-6" />}
                                onClick={() => this.setState({ modalVisible: true })}
                                size="large"
                                className="float-right stroke-estela-blue-full border-none"
                            ></Button>
                            <Modal
                                style={{
                                    overflow: "hidden",
                                    padding: 0,
                                }}
                                centered
                                width={380}
                                open={modalVisible}
                                title={<Text className="text-xl ml-16 text-center font-normal">NEW SCHEDULED JOB</Text>}
                                onCancel={() => this.setState({ modalVisible: false })}
                                footer={null}
                            >
                                <Col className="schedule">
                                    <Text className="text-base">Select a period</Text>
                                    <Content>
                                        <Content className="flex items-center my-2">
                                            <Switch
                                                className="bg-estela-white-low"
                                                size="small"
                                                checked={schedulesFlag[0]}
                                                onChange={() => this.onChangeSchedule(0)}
                                            />
                                            <Text className="text-sm">&nbsp;By cron schedule expression</Text>
                                        </Content>
                                        {schedulesFlag[0] && (
                                            <Content className="my-3">
                                                <Text className="text-sm">Expression</Text>
                                                <Input
                                                    placeholder="5 4 * * *"
                                                    onChange={this.onChangeExpression}
                                                    size="large"
                                                    className="my-2 border-estela-blue-full placeholder:text-sm rounded-lg"
                                                />
                                                {expression.length == 0 && (
                                                    <Content>
                                                        <Text className="text-xs text-red-500 mb-2">
                                                            This field is mandatory
                                                        </Text>
                                                        <br />
                                                    </Content>
                                                )}
                                                <Text className="text-xs">
                                                    More information about cron schedule expressions&nbsp;
                                                </Text>
                                                <a
                                                    className="text-estela-blue-full text-xs font-medium"
                                                    href="https://crontab.guru/"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    here
                                                </a>
                                            </Content>
                                        )}
                                    </Content>
                                    <Content className="mt-2 mb-4">
                                        <Content className="flex items-center">
                                            <Switch
                                                className="bg-estela-white-low"
                                                size="small"
                                                checked={schedulesFlag[1]}
                                                onChange={() => this.onChangeSchedule(1)}
                                            />
                                            <Text className="text-sm">&nbsp;Advanced</Text>
                                        </Content>
                                        {schedulesFlag[1] && (
                                            <Content className="my-2">
                                                <Content className="my-3">
                                                    <Space direction="horizontal">
                                                        <Space direction="vertical">
                                                            <p className="text-sm">Date</p>
                                                            <DatePicker
                                                                onChange={this.onChangeDate}
                                                                size="large"
                                                                className="border-estela-blue-full rounded-lg"
                                                                defaultValue={date}
                                                                format={this.dateFormat}
                                                            />
                                                        </Space>
                                                        <Space direction="vertical">
                                                            <p className="text-sm">Hour</p>
                                                            <TimePicker
                                                                onChange={this.onChangeDate}
                                                                size="large"
                                                                className="border-estela-blue-full rounded-lg"
                                                                defaultValue={date}
                                                                format={this.hourFormat}
                                                            />
                                                        </Space>
                                                    </Space>
                                                </Content>
                                                <Content className="my-3">
                                                    <p className="text-sm my-3">Repeat</p>
                                                    <Select
                                                        onChange={this.handleRepeatChange}
                                                        className="w-full"
                                                        size="large"
                                                        defaultValue={"hourly"}
                                                    >
                                                        {this.repeatOptions.map((option: OptionDataRepeat) => (
                                                            <Option
                                                                className="text-sm"
                                                                key={option.key}
                                                                value={option.value}
                                                            >
                                                                {option.label}
                                                            </Option>
                                                        ))}
                                                    </Select>
                                                </Content>
                                                {repeat === "custom" && (
                                                    <Content className="my-3">
                                                        <Text className="text-sm my-4">Custom recurrence</Text>
                                                        <Space direction="horizontal" className="my-3">
                                                            <p className="text-sm">Every</p>
                                                            <InputNumber
                                                                onChange={this.onChangeRecurrence}
                                                                min={1}
                                                                max={12}
                                                                size="large"
                                                                className="border-estela-blue-full rounded-lg"
                                                                value={recurrenceNum}
                                                            />
                                                            <Select
                                                                onChange={this.handleRecurrenceChange}
                                                                className="w-full"
                                                                size="large"
                                                                defaultValue={recurrence}
                                                            >
                                                                {this.recurrenceOptions.map(
                                                                    (option: OptionDataRepeat) => (
                                                                        <Option
                                                                            className="text-sm"
                                                                            key={option.key}
                                                                            value={option.value}
                                                                        >
                                                                            {option.label}
                                                                        </Option>
                                                                    ),
                                                                )}
                                                            </Select>
                                                        </Space>
                                                        {recurrence === "weeks" && (
                                                            <Content>
                                                                <Text className="text-sm">Repeat on</Text>
                                                                <Space
                                                                    className="grid grid-cols-7 mb-6 mt-2 mx-2"
                                                                    direction="horizontal"
                                                                >
                                                                    {this.weekOptions.map(
                                                                        (option: OptionDataPersistance) => (
                                                                            <Checkbox
                                                                                key={option.key}
                                                                                onChange={() => {
                                                                                    this.handleWeekChange(option.value);
                                                                                }}
                                                                                checked={weekDays[option.key]}
                                                                            >
                                                                                {option.label}
                                                                            </Checkbox>
                                                                        ),
                                                                    )}
                                                                </Space>
                                                            </Content>
                                                        )}
                                                    </Content>
                                                )}
                                            </Content>
                                        )}
                                    </Content>
                                    <Row className="grid grid-cols-2 gap-1">
                                        <Button
                                            disabled={expression.length == 0 && !schedulesFlag[1]}
                                            onClick={this.handleSubmit}
                                            size="large"
                                            className="h-12 bg-estela-blue-full border-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                        >
                                            Save changes
                                        </Button>
                                        <Button
                                            size="large"
                                            className="h-12 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                            onClick={() => this.setState({ modalVisible: false })}
                                        >
                                            Cancel
                                        </Button>
                                    </Row>
                                </Col>
                            </Modal>
                        </Space>
                        <Space direction="vertical" className="mx-4">
                            <Text className="text-estela-black-full font-medium">Launch date</Text>
                            <Text className="text-estela-black-medium leading-5">{created}</Text>
                            <Text className="text-estela-black-full font-medium">Repeat every</Text>
                            <Text className="text-estela-black-medium leading-5">{cronstrue.toString(schedule)}</Text>
                        </Space>
                    </Card>
                    <Card className="w-full col-span-2" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">DETAILS</Text>
                        <Row className="grid grid-cols-3 py-1 px-4 mt-4">
                            <Col>Sche-Job ID</Col>
                            <Col>{this.cronjobId}</Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg">
                            <Col>Spider</Col>
                            <Col>
                                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`}>{this.spiderId}</Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-4">
                            <Col className="col-span-1">Project ID</Col>
                            <Col className="col-span-2">
                                <Link
                                    to={`/projects/${this.projectId}/dashboard`}
                                    className="hover:text-estela-blue-medium"
                                >
                                    {this.projectId}
                                </Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg">
                            <Col>Creation date</Col>
                            <Col>{created}</Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-4 rounded-lg">
                            <Col>Unique collection</Col>
                            <Col>
                                {unique_collection ? (
                                    <Tag
                                        className="border-estela-green-full bg-estela-blue-low text-estela-green-full rounded-md"
                                        key={"true"}
                                    >
                                        Yes
                                    </Tag>
                                ) : (
                                    <Tag
                                        className="border-estela-black-medium text-estela-black-medium rounded-md"
                                        key={"false"}
                                    >
                                        No
                                    </Tag>
                                )}
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4">
                            <Col>Tags</Col>
                            <Col>
                                <Space direction="horizontal">
                                    {tags.map((tag: TagsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {tag.name}
                                        </Tag>
                                    ))}
                                    {tags.length == 0 && (
                                        <Text className="text-estela-black-medium text-xs">No Arguments</Text>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-4 rounded-lg">
                            <Col>Environment variables</Col>
                            <Col>
                                <Space direction="vertical">
                                    {envVars.map((envVar: SpiderJobEnvVar, id) =>
                                        envVar.masked ? (
                                            <Tooltip title="Masked variable" showArrow={false} className="tooltip">
                                                <Tag className="environment-variables" key={id}>
                                                    {envVar.name}
                                                </Tag>
                                            </Tooltip>
                                        ) : (
                                            <Tag className="environment-variables" key={id}>
                                                {envVar.name}: {envVar.value}
                                            </Tag>
                                        ),
                                    )}
                                    {envVars.length == 0 && (
                                        <Text className="text-estela-black-medium text-xs">No Arguments</Text>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-4">
                            <Col>Arguments</Col>
                            <Col>
                                <Space direction="horizontal">
                                    {args.map((arg: ArgsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {arg.name}: {arg.value}
                                        </Tag>
                                    ))}
                                    {args.length == 0 && (
                                        <Text className="text-estela-black-medium text-xs">No Arguments</Text>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                    </Card>
                </Content>
                <Content className="my-4">
                    <Row className="flow-root lg:my-6 my-4">
                        <Text className="float-left text-estela-black-full font-medium text-2xl">Associated jobs</Text>
                        <Button
                            onClick={() => this.setState({ tableStatus: Array(4).fill(true) })}
                            className="float-right py-1 px-3 text-estela-blue-full border-none text-base font-medium hover:text-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                        >
                            See all
                        </Button>
                    </Row>
                    <Content className="grid gap-2 grid-cols-1 lg:grid-cols-5 items-start w-full">
                        <Col className="float-left col-span-4">
                            {tableStatus[0] && (
                                <Row className="my-2 rounded-lg bg-white">
                                    <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                        <Col className="float-left py-1">
                                            <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                                In queue
                                            </Text>
                                            <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                {queueJobs.length}
                                            </Tag>
                                        </Col>
                                        <Col className="flex float-right">
                                            <Button
                                                disabled={true}
                                                icon={<Filter className="h-6 w-6 mr-2" />}
                                                size="large"
                                                className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                            >
                                                Filter
                                            </Button>
                                            <Button
                                                icon={<Setting className="h-6 w-6" />}
                                                size="large"
                                                className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                            ></Button>
                                        </Col>
                                    </Content>
                                    <Content className="mx-4 my-1">
                                        <Table
                                            scroll={{}}
                                            size="small"
                                            rowSelection={{
                                                type: "checkbox",
                                            }}
                                            columns={this.columns}
                                            dataSource={queueJobs}
                                            pagination={false}
                                        />
                                    </Content>
                                    <Row className="w-full h-6 bg-estela-white-low"></Row>
                                    <Space direction="horizontal" className="my-2 mx-4">
                                        <Button
                                            disabled
                                            className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            disabled
                                            className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                        >
                                            Edit
                                        </Button>
                                    </Space>
                                </Row>
                            )}
                            {tableStatus[1] && (
                                <Row className="my-2 rounded-lg bg-white">
                                    <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                        <Col className="float-left py-1">
                                            <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                                Running
                                            </Text>
                                            <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                {runningJobs.length}
                                            </Tag>
                                        </Col>
                                        <Col className="flex float-right">
                                            <Button
                                                disabled={true}
                                                icon={<Filter className="h-6 w-6 mr-2" />}
                                                size="large"
                                                className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                            >
                                                Filter
                                            </Button>
                                            <Button
                                                icon={<Setting className="h-6 w-6" />}
                                                size="large"
                                                className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                            ></Button>
                                        </Col>
                                    </Content>
                                    <Content className="mx-4 my-1">
                                        <Table
                                            size="small"
                                            rowSelection={{
                                                type: "checkbox",
                                            }}
                                            columns={this.columns}
                                            dataSource={runningJobs}
                                            pagination={false}
                                        />
                                    </Content>
                                    <Row className="w-full h-6 bg-estela-white-low"></Row>
                                    <Space direction="horizontal" className="my-2 mx-4">
                                        <Button
                                            disabled
                                            className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl"
                                        >
                                            Cancel
                                        </Button>
                                    </Space>
                                </Row>
                            )}
                            {tableStatus[2] && (
                                <Row className="my-2 rounded-lg bg-white">
                                    <Row className="flow-root lg:m-4 mx-4 my-2 w-full">
                                        <Col className="float-left py-1">
                                            <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                                Completed
                                            </Text>
                                            <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                {completedJobs.length}
                                            </Tag>
                                        </Col>
                                        <Col className="flex float-right">
                                            <Button
                                                disabled={true}
                                                icon={<Filter className="h-6 w-6 mr-2" />}
                                                size="large"
                                                className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                            >
                                                Filter
                                            </Button>
                                            <Button
                                                icon={<Setting className="h-6 w-6" />}
                                                size="large"
                                                className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                            ></Button>
                                        </Col>
                                    </Row>
                                    <Content className="mx-4 my-1">
                                        <Table
                                            size="small"
                                            rowSelection={{
                                                type: "checkbox",
                                            }}
                                            columns={this.columns}
                                            dataSource={completedJobs}
                                            pagination={false}
                                        />
                                    </Content>
                                    <Row className="w-full h-6 bg-estela-white-low"></Row>
                                    <Space direction="horizontal" className="my-2 mx-4">
                                        <Button
                                            disabled
                                            className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                        >
                                            Run again
                                        </Button>
                                    </Space>
                                </Row>
                            )}
                            {tableStatus[3] && (
                                <Row className="my-2 rounded-lg bg-white">
                                    <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                        <Col className="float-left py-1">
                                            <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                                Error
                                            </Text>
                                            <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                {errorJobs.length}
                                            </Tag>
                                        </Col>
                                        <Col className="flex float-right">
                                            <Button
                                                disabled={true}
                                                icon={<Filter className="h-6 w-6 mr-2" />}
                                                size="large"
                                                className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                            >
                                                Filter
                                            </Button>
                                            <Button
                                                icon={<Setting className="h-6 w-6" />}
                                                size="large"
                                                className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                            ></Button>
                                        </Col>
                                    </Content>
                                    <Content className="mx-4 my-1">
                                        <Table
                                            size="small"
                                            rowSelection={{
                                                type: "checkbox",
                                            }}
                                            columns={this.columns}
                                            dataSource={errorJobs}
                                            pagination={false}
                                        />
                                    </Content>
                                    <Row className="w-full h-6 bg-estela-white-low"></Row>
                                    <Space direction="horizontal" className="my-2 mx-4">
                                        <Button
                                            disabled
                                            className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                        >
                                            Run again
                                        </Button>
                                    </Space>
                                </Row>
                            )}
                            <Row>
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
                            </Row>
                        </Col>
                        <Col className="float-right my-2 col-span-1 rounded-lg w-48 bg-white">
                            <Content className="my-2 mx-3">
                                <Text className="text-estela-black-medium font-medium text-xs">STATUS</Text>
                                <Content className="my-2">
                                    <Checkbox
                                        checked={queueJobs.length == 0 ? tableStatus[0] : true}
                                        onChange={() => this.onChangeStatus(0, queueJobs.length)}
                                    >
                                        <Space direction="horizontal">
                                            <Text className="text-estela-black-medium font-medium text-sm">Queue</Text>
                                            <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                {queueJobs.length}
                                            </Tag>
                                        </Space>
                                    </Checkbox>
                                    <br />
                                    <Checkbox
                                        checked={runningJobs.length == 0 ? tableStatus[1] : true}
                                        onChange={() => this.onChangeStatus(1, runningJobs.length)}
                                    >
                                        <Space direction="horizontal">
                                            <Text className="text-estela-black-medium font-medium text-sm">
                                                Running
                                            </Text>
                                            <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                {runningJobs.length}
                                            </Tag>
                                        </Space>
                                    </Checkbox>
                                    <br />
                                    <Checkbox
                                        checked={completedJobs.length == 0 ? tableStatus[2] : true}
                                        onChange={() => this.onChangeStatus(2, completedJobs.length)}
                                    >
                                        <Space direction="horizontal">
                                            <Text className="text-estela-black-medium font-medium text-sm">
                                                Completed
                                            </Text>
                                            <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                {completedJobs.length}
                                            </Tag>
                                        </Space>
                                    </Checkbox>
                                    <br />
                                    <Checkbox
                                        checked={errorJobs.length == 0 ? tableStatus[3] : true}
                                        onChange={() => this.onChangeStatus(3, errorJobs.length)}
                                    >
                                        <Space direction="horizontal">
                                            <Text className="text-estela-black-medium font-medium text-sm">Error</Text>
                                            <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                {errorJobs.length}
                                            </Tag>
                                        </Space>
                                    </Checkbox>
                                </Content>
                            </Content>
                        </Col>
                    </Content>
                </Content>
            </>
        );
    };

    dataPersistence = (): React.ReactNode => {
        const { dataExpiryDays, modified } = this.state;
        return (
            <>
                <Content>
                    <Row className="bg-white py-6 px-8 rounded-lg">
                        <Space direction="vertical" className="w-full">
                            <Text className="text-2xl text-black">Data persistence</Text>
                            <p className="text-sm text-estela-black-medium">
                                Data persistence will be applied to all jobs creadted from this schedue job by default.
                            </p>
                            <Space direction="horizontal">
                                <Text className="text-estela-black-full text-sm mr-2">
                                    Schedule jobs data persistence
                                </Text>
                                <Radio.Group
                                    className="my-2 grid lg:grid-cols-7 md:grid-cols-3 sm:grid-cols-2 gap-2"
                                    defaultValue={dataExpiryDays}
                                >
                                    {this.dataPersistenceOptions.map((option: OptionDataPersistance) => (
                                        <Radio.Button
                                            onChange={this.onChangeDataPersistence}
                                            className="w-24 h-8 rounded-2xl text-estela-black-medium text-sm"
                                            key={option.key}
                                            value={option.value}
                                        >
                                            &nbsp;{option.label}
                                        </Radio.Button>
                                    ))}
                                </Radio.Group>
                            </Space>
                            <Button
                                size="large"
                                disabled={!modified}
                                onClick={this.updateDataExpiry}
                                htmlType="submit"
                                className="border-estela h-12 md:w-96 sm:w-80 bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base"
                            >
                                Save Changes
                            </Button>
                        </Space>
                    </Row>
                </Content>
            </>
        );
    };

    render(): JSX.Element {
        const { loaded, status } = this.state;
        return (
            <Content className="content-padding">
                {loaded ? (
                    <Layout className="bg-white">
                        <Content className="bg-metal rounded-2xl">
                            <Row className="flow-root lg:mt-10 lg:mx-10 mt-6 mx-6">
                                <Col className="float-left">
                                    <Text className="text-estela-black-medium font-medium text-xl">
                                        Sche-Job-{this.cronjobId}
                                    </Text>
                                </Col>
                                <Col className="float-right flex gap-1">
                                    <Button
                                        disabled={true}
                                        icon={<Copy className="h-6 w-6 mr-2 text-sm" />}
                                        size="large"
                                        className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                    >
                                        Clone
                                    </Button>
                                    <Button
                                        onClick={this.runOnce}
                                        icon={<Run className="h-6 w-6 mr-2 text-sm" />}
                                        size="large"
                                        className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                    >
                                        Run once
                                    </Button>
                                    {status == SpiderCronJobUpdateStatusEnum.Active ? (
                                        <Button
                                            onClick={() => this.updateStatus(SpiderCronJobUpdateStatusEnum.Disabled)}
                                            icon={<Pause className="h-6 w-6 mr-2 text-sm" />}
                                            size="large"
                                            className="flex items-center stroke-estela-red-full border-estela-red-full hover:stroke-estela-red-full bg-estela-white text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-md"
                                        >
                                            Disable
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => this.updateStatus(SpiderCronJobUpdateStatusEnum.Active)}
                                            icon={<Run className="h-6 w-6 mr-2 text-sm" />}
                                            size="large"
                                            className="flex items-center stroke-white border-estela-red-full hover:stroke-estela-red-full bg-estela-red-full text-white hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-md"
                                        >
                                            Enable
                                        </Button>
                                    )}
                                </Col>
                            </Row>
                            <Row className="lg:mx-10 mx-6">
                                <Tabs
                                    size="middle"
                                    defaultActiveKey={"1"}
                                    items={[
                                        {
                                            label: "Overview",
                                            key: "1",
                                            children: this.overview(),
                                        },
                                        {
                                            label: "Data persistence",
                                            key: "2",
                                            children: this.dataPersistence(),
                                        },
                                    ]}
                                />
                            </Row>
                        </Content>
                    </Layout>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    }
}
