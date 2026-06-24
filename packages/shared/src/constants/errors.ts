export const apiErrorCodes = {
  validation: "VALIDATION_ERROR",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  businessRuleViolation: "BUSINESS_RULE_VIOLATION",
  internal: "INTERNAL_ERROR"
} as const;

export type ApiErrorCode = (typeof apiErrorCodes)[keyof typeof apiErrorCodes];
