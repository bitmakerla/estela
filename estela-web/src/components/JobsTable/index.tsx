import React, { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Typography, Table, Row, Space, Layout, Col, Tag, Button } from "antd";
import "./styles.scss";

import Filter from "../../assets/icons/filter.svg";
import Setting from "../../assets/icons/setting.svg";
import { SpiderJobArg, SpiderJobTag } from "../../services";

const { Content } = Layout;
const { Text } = Typography;

interface SpiderData {
    sid: number;
    name: string;
}

interface BaseInfo {
    jid: number | undefined;
    spider: SpiderData;
    cid?: number | null | undefined;
}

interface SpiderJobData {
    info: BaseInfo;
    key: number | undefined;
    date: string;
    tags: SpiderJobTag[] | undefined;
    args: SpiderJobArg[] | undefined;
    status: string | undefined;
}

interface JobsTableProps {
    projectId: string;
    titleLabel: string;
    jobs: SpiderJobData[];
    tagElement: ReactNode;
}

export const JobsTable: React.FC<JobsTableProps> = ({ projectId, jobs, titleLabel, tagElement }) => {
    const columns = [
        {
            title: "JOB",
            dataIndex: "info",
            key: "info",
            render: (info: BaseInfo): ReactElement => (
                <Link
                    to={`/projects/${projectId}/spiders/${info.spider.sid}/jobs/${info.jid}`}
                    className="text-estela-blue-medium"
                >
                    Job-{info.jid}
                </Link>
            ),
        },
        {
            title: "SPIDER",
            dataIndex: "info",
            key: "info",
            render: (info: BaseInfo): ReactElement => (
                <Link to={`/projects/${projectId}/spiders/${info.spider.sid}`} className="text-estela-blue-medium">
                    {info.spider.name}
                </Link>
            ),
        },
        {
            title: "SCHEDULED JOB",
            key: "info",
            dataIndex: "info",
            render: (info: BaseInfo): ReactElement =>
                info.cid ? (
                    <Link
                        to={`/projects/${projectId}/spiders/${info.spider.sid}/cronjobs/${info.cid}`}
                        className="text-estela-blue-medium"
                    >
                        Sche-Job-{info.cid}
                    </Link>
                ) : (
                    <Text className="text-estela-black-medium text-xs">Not associated</Text>
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
            render: (args: SpiderJobArg[]): ReactElement => (
                <Content>
                    {args.map((arg: SpiderJobArg, id: number) => (
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
            render: (tags: SpiderJobTag[]): ReactElement => (
                <Content>
                    {tags.map((tag: SpiderJobTag, id) => (
                        <Tag key={id} className="text-estela border-estela rounded bg-button-hover">
                            {tag.name}
                        </Tag>
                    ))}
                </Content>
            ),
        },
    ];

    return (
        <Row className="my-2 rounded-lg bg-white">
            <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                <Col className="float-left py-1">
                    <Text className="mr-2 text-estela-black-medium font-medium text-lg">{titleLabel}</Text>
                    {tagElement}
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
                    className="table-joblist"
                    size="small"
                    rowSelection={{
                        type: "checkbox",
                    }}
                    columns={columns}
                    dataSource={jobs}
                    pagination={false}
                    locale={{ emptyText: "No jobs yet" }}
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
    );
};
