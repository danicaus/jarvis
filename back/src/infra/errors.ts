interface ErrorOptions {
  cause?: unknown;
  message?: string;
  action?: string;
}

export class ValidationError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause, message, action }: ErrorOptions = {}) {
    super(message ?? 'Um erro de validação ocorreu', { cause });
    this.name = 'ValidationError';
    this.action = action ?? 'Ajuste os dados enviados e tente novamente';
    this.statusCode = 400;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class UnauthorizedError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause, message, action }: ErrorOptions = {}) {
    super(message ?? 'Usuário não autenticado', { cause });
    this.name = 'UnauthorizedError';
    this.action = action ?? 'Faça login novamente para continuar';
    this.statusCode = 401;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class ForbiddenError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause, message, action }: ErrorOptions = {}) {
    super(message ?? 'Acesso negado', { cause });
    this.name = 'ForbiddenError';
    this.action = action ?? 'Verifique se você tem permissão para esta ação';
    this.statusCode = 403;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class InternalServerError extends Error {
  action: string;
  statusCode: number;

  constructor({ cause }: { cause?: unknown } = {}) {
    super('Um erro interno não esperado aconteceu', { cause });
    this.name = 'InternalServerError';
    this.action = 'Tente novamente mais tarde';
    this.statusCode = 500;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}