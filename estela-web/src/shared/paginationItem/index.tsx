import React from "react";
import type { PaginationProps } from "antd";
import DoubleRight from "../../assets/icons/doubleRight.svg";
import DoubleLeft from "../../assets/icons/doubleLeft.svg";

export const PaginationItem: PaginationProps["itemRender"] = (current, type) => {
    if (type === "prev") {
        return (
            <div className="flex items-center mx-3 gap-2 hover:text-estela font-medium">
                <DoubleLeft />
                <p>Prev</p>
            </div>
        );
    }
    if (type === "next") {
        return (
            <div className="flex items-center mx-3 gap-2 hover:text-estela font-medium">
                <p>Next</p>
                <DoubleRight />
            </div>
        );
    }
    if (type === "page") {
        return <div className="justify-center align-middle p-0 mx-3">{current}</div>;
    }
};
