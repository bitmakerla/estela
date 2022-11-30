import React, { Component, ReactElement } from "react";
import moment from "moment";
import {
    Layout,
    Pagination,
    Row,
    Space,
    Table,
    Modal,
    Col,
    Button,
    Input,
    Form,
    Switch,
    Select,
    Tag,
    Checkbox,
    Radio,
    message,
    InputNumber,
    TimePicker,
    DatePicker,
} from "antd";
import type { DatePickerProps, RadioChangeEvent } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import Add from "../../assets/icons/add.svg";
import {
    ApiProjectsSpidersCronjobsCreateRequest,
    ApiProjectsSpidersCronjobsUpdateRequest,
    ApiProjectsSpidersCronjobsDeleteRequest,
    ApiProjectsSpidersCronjobsRunOnceRequest,
    SpiderCronJobUpdateStatusEnum,
    ApiProjectsSpidersListRequest,
    ApiProjectsCronjobsRequest,
    SpiderCronJobStatusEnum,
    ApiProjectsReadRequest,
    SpiderCronJobCreate,
    ProjectCronJob,
    SpiderCronJob,
    Project,
    Spider,
} from "../../services/api";
import {
    authNotification,
    resourceNotAllowedNotification,
    invalidDataNotification,
    incorrectDataNotification,
    Header,
    ProjectSidenav,
    Spin,
} from "../../shared";
import { convertDateToString } from "../../utils";

const { Option } = Select;
const { Content } = Layout;

interface Ids {
    sid: number;
    cid: number | undefined;
}

interface Tags {
    name: string;
    key: number;
}

interface TagsData {
    name: string;
}

interface OptionDataPersistance {
    label: string;
    key: number;
    value: number;
}

interface OptionDataRepeat {
    label: string;
    key: number;
    value: string;
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

interface ArgsData {
    name: string;
    value: string;
    key: number;
}

interface EnvVarsData {
    name: string;
    value: string;
    key: number;
}

interface ProjectCronJobListPageState {
    name: string;
    spiders: Spider[];
    cronjobs: SpiderCronJobData[];
    selectedRows: SpiderCronJobData[];
    expression: string;
    repeat: string;
    currentDay: number;
    spiderId: string;
    dataExpireDays: number;
    dataStatus: string;
    uniqueCollection: boolean;
    date: moment.Moment;
    recurrence: string;
    recurrenceNum: number;
    schedulesFlag: boolean[];
    weekDays: boolean[];
    loadedCronjobs: boolean;
    loadedSpiders: boolean;
    modal: boolean;
    count: number;
    current: number;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    newTags: Tags[];
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newTagName: string;
}

interface RouteParams {
    projectId: string;
}

export class ProjectCronJobListPage extends Component<RouteComponentProps<RouteParams>, ProjectCronJobListPageState> {
    PAGE_SIZE = 10;
    state: ProjectCronJobListPageState = {
        name: "",
        spiders: [],
        expression: "",
        repeat: "hourly",
        currentDay: 1,
        dataExpireDays: 1,
        dataStatus: "PENDING",
        uniqueCollection: false,
        spiderId: "",
        date: moment(),
        recurrence: "weeks",
        recurrenceNum: 1,
        schedulesFlag: [true, false],
        weekDays: new Array<boolean>(7).fill(false),
        args: [],
        envVars: [],
        tags: [],
        newTags: [],
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newTagName: "",
        cronjobs: [],
        selectedRows: [],
        loadedCronjobs: false,
        loadedSpiders: false,
        modal: false,
        count: 0,
        current: 0,
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
                        defaultChecked={status === SpiderCronJobStatusEnum.Active}
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
            title: "SPIDER ID",
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
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
            this.apiService.apiProjectsRead(requestParams).then(
                (response: Project) => {
                    this.setState({ name: response.name });
                },
                (error: unknown) => {
                    console.error(error);
                    resourceNotAllowedNotification();
                },
            );
            this.getCronJobs(1);
            this.getProjectSpiders(1);
            const weekDays = this.state.weekDays;
            weekDays[moment().day() % 7] = true;
            this.setState({ currentDay: moment().day(), weekDays: weekDays });
        }
    }

