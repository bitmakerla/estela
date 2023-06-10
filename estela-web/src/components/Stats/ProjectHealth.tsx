import React, { Component } from "react";
import { Doughnut } from "react-chartjs-2";
import { Card, Space, Typography, Tooltip as TooltipAntd } from "antd";
import { Spin } from "../../shared";
import { BytesMetric, formatSecondsToHHMMSS } from "../../utils";
import { Chart as ChartJS, CategoryScale, Title, Tooltip, Legend, ArcElement } from "chart.js";
import Help from "../../assets/icons/help.svg";
import { GlobalStats } from "../../services";

ChartJS.register(CategoryScale, ArcElement, Title, Tooltip, Legend);
const { Text } = Typography;

interface ProjectHealthProps {
    loadedStats: boolean;
    stats: GlobalStats[];
    formattedNetwork: BytesMetric;
    processingTime: number;
    formattedStorage: BytesMetric;
}

export class ProjectHealth extends Component<ProjectHealthProps, unknown> {
    calculateHealth = (): number => {
        const { stats } = this.props;
        if (stats.length === 0) return 0;

        const avgSuccessRates =
            stats.map((stat) => (stat.stats.successRate ?? 0) / 100).reduce((acc, cur) => acc + cur, 0) / stats.length;

        const avgPages =
            stats
                .map((stat) => {
                    const scrapedPages = stat.stats.pages.scrapedPages ?? 0;
                    const totalPages = stat.stats.pages.totalPages ?? 0;
                    return totalPages === 0 ? 0 : scrapedPages / totalPages;
                })
                .reduce((acc, cur) => acc + cur, 0) / stats.length;

        return (avgPages + avgSuccessRates) / 2;
    };

    getHealthColor = (health: number): string => {
        let color = "#E34A46";
        if (health > 0.2) color = "#A13764";
        if (health > 0.4) color = "#D1A34F";
        if (health > 0.6) color = "#7DC932";
        if (health > 0.8) color = "#489019";
        return color;
    };

    getHealthText = (health: number): string => {
        let text = "Unhealthy";
        if (health > 0.2) text = "Low";
        if (health > 0.4) text = "Regular";
        if (health > 0.6) text = "Good";
        if (health > 0.8) text = "Healthy";
        return text;
    };

    render(): JSX.Element {
        const { formattedNetwork, formattedStorage, processingTime, loadedStats } = this.props;
        const health = this.calculateHealth();
        const healthColor = this.getHealthColor(health);
        const healthText = this.getHealthText(health);
        const dataChart = {
            datasets: [
                {
                    label: "GB",
                    data: [health, 1 - health],
                    backgroundColor: [healthColor, "#F1F1F1"],
                    borderWidth: 1,
                    cutout: "90%",
                    circumference: 180,
                    rotation: 270,
                    borderRadius: 4,
                },
            ],
        };
        return (
            <Space direction="vertical" className="w-full">
                <Card bordered={false} className="bg-white rounded-lg w-full">
                    <Space direction="vertical" className="w-full">
                        <div className="flex items-center justify-between">
                            <Text className="text-base text-estela-black-medium break-words">PROJECT HEALTH</Text>
                            <TooltipAntd
                                placement="left"
                                title="Average job success rate of all dates in the specified range."
                            >
                                <Help className="w-4 h-4 stroke-estela-black-medium" />
                            </TooltipAntd>
                        </div>
                        {loadedStats ? (
                            <div className="mx-auto w-44 static">
                                <Doughnut
                                    plugins={[
                                        {
                                            id: "successRateNeedle",
                                            afterDatasetDraw(chart: ChartJS) {
                                                const { ctx } = chart;
                                                ctx.save();
                                                const x = chart.getDatasetMeta(0).data[0].x;
                                                const y = chart.getDatasetMeta(0).data[0].y;
                                                ctx.textAlign = "center";
                                                ctx.textBaseline = "middle";
                                                ctx.font = "bold 1rem/1.5rem sans-serif";
                                                ctx.fillStyle = `${healthColor}`;
                                                ctx.fillText(healthText, x, y - 20);
                                                ctx.fillStyle = "#212529";
                                                ctx.fillText(`${(100 * health).toFixed(2)}%`, x, y);
                                            },
                                        },
                                    ]}
                                    options={{
                                        responsive: true,
                                        events: [],
                                    }}
                                    data={dataChart}
                                />
                            </div>
                        ) : (
                            <Spin />
                        )}
                    </Space>
                </Card>
                <Card bordered={false} className="bg-white rounded-lg">
                    <Space direction="vertical" className={`${loadedStats && "w-full"}`}>
                        <div className="flex items-center justify-between mb-4">
                            <Text className="text-base text-estela-black-medium break-words">USAGE STATS</Text>
                            <TooltipAntd placement="left" title="Usage of the project.">
                                <Help className="w-4 h-4 stroke-estela-black-medium" />
                            </TooltipAntd>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between space-x-4">
                                <Text className="text-sm text-estela-black-medium break-words">Processing time</Text>
                                <Text className="text-base text-estela-black-full break-words">
                                    {formatSecondsToHHMMSS(processingTime)}
                                </Text>
                            </div>
                            <div className="flex items-center justify-between space-x-4">
                                <Text className="text-sm text-estela-black-medium break-words">Bandwidth</Text>
                                <Text className="text-base text-estela-black-full break-words">
                                    {formattedNetwork.quantity} {formattedNetwork.type}
                                </Text>
                            </div>
                            <div className="flex items-center justify-between space-x-4">
                                <Text className="text-sm text-estela-black-medium break-words">Storage</Text>
                                <Text className="text-base text-estela-black-full break-words">
                                    {formattedStorage.quantity} {formattedStorage.type}
                                </Text>
                            </div>
                        </div>
                    </Space>
                </Card>
            </Space>
        );
    }
}
