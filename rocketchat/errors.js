/* eslint-disable require-jsdoc */
import Logger from '@jitsi/logger';

const logger = Logger.getLogger(__filename);

/**
 * Custom error classes for Rocket.Chat integration
 */
export class RocketChatError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'RocketChatError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

export class AuthenticationError extends RocketChatError {
    constructor(message = 'Authentication failed', details = null) {
        super(message, 'AUTH_FAILED', details);
        this.name = 'AuthenticationError';
    }
}

export class ConnectionError extends RocketChatError {
    constructor(message = 'Connection failed', details = null) {
        super(message, 'CONNECTION_FAILED', details);
        this.name = 'ConnectionError';
    }
}

export class WebSocketError extends RocketChatError {
    constructor(message = 'WebSocket error', details = null) {
        super(message, 'WEBSOCKET_ERROR', details);
        this.name = 'WebSocketError';
    }
}

export class APIError extends RocketChatError {
    constructor(message = 'API request failed', details = null) {
        super(message, 'API_ERROR', details);
        this.name = 'APIError';
    }
}

export class ValidationError extends RocketChatError {
    constructor(message = 'Validation failed', details = null) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

/**
 * Error handler utility
 */
export const ErrorHandler = {
    /**
     * Handle and log errors
     */
    handle(error, context = '') {
        if (error instanceof RocketChatError) {
            logger.error(`[${context}] ${error.name}: ${error.message}`, {
                code: error.code,
                details: error.details,
                timestamp: error.timestamp
            });
        } else {
            logger.error(`[${context}] Unexpected error:`, error);
        }

        return {
            error: true,
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Create error response
     */
    createErrorResponse(message, code = 'UNKNOWN_ERROR', details = null) {
        return {
            success: false,
            error: {
                message,
                code,
                details,
                timestamp: new Date().toISOString()
            }
        };
    },

    /**
     * Wrap async function with error handling
     */
    async wrapAsync(fn, context = '') {
        try {
            return await fn();
        } catch (error) {
            return this.handle(error, context);
        }
    },

    /**
     * Handle WebSocket errors
     */
    handleWebSocketError(error, context = 'WebSocket') {
        if (error instanceof WebSocketError) {
            return this.handle(error, context);
        }

        const wsError = new WebSocketError(`WebSocket error: ${error.message}`, error);

        return this.handle(wsError, context);
    },

    /**
     * Handle API errors
     */
    handleAPIError(error, context = 'API') {
        if (error instanceof APIError) {
            return this.handle(error, context);
        }

        const apiError = new APIError(`API error: ${error.message}`, error);

        return this.handle(apiError, context);
    },

    /**
     * Handle authentication errors
     */
    handleAuthError(error, context = 'Authentication') {
        if (error instanceof AuthenticationError) {
            return this.handle(error, context);
        }

        const authError = new AuthenticationError(`Auth error: ${error.message}`, error);

        return this.handle(authError, context);
    },

    /**
     * Handle connection errors
     */
    handleConnectionError(error, context = 'Connection') {
        if (error instanceof ConnectionError) {
            return this.handle(error, context);
        }

        const connError = new ConnectionError(`Connection error: ${error.message}`, error);

        return this.handle(connError, context);
    },

    /**
     * Handle validation errors
     */
    handleValidationError(error, context = 'Validation') {
        if (error instanceof ValidationError) {
            return this.handle(error, context);
        }

        const valError = new ValidationError(`Validation error: ${error.message}`, error);

        return this.handle(valError, context);
    },

    /**
     * Create standardized error response for API calls
     */
    createAPIErrorResponse(error, statusCode = 500) {
        const errorResponse = this.handle(error, 'API');

        return {
            success: false,
            statusCode,
            ...errorResponse
        };
    },

    /**
     * Create standardized error response for WebSocket
     */
    createWebSocketErrorResponse(error) {
        const errorResponse = this.handleWebSocketError(error);

        return {
            type: 'error',
            ...errorResponse
        };
    },

    /**
     * Log error with different levels
     */
    logError(error, level = 'error', context = '') {
        const errorInfo = {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString(),
            context
        };

        switch (level) {
        case 'debug':
            logger.debug(`[${context}] Error:`, errorInfo);
            break;
        case 'warn':
            logger.warn(`[${context}] Warning:`, errorInfo);
            break;
        case 'info':
            logger.info(`[${context}] Info:`, errorInfo);
            break;
        default:
            logger.error(`[${context}] Error:`, errorInfo);
        }
    }
};
