import { ERROR_MESSAGES } from '@/constants'

// 错误日志记录接口
interface ErrorLog {
  message: string
  statusCode: number
  stack?: string
  timestamp: string
  context?: Record<string, any>
}

// 日志记录函数（生产环境可以集成Sentry等）
const logError = (error: Error | AppError, context?: Record<string, any>) => {
  const errorLog: ErrorLog = {
    message: error.message,
    statusCode: error instanceof AppError ? error.statusCode : 500,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  }

  // 开发环境：详细日志
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error Log:', errorLog)
  } else {
    // 生产环境：简化日志（可以发送到错误监控服务）
    console.error(`[${errorLog.statusCode}] ${errorLog.message}`, {
      timestamp: errorLog.timestamp,
      ...(context && { context }),
    })
  }

  // TODO: 生产环境可以集成Sentry
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: context })
  // }
}

// 基础错误类
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    // 记录错误
    logError(this, context)
  }
}

// 验证错误
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, true, field ? { field } : undefined)
  }
}

// 认证错误
export class AuthenticationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.AUTH.LOGIN_REQUIRED) {
    super(message, 401)
  }
}

// 授权错误
export class AuthorizationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.AUTH.ADMIN_REQUIRED) {
    super(message, 403)
  }
}

// 资源未找到错误
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404)
  }
}

// 冲突错误（如重复预订）
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

// 支付错误
export class PaymentError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 402, true, context)
  }
}

// 数据库错误
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', context?: Record<string, any>) {
    super(message, 500, false, context)
  }
}

// 外部服务错误（如Stripe、Supabase）
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`${service} error: ${message}`, 502, false, { service, ...context })
  }
}

// 错误处理工具函数
export const handleError = (
  error: unknown,
  defaultMessage: string = ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR
): { message: string; statusCode: number } => {
  // 如果已经是AppError，直接返回
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    }
  }

  // 如果是普通Error，记录并转换为AppError
  if (error instanceof Error) {
    logError(error)
    
    // 根据错误消息判断类型
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return {
        message: error.message,
        statusCode: 400,
      }
    }
    
    if (error.message.includes('not found')) {
      return {
        message: error.message,
        statusCode: 404,
      }
    }

    return {
      message: error.message || defaultMessage,
      statusCode: 500,
    }
  }

  // 未知错误类型
  const unknownError = new Error(defaultMessage)
  logError(unknownError, { originalError: error })
  
  return {
    message: defaultMessage,
    statusCode: 500,
  }
}

// Server Action错误处理包装器
export const handleServerActionError = (
  error: unknown
): { message: string } => {
  const handled = handleError(error)
  return { message: handled.message }
}

// API路由错误处理
export const handleApiError = (
  error: unknown,
  defaultMessage: string = ERROR_MESSAGES.GENERAL.SERVER_ERROR
) => {
  const handled = handleError(error, defaultMessage)
  
  return Response.json(
    {
      error: {
        message: handled.message,
        statusCode: handled.statusCode,
      },
    },
    {
      status: handled.statusCode,
      statusText: getStatusText(handled.statusCode),
    }
  )
}

// 获取HTTP状态文本
const getStatusText = (statusCode: number): string => {
  const statusTexts: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
  }
  return statusTexts[statusCode] || 'Internal Server Error'
}

// Async错误包装器（用于Server Actions）
export const asyncHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      // 重新抛出AppError，让调用者处理
      if (error instanceof AppError) {
        throw error
      }
      // 其他错误转换为AppError
      throw new AppError(
        error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR,
        500,
        false
      )
    }
  }
}

// 验证辅助函数
export const validateRequired = (value: any, fieldName: string): void => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
}

export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError(ERROR_MESSAGES.VALIDATION.INVALID_EMAIL, 'email')
  }
}

export const validateDateRange = (checkIn: Date, checkOut: Date): void => {
  if (checkOut <= checkIn) {
    throw new ValidationError(ERROR_MESSAGES.VALIDATION.INVALID_DATE_RANGE, 'dateRange')
  }
  
  // 检查日期不能是过去
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (checkIn < today) {
    throw new ValidationError('Check-in date cannot be in the past', 'checkIn')
  }
}

export const validatePrice = (price: number): void => {
  if (price <= 0) {
    throw new ValidationError('Price must be greater than 0', 'price')
  }
  
  if (price > 10000) {
    throw new ValidationError('Price must be less than 10000', 'price')
  }
}

// 检查资源是否存在
export const ensureExists = <T>(
  resource: T | null,
  resourceName: string = 'Resource'
): T => {
  if (!resource) {
    throw new NotFoundError(resourceName)
  }
  return resource
}

// 检查权限
export const ensureAuthorized = (
  condition: boolean,
  message: string = ERROR_MESSAGES.AUTH.ADMIN_REQUIRED
): void => {
  if (!condition) {
    throw new AuthorizationError(message)
  }
}

