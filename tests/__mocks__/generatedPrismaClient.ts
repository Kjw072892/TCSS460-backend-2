class PrismaClientKnownRequestError extends Error {
  code: string;
  clientVersion: string;

  constructor(message: string, options: { code: string; clientVersion: string }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = options.code;
    this.clientVersion = options.clientVersion;
  }
}

class PrismaClient {}

const Prisma = {
  PrismaClientKnownRequestError,
};

export { Prisma, PrismaClient };
