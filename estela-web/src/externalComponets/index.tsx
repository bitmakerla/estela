import React from "react";

export const ExternalRoutes = (): JSX.Element => {
    const ComponentRoutes = React.lazy(() => import("ExternalDropdownComponent/ComponentRoutes"));
    return (
        <>
            <ComponentRoutes />
        </>
    );
};
