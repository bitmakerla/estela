import React, { Component } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataset,
    ChartData,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { StatType } from "../../shared";
import { SpiderJobStats } from "../../services";
import { Tabs } from "antd";
import "./ChartsSection.scss";
import { parseDurationToSeconds, setValArr, sumArr } from "../../utils";
import moment from "moment";
import { MinMaxStatCard } from "./MinMaxStatCard";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const datasetsGenerator = (statOption: StatType, stats: SpiderJobStats | SpiderJobStats[]) => {
    if (Array.isArray(stats)) {
        if (statOption === StatType.PAGES)
            return [
                {
                    label: "scraped",
                    data: [sumArr(stats.map((jobsStats) => jobsStats.stats?.pages.scrapedPages ?? 0)), 0],
                    backgroundColor: "#32C3A4",
                },
                {
                    label: "missed",
                    data: [0, sumArr(stats.map((jobsStats) => jobsStats.stats?.pages.missedPages ?? 0))],
                    backgroundColor: "#A13764",
                },
            ];
        if (statOption === StatType.ITEMS)
            return [
                {
                    label: "items",
                    data: stats.map((jobsStats) => jobsStats.stats?.itemsCount ?? 0),
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.RUNTIME)
            return [
                {
                    label: "runtime",
                    data: stats.map((jobsStats) => parseDurationToSeconds(jobsStats.stats?.runtime?.toString())),
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.SUCCESS_RATE)
            return [
                {
                    label: "Job success rate",
                    data: [sumArr(stats.map((jobsStats) => jobsStats.stats?.successRate ?? 0)) / stats.length],
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.STATUS_CODE)
            return [
                {
                    label: "200",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.statusCodes.status200 ?? 0)),
                        index: 0,
                    }),
                    backgroundColor: ["#32C3A4"],
                },
                {
                    label: "301",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.statusCodes.status301 ?? 0)),
                        index: 1,
                    }),
                    backgroundColor: "#D1A34F",
                },
                {
                    label: "302",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.statusCodes.status302 ?? 0)),
                        index: 2,
                    }),
                    backgroundColor: "#A13764",
                },
                {
                    label: "401",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.statusCodes.status401 ?? 0)),
                        index: 3,
                    }),
                    backgroundColor: "#3C7BC6",
                },
                {
                    label: "403",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.statusCodes.status403 ?? 0)),
                        index: 4,
                    }),
                    backgroundColor: "#7DC932",
                },
                {
                    label: "404",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.statusCodes.status404 ?? 0)),
                        index: 5,
                    }),
                    backgroundColor: "#FE9F99",
                },
                {
                    label: "429",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.statusCodes.status429 ?? 0)),
                        index: 6,
                    }),
                    backgroundColor: "#E7E255",
                },
                {
                    label: "500",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.statusCodes.status500 ?? 0)),
                        index: 7,
                    }),
                    backgroundColor: "#6C757D",
                },
            ];
        if (statOption === StatType.LOGS)
            return [
                {
                    label: "INFO",
                    data: setValArr({
                        arr: new Array(5).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.logs.infoLogs ?? 0)),
                        index: 0,
                    }),
                    backgroundColor: "#32C3A4",
                },
                {
                    label: "DEBUG",
                    data: setValArr({
                        arr: new Array(5).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.logs.debugLogs ?? 0)),
                        index: 1,
                    }),
                    backgroundColor: "#D1A34F",
                },
                {
                    label: "ERROR",
                    data: setValArr({
                        arr: new Array(5).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.logs.errorLogs ?? 0)),
                        index: 2,
                    }),
                    backgroundColor: "#A13764",
                },
                {
                    label: "WARNING",
                    data: setValArr({
                        arr: new Array(5).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.logs.warningLogs ?? 0)),
                        index: 3,
                    }),
                    backgroundColor: "#E7E255",
                },
                {
                    label: "CRITICAL",
                    data: setValArr({
                        arr: new Array(5).fill(0),
                        val: sumArr(stats.map((jobsStats) => jobsStats.stats?.logs.criticalLogs ?? 0)),
                        index: 4,
                    }),
                    backgroundColor: "#6C757D",
                },
            ];
    } else {
        if (statOption === StatType.PAGES)
            return [
                {
                    label: "scraped",
                    data: [stats.stats.pages.scrapedPages ?? 0, 0],
                    backgroundColor: "#32C3A4",
                },
                {
                    label: "missed",
                    data: [0, stats.stats.pages.missedPages ?? 0],
                    backgroundColor: "#A13764",
                },
            ];
        if (statOption === StatType.ITEMS)
            return [
                {
                    label: "items",
                    data: [stats.stats.itemsCount ?? 0],
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.RUNTIME)
            return [
                {
                    label: "runtime",
                    data: [stats.stats.runtime ?? 0],
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.SUCCESS_RATE)
            return [
                {
                    label: "Job success rate",
                    data: [stats.stats.successRate ?? 0],
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.STATUS_CODE)
            return [
                {
                    label: "200",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: stats.stats.statusCodes.status200 ?? 0,
                        index: 0,
                    }),
                    backgroundColor: ["#32C3A4"],
                },
                {
                    label: "301",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: stats.stats.statusCodes.status301 ?? 0,
                        index: 1,
                    }),
                    backgroundColor: "#D1A34F",
                },
                {
                    label: "302",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: stats.stats.statusCodes.status302 ?? 0,
                        index: 2,
                    }),
                    backgroundColor: "#A13764",
                },
                {
                    label: "401",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: stats.stats.statusCodes.status401 ?? 0,
                        index: 3,
                    }),
                    backgroundColor: "#3C7BC6",
                },
                {
                    label: "403",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: stats.stats.statusCodes.status403 ?? 0,
                        index: 4,
                    }),
                    backgroundColor: "#7DC932",
                },
                {
                    label: "404",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: stats.stats.statusCodes.status404 ?? 0,
                        index: 5,
                    }),
                    backgroundColor: "#FE9F99",
                },
                {
                    label: "429",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: stats.stats.statusCodes.status429 ?? 0,
                        index: 6,
                    }),
                    backgroundColor: "#E7E255",
                },
                {
                    label: "500",
                    data: setValArr({
                        arr: new Array(8).fill(0),
                        val: stats.stats.statusCodes.status500 ?? 0,
                        index: 7,
                    }),
                    backgroundColor: "#6C757D",
                },
            ];
        return [
            {
                label: "INFO",
                data: setValArr({
                    arr: new Array(5).fill(0),
                    val: stats.stats.logs.infoLogs ?? 0,
                    index: 0,
                }),
                backgroundColor: "#32C3A4",
            },
            {
                label: "DEBUG",
                data: setValArr({
                    arr: new Array(5).fill(0),
                    val: stats.stats.logs.debugLogs ?? 0,
                    index: 1,
                }),
                backgroundColor: "#D1A34F",
            },
            {
                label: "ERROR",
                data: setValArr({
                    arr: new Array(5).fill(0),
                    val: stats.stats.logs.errorLogs ?? 0,
                    index: 2,
                }),
                backgroundColor: "#A13764",
            },
            {
                label: "WARNING",
                data: setValArr({
                    arr: new Array(5).fill(0),
                    val: stats.stats.logs.warningLogs ?? 0,
                    index: 3,
                }),
                backgroundColor: "#E7E255",
            },
            {
                label: "CRITICAL",
                data: setValArr({
                    arr: new Array(5).fill(0),
                    val: stats.stats.logs.criticalLogs ?? 0,
                    index: 4,
                }),
                backgroundColor: "#6C757D",
            },
        ];
    }
    return [
        {
            label: "",
            data: [],
            backgroundColor: "",
        },
    ];
};

