import React, { Component } from "react";
import { Checkbox, Col, Row, Space, Tag, Layout, Typography, Pagination } from "antd";
import { JobsTable } from "../JobsTable";
import { SpiderJobArg, SpiderJobTag } from "../../services";

import { PaginationItem } from "../PaginationItem";

const { Content } = Layout;
const { Text } = Typography;

enum JobStatus {
    Waiting,
    Queued,
    Running,
    Completed,
    Stopped,
    WithError,
}

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

interface JobsListProps {
    projectId: string;
    tableStatus: boolean[];
    waitingJobs: SpiderJobData[];
    queueJobs: SpiderJobData[];
    runningJobs: SpiderJobData[];
    completedJobs: SpiderJobData[];
    stoppedJobs: SpiderJobData[];
    errorJobs: SpiderJobData[];
    count: number;
    current: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onChangeStatus: (index: number, count: number) => void;
}

export class JobsList extends Component<JobsListProps, unknown> {
    PAGE_SIZE = this.props.pageSize;
    render(): JSX.Element {
        const {
            projectId,
            tableStatus,
            waitingJobs,
            queueJobs,
            runningJobs,
            completedJobs,
            stoppedJobs,
            errorJobs,
            count,
            current,
            onPageChange,
            onChangeStatus,
        } = this.props;
        return (
            <Row className="my-4 grid gap-2 grid-cols-1 lg:grid-cols-5 items-start w-full">
                <Col className="float-left col-span-4">
                    {tableStatus[JobStatus.Waiting] && (
                        <JobsTable
                            titleLabel="Waiting"
                            tagElement={
                                <Tag className="rounded-2xl bg-estela-yellow-low text-estela-yellow-full border-estela-yellow-low">
                                    {waitingJobs.length}
                                </Tag>
                            }
                            projectId={projectId}
                            jobs={waitingJobs}
                        />
                    )}
                    {tableStatus[JobStatus.Queued] && (
                        <JobsTable
                            titleLabel="In queue"
                            tagElement={
                                <Tag className="rounded-2xl bg-estela-yellow-low text-estela-yellow-full border-estela-yellow-low">
                                    {queueJobs.length}
                                </Tag>
                            }
                            projectId={projectId}
                            jobs={queueJobs}
                        />
                    )}
                    {tableStatus[JobStatus.Running] && (
                        <JobsTable
                            titleLabel="Running"
                            tagElement={
                                <Tag className="rounded-2xl bg-estela-green-low text-estela-green-full border-estela-green-low">
                                    {runningJobs.length}
                                </Tag>
                            }
                            projectId={projectId}
                            jobs={runningJobs}
                        />
                    )}
                    {tableStatus[JobStatus.Completed] && (
                        <JobsTable
                            titleLabel="Completed"
                            tagElement={
                                <Tag className="rounded-2xl bg-estela-blue-low text-estela-blue-full border-estela-blue-low">
                                    {completedJobs.length}
                                </Tag>
                            }
                            projectId={projectId}
                            jobs={completedJobs}
                        />
                    )}
                    {tableStatus[JobStatus.Stopped] && (
                        <JobsTable
                            titleLabel="Stopped"
                            tagElement={
                                <Tag className="rounded-2xl bg-estela-red-low text-estela-red-full border-estela-red-low">
                                    {stoppedJobs.length}
                                </Tag>
                            }
                            projectId={projectId}
                            jobs={stoppedJobs}
                        />
                    )}
                    {tableStatus[JobStatus.WithError] && (
                        <JobsTable
                            titleLabel="Error"
                            tagElement={
                                <Tag className="rounded-2xl bg-estela-red-low text-estela-red-full border-estela-red-low">
                                    {errorJobs.length}
                                </Tag>
                            }
                            projectId={projectId}
                            jobs={errorJobs}
                        />
                    )}
                    <Row>
                        <Pagination
                            className="pagination"
                            defaultCurrent={1}
                            total={count}
                            current={current}
                            pageSize={this.PAGE_SIZE}
                            onChange={onPageChange}
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
                                checked={waitingJobs.length == 0 ? tableStatus[JobStatus.Waiting] : true}
                                onChange={() => onChangeStatus(JobStatus.Waiting, waitingJobs.length)}
                            >
                                <Space direction="horizontal">
                                    <Text className="text-estela-black-medium font-medium text-sm">Waiting</Text>
                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                        {waitingJobs.length}
                                    </Tag>
                                </Space>
                            </Checkbox>
                            <br />
                            <Checkbox
                                checked={queueJobs.length == 0 ? tableStatus[JobStatus.Queued] : true}
                                onChange={() => onChangeStatus(JobStatus.Queued, queueJobs.length)}
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
                                checked={runningJobs.length == 0 ? tableStatus[JobStatus.Running] : true}
                                onChange={() => onChangeStatus(JobStatus.Running, runningJobs.length)}
                            >
                                <Space direction="horizontal">
                                    <Text className="text-estela-black-medium font-medium text-sm">Running</Text>
                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                        {runningJobs.length}
                                    </Tag>
                                </Space>
                            </Checkbox>
                            <br />
                            <Checkbox
                                checked={completedJobs.length == 0 ? tableStatus[JobStatus.Completed] : true}
                                onChange={() => onChangeStatus(JobStatus.Completed, completedJobs.length)}
                            >
                                <Space direction="horizontal">
                                    <Text className="text-estela-black-medium font-medium text-sm">Completed</Text>
                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                        {completedJobs.length}
                                    </Tag>
                                </Space>
                            </Checkbox>
                            <br />
                            <Checkbox
                                checked={stoppedJobs.length == 0 ? tableStatus[JobStatus.Stopped] : true}
                                onChange={() => onChangeStatus(JobStatus.Stopped, stoppedJobs.length)}
                            >
                                <Space direction="horizontal">
                                    <Text className="text-estela-black-medium font-medium text-sm">Stopped</Text>
                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                        {stoppedJobs.length}
                                    </Tag>
                                </Space>
                            </Checkbox>
                            <br />
                            <Checkbox
                                checked={errorJobs.length == 0 ? tableStatus[JobStatus.WithError] : true}
                                onChange={() => onChangeStatus(JobStatus.WithError, errorJobs.length)}
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
            </Row>
        );
    }
}
