import { createContext, useContext } from 'react'

// Used for updating the row size after we've figured out how large it is
type LoggingContext = {
    setSize: (index: number, size: number) => void;
    windowWidth: number
}
export const LogTableContext = createContext<LoggingContext|null>(null);

const getLogTableContext = (): LoggingContext => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const context = useContext(LogTableContext);

    if (!context) {
        throw Error("Unable to get LogTableContext!");
    }
    return context;
}

export default getLogTableContext
