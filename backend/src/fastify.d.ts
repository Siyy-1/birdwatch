import "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";

interface FastifyHttpErrors {
  [name: string]: (...args: unknown[]) => Error;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    httpErrors: FastifyHttpErrors;
  }
}
