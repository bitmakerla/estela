import React, { useState, useEffect } from "react";
import moment from "moment";
import {
    Button,
    Modal,
    message,
    Row,
    Col,
    Select,
    Layout,
    Space,
    Radio,
    Input,
    Tag,
    Switch,
    Form,
    RadioChangeEvent,
    InputNumber,
    Checkbox,
    DatePicker,
    DatePickerProps,
    TimePicker,
    Typography,
    notification,
} from "antd";

import {
    ApiProjectsSpidersListRequest,
    ApiProjectsSpidersCronjobsCreateRequest,
    SpiderCronJobCreate,
    SpiderCronJobCreateDataStatusEnum,
    SpiderDataStatusEnum,
    Spider,
} from "../../services/api";
import history from "../../history";
import { ApiService } from "../../services";
import { resourceNotAllowedNotification, invalidDataNotification, incorrectDataNotification } from "../../shared";
import { checkExternalError } from "../../defaultComponents";

import Add from "../../assets/icons/add.svg";

const { Content } = Layout;
const { Option } = Select;
const { Text } = Typography;

interface CronjobCreateModalProps {
    openModal: boolean;
    spider: Spider | null;
    projectId: string;
}

interface ProjectData {
    pid: string;
    sid: string;
}

interface OptionDataPersistance {
    label: string;
    key: number;
    value: number;
}

