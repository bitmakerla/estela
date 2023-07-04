import React from "react";
import { RegistrationContext } from "./RegistrationContext";

export type RegistrationProviderProps = {
    children: JSX.Element | JSX.Element[];
};
export const RegistrationProvider = ({ children }: RegistrationProviderProps) => {
    const [validated, setValidated] = React.useState<boolean>(true);

    const updateValidated = (value: boolean) => {
        setValidated(value);
    };

    return (
        <RegistrationContext.Provider
            value={{
                validated,
                updateValidated,
            }}
        >
            {children}
        </RegistrationContext.Provider>
    );
};
