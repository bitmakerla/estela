import React from "react";
import { Tag } from "antd";

export function RequestTag() {
    return (
        <div className="flex">
            <Tag className="text-estela-blue-full font-semibold border-0 bg-estela-blue-low text-base rounded py-1">
                REQUESTS
            </Tag>
            <Tag className="text-xs border-estela-blue-full text-estela-blue-full h-fit rounded">Beta</Tag>
        </div>
    );
}

export function ScrapyTag() {
    return (
        <div className="flex">
            <Tag className="text-estela-blue-full font-semibold border-0 bg-estela-blue-low text-base rounded py-1">
                SCRAPY
            </Tag>
        </div>
    );
}