interface CronjobData {
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    dataStatus: SpiderCronJobCreateDataStatusEnum | SpiderDataStatusEnum;
    dataExpiryDays: number;
    uniqueCollection: boolean;
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

interface TagsData {
    name: string;
}

interface Tags {
    name: string;
    key: number;
}

interface Cronjob {
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newTagName: string;
    newTags: Tags[];
}

interface OptionDataRepeat {
    label: string;
    key: number;
    value: string;
}

interface Crontab {
    expression: string;
    repeat: string;
    currentDay: number;
    date: moment.Moment;
    recurrence: string;
    recurrenceNum: number;
    weekDays: boolean[];
    expressionError: boolean;
}

const dataPersistenceOptions = [
    { label: "1 day", key: 1, value: 1 },
    { label: "1 week", key: 2, value: 7 },
    { label: "1 month", key: 3, value: 30 },
    { label: "3 months", key: 4, value: 90 },
    { label: "6 months", key: 5, value: 180 },
    { label: "1 year", key: 6, value: 365 },
    { label: "Forever", key: 7, value: 720 },
];

const repeatOptions = [
    { label: "Hourly", key: 1, value: "hourly" },
    { label: "Daily", key: 2, value: "daily" },
    { label: "Weekly", key: 3, value: "weekly" },
    { label: "Monthly", key: 4, value: "monthly" },
    { label: "Yearly", key: 5, value: "yearly" },
    { label: "Custom ...", key: 6, value: "custom" },
];

const recurrenceOptions = [
    { label: "Days", key: 1, value: "days" },
    { label: "Weeks", key: 2, value: "weeks" },
    { label: "Months", key: 3, value: "months" },
    { label: "Years", key: 4, value: "years" },
];

const weekOptions = [
    { label: "S", key: 0, value: 0 },
    { label: "M", key: 1, value: 1 },
    { label: "T", key: 2, value: 2 },
    { label: "W", key: 3, value: 3 },
    { label: "T", key: 4, value: 4 },
    { label: "F", key: 5, value: 5 },
    { label: "S", key: 6, value: 6 },
];

export default function CronjobCreateModal({ openModal, spider, projectId }: CronjobCreateModalProps) {
    const PAGE_SIZE = 15;
    const apiService = ApiService();
    const [open, setOpen] = useState(openModal);
    const [countKey, setCountKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [spiders, setSpiders] = useState<Spider[]>([]);
    const [externalComponent, setExternalComponent] = useState<React.ReactNode>(<></>);
    const [schedulesFlag, setSchedulesFlag] = useState([true, false]);
    const [cronjobData, setCronjobData] = useState<CronjobData>({
        args: [],
        envVars: [],
        tags: [],
        dataStatus: SpiderCronJobCreateDataStatusEnum.Pending,
        dataExpiryDays: spider ? Number(spider.dataExpiryDays) : 1,
        uniqueCollection: false,
    });
    const [newCronjob, setNewCronjob] = useState<Cronjob>({
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newTagName: "",
        newTags: [],
    });
    const [crontab, setCrontab] = useState<Crontab>({
        expression: "",
        repeat: "hourly",
        currentDay: 1,
        date: moment(),
        recurrence: "weeks",
        recurrenceNum: 1,
        weekDays: new Array<boolean>(7).fill(false),
        expressionError: false,
    });
    const [projectData, setProjectData] = useState<ProjectData>({
        pid: projectId,
        sid: "",
    });

    const hourFormat = "HH:mm";
    const dateFormat = "MMM D, YYYY";

    useEffect(() => {
        getProjectSpiders(1);
        const weekDays = crontab.weekDays;
        weekDays[moment().day() % 7] = true;
        setCrontab({ ...crontab, currentDay: moment().day(), weekDays: weekDays });
    }, []);

    const getProjectSpiders = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: projectId, page, pageSize: PAGE_SIZE };
        apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                const spider_list = results.results ? results.results : [];
                if (spider) {
                    let index = 0;
                    index = spider_list.findIndex((listedSpider: Spider) => {
                        return listedSpider.sid == spider.sid;
                    });

                    if (index < 0) {
                        spider_list.unshift(spider);
                        index = 0;
                    }
                    setProjectData({ ...projectData, sid: String(spider_list[index].sid) });
                    setCronjobData({
                        ...cronjobData,
                        dataStatus: spider_list[index].dataStatus,
                        dataExpiryDays: spider_list[index].dataExpiryDays,
                    });
                } else if (spider_list.length > 0) {
                    setProjectData({ ...projectData, sid: String(spider_list[0].sid) });
                    setCronjobData({
                        ...cronjobData,
                        dataStatus: spider_list[0].dataStatus,
                        dataExpiryDays: spider_list[0].dataExpiryDays,
                    });
                }
                setSpiders(spider_list);
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    const handleSpiderChange = (value: string): void => {
        const spiderId = spiders.find((spider) => {
            return spider.name === value;
        });
        setProjectData({ ...projectData, sid: String(spiderId?.sid) });
    };

    const handlePersistenceChange = (value: number): void => {
        if (value == 720) {
            setCronjobData({ ...cronjobData, dataStatus: SpiderCronJobCreateDataStatusEnum.Persistent });
        } else {
            setCronjobData({ ...cronjobData, dataExpiryDays: value });
        }
    };

    const onChangeUniqueCollection = (e: RadioChangeEvent): void => {
        setCronjobData({ ...cronjobData, uniqueCollection: e.target.value });
    };

    const handleRemoveArg = (id: number): void => {
        const args = [...cronjobData.args];
        args.splice(id, 1);
        setCronjobData({ ...cronjobData, args: [...args] });
    };

    const addArgument = (): void => {
        const args = [...cronjobData.args];
        const newArgName = newCronjob.newArgName.trim();
        const newArgValue = newCronjob.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            args.push({ name: newArgName, value: newArgValue, key: countKey });
            setCountKey(countKey + 1);
            setCronjobData({ ...cronjobData, args: [...args] });
            setNewCronjob({ ...newCronjob, newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newArgName") {
            setNewCronjob({ ...newCronjob, newArgName: value });
        } else if (name === "newArgValue") {
            setNewCronjob({ ...newCronjob, newArgValue: value });
        } else if (name === "newEnvVarName") {
            setNewCronjob({ ...newCronjob, newEnvVarName: value });
        } else if (name === "newEnvVarValue") {
            setNewCronjob({ ...newCronjob, newEnvVarValue: value });
        } else if (name === "newTagName") {
            setNewCronjob({ ...newCronjob, newTagName: value });
        }
    };

    const handleRemoveEnvVar = (id: number): void => {
        const envVars = [...cronjobData.envVars];
        envVars.splice(id, 1);
        setCronjobData({ ...cronjobData, envVars: [...envVars] });
    };

    const addEnvVar = (): void => {
        const envVars = [...cronjobData.envVars];
        const newEnvVarName = newCronjob.newEnvVarName.trim();
        const newEnvVarValue = newCronjob.newEnvVarValue.trim();
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({ name: newEnvVarName, value: newEnvVarValue, key: countKey });
            setCountKey(countKey + 1);
            setCronjobData({ ...cronjobData, envVars: [...envVars] });
            setNewCronjob({ ...newCronjob, newEnvVarName: "", newEnvVarValue: "" });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };

    const handleRemoveTag = (id: number): void => {
        const tags = [...cronjobData.tags];
        tags.splice(id, 1);
        setCronjobData({ ...cronjobData, tags: [...tags] });
    };

    const addTag = (): void => {
        const tags = [...cronjobData.tags];
        const newTags = [...newCronjob.newTags];
        const newTagName = newCronjob.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            newTags.push({ name: newTagName, key: countKey });
            setCountKey(countKey + 1);
            tags.push({ name: newTagName });
            setCronjobData({ ...cronjobData, tags: [...tags] });
            setNewCronjob({ ...newCronjob, newTags: [...newTags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    const onChangeSchedule = (id: number): void => {
        const checked = [false, false];
        checked[id] = true;
        setSchedulesFlag(checked);
        setCrontab({ ...crontab, repeat: "hourly" });
        if (id == 1) {
            setCrontab({ ...crontab, date: moment() });
        }
    };

    const onChangeExpression = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCrontab({ ...crontab, expression: e.target.value, expressionError: false });
    };

    const onChangeDate: DatePickerProps["onChange"] = (date) => {
        setCrontab({ ...crontab, date: moment(date) });
    };

    const handleRepeatChange = (value: string): void => {
        setCrontab({ ...crontab, repeat: value });
    };

    const onChangeRecurrence = (value: number | null) => {
        setCrontab({ ...crontab, recurrenceNum: Number(value) });
    };

    const handleRecurrenceChange = (value: string): void => {
        setCrontab({ ...crontab, recurrence: value });
    };

    const handleWeekChange = (value: number): void => {
        if (value % 7 != crontab.currentDay) {
            const weekDays = [...crontab.weekDays];
            weekDays[value] = !weekDays[value];
            setCrontab({ ...crontab, weekDays: weekDays });
        }
    };

    const getCustomExpression = (): string => {
        const { date, recurrence, recurrenceNum, weekDays } = crontab;
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

    const getExpression = (): string => {
        const { repeat, date } = crontab;
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
                return getCustomExpression();
        }
    };

    const handleSubmit = (): void => {
        setLoading(true);
        let expression = "";
        if (schedulesFlag[0]) {
            if (crontab.expression == "") {
                setLoading(false);
                setCrontab({ ...crontab, expressionError: true });
                notification.error({
                    message: "Invalid Cron Expression",
                    description: "Please enter a valid expression",
                });
                return;
            }
            expression = crontab.expression;
        } else {
            expression = getExpression();
        }

        const data_status =
            cronjobData.dataStatus == SpiderDataStatusEnum.Persistent
                ? SpiderCronJobCreateDataStatusEnum.Persistent
                : SpiderCronJobCreateDataStatusEnum.Pending;

        const requestData = {
            cargs: [...cronjobData.args],
            cenvVars: [...cronjobData.envVars],
            ctags: [...cronjobData.tags],
            schedule: expression,
            uniqueCollection: cronjobData.uniqueCollection,
            dataStatus: data_status,
            dataExpiryDays: cronjobData.dataExpiryDays,
        };
        const request: ApiProjectsSpidersCronjobsCreateRequest = {
            data: requestData,
            pid: projectData.pid,
            sid: projectData.sid,
        };
        apiService.apiProjectsSpidersCronjobsCreate(request).then(
            (response: SpiderCronJobCreate) => {
                setLoading(false);
                history.push(`/projects/${projectData.pid}/spiders/${projectData.sid}/cronjobs/${response.cjid}`);
            },
            async (error) => {
                setLoading(false);
                const data = await error.json();
                const [errorComponent, err] = checkExternalError(data);
                if (err) {
                    invalidDataNotification(data.detail);
                    setExternalComponent(errorComponent);
                } else {
                    incorrectDataNotification();
                }
                setOpen(false);
            },
        );
    };

    return (
        <>
            <Button
                icon={<Add className="mr-2" width={19} />}
                size="large"
                className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                onClick={() => {
                    if (spiders.length > 0) {
                        setOpen(true);
                    } else {
                        message.error("You don't have any spider.");
                    }
                }}
            >
                Schedule new job
            </Button>
            {externalComponent}
            <Modal
                style={{
                    overflow: "hidden",
                    padding: 0,
                }}
                centered
                width={900}
                open={open}
                title={<p className="text-xl text-center mt-2 font-normal">NEW SCHEDULED JOB</p>}
                onCancel={() => setOpen(false)}
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
                                defaultValue={spider ? spider.name : spiders[0] ? spiders[0].name : ""}
                                onChange={handleSpiderChange}
                            >
                                {spiders.map((spider: Spider) => (
                                    <Option key={spider.sid} value={spider.name}>
                                        {spider.name}
                                    </Option>
                                ))}
                            </Select>
                        </Content>
                        <Content>
                            <p className="text-base my-2">Data persistence</p>
                            <Select
                                onChange={handlePersistenceChange}
                                className="w-full"
                                size="large"
                                defaultValue={
                                    cronjobData.dataStatus === "PERSISTENT" ? 720 : cronjobData.dataExpiryDays
                                }
                            >
                                {dataPersistenceOptions.map((option: OptionDataPersistance) => (
                                    <Option className="text-sm" key={option.key} value={option.value}>
                                        {option.label}
                                    </Option>
                                ))}
                            </Select>
                        </Content>
                        <Content>
                            <Space direction="horizontal" className="my-4 flex items-center">
                                <p className="text-base mr-2">Unique Collection</p>
                                <Radio.Group onChange={onChangeUniqueCollection} value={cronjobData.uniqueCollection}>
                                    <Radio value={true}>Yes</Radio>
                                    <Radio value={false}>No</Radio>
                                </Radio.Group>
                            </Space>
                        </Content>
                        <Content>
                            <p className="text-base my-2">Arguments</p>
                            <Space direction="vertical">
                                <Space direction="horizontal">
                                    {cronjobData.args.map((arg: ArgsData, id) => (
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            key={arg.key}
                                            onClose={() => handleRemoveArg(id)}
                                        >
                                            {arg.name}: {arg.value}
                                        </Tag>
                                    ))}
                                </Space>
                                <Space direction="horizontal">
                                    <Input
                                        size="large"
                                        className="border-estela-blue-full rounded-l-lg"
                                        name="newArgName"
                                        placeholder="name"
                                        value={newCronjob.newArgName}
                                        onChange={handleInputChange}
                                    />
                                    <Input
                                        size="large"
                                        className="border-estela-blue-full rounded-r-lg"
                                        name="newArgValue"
                                        placeholder="value"
                                        value={newCronjob.newArgValue}
                                        onChange={handleInputChange}
                                    />
                                    <Button
                                        shape="circle"
                                        size="small"
                                        icon={<Add />}
                                        className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                        onClick={addArgument}
                                    ></Button>
                                </Space>
                            </Space>
                        </Content>
                        <Content>
                            <p className="text-base my-2">Environment Variables</p>
                            <Space direction="vertical">
                                <Space direction="horizontal">
                                    {cronjobData.envVars.map((envVar: EnvVarsData, id: number) => (
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            key={envVar.key}
                                            onClose={() => handleRemoveEnvVar(id)}
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
                                        value={newCronjob.newEnvVarName}
                                        onChange={handleInputChange}
                                    />
                                    <Input
                                        size="large"
                                        className="border-estela-blue-full rounded-r-lg"
                                        name="newEnvVarValue"
                                        placeholder="value"
                                        value={newCronjob.newEnvVarValue}
                                        onChange={handleInputChange}
                                    />
                                    <Button
                                        shape="circle"
                                        size="small"
                                        icon={<Add />}
                                        className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                        onClick={addEnvVar}
                                    ></Button>
                                </Space>
                            </Space>
                        </Content>
                        <Content>
                            <p className="text-base my-2">Tags</p>
                            <Space direction="horizontal">
                                {cronjobData.tags.map((tag: TagsData, id) => (
                                    <Tag
                                        className="text-estela-blue-full border-0 bg-estela-blue-low"
                                        closable
                                        key={id}
                                        onClose={() => handleRemoveTag(id)}
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
                                    value={newCronjob.newTagName}
                                    onChange={handleInputChange}
                                />
                                <Button
                                    shape="circle"
                                    size="small"
                                    icon={<Add />}
                                    className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                    onClick={addTag}
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
                                    onChange={() => onChangeSchedule(0)}
                                />
                                <p className="text-sm">&nbsp;By cron schedule expression</p>
                            </Content>
                            {schedulesFlag[0] && (
                                <Form.Item>
                                    <p className="text-sm my-2">Expression</p>
                                    <Input
                                        status={crontab.expressionError ? "error" : undefined}
                                        placeholder="5 4 * * *"
                                        onChange={onChangeExpression}
                                        size="large"
                                        className="border-estela-blue-full placeholder:text-sm rounded-lg"
                                    />
                                    {crontab.expressionError && (
                                        <Text className="text-estela-red-full font-semibold mt-4">
                                            Enter a valid expression
                                        </Text>
                                    )}
                                    <p className="text-sm mt-2">
                                        More information about cron schedule expressions&nbsp;
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
                                    onChange={() => onChangeSchedule(1)}
                                />
                                <p className="text-sm">&nbsp;By planning</p>
                            </Content>
                            {schedulesFlag[1] && (
                                <Content>
                                    <Content className="my-3">
                                        <Space direction="horizontal">
                                            <Space direction="vertical">
                                                <p className="text-sm">Date</p>
                                                <DatePicker
                                                    onChange={onChangeDate}
                                                    size="large"
                                                    className="border-estela-blue-full rounded-lg"
                                                    defaultValue={crontab.date}
                                                    format={dateFormat}
                                                />
                                            </Space>
                                            <Space direction="vertical">
                                                <p className="text-sm">Hour</p>
                                                <TimePicker
                                                    onChange={onChangeDate}
                                                    size="large"
                                                    className="border-estela-blue-full rounded-lg"
                                                    defaultValue={crontab.date}
                                                    format={hourFormat}
                                                />
                                            </Space>
                                        </Space>
                                    </Content>
                                    <Content>
                                        <p className="text-sm my-4">Repeat</p>
                                        <Select
                                            onChange={handleRepeatChange}
                                            className="w-full"
                                            size="large"
                                            defaultValue={"hourly"}
                                        >
                                            {repeatOptions.map((option: OptionDataRepeat) => (
                                                <Option className="text-sm" key={option.key} value={option.value}>
                                                    {option.label}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Content>
                                    {crontab.repeat === "custom" && (
                                        <Content>
                                            <p className="text-sm my-4">Custom recurrence</p>
                                            <Space direction="horizontal">
                                                <p className="text-sm">Every</p>
                                                <InputNumber
                                                    onChange={onChangeRecurrence}
                                                    min={1}
                                                    max={12}
                                                    size="large"
                                                    className="border-estela-blue-full rounded-lg"
                                                    value={crontab.recurrenceNum}
                                                />
                                                <Select
                                                    onChange={handleRecurrenceChange}
                                                    className="w-full"
                                                    size="large"
                                                    defaultValue={crontab.recurrence}
                                                >
                                                    {recurrenceOptions.map((option: OptionDataRepeat) => (
                                                        <Option
                                                            className="text-sm"
                                                            key={option.key}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Space>
                                            {crontab.recurrence === "weeks" && (
                                                <Content>
                                                    <p className="text-sm my-4">Repeat on</p>
                                                    <Space className="grid grid-cols-7" direction="horizontal">
                                                        {weekOptions.map((option: OptionDataPersistance) => (
                                                            <Checkbox
                                                                key={option.key}
                                                                onChange={() => {
                                                                    handleWeekChange(option.value);
                                                                }}
                                                                checked={crontab.weekDays[option.key]}
                                                            >
                                                                {option.label}
                                                            </Checkbox>
                                                        ))}
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
                        loading={loading}
                        onClick={handleSubmit}
                        size="large"
                        className="w-48 h-12 mr-1 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                    >
                        Create
                    </Button>
                    <Button
                        size="large"
                        className="w-48 h-12 ml-1 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                </Row>
            </Modal>
        </>
    );
}
