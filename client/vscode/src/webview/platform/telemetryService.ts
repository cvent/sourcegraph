import { TelemetryService } from '@sourcegraph/shared/src/telemetry/telemetryService'

export const vscodeTelemetryService: TelemetryService = {
    // TODO: generate and store anon user id.
    // store w Memento

    log: () => {},
    logViewEvent: () => {},
}
/**
 * Props interface that can be extended by React components depending on the TelemetryService.
 */
export interface VsceTelemetryProps {
    /**
     * A telemetry service implementation to log events.
     */
    telemetryService: VsceTelemetryService
}

/**
 * The telemetry service logs events.
 */
export interface VsceTelemetryService {
    /**
     * Log an event (by sending it to the server).
     * Provide uri manually for some events
     */
    log(eventName: string, eventProperties?: any, publicArgument?: any, uri?: string): void
    /**
     * Log a pageview event (by sending it to the server).
     */
    logViewEvent(eventName: string, eventProperties?: any, publicArgument?: any, uri?: string): void
    /**
     * Listen for event logs
     *
     * @returns a cleanup/removeEventListener function
     */
    addEventLogListener?(callback: (eventName: string) => void): () => void
}

/**
 * A noop telemetry service.
 * * Provide uri manually for some events
 */
export const NOOP_TELEMETRY_SERVICE: VsceTelemetryService = {
    log: () => {
        /* noop */
    },
    logViewEvent: () => {
        /* noop */
    },
}