const findMinMaxPages = (stats: SpiderJobStats[]) => {
    if (stats.length === 0) return { scraped: { max: null, min: null }, missed: { max: null, min: null } };
    return stats.reduce(
        (acc, curr) => {
            if ((curr.stats.pages.scrapedPages ?? 0) > (acc.scraped.max.stats.pages.scrapedPages ?? 0))
                acc.scraped.max = curr;
            if ((curr.stats.pages.scrapedPages ?? 0) < (acc.scraped.min.stats.pages.scrapedPages ?? 0))
                acc.scraped.min = curr;
            if ((curr.stats.pages.missedPages ?? 0) > (acc.scraped.max.stats.pages.missedPages ?? 0))
                acc.missed.max = curr;
            if ((curr.stats.pages.missedPages ?? 0) < (acc.scraped.min.stats.pages.missedPages ?? 0))
                acc.missed.min = curr;
            return acc;
        },
        {
            scraped: { max: stats[0], min: stats[0] },
            missed: { max: stats[0], min: stats[0] },
        },
    );
};
const findMinMaxStatusCodes = (stats: SpiderJobStats[]) => {
    if (stats.length === 0)
        return {
            vals200: { max: null, min: null },
            vals301: { max: null, min: null },
            vals302: { max: null, min: null },
            vals401: { max: null, min: null },
            vals403: { max: null, min: null },
            vals404: { max: null, min: null },
            vals429: { max: null, min: null },
            vals500: { max: null, min: null },
        };

    return stats.reduce(
        (acc, curr) => {
            if ((curr.stats.statusCodes.status200 ?? 0) > (acc.vals200.max.stats.statusCodes.status200 ?? 0))
                acc.vals200.max = curr;
            if ((curr.stats.statusCodes.status200 ?? 0) < (acc.vals200.min.stats.statusCodes.status200 ?? 0))
                acc.vals200.min = curr;
            if ((curr.stats.statusCodes.status301 ?? 0) > (acc.vals301.max.stats.statusCodes.status301 ?? 0))
                acc.vals301.max = curr;
            if ((curr.stats.statusCodes.status301 ?? 0) < (acc.vals301.min.stats.statusCodes.status301 ?? 0))
                acc.vals301.min = curr;
            if ((curr.stats.statusCodes.status302 ?? 0) > (acc.vals302.max.stats.statusCodes.status302 ?? 0))
                acc.vals302.max = curr;
            if ((curr.stats.statusCodes.status302 ?? 0) < (acc.vals302.min.stats.statusCodes.status302 ?? 0))
                acc.vals302.min = curr;
            if ((curr.stats.statusCodes.status401 ?? 0) > (acc.vals401.max.stats.statusCodes.status401 ?? 0))
                acc.vals401.max = curr;
            if ((curr.stats.statusCodes.status401 ?? 0) < (acc.vals401.min.stats.statusCodes.status401 ?? 0))
                acc.vals401.min = curr;
            if ((curr.stats.statusCodes.status403 ?? 0) > (acc.vals403.max.stats.statusCodes.status403 ?? 0))
                acc.vals403.max = curr;
            if ((curr.stats.statusCodes.status403 ?? 0) < (acc.vals403.min.stats.statusCodes.status403 ?? 0))
                acc.vals403.min = curr;
            if ((curr.stats.statusCodes.status404 ?? 0) > (acc.vals404.max.stats.statusCodes.status404 ?? 0))
                acc.vals404.max = curr;
            if ((curr.stats.statusCodes.status404 ?? 0) < (acc.vals404.min.stats.statusCodes.status404 ?? 0))
                acc.vals404.min = curr;
            if ((curr.stats.statusCodes.status429 ?? 0) > (acc.vals429.max.stats.statusCodes.status429 ?? 0))
                acc.vals429.max = curr;
            if ((curr.stats.statusCodes.status429 ?? 0) < (acc.vals429.min.stats.statusCodes.status429 ?? 0))
                acc.vals429.min = curr;
            if ((curr.stats.statusCodes.status500 ?? 0) > (acc.vals500.max.stats.statusCodes.status500 ?? 0))
                acc.vals500.max = curr;
            if ((curr.stats.statusCodes.status500 ?? 0) < (acc.vals500.min.stats.statusCodes.status500 ?? 0))
                acc.vals500.min = curr;
            return acc;
        },
        {
            vals200: { max: stats[0], min: stats[0] },
            vals301: { max: stats[0], min: stats[0] },
            vals302: { max: stats[0], min: stats[0] },
            vals401: { max: stats[0], min: stats[0] },
            vals403: { max: stats[0], min: stats[0] },
            vals404: { max: stats[0], min: stats[0] },
            vals429: { max: stats[0], min: stats[0] },
            vals500: { max: stats[0], min: stats[0] },
        },
    );
};
const findMinMaxLogs = (stats: SpiderJobStats[]) => {
    if (stats.length === 0)
        return {
            info: { max: null, min: null },
            debug: { max: null, min: null },
            error: { max: null, min: null },
            warning: { max: null, min: null },
            critical: { max: null, min: null },
        };

    return stats.reduce(
        (acc, curr) => {
            if ((curr.stats.logs.infoLogs ?? 0) > (acc.info.max.stats.logs.infoLogs ?? 0)) acc.info.max = curr;
            if ((curr.stats.logs.infoLogs ?? 0) < (acc.info.min.stats.logs.infoLogs ?? 0)) acc.info.min = curr;
            if ((curr.stats.logs.debugLogs ?? 0) > (acc.debug.max.stats.logs.debugLogs ?? 0)) acc.debug.max = curr;
            if ((curr.stats.logs.debugLogs ?? 0) < (acc.debug.min.stats.logs.debugLogs ?? 0)) acc.debug.min = curr;
            if ((curr.stats.logs.errorLogs ?? 0) > (acc.error.max.stats.logs.errorLogs ?? 0)) acc.error.max = curr;
            if ((curr.stats.logs.errorLogs ?? 0) < (acc.error.min.stats.logs.errorLogs ?? 0)) acc.error.min = curr;
            if ((curr.stats.logs.warningLogs ?? 0) > (acc.warning.max.stats.logs.warningLogs ?? 0))
                acc.warning.max = curr;
            if ((curr.stats.logs.warningLogs ?? 0) < (acc.warning.min.stats.logs.warningLogs ?? 0))
                acc.warning.min = curr;
            if ((curr.stats.logs.criticalLogs ?? 0) > (acc.critical.max.stats.logs.criticalLogs ?? 0))
                acc.critical.max = curr;
            if ((curr.stats.logs.criticalLogs ?? 0) < (acc.critical.min.stats.logs.criticalLogs ?? 0))
                acc.critical.min = curr;
            return acc;
        },
        {
            info: { max: stats[0], min: stats[0] },
            debug: { max: stats[0], min: stats[0] },
            error: { max: stats[0], min: stats[0] },
            warning: { max: stats[0], min: stats[0] },
            critical: { max: stats[0], min: stats[0] },
        },
    );
};

