export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
  message: string;
  statusCode: number;
};

export const successResponse = <T>(
  message: string,
  data: T,
): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data,
});

export const errorResponse = (
  statusCode: number,
  error: string,
  message: string,
): ApiErrorResponse => ({
  success: false,
  error,
  message,
  statusCode,
});
