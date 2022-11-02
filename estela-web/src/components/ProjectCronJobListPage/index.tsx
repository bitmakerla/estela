import React, { Component, ReactElement } from "react";
import moment from "moment";
import {
    Layout,
    Pagination,
    // Typography,
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
    // Checkbox,
    Radio,
    TimePicker,
    DatePicker,
} from "antd";
import type { DatePickerProps } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ReactComponent as Add } from "../../assets/icons/add.svg";
import {
    ApiProjectsSpidersCronjobsCreateRequest,
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
// const { Title, Text } = Typography;

interface Ids {
    sid: number | undefined;
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

interface SpiderCronJobData {
    id: Ids;
    key: number | undefined;
    date: string;
    status: string | undefined;
    schedule: string | undefined;
    dataExpiryDays: number | undefined | null;
    tags: TagsData[] | undefined;
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
    expression: string;
    repeat: string;
    spiderId: string;
    dataExpireDays: number;
    dataStatus: string;
    day: moment.Moment | null;
    hour: moment.Moment | null;
    schedulesFlag: boolean[];
    loaded: boolean;
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
        expression: "@daily",
        repeat: "",
        dataExpireDays: 1,
        dataStatus: "PENDING",
        spiderId: "1",
        day: moment(),
        hour: moment(),
        schedulesFlag: [true, false, false],
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
        loaded: false,
        modal: true,
        count: 0,
        current: 0,
    };

    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    countKey = 0;
    hourFormat = "HH:mm";
    dateFormat = "MMM D, YYYY";

    dataPeristenceOptions = [
        { label: "1 day", key: 1, value: 1 },
        { label: "1 week", key: 2, value: 7 },
        { label: "1 month", key: 3, value: 30 },
        { label: "3 months", key: 4, value: 90 },
        { label: "6 months", key: 5, value: 180 },
        { label: "1 year", key: 6, value: 365 },
        { label: "Forever", key: 7, value: 720 },
    ];

    repeatOptions = [
        { label: "Hourly", key: 1, value: "@hourly" },
        { label: "Daily", key: 2, value: "@daily" },
        { label: "Weekly", key: 3, value: "@weekly" },
        { label: "Monthly", key: 4, value: "@monthly" },
        { label: "Yearly", key: 5, value: "@yearly" },
        { label: "Custom ...", key: 6, value: "custom" },
    ];

    columns = [
        {
            title: "ENABLED",
            key: "status",
            dataIndex: "status",
            render: (status: string | undefined) => {
                return (
                    <Switch
                        size="small"
                        className="bg-estela-white-low"
                        defaultChecked={status === SpiderCronJobStatusEnum.Active}
                        // onChange={this.handleSwitchChange}
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
            title: "EXPRESSION",
            key: "schedule",
            dataIndex: "schedule",
        },
        {
            title: "Tags",
            key: "tags",
            dataIndex: "tags",
            render: (tags: TagsData[]): ReactElement => (
                <Space direction="horizontal">
                    {tags.map((tag: TagsData, id) => (
                        <Tag key={id} className="text-estela border-estela rounded bg-button-hover">
                            {tag.name}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: "PERSISTENCE",
            key: "dataExpiryDays",
            dataIndex: "dataExpiryDays",
            render: (dataExpiryDays: number | undefined): ReactElement => (
                <p>{dataExpiryDays ? dataExpiryDays : "No"}</p>
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
        }
    }

    getProjectSpiders = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId, page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                const spiders: Spider[] = results.results;
                this.setState({ spiders: [...spiders] });
                this.setState({ spiderId: String(results.results[0].sid) });
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
            // console.log(response.results);
            const data = response.results.map((cronjob: SpiderCronJob, iterator: number) => ({
                key: iterator,
                id: { sid: cronjob.spider, cid: cronjob.cjid },
                date: convertDateToString(cronjob.created),
                status: cronjob.status,
                schedule: cronjob.schedule,
                dataExpiryDays: cronjob.dataExpiryDays,
                tags: cronjob.ctags,
            }));
            const cronjobs: SpiderCronJobData[] = data;
            this.setState({ cronjobs: [...cronjobs], loaded: true, count: response.count, current: page });
        });
    };

    handleSubmit = (): void => {
        const requestData = {
            cargs: [...this.state.args],
            cenvVars: [...this.state.envVars],
            ctags: [...this.state.tags],
            schedule: this.state.expression,
            uniqueCollection: true,
            dataStatus: this.state.dataStatus,
            dataExpiryDays: `0/${this.state.dataExpireDays}`,
        };
        const request: ApiProjectsSpidersCronjobsCreateRequest = {
            data: requestData,
            pid: this.projectId,
            sid: this.state.spiderId,
        };
        console.log(request);
        console.log(this.state);
        // this.apiService.apiProjectsSpidersCronjobsCreate(request).then(
        //     (response: SpiderCronJobCreate) => {
        //         history.push(`/projects/${this.projectId}/spiders/${"1"}/cronjobs/${response.cjid}`);
        //     },
        //     (error: unknown) => {
        //         console.error(error);
        //         incorrectDataNotification();
        //     },
        // );
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
        const checked = [false, false, false];
        checked[id] = true;
        this.setState({ schedulesFlag: checked, repeat: "@hourly" });
        if (id == 2) {
            this.setState({ day: moment(), hour: moment() });
        }
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

    handleScheduleChange = (value: string): void => {
        this.setState({ expression: value });
    };

    handleRepeatChange = (value: string): void => {
        this.setState({ repeat: value });
    };

    handlePersistenceChange = (value: number): void => {
        this.setState({ dataExpireDays: value });
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getCronJobs(page);
    };

    onChangeExpression = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        this.setState({ expression: e.target.value });
    };

    onChangeDate: DatePickerProps["onChange"] = (date, dateString) => {
        // console.log(date, dateString);
        this.setState({ day: date, hour: date });
    };

    render(): JSX.Element {
        const {
            loaded,
            cronjobs,
            expression,
            repeat,
            day,
            hour,
            schedulesFlag,
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
                    <Content className="bg-metal rounded-2xl">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content className="bg-metal rounded-2xl">
                                    <div className="lg:m-10 md:mx-6 mx-2">
                                        <Row className="flow-root my-6">
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
                                                    onClick={() => this.setState({ modal: true })}
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
                                                    <Content>
                                                        <Row className="grid sm:grid-cols-2">
                                                            <Col>
                                                                <div className="mx-4">
                                                                    <Content>
                                                                        <p className="my-2 text-base">Spider</p>
                                                                        <Select
                                                                            style={{ borderRadius: 16 }}
                                                                            size="large"
                                                                            className="w-full"
                                                                            defaultValue={spiders[0].name}
                                                                        >
                                                                            {spiders.map((spider: Spider) => (
                                                                                <Option
                                                                                    onClick={() => {
                                                                                        this.setState({
                                                                                            spiderId: String(
                                                                                                spider.sid,
                                                                                            ),
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
                                                                        <p className="text-base my-2">
                                                                            Data persistence
                                                                        </p>
                                                                        <Select
                                                                            onChange={this.handlePersistenceChange}
                                                                            className="w-full"
                                                                            size="large"
                                                                            defaultValue={
                                                                                this.dataPeristenceOptions[0].value
                                                                            }
                                                                        >
                                                                            {this.dataPeristenceOptions.map(
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
                                                                    {/* <Form.Item
                                                                        name="unique_collection"
                                                                        valuePropName="checked"
                                                                    >
                                                                        <Checkbox>Unique Collection</Checkbox>
                                                                    </Form.Item> */}
                                                                    <Content>
                                                                        <p className="text-base my-2">Arguments</p>
                                                                        <Space direction="vertical">
                                                                            {args.map((arg: ArgsData, id) => (
                                                                                <Tag
                                                                                    className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                                    closable
                                                                                    key={arg.key}
                                                                                    onClose={() =>
                                                                                        this.handleRemoveArg(id)
                                                                                    }
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
                                                                        <p className="text-base my-2">
                                                                            Environment Variables
                                                                        </p>
                                                                        <Space className="mb-2" direction="horizontal">
                                                                            {envVars.map((envVar: EnvVarsData, id) => (
                                                                                <Tag
                                                                                    className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                                    closable
                                                                                    key={envVar.key}
                                                                                    onClose={() =>
                                                                                        this.handleRemoveEnvVar(id)
                                                                                    }
                                                                                >
                                                                                    {envVar.name} : {envVar.value}
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
                                                                                    onClose={() =>
                                                                                        this.handleRemoveTag(id)
                                                                                    }
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
                                                                </div>
                                                            </Col>
                                                            <Col className="schedule">
                                                                <div className="mx-4">
                                                                    <p className="text-base">Select a period</p>
                                                                    <div className="my-3">
                                                                        <Content className="flex items-center">
                                                                            <Switch
                                                                                className="bg-estela-white-low"
                                                                                size="small"
                                                                                checked={schedulesFlag[0]}
                                                                                onChange={() =>
                                                                                    this.onChangeSchedule(0)
                                                                                }
                                                                            />
                                                                            <p className="text-sm">
                                                                                &nbsp;By commom schedules
                                                                            </p>
                                                                        </Content>
                                                                        {schedulesFlag[0] && (
                                                                            <Content>
                                                                                <Radio.Group
                                                                                    defaultValue={"daily"}
                                                                                    className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 lg:my-6 my-4"
                                                                                >
                                                                                    <Radio.Button
                                                                                        value="hourly"
                                                                                        onClick={() => {
                                                                                            this.handleScheduleChange(
                                                                                                "@hourly",
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        Hourly
                                                                                    </Radio.Button>
                                                                                    <Radio.Button
                                                                                        value="daily"
                                                                                        onClick={() => {
                                                                                            this.handleScheduleChange(
                                                                                                "@daily",
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        Daily
                                                                                    </Radio.Button>
                                                                                    <Radio.Button
                                                                                        value="weekly"
                                                                                        onClick={() => {
                                                                                            this.handleScheduleChange(
                                                                                                "@weekly",
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        Weekly
                                                                                    </Radio.Button>
                                                                                    <Radio.Button
                                                                                        value="monthly"
                                                                                        onClick={() => {
                                                                                            this.handleScheduleChange(
                                                                                                "@monthly",
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        Monthly
                                                                                    </Radio.Button>
                                                                                    <Radio.Button
                                                                                        value="yearly"
                                                                                        onClick={() => {
                                                                                            this.handleScheduleChange(
                                                                                                "@yearly",
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        Yearly
                                                                                    </Radio.Button>
                                                                                </Radio.Group>
                                                                            </Content>
                                                                        )}
                                                                    </div>
                                                                    <div className="my-3">
                                                                        <Content className="flex items-center">
                                                                            <Switch
                                                                                className="bg-estela-white-low"
                                                                                size="small"
                                                                                checked={schedulesFlag[1]}
                                                                                onChange={() =>
                                                                                    this.onChangeSchedule(1)
                                                                                }
                                                                            />
                                                                            <p className="text-sm">
                                                                                &nbsp;By cron schedule expression
                                                                            </p>
                                                                        </Content>
                                                                        {schedulesFlag[1] && (
                                                                            <Form.Item>
                                                                                <p className="text-sm my-2">
                                                                                    Expression
                                                                                </p>
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
                                                                    </div>
                                                                    <div className="my-3">
                                                                        <Content className="flex items-center">
                                                                            <Switch
                                                                                className="bg-estela-white-low"
                                                                                size="small"
                                                                                checked={schedulesFlag[2]}
                                                                                onChange={() =>
                                                                                    this.onChangeSchedule(2)
                                                                                }
                                                                            />
                                                                            <p className="text-sm">&nbsp;Advanced</p>
                                                                        </Content>
                                                                        {schedulesFlag[2] && (
                                                                            <Content>
                                                                                <Content className="my-3">
                                                                                    <Space direction="horizontal">
                                                                                        <Space direction="vertical">
                                                                                            <p className="text-sm">
                                                                                                Date
                                                                                            </p>
                                                                                            <DatePicker
                                                                                                // onPanelChange={
                                                                                                //     this.onChangeDate
                                                                                                // }
                                                                                                // onOpenChange={
                                                                                                //     this.onChangeDate
                                                                                                // }
                                                                                                onChange={
                                                                                                    this.onChangeDate
                                                                                                }
                                                                                                size="large"
                                                                                                className="border-estela-blue-full rounded-lg"
                                                                                                defaultValue={moment(
                                                                                                    moment(),
                                                                                                    this.dateFormat,
                                                                                                )}
                                                                                                format={this.dateFormat}
                                                                                            />
                                                                                            {/* <Input
                                                                                                size="large"
                                                                                                className="border-estela-blue-full rounded-lg placeholder:text-sm"
                                                                                                // name="newDate"
                                                                                                placeholder="Today"
                                                                                                value={day}
                                                                                                // onChange={this.handleInputChange}
                                                                                            /> */}
                                                                                        </Space>
                                                                                        <Space direction="vertical">
                                                                                            <p className="text-sm">
                                                                                                Hour
                                                                                            </p>
                                                                                            <TimePicker
                                                                                                // onChange={
                                                                                                //     this.onChangeHour
                                                                                                // }
                                                                                                size="large"
                                                                                                className="border-estela-blue-full rounded-lg"
                                                                                                defaultValue={moment(
                                                                                                    moment(),
                                                                                                    "HH:mm",
                                                                                                )}
                                                                                                format={"HH:mm"}
                                                                                            />
                                                                                        </Space>
                                                                                    </Space>
                                                                                </Content>
                                                                                <Content>
                                                                                    <p className="text-sm my-4">
                                                                                        Repeat
                                                                                    </p>
                                                                                    <Select
                                                                                        onChange={
                                                                                            this.handleRepeatChange
                                                                                        }
                                                                                        className="w-full"
                                                                                        size="large"
                                                                                        defaultValue={"@hourly"}
                                                                                    >
                                                                                        {this.repeatOptions.map(
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
                                                                                </Content>
                                                                                {repeat === "custom" && (
                                                                                    <Content>
                                                                                        <Content>
                                                                                            <p className="text-sm my-4">
                                                                                                Custom recurrence
                                                                                            </p>
                                                                                            <Space direction="horizontal">
                                                                                                <p className="text-sm">
                                                                                                    Every
                                                                                                </p>
                                                                                                <Input
                                                                                                    size="large"
                                                                                                    className="border-estela-blue-full rounded-lg"
                                                                                                    name="newDay"
                                                                                                    placeholder="value"
                                                                                                    value={
                                                                                                        newEnvVarValue
                                                                                                    }
                                                                                                    // onChange={this.handleInputChange}
                                                                                                />
                                                                                                <Input
                                                                                                    size="large"
                                                                                                    className="border-estela-blue-full rounded-lg"
                                                                                                    name="newWeek"
                                                                                                    placeholder="value"
                                                                                                    value={
                                                                                                        newEnvVarValue
                                                                                                    }
                                                                                                    // onChange={this.handleInputChange}
                                                                                                />
                                                                                            </Space>
                                                                                        </Content>
                                                                                        <Content>
                                                                                            <p className="text-sm my-4">
                                                                                                Repeat on
                                                                                            </p>
                                                                                            <Space direction="horizontal">
                                                                                                <Radio.Group className="flex gap-1">
                                                                                                    <Radio.Button
                                                                                                        value="sunday"
                                                                                                        // onClick={() => {
                                                                                                        //     this.handlePersistenceChange(
                                                                                                        //         "hourly",
                                                                                                        //     );
                                                                                                        // }}
                                                                                                    >
                                                                                                        S
                                                                                                    </Radio.Button>
                                                                                                    <Radio.Button value="monday">
                                                                                                        M
                                                                                                    </Radio.Button>
                                                                                                    <Radio.Button value="tuesday">
                                                                                                        T
                                                                                                    </Radio.Button>
                                                                                                    <Radio.Button value="wednesday">
                                                                                                        W
                                                                                                    </Radio.Button>
                                                                                                    <Radio.Button value="thursday">
                                                                                                        T
                                                                                                    </Radio.Button>
                                                                                                    <Radio.Button value="friday">
                                                                                                        F
                                                                                                    </Radio.Button>
                                                                                                    <Radio.Button value="saturday">
                                                                                                        S
                                                                                                    </Radio.Button>
                                                                                                </Radio.Group>
                                                                                            </Space>
                                                                                        </Content>
                                                                                        <Content>
                                                                                            <p className="text-sm my-3">
                                                                                                End
                                                                                            </p>
                                                                                            <Radio.Group
                                                                                                onChange={() => {
                                                                                                    console.log("c");
                                                                                                }}
                                                                                                // value={1}
                                                                                            >
                                                                                                <Space direction="vertical">
                                                                                                    <Radio value={1}>
                                                                                                        Never
                                                                                                    </Radio>
                                                                                                    <Space direction="horizontal">
                                                                                                        <Radio
                                                                                                            value={2}
                                                                                                        >
                                                                                                            On
                                                                                                        </Radio>
                                                                                                        <Input
                                                                                                            size="large"
                                                                                                            className="border-estela-blue-full rounded-lg"
                                                                                                            name="newEnvVarValue"
                                                                                                            placeholder="value"
                                                                                                            value={
                                                                                                                newEnvVarValue
                                                                                                            }
                                                                                                            // onChange={this.handleInputChange}
                                                                                                        />
                                                                                                    </Space>
                                                                                                    <Space direction="horizontal">
                                                                                                        <Radio
                                                                                                            value={3}
                                                                                                        >
                                                                                                            After
                                                                                                        </Radio>
                                                                                                        <Input
                                                                                                            size="large"
                                                                                                            className="border-estela-blue-full rounded-lg"
                                                                                                            name="newEnvVarValue"
                                                                                                            placeholder="value"
                                                                                                            value={
                                                                                                                newEnvVarValue
                                                                                                            }
                                                                                                            // onChange={this.handleInputChange}
                                                                                                        />
                                                                                                    </Space>
                                                                                                </Space>
                                                                                            </Radio.Group>
                                                                                        </Content>
                                                                                    </Content>
                                                                                )}
                                                                            </Content>
                                                                        )}
                                                                    </div>
                                                                </div>
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
                                                    </Content>
                                                </Modal>
                                            </Col>
                                        </Row>
                                        <Row justify="center" className="bg-white rounded-lg">
                                            <div className="m-4">
                                                <Table
                                                    tableLayout="fixed"
                                                    rowSelection={{
                                                        type: "checkbox",
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
                                                <Button className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl">
                                                    Delete
                                                </Button>
                                                <Button className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl">
                                                    Edit
                                                </Button>
                                                <Button className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl">
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