interface ChartsModalSectionProps {
    pid: string;
    stats: SpiderJobStats | SpiderJobStats[];
    pages?: boolean;
    items?: boolean;
    runtime?: boolean;
    successRate?: boolean;
    statusCodes?: boolean;
    coverage?: boolean;
    logs?: boolean;
}
export class ChartsModalSection extends Component<ChartsModalSectionProps, unknown> {
    labelsGenerator = (statOption: StatType) => {
        const { stats } = this.props;
        if (statOption === StatType.PAGES) return ["scraped", "missed"];
        else if (statOption === StatType.ITEMS)
            return Array.isArray(stats) ? stats.map(({ jid }) => `job ${jid}`) : ["items"];
        else if (statOption === StatType.RUNTIME)
            return Array.isArray(stats) ? stats.map(({ jid }) => `job ${jid}`) : ["runtime"];
        else if (statOption === StatType.SUCCESS_RATE) return ["job success rate"];
        else if (statOption === StatType.STATUS_CODE) return ["200", "301", "302", "401", "403", "404", "429", "500"];
        else if (statOption === StatType.COVERAGE) return ["coverage"];
        else if (statOption === StatType.LOGS) return ["info", "debug", "error", "warning", "critical"];
        return [];
    };

    appendixCharts = (statOption: StatType): JSX.Element => {
        const { stats, pid } = this.props;
        if (!Array.isArray(stats)) return <></>;
        let items: { label: React.ReactNode; key: string; children: React.ReactNode }[] | null = null;
        if (statOption === StatType.PAGES) {
            const { scraped, missed } = findMinMaxPages(stats);
            items = [
                {
                    label: "Scraped",
                    key: "scraped",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Scraped more pages:"
                            minHeadText="Scraped less pages:"
                            maxJobURL={`/projects/${pid}/spiders/${scraped.max?.spider}/jobs/${scraped.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${scraped.min?.spider}/jobs/${scraped.min?.jid}`}
                            maxJobText={`Job ${scraped.max?.jid} - ${moment(scraped.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${scraped.min?.jid} - ${moment(scraped.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${scraped.max?.stats.pages.scrapedPages ?? 0} pages`}
                            minValText={`${scraped.min?.stats.pages.scrapedPages ?? 0} pages`}
                        />
                    ),
                },
                {
                    label: "Missed",
                    key: "missed",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Missed more pages:"
                            minHeadText="Missed less pages:"
                            maxJobURL={`/projects/${pid}/spiders/${missed.max?.spider}/jobs/${missed.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${missed.min?.spider}/jobs/${missed.min?.jid}`}
                            maxJobText={`Job ${missed.max?.jid} - ${moment(missed.max?.created).format("dddd DD MMM")}`}
                            minJobText={`Job ${missed.min?.jid} - ${moment(missed.min?.created).format("dddd DD MMM")}`}
                            maxValText={`${missed.max?.stats.pages.missedPages ?? 0} pages`}
                            minValText={`${missed.min?.stats.pages.missedPages ?? 0} pages`}
                        />
                    ),
                },
            ];
        }
        if (statOption === StatType.STATUS_CODE) {
            const { vals200, vals301, vals302, vals401, vals403, vals404, vals429, vals500 } =
                findMinMaxStatusCodes(stats);
            items = [
                {
                    label: "200",
                    key: "200",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Has more 200 status:"
                            minHeadText="Has less 200 status:"
                            maxJobURL={`/projects/${pid}/spiders/${vals200.max?.spider}/jobs/${vals200.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${vals200.min?.spider}/jobs/${vals200.min?.jid}`}
                            maxJobText={`Job ${vals200.max?.jid} - ${moment(vals200.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${vals200.min?.jid} - ${moment(vals200.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${vals200.max?.stats.statusCodes.status200 ?? 0} statuses`}
                            minValText={`${vals200.min?.stats.statusCodes.status200 ?? 0} statuses`}
                        />
                    ),
                },
                {
                    label: "301",
                    key: "301",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Has more 301 status:"
                            minHeadText="Has less 301 status:"
                            maxJobURL={`/projects/${pid}/spiders/${vals301.max?.spider}/jobs/${vals301.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${vals301.min?.spider}/jobs/${vals301.min?.jid}`}
                            maxJobText={`Job ${vals301.max?.jid} - ${moment(vals301.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${vals301.min?.jid} - ${moment(vals301.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${vals301.max?.stats.statusCodes.status301 ?? 0} statuses`}
                            minValText={`${vals301.min?.stats.statusCodes.status301 ?? 0} statuses`}
                        />
                    ),
                },
                {
                    label: "302",
                    key: "302",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Has more 302 status:"
                            minHeadText="Has less 302 status:"
                            maxJobURL={`/projects/${pid}/spiders/${vals302.max?.spider}/jobs/${vals302.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${vals302.min?.spider}/jobs/${vals302.min?.jid}`}
                            maxJobText={`Job ${vals302.max?.jid} - ${moment(vals302.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${vals302.min?.jid} - ${moment(vals302.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${vals302.max?.stats.statusCodes.status302 ?? 0} statuses`}
                            minValText={`${vals302.min?.stats.statusCodes.status302 ?? 0} statuses`}
                        />
                    ),
                },
                {
                    label: "401",
                    key: "401",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Has more 401 status:"
                            minHeadText="Has less 401 status:"
                            maxJobURL={`/projects/${pid}/spiders/${vals401.max?.spider}/jobs/${vals401.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${vals401.min?.spider}/jobs/${vals401.min?.jid}`}
                            maxJobText={`Job ${vals401.max?.jid} - ${moment(vals401.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${vals401.min?.jid} - ${moment(vals401.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${vals401.max?.stats.statusCodes.status401 ?? 0} statuses`}
                            minValText={`${vals401.min?.stats.statusCodes.status401 ?? 0} statuses`}
                        />
                    ),
                },
                {
                    label: "403",
                    key: "403",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Has more 403 status:"
                            minHeadText="Has less 403 status:"
                            maxJobURL={`/projects/${pid}/spiders/${vals403.max?.spider}/jobs/${vals403.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${vals403.min?.spider}/jobs/${vals403.min?.jid}`}
                            maxJobText={`Job ${vals403.max?.jid} - ${moment(vals403.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${vals403.min?.jid} - ${moment(vals403.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${vals403.max?.stats.statusCodes.status403 ?? 0} statuses`}
                            minValText={`${vals403.min?.stats.statusCodes.status403 ?? 0} statuses`}
                        />
                    ),
                },
                {
                    label: "404",
                    key: "404",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Has more 404 status:"
                            minHeadText="Has less 404 status:"
                            maxJobURL={`/projects/${pid}/spiders/${vals404.max?.spider}/jobs/${vals404.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${vals404.min?.spider}/jobs/${vals404.min?.jid}`}
                            maxJobText={`Job ${vals404.max?.jid} - ${moment(vals404.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${vals404.min?.jid} - ${moment(vals404.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${vals404.max?.stats.statusCodes.status404 ?? 0} statuses`}
                            minValText={`${vals404.min?.stats.statusCodes.status404 ?? 0} statuses`}
                        />
                    ),
                },
                {
                    label: "429",
                    key: "429",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Has more 429 status:"
                            minHeadText="Has less 429 status:"
                            maxJobURL={`/projects/${pid}/spiders/${vals429.max?.spider}/jobs/${vals429.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${vals429.min?.spider}/jobs/${vals429.min?.jid}`}
                            maxJobText={`Job ${vals429.max?.jid} - ${moment(vals429.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${vals429.min?.jid} - ${moment(vals429.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${vals429.max?.stats.statusCodes.status429 ?? 0} statuses`}
                            minValText={`${vals429.min?.stats.statusCodes.status429 ?? 0} statuses`}
                        />
                    ),
                },
                {
                    label: "500",
                    key: "500",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Has more 500 status:"
                            minHeadText="Has less 500 status:"
                            maxJobURL={`/projects/${pid}/spiders/${vals500.max?.spider}/jobs/${vals500.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${vals500.min?.spider}/jobs/${vals500.min?.jid}`}
                            maxJobText={`Job ${vals500.max?.jid} - ${moment(vals500.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${vals500.min?.jid} - ${moment(vals500.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${vals500.max?.stats.statusCodes.status500 ?? 0} statuses`}
                            minValText={`${vals500.min?.stats.statusCodes.status500 ?? 0} statuses`}
                        />
                    ),
                },
            ];
        }
        if (statOption === StatType.LOGS) {
            const { info, debug, error, warning, critical } = findMinMaxLogs(stats);
            items = [
                {
                    label: "INFO",
                    key: "info",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Detected more INFO:"
                            minHeadText="Detected less INFO:"
                            maxJobURL={`/projects/${pid}/spiders/${info.max?.spider}/jobs/${info.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${info.min?.spider}/jobs/${info.min?.jid}`}
                            maxJobText={`Job ${info.max?.jid} - ${moment(info.max?.created).format("dddd DD MMM")}`}
                            minJobText={`Job ${info.min?.jid} - ${moment(info.min?.created).format("dddd DD MMM")}`}
                            maxValText={`${info.max?.stats.logs.infoLogs ?? 0} logs`}
                            minValText={`${info.min?.stats.logs.infoLogs ?? 0} logs`}
                        />
                    ),
                },
                {
                    label: "DEBUG",
                    key: "debug",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Detected more DEBUG:"
                            minHeadText="Detected less DEBUG:"
                            maxJobURL={`/projects/${pid}/spiders/${debug.max?.spider}/jobs/${debug.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${debug.min?.spider}/jobs/${debug.min?.jid}`}
                            maxJobText={`Job ${debug.max?.jid} - ${moment(debug.max?.created).format("dddd DD MMM")}`}
                            minJobText={`Job ${debug.min?.jid} - ${moment(debug.min?.created).format("dddd DD MMM")}`}
                            maxValText={`${debug.max?.stats.logs.debugLogs ?? 0} logs`}
                            minValText={`${debug.min?.stats.logs.debugLogs ?? 0} logs`}
                        />
                    ),
                },
                {
                    label: "ERROR",
                    key: "error",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Detected more ERROR:"
                            minHeadText="Detected less ERROR:"
                            maxJobURL={`/projects/${pid}/spiders/${error.max?.spider}/jobs/${error.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${error.min?.spider}/jobs/${error.min?.jid}`}
                            maxJobText={`Job ${error.max?.jid} - ${moment(error.max?.created).format("dddd DD MMM")}`}
                            minJobText={`Job ${error.min?.jid} - ${moment(error.min?.created).format("dddd DD MMM")}`}
                            maxValText={`${error.max?.stats.logs.errorLogs ?? 0} logs`}
                            minValText={`${error.min?.stats.logs.errorLogs ?? 0} logs`}
                        />
                    ),
                },
                {
                    label: "WARNING",
                    key: "warning",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Detected more WARNING:"
                            minHeadText="Detected less WARNING:"
                            maxJobURL={`/projects/${pid}/spiders/${warning.max?.spider}/jobs/${warning.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${warning.min?.spider}/jobs/${warning.min?.jid}`}
                            maxJobText={`Job ${warning.max?.jid} - ${moment(warning.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${warning.min?.jid} - ${moment(warning.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${warning.max?.stats.logs.warningLogs ?? 0} logs`}
                            minValText={`${warning.min?.stats.logs.warningLogs ?? 0} logs`}
                        />
                    ),
                },
                {
                    label: "CRITICAL",
                    key: "critical",
                    children: (
                        <MinMaxStatCard
                            maxHeadText="Detected more CRITICAL:"
                            minHeadText="Detected less CRITICAL:"
                            maxJobURL={`/projects/${pid}/spiders/${critical.max?.spider}/jobs/${critical.max?.jid}`}
                            minJobURL={`/projects/${pid}/spiders/${critical.min?.spider}/jobs/${critical.min?.jid}`}
                            maxJobText={`Job ${critical.max?.jid} - ${moment(critical.max?.created).format(
                                "dddd DD MMM",
                            )}`}
                            minJobText={`Job ${critical.min?.jid} - ${moment(critical.min?.created).format(
                                "dddd DD MMM",
                            )}`}
                            maxValText={`${critical.max?.stats.logs.criticalLogs ?? 0} logs`}
                            minValText={`${critical.min?.stats.logs.criticalLogs ?? 0} logs`}
                        />
                    ),
                },
            ];
        }

        if (items) {
            return (
                <div className="bg-[#FFFECD] rounded-lg px-10 py-5">
                    <Tabs className="w-full" items={items} />
                </div>
            );
        }
        return <></>;
    };

    charts = (statOption: StatType): JSX.Element => {
        const { stats } = this.props;
        const labels: string[] = this.labelsGenerator(statOption);

        const datasets: ChartDataset<"bar", number[]>[] = datasetsGenerator(statOption, stats);

        const data: ChartData<"bar", number[], string> = {
            labels: labels,
            datasets: datasets,
        };

        return (
            <>
                <div className="stats-charts mb-4">
                    <Bar
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: "y",
                            plugins: {
                                legend: {
                                    position: "right" as const,
                                },
                            },
                            scales: {
                                x: {
                                    stacked: true,
                                },
                                y: {
                                    stacked: true,
                                    grid: {
                                        display: false,
                                    },
                                    min:
                                        statOption === StatType.COVERAGE || statOption === StatType.SUCCESS_RATE
                                            ? 0
                                            : undefined,
                                    max:
                                        statOption === StatType.COVERAGE || statOption === StatType.SUCCESS_RATE
                                            ? 100
                                            : undefined,
                                },
                            },
                        }}
                        data={data}
                    />
                </div>
                {this.appendixCharts(statOption)}
            </>
        );
    };

    render() {
        const { pages, items, runtime, successRate, statusCodes, coverage, logs } = this.props;
        const tabsItems = [];
        if (pages)
            tabsItems.push({
                label: "Pages",
                key: StatType.PAGES,
                children: this.charts(StatType.PAGES),
            });
        if (items)
            tabsItems.push({
                label: "Items",
                key: StatType.ITEMS,
                children: this.charts(StatType.ITEMS),
            });
        if (runtime)
            tabsItems.push({
                label: "Runtime",
                key: StatType.RUNTIME,
                children: this.charts(StatType.RUNTIME),
            });
        if (successRate)
            tabsItems.push({
                label: "Job success rate",
                key: StatType.SUCCESS_RATE,
                children: this.charts(StatType.SUCCESS_RATE),
            });
        if (statusCodes)
            tabsItems.push({
                label: "Status code",
                key: StatType.STATUS_CODE,
                children: this.charts(StatType.STATUS_CODE),
            });
        if (coverage)
            tabsItems.push({
                label: "Coverage",
                key: StatType.COVERAGE,
                children: this.charts(StatType.COVERAGE),
            });
        if (logs)
            tabsItems.push({
                label: "Logs",
                key: StatType.LOGS,
                children: this.charts(StatType.LOGS),
            });

        return <Tabs className="w-full float-right text-estela-black-medium text-xs md:text-sm" items={tabsItems} />;
    }
}
