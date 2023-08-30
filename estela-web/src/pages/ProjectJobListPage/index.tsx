import React, { Component } from "react";
import { Layout, Typography, Row, Col } from "antd";
import { RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService } from "../../services";
import JobCreateModal from "../JobCreateModal";
import { ApiProjectsJobsRequest, SpiderJob, SpiderJobArg, SpiderJobTag } from "../../services/api";
import { Spin, RouteParams } from "../../shared";
import { convertDateToString } from "../../utils";
import { JobsList } from "../../components/JobsList";

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

interface ProjectJobListPageState {
    loaded: boolean;
    tableStatus: boolean[];
    waitingJobs: SpiderJobData[];
    queueJobs: SpiderJobData[];
    runningJobs: SpiderJobData[];
    completedJobs: SpiderJobData[];
    stoppedJobs: SpiderJobData[];
    errorJobs: SpiderJobData[];
    count: number;
    current: number;
}

export class ProjectJobListPage extends Component<RouteComponentProps<RouteParams>, ProjectJobListPageState> {
    PAGE_SIZE = 2;
    state: ProjectJobListPageState = {
        loaded: false,
        tableStatus: new Array<boolean>(5).fill(true),
        waitingJobs: [],
        queueJobs: [],
        runningJobs: [],
        completedJobs: [],
        stoppedJobs: [],
        errorJobs: [],
        count: 0,
        current: 0,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    async componentDidMount(): Promise<void> {
        const data = await this.getJobs(1);
        this.updateJobs(data, 1);
        this.setState({
            loaded: true,
        });
    }
    updateJobs = (data: { data: SpiderJobData[]; count: number; current: number }, page: number) => {
        const jobs: SpiderJobData[] = data.data;
        const waitingJobs = jobs.filter((job: SpiderJobData) => job.status === "WAITING");
        const queueJobs = jobs.filter((job: SpiderJobData) => job.status === "IN_QUEUE");
        const runningJobs = jobs.filter((job: SpiderJobData) => job.status === "RUNNING");
        const completedJobs = jobs.filter((job: SpiderJobData) => job.status === "COMPLETED");
        const stoppedJobs = jobs.filter((job: SpiderJobData) => job.status === "STOPPED");
        const errorJobs = jobs.filter((job: SpiderJobData) => job.status === "ERROR");

        const tableStatus = [
            waitingJobs.length === 0 ? false : true,
            queueJobs.length === 0 ? false : true,
            runningJobs.length === 0 ? false : true,
            completedJobs.length === 0 ? false : true,
            stoppedJobs.length === 0 ? false : true,
            errorJobs.length === 0 ? false : true,
        ];
        this.setState({
            tableStatus: [...tableStatus],
            errorJobs: [...errorJobs],
            completedJobs: [...completedJobs],
            stoppedJobs: [...stoppedJobs],
            runningJobs: [...runningJobs],
            waitingJobs: [...waitingJobs],
            queueJobs: [...queueJobs],
            count: data.count,
            current: page,
        });
    };

    getJobs = async (page: number): Promise<{ data: SpiderJobData[]; count: number; current: number }> => {
        const requestParams: ApiProjectsJobsRequest = {
            pid: this.projectId,
            page,
            pageSize: this.PAGE_SIZE,
        };
        const response = await this.apiService.apiProjectsJobs(requestParams);
        const data: SpiderJobData[] = response.results.map((job: SpiderJob, iterator: number) => ({
            key: iterator,
            info: {
                jid: job.jid,
                spider: job.spider as unknown as SpiderData,
                cid: job.cronjob,
            },
            args: job.args,
            date: convertDateToString(job.created),
            status: job.jobStatus,
            tags: job.tags,
        }));
        return { data: data, count: response.count, current: page };
    };

    onPageChange = async (page: number) => {
        const data = await this.getJobs(page);
        this.updateJobs(data, page);
    };

    onChangeStatus = (index: number, count: number) => {
        if (count === 0) {
            const tableStatus = this.state.tableStatus;
            tableStatus[index] = !tableStatus[index];
            this.setState({ tableStatus: tableStatus });
        }
    };

    render(): JSX.Element {
        const {
            loaded,
            tableStatus,
            waitingJobs,
            queueJobs,
            runningJobs,
            completedJobs,
            stoppedJobs,
            errorJobs,
            count,
            current,
        } = this.state;
        return (
            <Content>
                {loaded ? (
                    <Layout className="bg-metal rounded-2xl">
                        <Content className="lg:m-10 md:mx-6 mx-2">
                            <Row className="flow-root">
                                <Col className="float-left">
                                    <Text className="text-xl font-medium text-estela-black-medium float-left">
                                        JOB OVERVIEW
                                    </Text>
                                </Col>
                                <Col className="float-right">
                                    <JobCreateModal projectId={this.projectId} openModal={false} spider={null} />
                                </Col>
                            </Row>
                            <JobsList
                                projectId={this.projectId}
                                tableStatus={tableStatus}
                                waitingJobs={waitingJobs}
                                queueJobs={queueJobs}
                                runningJobs={runningJobs}
                                completedJobs={completedJobs}
                                stoppedJobs={stoppedJobs}
                                errorJobs={errorJobs}
                                count={count}
                                current={current}
                                pageSize={this.PAGE_SIZE}
                                onPageChange={this.onPageChange}
                                onChangeStatus={this.onChangeStatus}
                            />
                        </Content>
                    </Layout>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    }
}
