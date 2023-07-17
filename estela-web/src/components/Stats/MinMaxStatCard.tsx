import React, { Component } from "react";
import { Link } from "react-router-dom";
import ArrowRight from "../../assets/icons/arrowRight.svg";

interface MinMaxStatCardProps {
    maxJobURL: string;
    minJobURL: string;
    maxHeadText: string;
    minHeadText: string;
    maxJobText: string;
    minJobText: string;
    maxValText: string;
    minValText: string;
}

export class MinMaxStatCard extends Component<MinMaxStatCardProps, unknown> {
    render() {
        const { maxJobURL, minJobURL, maxHeadText, minHeadText, maxJobText, minJobText, maxValText, minValText } =
            this.props;
        return (
            <>
                <p className="text-estela-black-full text-sm mt-3">{maxHeadText}</p>
                <Link
                    to={maxJobURL}
                    target="_blank"
                    className="flex items-center justify-between hover:bg-estela-white-full rounded-lg px-2 py-1"
                >
                    <div>
                        <p className="text-estela-blue-full text-sm">{maxJobText}</p>
                        <p className="text-estela-black-full text-xs">{maxValText}</p>
                    </div>
                    <ArrowRight className="w-6 h-6 stroke-estela-blue-full" />
                </Link>
                <p className="text-estela-black-full text-sm mt-3">{minHeadText}</p>
                <Link
                    to={minJobURL}
                    target="_blank"
                    className="flex items-center justify-between hover:bg-estela-white-full rounded-lg px-2 py-1"
                >
                    <div>
                        <p className="text-estela-blue-full text-sm">{minJobText}</p>
                        <p className="text-estela-black-full text-xs">{minValText}</p>
                    </div>
                    <ArrowRight className="w-6 h-6 stroke-estela-blue-full" />
                </Link>
            </>
        );
    }
}