    getProjectSpiders = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId, page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                if (results.results.length == 0 || results.results == undefined) {
                    this.setState({ spiders: [], loadedSpiders: true });
                } else {
                    this.setState({
                        spiders: [...results.results],
                        spiderId: String(results.results[0].sid),
                        loadedSpiders: true,
                    });
                }
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    };

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

        const requestData = {
            cargs: [...this.state.args],
            cenvVars: [...this.state.envVars],
            ctags: [...this.state.tags],
            schedule: expression,
            uniqueCollection: this.state.uniqueCollection,
            dataStatus: this.state.dataStatus,
            dataExpiryDays: `0/${this.state.dataExpireDays}`,
        };
        const request: ApiProjectsSpidersCronjobsCreateRequest = {
            data: requestData,
            pid: this.projectId,
            sid: this.state.spiderId,
        };
        this.apiService.apiProjectsSpidersCronjobsCreate(request).then(
            (response: SpiderCronJobCreate) => {
                history.push(`/projects/${this.projectId}/spiders/${this.state.spiderId}/cronjobs/${response.cjid}`);
            },
            (error: unknown) => {
                console.error(error);
                incorrectDataNotification();
            },
        );
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
                this.getCronJobs(1);
            },
            (error: unknown) => {
                console.log(error);
                incorrectDataNotification();
            },
        );
    };

    handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newArgName") {
            this.setState({ newArgName: value });
        } else if (name === "newArgValue") {
            this.setState({ newArgValue: value });
        } else if (name === "newEnvVarName") {
            this.setState({ newEnvVarName: value });
        } else if (name === "newEnvVarValue") {
            this.setState({ newEnvVarValue: value });
        } else if (name === "newTagName") {
            this.setState({ newTagName: value });
        }
    };

    addArgument = (): void => {
        const args = [...this.state.args];
        const newArgName = this.state.newArgName.trim();
        const newArgValue = this.state.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            args.push({ name: newArgName, value: newArgValue, key: this.countKey++ });
            this.setState({ args: [...args], newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    onChangeSchedule = (id: number): void => {
        const checked = [false, false];
        checked[id] = true;
        this.setState({ schedulesFlag: checked, repeat: "hourly" });
        if (id == 1) {
            this.setState({ date: moment() });
        }
    };

    onChangeUniqueCollection = (e: RadioChangeEvent): void => {
        this.setState({ uniqueCollection: e.target.value });
    };

    addEnvVar = (): void => {
        const envVars = [...this.state.envVars];
        const newEnvVarName = this.state.newEnvVarName.trim();
        const newEnvVarValue = this.state.newEnvVarValue.trim();
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({ name: newEnvVarName, value: newEnvVarValue, key: this.countKey++ });
            this.setState({ envVars: [...envVars], newEnvVarName: "", newEnvVarValue: "" });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };

    addTag = (): void => {
        const tags = [...this.state.tags];
        const newTags = [...this.state.newTags];
        const newTagName = this.state.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            newTags.push({ name: newTagName, key: this.countKey++ });
            tags.push({ name: newTagName });
            this.setState({ tags: [...tags], newTags: [...newTags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    handleRemoveEnvVar = (id: number): void => {
        const envVars = [...this.state.envVars];
        envVars.splice(id, 1);
        this.setState({ envVars: [...envVars] });
    };

    handleRemoveTag = (id: number): void => {
        const tags = [...this.state.tags];
        tags.splice(id, 1);
        this.setState({ tags: [...tags] });
    };

    handleRemoveArg = (id: number): void => {
        const args = [...this.state.args];
        args.splice(id, 1);
        this.setState({ args: [...args] });
    };

    handleRepeatChange = (value: string): void => {
        this.setState({ repeat: value });
    };

    handleRecurrenceChange = (value: string): void => {
        this.setState({ recurrence: value });
    };

    handlePersistenceChange = (value: number): void => {
        if (value == 720) {
            this.setState({ dataStatus: "PERSISTENT" });
        } else {
            this.setState({ dataExpireDays: value });
        }
    };

    handleWeekChange = (value: number): void => {
        if (value % 7 != this.state.currentDay) {
            const weekDays = [...this.state.weekDays];
            weekDays[value] = !weekDays[value];
            this.setState({ weekDays: weekDays });
        }
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getCronJobs(page);
    };

    onChangeRecurrence = (value: number | null) => {
        this.setState({ recurrenceNum: Number(value) });
    };

    onChangeExpression = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        this.setState({ expression: e.target.value });
    };

    onChangeDate: DatePickerProps["onChange"] = (date) => {
        this.setState({ date: moment(date) });
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
                console.log(response.cjid);
            },
            (error: unknown) => {
                console.log(error);
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
        const {
            loadedCronjobs,
            loadedSpiders,
            cronjobs,
            repeat,
            date,
            uniqueCollection,
            selectedRows,
            recurrence,
            recurrenceNum,
            schedulesFlag,
            weekDays,
            spiders,
            modal,
            count,
            current,
            args,
            envVars,
            newTags,
            newArgName,
            newArgValue,
            newEnvVarName,
            newEnvVarValue,
            newTagName,
        } = this.state;
        return (
            <Layout>
                <Header />
                <Layout className="bg-white">
                    <ProjectSidenav projectId={this.projectId} path={"/cronjobs"} />
                    <Content>
                        {loadedCronjobs && loadedSpiders ? (
                            <Layout className="bg-white">
                                <Content className="bg-metal rounded-2xl">
                                    <div className="lg:m-10 m-6">
                                        <Row className="flow-root">
                                            <Col className="float-left">
                                                <p className="text-xl font-medium text-silver float-left">
                                                    PROJECT MEMBERS
                                                </p>
                                            </Col>
                                            <Col className="float-right">
                                                <Button
                                                    icon={<Add className="mr-2" width={19} />}
                                                    size="large"
                                                    className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                    onClick={() => {
                                                        if (spiders.length > 0) {
                                                            this.setState({ modal: true });
                                                        } else {
                                                            message.error("You don't have any spider.");
                                                        }
                                                    }}
                                                >
                                                    Schedule new job
                                                </Button>
                                                <Modal
                                                    style={{
                                                        overflow: "hidden",
                                                        padding: 0,
                                                    }}
                                                    centered
                                                    width={900}
                                                    visible={modal}
                                                    title={
                                                        <p className="text-xl text-center mt-2 font-normal">
                                                            NEW SCHEDULED JOB
                                                        </p>
                                                    }
                                                    onCancel={() => this.setState({ modal: false })}
                                                    footer={null}
                                                >
                                                    <Row className="grid sm:grid-cols-2">
                                                        <Col className="mx-4">
                                                            <Content>
                                                                <p className="my-2 text-base">Spider</p>
                                                                <Select
                                                                    style={{ borderRadius: 16 }}
                                                                    size="large"
                                                                    className="w-full"
                                                                    defaultValue={spiders[0] ? spiders[0].name : ""}
                                                                >
                                                                    {spiders.map((spider: Spider) => (
                                                                        <Option
                                                                            onClick={() => {
                                                                                this.setState({
                                                                                    spiderId: String(spider.sid),
                                                                                });
                                                                            }}
                                                                            key={spider.sid}
                                                                            value={spider.name}
                                                                        >
                                                                            {spider.name}
                                                                        </Option>
                                                                    ))}
                                                                </Select>
                                                            </Content>
                                                            <Content>
                                                                <p className="text-base my-2">Data persistence</p>
                                                                <Select
                                                                    onChange={this.handlePersistenceChange}
                                                                    className="w-full"
                                                                    size="large"
                                                                    defaultValue={this.dataPersistenceOptions[0].value}
                                                                >
                                                                    {this.dataPersistenceOptions.map(
                                                                        (option: OptionDataPersistance) => (
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
                                                            </Content>
                                                            <Content>
                                                                <Space
                                                                    direction="horizontal"
                                                                    className="my-4 flex items-center"
                                                                >
                                                                    <p className="text-base mr-2">Unique Collection</p>
                                                                    <Radio.Group
                                                                        onChange={this.onChangeUniqueCollection}
                                                                        value={uniqueCollection}
                                                                    >
                                                                        <Radio value={true}>Yes</Radio>
                                                                        <Radio value={false}>No</Radio>
                                                                    </Radio.Group>
                                                                </Space>
                                                            </Content>
                                                            <Content>
                                                                <p className="text-base my-2">Arguments</p>
                                                                <Space direction="vertical">
                                                                    {args.map((arg: ArgsData, id) => (
                                                                        <Tag
                                                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                            closable
                                                                            key={arg.key}
                                                                            onClose={() => this.handleRemoveArg(id)}
                                                                        >
                                                                            {arg.name}: {arg.value}
                                                                        </Tag>
                                                                    ))}
                                                                    <Space direction="horizontal">
                                                                        <Input
                                                                            size="large"
                                                                            className="border-estela-blue-full rounded-l-lg"
                                                                            name="newArgName"
                                                                            placeholder="name"
                                                                            value={newArgName}
                                                                            onChange={this.handleInputChange}
                                                                        />
                                                                        <Input
                                                                            size="large"
                                                                            className="border-estela-blue-full rounded-r-lg"
                                                                            name="newArgValue"
                                                                            placeholder="value"
                                                                            value={newArgValue}
                                                                            onChange={this.handleInputChange}
                                                                        />
                                                                        <Button
                                                                            shape="circle"
                                                                            size="small"
                                                                            icon={<Add className="p-1" />}
                                                                            className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                            onClick={this.addArgument}
                                                                        ></Button>
                                                                    </Space>
                                                                </Space>
                                                            </Content>
                                                            <Content>
                                                                <p className="text-base my-2">Environment Variables</p>
                                                                <Space className="mb-2" direction="horizontal">
                                                                    {envVars.map((envVar: EnvVarsData, id: number) => (
                                                                        <Tag
                                                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                            closable
                                                                            key={envVar.key}
                                                                            onClose={() => this.handleRemoveEnvVar(id)}
                                                                        >
                                                                            {envVar.name}: {envVar.value}
                                                                        </Tag>
                                                                    ))}
                                                                </Space>
                                                                <Space direction="horizontal">
                                                                    <Input
                                                                        size="large"
                                                                        className="border-estela-blue-full rounded-l-lg"
                                                                        name="newEnvVarName"
                                                                        placeholder="name"
                                                                        value={newEnvVarName}
                                                                        onChange={this.handleInputChange}
                                                                    />
                                                                    <Input
                                                                        size="large"
                                                                        className="border-estela-blue-full rounded-r-lg"
                                                                        name="newEnvVarValue"
                                                                        placeholder="value"
                                                                        value={newEnvVarValue}
                                                                        onChange={this.handleInputChange}
                                                                    />
                                                                    <Button
                                                                        shape="circle"
                                                                        size="small"
                                                                        icon={<Add className="p-1" />}
                                                                        className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                        onClick={this.addEnvVar}
                                                                    ></Button>
                                                                </Space>
                                                            </Content>
                                                            <Content>
                                                                <p className="text-base my-2">Tags</p>
                                                                <Space direction="horizontal">
                                                                    {newTags.map((tag: Tags, id) => (
                                                                        <Tag
                                                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                            closable
                                                                            key={tag.key}
                                                                            onClose={() => this.handleRemoveTag(id)}
                                                                        >
                                                                            {tag.name}
                                                                        </Tag>
                                                                    ))}
                                                                </Space>
                                                                <Space direction="horizontal">
                                                                    <Input
                                                                        size="large"
                                                                        className="border-estela-blue-full rounded-lg"
                                                                        name="newTagName"
                                                                        placeholder="name"
                                                                        value={newTagName}
                                                                        onChange={this.handleInputChange}
                                                                    />
                                                                    <Button
                                                                        shape="circle"
                                                                        size="small"
                                                                        icon={<Add className="p-1" />}
                                                                        className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                        onClick={this.addTag}
                                                                    ></Button>
                                                                </Space>
                                                            </Content>
                                                        </Col>
                                                        <Col className="schedule mx-4">
                                                            <p className="text-base">Select a period</p>
                                                            <Content className="my-3">
                                                                <Content className="flex items-center">
                                                                    <Switch
                                                                        className="bg-estela-white-low"
                                                                        size="small"
                                                                        checked={schedulesFlag[0]}
                                                                        onChange={() => this.onChangeSchedule(0)}
                                                                    />
                                                                    <p className="text-sm">
                                                                        &nbsp;By cron schedule expression
                                                                    </p>
                                                                </Content>
                                                                {schedulesFlag[0] && (
                                                                    <Form.Item>
                                                                        <p className="text-sm my-2">Expression</p>
                                                                        <Input
                                                                            placeholder="5 4 * * *"
                                                                            onChange={this.onChangeExpression}
                                                                            size="large"
                                                                            className="border-estela-blue-full placeholder:text-sm rounded-lg"
                                                                        />
                                                                        <p className="text-sm mt-2">
                                                                            More information about cron schedule
                                                                            expressions&nbsp;
                                                                            <a
                                                                                className="text-estela-blue-full"
                                                                                href="https://crontab.guru/"
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                            >
                                                                                here
                                                                            </a>
                                                                        </p>
                                                                    </Form.Item>
                                                                )}
                                                            </Content>
                                                            <Content className="my-3">
                                                                <Content className="flex items-center">
                                                                    <Switch
                                                                        className="bg-estela-white-low"
                                                                        size="small"
                                                                        checked={schedulesFlag[1]}
                                                                        onChange={() => this.onChangeSchedule(1)}
                                                                    />
                                                                    <p className="text-sm">&nbsp;Advanced</p>
                                                                </Content>
                                                                {schedulesFlag[1] && (
                                                                    <Content>
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
                                                                        <Content>
                                                                            <p className="text-sm my-4">Repeat</p>
                                                                            <Select
                                                                                onChange={this.handleRepeatChange}
                                                                                className="w-full"
                                                                                size="large"
                                                                                defaultValue={"hourly"}
                                                                            >
                                                                                {this.repeatOptions.map(
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
                                                                        </Content>
                                                                        {repeat === "custom" && (
                                                                            <Content>
                                                                                <p className="text-sm my-4">
                                                                                    Custom recurrence
                                                                                </p>
                                                                                <Space direction="horizontal">
                                                                                    <p className="text-sm">Every</p>
                                                                                    <InputNumber
                                                                                        onChange={
                                                                                            this.onChangeRecurrence
                                                                                        }
                                                                                        min={1}
                                                                                        max={12}
                                                                                        size="large"
                                                                                        className="border-estela-blue-full rounded-lg"
                                                                                        value={recurrenceNum}
                                                                                    />
                                                                                    <Select
                                                                                        onChange={
                                                                                            this.handleRecurrenceChange
                                                                                        }
                                                                                        className="w-full"
                                                                                        size="large"
                                                                                        defaultValue={recurrence}
                                                                                    >
                                                                                        {this.recurrenceOptions.map(
                                                                                            (
                                                                                                option: OptionDataRepeat,
                                                                                            ) => (
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
                                                                                        <p className="text-sm my-4">
                                                                                            Repeat on
                                                                                        </p>
                                                                                        <Space
                                                                                            className="grid grid-cols-7"
                                                                                            direction="horizontal"
                                                                                        >
                                                                                            {this.weekOptions.map(
                                                                                                (
                                                                                                    option: OptionDataPersistance,
                                                                                                ) => (
                                                                                                    <Checkbox
                                                                                                        key={option.key}
                                                                                                        onChange={() => {
                                                                                                            this.handleWeekChange(
                                                                                                                option.value,
                                                                                                            );
                                                                                                        }}
                                                                                                        checked={
                                                                                                            weekDays[
                                                                                                                option
                                                                                                                    .key
                                                                                                            ]
                                                                                                        }
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
                                                        </Col>
                                                    </Row>
                                                    <Row justify="center" className="mt-4">
                                                        <Button
                                                            onClick={this.handleSubmit}
                                                            size="large"
                                                            className="w-48 h-12 mr-1 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                                        >
                                                            Create
                                                        </Button>
                                                        <Button
                                                            size="large"
                                                            className="w-48 h-12 ml-1 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                            onClick={() => this.setState({ modal: false })}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Row>
                                                </Modal>
                                            </Col>
                                        </Row>
                                        <Row justify="center" className="bg-white rounded-lg">
                                            <div className="m-4">
                                                <Table
                                                    tableLayout="fixed"
                                                    rowSelection={{
                                                        type: "checkbox",
                                                        ...this.rowSelection,
                                                    }}
                                                    columns={this.columns}
                                                    dataSource={cronjobs}
                                                    pagination={false}
                                                    size="small"
                                                />
                                            </div>
                                        </Row>
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
                                        />
                                    </div>
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
